# WebGPU Ed25519 Scalar Multiplication

Implementation of Ed25519 scalar multiplication in a WGSL compute shader using a fixed-base comb method.

💻 See the demo <a href="https://dcfgvy.github.io/WebGPU-Ed25519-Scalar-Multiplication/" target="_blank">here</a> (your browser should support WebGPU)!

The shader code itself is available at <a href="https://github.com/Dcfgvy/WebGPU-Ed25519-Scalar-Multiplication/tree/main/src/wgsl">src/wgsl</a>, starting with <a href="https://github.com/Dcfgvy/WebGPU-Ed25519-Scalar-Multiplication/blob/main/src/wgsl/00-initialization.wgsl">src/wgsl/00-initialization.wgsl</a>.

## 💾 Precomputation:

This scalar multiplication method requires precomputing a look-up table. This precomputation is implemented in Go.

In order to precompute a table for custom *comb width* `w`:

```console
cd ./precomputation/
go install
go run . -w {window width} -out {output path}
```

## ⚙️ Shader Setup

In the shader <a href="https://github.com/Dcfgvy/WebGPU-Ed25519-Scalar-Multiplication/blob/main/src/wgsl/00-initialization.wgsl">code</a> there are 4 integer constants:

1. `t` defines the bit length of a scalar.
2. `w` is the *comb width* or *column* size. Max value is `9`, limited by the size of uniform buffers (64 KiB), since the precomputed table size grows exponentially with `w`.
3. `d` is just the number of these *columns*, logically equal to `ceil(t / w)`. Number of field element multiplications in the cycle is proportional to `d`.
4. `PRECOMPUTED_COMB_TABLE_SIZE` speaks for itself. Since every precomputed point is represented with 3 field elements, each being 10 32-bit integers, the formula for `PRECOMPUTED_COMB_TABLE_SIZE` is `2^w * 120 bytes per point / 4 bytes per u32`.


## 📄 Input & Output:

 - The `scalar` buffer accepts the 256-bit scalar, bit-packed in an array of 8 unsigned 32-bit integers in **little-endian byte order**, meaning that `scalar[0] >> 24` is the least significant byte. See the `bytesToU256` function in <a href="https://github.com/Dcfgvy/WebGPU-Ed25519-Scalar-Multiplication/blob/main/src/main.ts">src/main.ts</a> for JS implementation details.

 - The `result` buffer stores the point = `scalar * B`, where B is the base point with y = 4/5 and x is positive (LSB is 0). The resulting point is represented in affine coordinates with a pair of 256-bit integers X and Y, which are also **bit-packed little-endian integers**. Getting the common 32-byte compressed form is as easy as placing the sign bit of X (LSB of X) to the MSB of Y.
 
## ⏲ JIT compilation time

Given the complexity of the shader, the <ins>first-time</ins> Just-In-Time (JIT) compilation of WGSL code takes quite a lot of time **(usually 2-5 mins)**.

The subsequent dispatches will already use the compiled GPU code and therefore will only take **milliseconds** to execute, including JS pre- and postcomputations, buffer allocations, etc.