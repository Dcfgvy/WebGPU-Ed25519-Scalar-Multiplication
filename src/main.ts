import shader from "./base58.wgsl?raw";
import bs58 from 'bs58';

const base58Alphabet: string = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Generate random test data
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Verify against bs58
function verifyWithJsCrypto(input: string, ourResult: string): boolean {
  const bytes = new TextEncoder().encode(input);
  const base58Encoding = bs58.encode(bytes);
  return base58Encoding === ourResult;
}

class Base58Encoder {
  private device: GPUDevice | null = null;
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

    try {
      this.shaderCode = shader;
    } catch (error) {
      throw new Error(
        "Could not read base58.wgsl file. Make sure it exists in the current directory."
      );
    }
  }

  private stringToU32Array(input: string): Uint32Array {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);

    // Pad to 4-byte boundary
    const paddedLength = Math.ceil(bytes.length / 4) * 4;
    const paddedBytes = new Uint8Array(paddedLength);
    paddedBytes.set(bytes);

    // Convert to u32 array with big-endian byte order
    const u32Array = new Uint32Array(paddedLength / 4);
    for (let i = 0; i < u32Array.length; i++) {
      const byteOffset = i * 4;
      // Pack 4 bytes into u32 in big-endian order
      u32Array[i] =
        (paddedBytes[byteOffset] << 24) |
        (paddedBytes[byteOffset + 1] << 16) |
        (paddedBytes[byteOffset + 2] << 8) |
        paddedBytes[byteOffset + 3];
    }

    return u32Array;
  }

  async computeBase58(input: string): Promise<string> {
    if (!this.device) {
      throw new Error("Device not initialized. Call init() first.");
    }

    // Convert input to u32 array
    const inputU32 = this.stringToU32Array(input);
    const inputSizeInBytes = new TextEncoder().encode(input).length;

    // Create shader module
    const shaderModule = this.device.createShaderModule({
      code: this.shaderCode,
    });

    // Create buffers
    const alignedInputSize = Math.max(4, Math.ceil(inputSizeInBytes / 4) * 4);
    const b58BytesBufferSize = Math.max(4, Math.ceil(Math.ceil(inputSizeInBytes * 4 * 1.37) / 4) * 4);
    
    const inputBuffer = this.device.createBuffer({
      size: alignedInputSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const inputSizeBuffer = this.device.createBuffer({
      size: 4, // Single u32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const b58BytesBuffer = this.device.createBuffer({
      size: b58BytesBufferSize,  // max length of the encoding
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const resultInfoBuffer = this.device.createBuffer({
      size: 8,  // 2 * u32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const b58ReadBuffer = this.device.createBuffer({
      size: b58BytesBufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const resultInfoReadBuffer = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // Write input data to buffers
    this.device.queue.writeBuffer(inputBuffer, 0, new Uint32Array(inputU32));
    this.device.queue.writeBuffer(inputSizeBuffer, 0, new Uint32Array([inputSizeInBytes]));

    // Create bind group layout
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: inputSizeBuffer } },
        { binding: 2, resource: { buffer: b58BytesBuffer } },
        { binding: 3, resource: { buffer: resultInfoBuffer } },
      ],
    });

    // Create compute pipeline
    const computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: shaderModule,
        entryPoint: "encode",
      },
    });

    // Create command encoder and dispatch
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(1);
    passEncoder.end();

    // Copy results to read buffers
    commandEncoder.copyBufferToBuffer(b58BytesBuffer, 0, b58ReadBuffer, 0, b58BytesBufferSize);
    commandEncoder.copyBufferToBuffer(resultInfoBuffer, 0, resultInfoReadBuffer, 0, 8);

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    // Read results from GPU
    await Promise.all([
      b58ReadBuffer.mapAsync(GPUMapMode.READ),
      resultInfoReadBuffer.mapAsync(GPUMapMode.READ),
    ]);
    
    const b58ArrayBuffer = b58ReadBuffer.getMappedRange();
    const resultInfoArrayBuffer = resultInfoReadBuffer.getMappedRange();
    const b58Array = Array.from(new Uint32Array(b58ArrayBuffer.slice(0)));
    const resultInfo = Array.from(new Uint32Array(resultInfoArrayBuffer.slice(0)));
    
    b58ReadBuffer.unmap();
    resultInfoReadBuffer.unmap();

    // Build Base58 string from results
    const leadingOnesCount = resultInfo[0];
    const encodedDataStartIndex = resultInfo[1];
    let result = "1".repeat(leadingOnesCount);
    
    for (let i = encodedDataStartIndex; i < b58Array.length; i++) {
      result += base58Alphabet[b58Array[i]];
    }

    return result;
  }
}

// Main execution
async function main() {
  try {
    console.log("🚀 Starting Base58 Encoding Test");
    console.log("================================");

    const encoder = new Base58Encoder();
    await encoder.init();

    // Test cases
    const testCases = [
      "\0\0",
      "Hello, World!",
      "The quick brown fox jumps over the lazy dog",
      generateRandomString(50),
      generateRandomString(100),
      "",
      "!",
      "Base58 encoding test with WebGPU implementation using WGSL shaders!",
    ];

    console.log("Running test cases...\n");

    for (let i = 0; i < testCases.length; i++) {
      const input = testCases[i];
      const displayInput =
        input.length > 50 ? input.substring(0, 47) + "..." : input;

      console.log(`Test ${i + 1}: "${displayInput}"`);
      console.log(`Input length: ${input.length} characters`);

      try {
        const startTime = performance.now();
        const result = await encoder.computeBase58(input);
        const endTime = performance.now();

        console.log(`WebGPU Result: ${result} (Length: ${result.length})`);

        // Verify against JS implementation
        const isValid = verifyWithJsCrypto(input, result);
        const bytes = new TextEncoder().encode(input);
        const jsResult = bs58.encode(bytes);

        console.log(`JS Result: ${jsResult} (Length: ${jsResult.length})`);
        console.log(`✅ Verification: ${isValid ? "PASSED" : "FAILED"}`);
        console.log(`⏱️ Execution time: ${(endTime - startTime).toFixed(2)}ms`);
      } catch (error) {
        console.error(`❌ Error: ${error}`);
      }

      console.log("─".repeat(80));
    }

    // Performance test with larger data
    console.log("\n🏃 Performance Test with Random Large Data");
    console.log("====================================");

    const largeInput = generateRandomString(1000);
    console.log(`Testing with ${largeInput.length} character string:\n${largeInput}`);

    const startTime = performance.now();
    const largeResult = await encoder.computeBase58(largeInput);
    const endTime = performance.now();

    console.log(`WebGPU Result: ${largeResult} (Length: ${largeResult.length})`);
    console.log(`⏱️ Execution time: ${(endTime - startTime).toFixed(2)}ms`);

    const isLargeValid = verifyWithJsCrypto(largeInput, largeResult);
    const bytes = new TextEncoder().encode(largeInput);
    const jsResult = bs58.encode(bytes);

    console.log(`JS Result: ${jsResult} (Length: ${jsResult.length})`);
    console.log(`✅ Verification: ${isLargeValid ? "PASSED" : "FAILED"}`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
