// Import WGSL shader files in correct concatenation order
import i64Shader from "./wgsl/new_i64.wgsl?raw";
import initShader from "./wgsl/00-initialization.wgsl?raw";
import helperShader from "./wgsl/01-helper-functions.wgsl?raw";
import feAddShader from "./wgsl/02-fe_add.wgsl?raw";
import feSubShader from "./wgsl/03-fe_sub.wgsl?raw";
import feMulShader from "./wgsl/04-fe_mul.wgsl?raw";
import feSqShader from "./wgsl/05-fe_sq.wgsl?raw";
import feSq2Shader from "./wgsl/06-fe_sq2.wgsl?raw";
import feNegShader from "./wgsl/07-fe_neg.wgsl?raw";
import feDblShader from "./wgsl/08-fe_dbl.wgsl?raw";
import feInvertShader from "./wgsl/09-fe_invert.wgsl?raw";
import feTobytesShader from "./wgsl/10-fe_tobytes.wgsl?raw";
import scalarMulShader from "./wgsl/11-scalar-multiplication.wgsl?raw";

import nacl from "tweetnacl";

// Concatenate all shader files in order
function getConcatenatedShader(): string {
  return (
    i64Shader +
    "\n" +
    initShader +
    "\n" +
    helperShader +
    "\n" +
    feAddShader +
    "\n" +
    feSubShader +
    "\n" +
    feMulShader +
    "\n" +
    feSqShader +
    "\n" +
    feSq2Shader +
    "\n" +
    feNegShader +
    "\n" +
    feDblShader +
    "\n" +
    feInvertShader +
    "\n" +
    feTobytesShader +
    "\n" +
    scalarMulShader
  );
}

// Load the precomputed table binary
async function loadCombTable(): Promise<Uint32Array> {
  const response = await fetch("./src/ed25519-comb-table.bin");
  if (!response.ok) {
    throw new Error(`Failed to load comb table: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint32Array(arrayBuffer);
}

// Convert bytes to big-endian u256 (array of 8 u32s)
function bytesToU256(bytes: Uint8Array): Uint32Array {
  if (bytes.length < 32) {
    const padded = new Uint8Array(32);
    padded.set(bytes, 32 - bytes.length);
    bytes = padded;
  }

  const u256 = new Uint32Array(8);
  for (let i = 0; i < 8; i++) {
    u256[i] =
      (bytes[i * 4] << 24) |
      (bytes[i * 4 + 1] << 16) |
      (bytes[i * 4 + 2] << 8) |
      bytes[i * 4 + 3];
  }
  return u256;
}

// Convert big-endian u256 to bytes
function u256ToBytes(u256: Uint32Array): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    bytes[i * 4] = (u256[i] >> 24) & 0xff;
    bytes[i * 4 + 1] = (u256[i] >> 16) & 0xff;
    bytes[i * 4 + 2] = (u256[i] >> 8) & 0xff;
    bytes[i * 4 + 3] = u256[i] & 0xff;
  }
  return bytes;
}

// Generate a random 32-byte scalar
function generateRandomScalar(): Uint8Array {
  return new Uint8Array(crypto.getRandomValues(new Uint8Array(32)));
}

class Ed25519ScalarMultiplier {
  private device: GPUDevice | null = null;
  private combTable: Uint32Array | null = null;
  private shaderCode: string = "";

  async init() {
    if (!navigator.gpu) {
      alert("WebGPU not supported in this environment");
      throw new Error("WebGPU not supported in this environment");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      alert("No appropriate GPUAdapter found");
      throw new Error("No appropriate GPUAdapter found");
    }

    this.device = await adapter.requestDevice();
    this.shaderCode = getConcatenatedShader();
    this.combTable = await loadCombTable();
  }

  async multiply(scalar: Uint8Array): Promise<[Uint8Array, Uint8Array]> {
    if (!this.device || !this.combTable) {
      throw new Error("Device not initialized. Call init() first.");
    }

    // Convert scalar to u256
    const scalarU256 = bytesToU256(scalar);

    // Create shader module
    const shaderModule = this.device.createShaderModule({
      code: this.shaderCode,
    });

    // Create buffers
    const combTableBuffer = this.device.createBuffer({
      size: this.combTable.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      // mappedAtCreation: false,
    });

    const scalarBuffer = this.device.createBuffer({
      size: scalarU256.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const resultBuffer = this.device.createBuffer({
      size: 64, // 2 * u256 (X and Y coordinates)
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const resultReadBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // Write input data
    this.device.queue.writeBuffer(combTableBuffer, 0, this.combTable);
    this.device.queue.writeBuffer(scalarBuffer, 0, scalarU256);

    // Create bind group layouts
    const combTableLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    const scalarResultLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });

    // Create bind groups
    const combTableBindGroup = this.device.createBindGroup({
      layout: combTableLayout,
      entries: [{ binding: 0, resource: { buffer: combTableBuffer } }],
    });

    const scalarResultBindGroup = this.device.createBindGroup({
      layout: scalarResultLayout,
      entries: [
        { binding: 0, resource: { buffer: scalarBuffer } },
        { binding: 1, resource: { buffer: resultBuffer } },
      ],
    });

    // Create compute pipeline
    const computePipeline = await this.device.createComputePipelineAsync({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [combTableLayout, scalarResultLayout],
      }),
      compute: {
        module: shaderModule,
        entryPoint: "multiply",
      },
    });

    // Create command encoder and dispatch
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, combTableBindGroup);
    passEncoder.setBindGroup(1, scalarResultBindGroup);
    passEncoder.dispatchWorkgroups(1);
    passEncoder.end();

    // Copy results to read buffer
    commandEncoder.copyBufferToBuffer(resultBuffer, 0, resultReadBuffer, 0, 64);

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    await this.device.queue.onSubmittedWorkDone();

    // Read results from GPU
    await resultReadBuffer.mapAsync(GPUMapMode.READ);
    const resultArrayBuffer = resultReadBuffer.getMappedRange();
    const resultData = new Uint32Array(resultArrayBuffer).slice(0);
    resultReadBuffer.unmap();

    // Extract X and Y coordinates (each is 8 u32s = 32 bytes)
    const xCoord = u256ToBytes(resultData.slice(0, 8));
    const yCoord = u256ToBytes(resultData.slice(8, 16));

    return [xCoord, yCoord];
  }
}

// Test case data structure
interface TestCase {
  name: string;
  scalar: Uint8Array;
}

// Generate test cases including edge cases
function generateTestCases(): TestCase[] {
  const testCases: TestCase[] = [];

  // Edge case 1: Zero scalar (should result in identity point - but Ed25519 doesn't use strict identity)
  testCases.push({
    name: "Scalar = 0",
    scalar: new Uint8Array(32),
  });

  // Edge case 2: Scalar = 1 (should give base point G)
  const scalar1 = new Uint8Array(32);
  scalar1[31] = 1;
  testCases.push({
    name: "Scalar = 1 (Base Point G)",
    scalar: scalar1,
  });

  // Edge case 3: Scalar = L-1 (order of the group minus 1)
  const scalarL1 = new Uint8Array([
    0xec, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2,
    0xde, 0xf9, 0xde, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10,
  ]);
  testCases.push({
    name: "Scalar = L-1",
    scalar: scalarL1,
  });

  // Edge case 4: Small scalar
  const smallScalar = new Uint8Array(32);
  smallScalar[31] = 42;
  testCases.push({
    name: "Scalar = 42",
    scalar: smallScalar,
  });

  // Edge case 5: Large scalar
  const largeScalar = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    largeScalar[i] = 0xff;
  }
  testCases.push({
    name: "Scalar = 2^256 - 1 (max u256)",
    scalar: largeScalar,
  });

  // Random test cases
  for (let i = 0; i < 3; i++) {
    testCases.push({
      name: `Random Scalar ${i + 1}`,
      scalar: generateRandomScalar(),
    });
  }

  return testCases;
}

// Format bytes as hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Main execution
async function main() {
  try {
    console.log("🚀 Starting Ed25519 Scalar Multiplication Test");
    console.log("=".repeat(80));

    const multiplier = new Ed25519ScalarMultiplier();
    await multiplier.init();

    // Load tweetnacl for reference
    console.log("✅ Loaded tweetnacl for verification");
    console.log("");

    // Generate test cases
    const testCases = generateTestCases();

    console.log(`Running ${testCases.length} test cases...\n`);

    let passedTests = 0;
    let failedTests = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Test ${i + 1}: ${testCase.name}`);
      console.log(`Scalar: 0x${bytesToHex(testCase.scalar)}`);

      try {
        const startTime = performance.now();
        const [gpuX, gpuY] = await multiplier.multiply(testCase.scalar);
        const endTime = performance.now();

        console.log(
          `WebGPU Result X: 0x${bytesToHex(gpuX)}`
        );
        console.log(
          `WebGPU Result Y: 0x${bytesToHex(gpuY)}`
        );

        // Verify using tweetnacl - compute public key from scalar
        const publicKey = nacl.sign.keyPair.fromSeed(testCase.scalar).publicKey;
        console.log(
          `TweetNaCl Public Key (reference): 0x${bytesToHex(publicKey)}`
        );

        // Note: The Y coordinate from nacl's Ed25519 can be recovered from the public key
        // We compare the full result with tweetnacl's point
        const match = publicKey.every((byte, idx) => byte === gpuY[idx]);

        console.log(`✅ Execution time: ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`✅ Verification: ${match ? "PASSED ✓" : "POTENTIAL MISMATCH ⚠"}`);

        if (match) {
          passedTests++;
        } else {
          failedTests++;
        }
      } catch (error) {
        console.error(`❌ Error: ${error}`);
        failedTests++;
      }

      console.log("─".repeat(80));
    }

    // Summary
    console.log("\n📊 Test Summary");
    console.log("=".repeat(80));
    console.log(`Total tests: ${testCases.length}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Pass rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);
  } catch (error) {
    console.error("❌ Fatal Error:", error);
  }
}

main();
