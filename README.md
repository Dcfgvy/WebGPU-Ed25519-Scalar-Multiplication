# WebGPU Base58

Implementation of Base58 encoding algorithm in a WebGPU compute shader

💻 See the demo <a href="https://dcfgvy.github.io/WebGPU-Base58/">here</a> (your browser should support WebGPU)! The shader code itself is available at <a href="https://github.com/Dcfgvy/WebGPU-Base58/blob/main/src/base58.wgsl">src/base58.wgsl</a>.

## ⚠ Warning:
This general algorithm was designed to work with **<ins>arbitrary</ins> small input sizes** (< 1000 bytes) and because of that it is **highly inefficient** due to the reasons detailed in the [Limitations](#⏲-limitations) section below. Therefore, **it is strongly recommended to modify the shader in the following ways for production**:
1. Use a small <ins>fixed</ins> input size appropriate for your use case
2. Define `b58_bytes` locally instead of using a slow `var<storage>` variable
3. Use `uniform` buffers instead of `storage` buffers for input

## 📄 Input & Output:

 - The `input` buffer accepts an array of unsigned 32-bit integers. Each integer should be treated as 4 bytes in **big-endian** byte order. See the `stringToU32Array` method in <a href="https://github.com/Dcfgvy/WebGPU-Base58/blob/main/src/main.ts">src/main.ts</a> for JS implementation details.
 
 - The `input_size_arr` buffer accepts an array with a single unsigned 32-bit integer, which indicates the size of the actual data in `input` **in bytes**. For example, if there are 3 bytes of data, you still have to pad the `input` buffer size to 4 bytes in WebGPU. In this case `input_size_arr[0]` should be 3.

 - The `b58_bytes` buffer is initialized with zeros and should have a size of `ceil(input_size * 4 * 1.37)` bytes (times 4 because each byte in input corresponds to 1 `u32` of size 4 bytes in `b58_bytes`). This sizing accounts for the Base58 encoding expansion: since Base58 has a smaller radix than Base256, approximately 1.37 times more space is needed in a worst case scenario (derived from log(256) / log(58)).

 - The result of the computation is composed of the `b58_bytes` array and 2 unsigned 32-bit integers in `result_info`. The `result_info[0]` contains the count of leading zeros ('1' characters in Base58 alphabet), and `result_info[1]` indicates the starting index of encoded digits in `b58_bytes`. The final string is obtained by translating numbers in `b58_bytes` to the Base58 alphabet starting from the index specified in `result_info[1]` and prepending the string with `result_info[0]` leading '1's.
 
## ⏲ Limitations:

 - This algorithm can *theoretically* process an input up to 747 MB in size. Due to a nested cycle, though, large inputs will most certainly take enormous amount of time to compute, which in turn will trigger a GPU watchdog timeout on most systems. In general, the shader was designed to only work with relatively small input sizes.

 - Another drawback is the use of `var<storage> b58_bytes`, which is needed to work with arbitrary input sizes. However, accessing a `storage` variable is **way slower** than accessing a `private` or `function` variable, and because we are constantly updating values in `b58_bytes`, this slows down the computation significantly.