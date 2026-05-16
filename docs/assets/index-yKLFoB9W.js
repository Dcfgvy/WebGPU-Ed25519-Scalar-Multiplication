var Lf=Object.defineProperty;var Rf=(S,p,l)=>p in S?Lf(S,p,{enumerable:!0,configurable:!0,writable:!0,value:l}):S[p]=l;var Hr=(S,p,l)=>Rf(S,typeof p!="symbol"?p+"":p,l);(function(){const p=document.createElement("link").relList;if(p&&p.supports&&p.supports("modulepreload"))return;for(const z of document.querySelectorAll('link[rel="modulepreload"]'))$(z);new MutationObserver(z=>{for(const rr of z)if(rr.type==="childList")for(const nr of rr.addedNodes)nr.tagName==="LINK"&&nr.rel==="modulepreload"&&$(nr)}).observe(document,{childList:!0,subtree:!0});function l(z){const rr={};return z.integrity&&(rr.integrity=z.integrity),z.referrerPolicy&&(rr.referrerPolicy=z.referrerPolicy),z.crossOrigin==="use-credentials"?rr.credentials="include":z.crossOrigin==="anonymous"?rr.credentials="omit":rr.credentials="same-origin",rr}function $(z){if(z.ep)return;z.ep=!0;const rr=l(z);fetch(z.href,rr)}})();const zf=`struct i64 {\r
    lo: u32,\r
    hi: u32\r
};\r
\r
// --- Constructors ---\r
\r
fn i64_from_i32(x: i32) -> i64 {\r
    // Sign-extend: if x is negative, high word is all 1s; if positive, all 0s.\r
    let lo = bitcast<u32>(x);\r
    let hi = bitcast<u32>(x >> 31);   // arithmetic right shift fills with sign bit\r
    return i64(lo, hi);\r
}\r
\r
fn i64_from_u32(x: u32) -> i64 {\r
    // Zero-extend: high word is always 0, value is never negative.\r
    return i64(x, 0u);\r
}\r
\r
// --- Addition ---\r
\r
fn i64_add(a: i64, b: i64) -> i64 {\r
    let lo    = a.lo + b.lo;\r
    let carry = u32(lo < a.lo);       // wrapping overflow detection\r
    let hi    = a.hi + b.hi + carry;\r
    return i64(lo, hi);\r
}\r
\r
// --- Subtraction ---\r
\r
fn i64_sub(a: i64, b: i64) -> i64 {\r
    let lo     = a.lo - b.lo;\r
    let borrow = u32(a.lo < b.lo);    // borrow if lo underflowed\r
    let hi     = a.hi - b.hi - borrow;\r
    return i64(lo, hi);\r
}\r
\r
// --- Left shift (0 < shift < 32) ---\r
\r
fn i64_left_shift(a: i64, shift: u32) -> i64 {\r
    // Bits shifted out of lo.high end move into hi.\r
    let lo = a.lo << shift;\r
    let hi = (a.hi << shift) | (a.lo >> (32u - shift));\r
    return i64(lo, hi);\r
}\r
\r
// --- Arithmetic right shift (0 < shift < 32) ---\r
\r
fn i64_right_shift(a: i64, shift: u32) -> i64 {\r
    // Bits shifted out of hi.low end move into lo.\r
    // hi is sign-extended via arithmetic shift on its i32 reinterpretation.\r
    let lo = (a.lo >> shift) | (a.hi << (32u - shift));\r
    let hi = bitcast<u32>(bitcast<i32>(a.hi) >> shift);  // arithmetic, preserves sign\r
    return i64(lo, hi);\r
}\r
\r
\r
fn mul32(x: u32, y: u32) -> i64 {\r
    let x0: u32 = x & 0xFFFF;\r
    let x1: u32 = x >> 16;\r
    let y0: u32 = y & 0xFFFF;\r
    let y1: u32 = y >> 16;\r
\r
    let p00: u32 = x0 * y0;\r
    let p01: u32 = x0 * y1;\r
    let p10: u32 = x1 * y0;\r
    let p11: u32 = x1 * y1;\r
\r
    let middle: u32 =\r
        (p00 >> 16) +\r
        (p01 & 0xFFFF) +\r
        (p10 & 0xFFFF);\r
\r
    return i64(\r
        (p00 & 0xFFFF) |\r
        (middle << 16),\r
\r
\r
        p11 +\r
        (p01 >> 16) +\r
        (p10 >> 16) +\r
        (middle >> 16)\r
    );\r
}\r
\r
fn i64_mul_to_i64(x: i64, y: i64) -> i64 {\r
    // low*low -> 64 bits\r
    let p0 = mul32(x.lo, y.lo);\r
\r
    // cross products\r
    let p1 = mul32(x.lo, y.hi);\r
    let p2 = mul32(x.hi, y.lo);\r
\r
    // low 32 bits come directly from p0\r
    let lo = p0.lo;\r
\r
    // upper 32 bits:\r
    // p0.hi + low32(p1) + low32(p2)\r
    let hi =\r
        p0.hi +\r
        p1.lo +\r
        p2.lo;\r
\r
    return i64(lo, hi);\r
}`,Df=`/*\r
  Implementation of Ed25519 scalar multiplication in WGSL using a fixed-base comb method\r
  Based on:\r
    [1] "Twisted Edwards Curves Revisited" by Huseyin Hisil, Kenneth Koon-Ho Wong, Gary Carter, and Ed Dawson available at https://link.springer.com/chapter/10.1007/978-3-540-89255-7_20\r
    [2] Algorithm 17 in "Software Implementation of Elliptic Curve Cryptography over Binary Fields" by Darrel Hankerson, Julio López Hernandez, and Alfred Menezes available at https://link.springer.com/chapter/10.1007/3-540-44499-8_1\r
    [3] "High-speed high-security signatures" by Daniel J. Bernstein, Niels Duif, Tanja Lange, Peter Schwabe, and Bo-Yin Yang available at https://link.springer.com/article/10.1007/s13389-012-0027-1\r
    [4] Daniel J. Bernstein's ref10 reference implementation available at https://github.com/floodyberry/supercop/tree/master/crypto_sign/ed25519/ref10\r
  Copyright (c) 2026 Ivan Kusliy <ipkusliywork@gmail.com>\r
  Licensed under the MIT License\r
*/\r
\r
// TODO mix extended affine with extended twisted edwards coordinates as described in [1] section 4.3\r
\r
const t: u32 = 256u;  // scalar length\r
\r
/*\r
  Window or "comb" width or "column" size. See [2]\r
  Max value = 9, limited by the size of uniform buffers (64 KiB), since the table size grows exponentially with w\r
*/\r
const w: u32 = 4u;\r
\r
/*\r
  Number of "columns" = ceil(t / w)\r
  Number of field element multiplications in the cycle is proportional to d\r
*/\r
const d: u32 = 64u;\r
\r
const PRECOMPUTED_COMB_TABLE_SIZE: u32 = 480u;  // 2^w * 120 bytes per point / 4 bytes per u32\r
\r
/*\r
  Field element (basically an integer n 0 <= n < 2^255 - 19).\r
  An element t, entries t[0]...t[9], represents the integer\r
  t[0] + 2^26 t[1] + 2^51 t[2] + 2^77 t[3] + 2^102 t[4] + ... + 2^230 t[9]\r
  So the limb sizes alternate between 26 and 25. 26 for even indices, 25 for odd indices.\r
  t[0] holds the least significant bits -> the order of the limbs is little-endian\r
*/\r
alias fe = array<i32, 10>;\r
\r
alias u256 = array<u32, 8>;\r
\r
// Extended twisted Edwards coordinates [1] section 3\r
struct extended_point {\r
  X: fe,\r
  Y: fe,\r
  T: fe,\r
  Z: fe\r
}\r
\r
// Precomputed in this format for faster operations\r
struct affine_niels_point {\r
  YminusX: fe,  // Y - X\r
  YplusX: fe,   // Y + X\r
  kT: fe        // 2 * d' * X * Y\r
}\r
\r
/*\r
  Precomputed point as described in [2], sorted by their indices in asending order\r
  Each point is represented in affine_niels_point format, therefore takes up 120 bytes or 30 array elements\r
*/\r
@group(0) @binding(0) var<uniform> comb_table: array<i32, PRECOMPUTED_COMB_TABLE_SIZE>;\r
\r
/*\r
  The scalar in little-endian bit-packed form\r
  That means scalar[0] >> 24 is the least significant byte\r
*/\r
@group(1) @binding(0) var<uniform> scalar: u256;\r
\r
/*\r
  The result is a point = scalar * B, where B is the base point with y = 4/5 and x is positive (LSB is 0)\r
  The resulting point is represented in affine coordinates with a pair of 256-bit integers X and Y\r
  X and Y are also bit-packed little-endian integers\r
*/\r
@group(1) @binding(1) var<storage, read_write> result: array<u256, 2>;\r
\r
@group(1) @binding(2) var<storage, read_write> DEBUG: array<u32, 2>;\r
\r
const IDENTITY: extended_point = extended_point(\r
  fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),\r
  fe(1, 0, 0, 0, 0, 0, 0, 0, 0, 0),\r
  fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),\r
  fe(1, 0, 0, 0, 0, 0, 0, 0, 0, 0)\r
);\r
`,If=`// Reverse scalar from little-endian to big-endian for a clearer data flow in get_precomputed_point()\r
fn reverse_scalar() -> u256 {\r
  let k: u256 = scalar;\r
  var k2: u256 = u256(0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u);\r
\r
  for(var i: i32 = 0; i < 8; i++){\r
    k2[7 - i] = (k[i] >> 24)\r
              | ((k[i] & 0x00FF0000) >> 8)\r
              | ((k[i] & 0x0000FF00) << 8)\r
              | (k[i] << 24);\r
  }\r
\r
  return k2;\r
}\r
\r
fn get_precomputed_point(k: u256, i: u32) -> affine_niels_point {\r
  var table_index: u32 = 0u;\r
  // index of the bit in k from 0 = MSB to 255 = LSB\r
  var bit_index: u32 = (d - 1u) - i;\r
\r
  for(var j: i32 = i32(w) - 1; j >= 0; j--){\r
    // index of the 32-bit chunk = bit_index / 32 = bit_index >> 5\r
    // index of the bit in the 32-bit chunk = bit_index % 32 = bit_index & 31\r
\r
    // bit * 2^j\r
    table_index += ((k[bit_index >> 5u] << (bit_index & 31u)) >> 31u) << bitcast<u32>(j);\r
\r
    // go 1 row down in the matrix\r
    bit_index += d;\r
  }\r
  // for w = 4 and i = 63 table index should be [0, 0 + d, 0 + 2d, 0 + 3d]\r
\r
  // cti = comb table index. times 30 because every point takes 3 coordinates * 10 32-bit limbs = 30 u32s\r
  let cti: u32 = table_index * 30u;\r
  return affine_niels_point(\r
    fe(\r
      comb_table[cti],       comb_table[cti + 1u],  comb_table[cti + 2u],  comb_table[cti + 3u],  comb_table[cti + 4u],\r
      comb_table[cti + 5u],  comb_table[cti + 6u],  comb_table[cti + 7u],  comb_table[cti + 8u],  comb_table[cti + 9u]\r
    ),\r
    fe(\r
      comb_table[cti + 10u], comb_table[cti + 11u], comb_table[cti + 12u], comb_table[cti + 13u], comb_table[cti + 14u],\r
      comb_table[cti + 15u], comb_table[cti + 16u], comb_table[cti + 17u], comb_table[cti + 18u], comb_table[cti + 19u]\r
    ),\r
    fe(\r
      comb_table[cti + 20u], comb_table[cti + 21u], comb_table[cti + 22u], comb_table[cti + 23u], comb_table[cti + 24u],\r
      comb_table[cti + 25u], comb_table[cti + 26u], comb_table[cti + 27u], comb_table[cti + 28u], comb_table[cti + 29u]\r
    )\r
  );\r
}`,Nf=`fn fe_add(a: fe, b: fe) -> fe {\r
  return fe(\r
    a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3], a[4] + b[4],\r
    a[5] + b[5], a[6] + b[6], a[7] + b[7], a[8] + b[8], a[9] + b[9]\r
  );\r
}\r
\r
/*\r
In C:\r
\r
void fe_add(fe h,const fe f,const fe g)\r
{\r
  crypto_int32 f0 = f[0];\r
  crypto_int32 f1 = f[1];\r
  crypto_int32 f2 = f[2];\r
  crypto_int32 f3 = f[3];\r
  crypto_int32 f4 = f[4];\r
  crypto_int32 f5 = f[5];\r
  crypto_int32 f6 = f[6];\r
  crypto_int32 f7 = f[7];\r
  crypto_int32 f8 = f[8];\r
  crypto_int32 f9 = f[9];\r
  crypto_int32 g0 = g[0];\r
  crypto_int32 g1 = g[1];\r
  crypto_int32 g2 = g[2];\r
  crypto_int32 g3 = g[3];\r
  crypto_int32 g4 = g[4];\r
  crypto_int32 g5 = g[5];\r
  crypto_int32 g6 = g[6];\r
  crypto_int32 g7 = g[7];\r
  crypto_int32 g8 = g[8];\r
  crypto_int32 g9 = g[9];\r
  crypto_int32 h0 = f0 + g0;\r
  crypto_int32 h1 = f1 + g1;\r
  crypto_int32 h2 = f2 + g2;\r
  crypto_int32 h3 = f3 + g3;\r
  crypto_int32 h4 = f4 + g4;\r
  crypto_int32 h5 = f5 + g5;\r
  crypto_int32 h6 = f6 + g6;\r
  crypto_int32 h7 = f7 + g7;\r
  crypto_int32 h8 = f8 + g8;\r
  crypto_int32 h9 = f9 + g9;\r
  h[0] = h0;\r
  h[1] = h1;\r
  h[2] = h2;\r
  h[3] = h3;\r
  h[4] = h4;\r
  h[5] = h5;\r
  h[6] = h6;\r
  h[7] = h7;\r
  h[8] = h8;\r
  h[9] = h9;\r
}\r
*/`,Xf=`fn fe_sub(a: fe, b: fe) -> fe {\r
  return fe(\r
    a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3], a[4] - b[4],\r
    a[5] - b[5], a[6] - b[6], a[7] - b[7], a[8] - b[8], a[9] - b[9]\r
  );\r
}\r
\r
/*\r
In C:\r
\r
void fe_sub(fe h,const fe f,const fe g)\r
{\r
  crypto_int32 f0 = f[0];\r
  crypto_int32 f1 = f[1];\r
  crypto_int32 f2 = f[2];\r
  crypto_int32 f3 = f[3];\r
  crypto_int32 f4 = f[4];\r
  crypto_int32 f5 = f[5];\r
  crypto_int32 f6 = f[6];\r
  crypto_int32 f7 = f[7];\r
  crypto_int32 f8 = f[8];\r
  crypto_int32 f9 = f[9];\r
  crypto_int32 g0 = g[0];\r
  crypto_int32 g1 = g[1];\r
  crypto_int32 g2 = g[2];\r
  crypto_int32 g3 = g[3];\r
  crypto_int32 g4 = g[4];\r
  crypto_int32 g5 = g[5];\r
  crypto_int32 g6 = g[6];\r
  crypto_int32 g7 = g[7];\r
  crypto_int32 g8 = g[8];\r
  crypto_int32 g9 = g[9];\r
  crypto_int32 h0 = f0 - g0;\r
  crypto_int32 h1 = f1 - g1;\r
  crypto_int32 h2 = f2 - g2;\r
  crypto_int32 h3 = f3 - g3;\r
  crypto_int32 h4 = f4 - g4;\r
  crypto_int32 h5 = f5 - g5;\r
  crypto_int32 h6 = f6 - g6;\r
  crypto_int32 h7 = f7 - g7;\r
  crypto_int32 h8 = f8 - g8;\r
  crypto_int32 h9 = f9 - g9;\r
  h[0] = h0;\r
  h[1] = h1;\r
  h[2] = h2;\r
  h[3] = h3;\r
  h[4] = h4;\r
  h[5] = h5;\r
  h[6] = h6;\r
  h[7] = h7;\r
  h[8] = h8;\r
  h[9] = h9;\r
}\r
*/`,Zf=`fn fe_mul(a: fe, b: fe) -> fe {\r
  let g1_19: i32 = 19 * b[1]; /* 1.959375*2^29 */\r
  let g2_19: i32 = 19 * b[2]; /* 1.959375*2^30; still ok */\r
  let g3_19: i32 = 19 * b[3];\r
  let g4_19: i32 = 19 * b[4];\r
  let g5_19: i32 = 19 * b[5];\r
  let g6_19: i32 = 19 * b[6];\r
  let g7_19: i32 = 19 * b[7];\r
  let g8_19: i32 = 19 * b[8];\r
  let g9_19: i32 = 19 * b[9];\r
  let f1_2: i32 = 2 * a[1];\r
  let f3_2: i32 = 2 * a[3];\r
  let f5_2: i32 = 2 * a[5];\r
  let f7_2: i32 = 2 * a[7];\r
  let f9_2: i32 = 2 * a[9];\r
\r
  let f0g0: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[0]));\r
  let f0g1: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[1]));\r
  let f0g2: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[2]));\r
  let f0g3: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[3]));\r
  let f0g4: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[4]));\r
  let f0g5: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[5]));\r
  let f0g6: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[6]));\r
  let f0g7: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[7]));\r
  let f0g8: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[8]));\r
  let f0g9: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[9]));\r
  let f1g0: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[0]));\r
  let f1g1_2: i64    = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(b[1]));\r
  let f1g2: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[2]));\r
  let f1g3_2: i64    = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(b[3]));\r
  let f1g4: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[4]));\r
  let f1g5_2: i64    = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(b[5]));\r
  let f1g6: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[6]));\r
  let f1g7_2: i64    = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(b[7]));\r
  let f1g8: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[8]));\r
  let f1g9_38: i64   = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(g9_19));\r
  let f2g0: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[0]));\r
  let f2g1: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[1]));\r
  let f2g2: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[2]));\r
  let f2g3: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[3]));\r
  let f2g4: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[4]));\r
  let f2g5: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[5]));\r
  let f2g6: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[6]));\r
  let f2g7: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[7]));\r
  let f2g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(g8_19));\r
  let f2g9_19: i64   = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(g9_19));\r
  let f3g0: i64      = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(b[0]));\r
  let f3g1_2: i64    = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(b[1]));\r
  let f3g2: i64      = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(b[2]));\r
  let f3g3_2: i64    = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(b[3]));\r
  let f3g4: i64      = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(b[4]));\r
  let f3g5_2: i64    = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(b[5]));\r
  let f3g6: i64      = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(b[6]));\r
  let f3g7_38: i64   = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(g7_19));\r
  let f3g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(g8_19));\r
  let f3g9_38: i64   = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(g9_19));\r
  let f4g0: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[0]));\r
  let f4g1: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[1]));\r
  let f4g2: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[2]));\r
  let f4g3: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[3]));\r
  let f4g4: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[4]));\r
  let f4g5: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[5]));\r
  let f4g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(g6_19));\r
  let f4g7_19: i64   = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(g7_19));\r
  let f4g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(g8_19));\r
  let f4g9_19: i64   = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(g9_19));\r
  let f5g0: i64      = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(b[0]));\r
  let f5g1_2: i64    = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(b[1]));\r
  let f5g2: i64      = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(b[2]));\r
  let f5g3_2: i64    = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(b[3]));\r
  let f5g4: i64      = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(b[4]));\r
  let f5g5_38: i64   = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(g5_19));\r
  let f5g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(g6_19));\r
  let f5g7_38: i64   = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(g7_19));\r
  let f5g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(g8_19));\r
  let f5g9_38: i64   = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(g9_19));\r
  let f6g0: i64      = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(b[0]));\r
  let f6g1: i64      = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(b[1]));\r
  let f6g2: i64      = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(b[2]));\r
  let f6g3: i64      = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(b[3]));\r
  let f6g4_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g4_19));\r
  let f6g5_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g5_19));\r
  let f6g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g6_19));\r
  let f6g7_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g7_19));\r
  let f6g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g8_19));\r
  let f6g9_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g9_19));\r
  let f7g0: i64      = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(b[0]));\r
  let f7g1_2: i64    = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(b[1]));\r
  let f7g2: i64      = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(b[2]));\r
  let f7g3_38: i64   = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(g3_19));\r
  let f7g4_19: i64   = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(g4_19));\r
  let f7g5_38: i64   = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(g5_19));\r
  let f7g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(g6_19));\r
  let f7g7_38: i64   = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(g7_19));\r
  let f7g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(g8_19));\r
  let f7g9_38: i64   = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(g9_19));\r
  let f8g0: i64      = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(b[0]));\r
  let f8g1: i64      = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(b[1]));\r
  let f8g2_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g2_19));\r
  let f8g3_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g3_19));\r
  let f8g4_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g4_19));\r
  let f8g5_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g5_19));\r
  let f8g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g6_19));\r
  let f8g7_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g7_19));\r
  let f8g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g8_19));\r
  let f8g9_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g9_19));\r
  let f9g0: i64      = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(b[0]));\r
  let f9g1_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g1_19));\r
  let f9g2_19: i64   = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(g2_19));\r
  let f9g3_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g3_19));\r
  let f9g4_19: i64   = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(g4_19));\r
  let f9g5_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g5_19));\r
  let f9g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(g6_19));\r
  let f9g7_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g7_19));\r
  let f9g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(g8_19));\r
  let f9g9_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g9_19));\r
\r
  \r
  var h0: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g0, f1g9_38), f2g8_19), f3g7_38), f4g6_19), f5g5_38), f6g4_19), f7g3_38), f8g2_19), f9g1_38);\r
  var h1: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g1, f1g0), f2g9_19), f3g8_19), f4g7_19), f5g6_19), f6g5_19), f7g4_19), f8g3_19), f9g2_19);\r
  var h2: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g2, f1g1_2), f2g0), f3g9_38), f4g8_19), f5g7_38), f6g6_19), f7g5_38), f8g4_19), f9g3_38);\r
  var h3: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g3, f1g2), f2g1), f3g0), f4g9_19), f5g8_19), f6g7_19), f7g6_19), f8g5_19), f9g4_19);\r
  var h4: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g4, f1g3_2), f2g2), f3g1_2), f4g0), f5g9_38), f6g8_19), f7g7_38), f8g6_19), f9g5_38);\r
  var h5: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g5, f1g4), f2g3), f3g2), f4g1), f5g0), f6g9_19), f7g8_19), f8g7_19), f9g6_19);\r
  var h6: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g6, f1g5_2), f2g4), f3g3_2), f4g2), f5g1_2), f6g0), f7g9_38), f8g8_19), f9g7_38);\r
  var h7: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g7, f1g6), f2g5), f3g4), f4g3), f5g2), f6g1), f7g0), f8g9_19), f9g8_19);\r
  var h8: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g8, f1g7_2), f2g6), f3g5_2), f4g4), f5g3_2), f6g2), f7g1_2), f8g0), f9g9_38);\r
  var h9: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(i64_add(f0g9, f1g8), f2g7), f3g6), f4g5), f5g4), f6g3), f7g2), f8g1), f9g0);\r
  var carry0: i64 = i64_from_u32(0u);\r
  var carry1: i64 = i64_from_u32(0u);\r
  var carry2: i64 = i64_from_u32(0u);\r
  var carry3: i64 = i64_from_u32(0u);\r
  var carry4: i64 = i64_from_u32(0u);\r
  var carry5: i64 = i64_from_u32(0u);\r
  var carry6: i64 = i64_from_u32(0u);\r
  var carry7: i64 = i64_from_u32(0u);\r
  var carry8: i64 = i64_from_u32(0u);\r
  var carry9: i64 = i64_from_u32(0u);\r
\r
  /*\r
  |h0| <= (1.65*1.65*2^52*(1+19+19+19+19)+1.65*1.65*2^50*(38+38+38+38+38))\r
    i.e. |h0| <= 1.4*2^60; narrower ranges for h2, h4, h6, h8\r
  |h1| <= (1.65*1.65*2^51*(1+1+19+19+19+19+19+19+19+19))\r
    i.e. |h1| <= 1.7*2^59; narrower ranges for h3, h5, h7, h9\r
  */\r
\r
  carry0 = i64_right_shift(i64_add(h0, i64_from_u32(1u << 25u)), 26u);\r
  h1 = i64_add(h1, carry0);\r
  h0 = i64_sub(h0, i64_left_shift(carry0, 26u));\r
  carry4 = i64_right_shift(i64_add(h4, i64_from_u32(1u << 25u)), 26u);\r
  h5 = i64_add(h5, carry4);\r
  h4 = i64_sub(h4, i64_left_shift(carry4, 26u));\r
\r
  /* |h0| <= 2^25 */\r
  /* |h4| <= 2^25 */\r
  /* |h1| <= 1.71*2^59 */\r
  /* |h5| <= 1.71*2^59 */\r
\r
  carry1 = i64_right_shift(i64_add(h1, i64_from_u32(1u << 24u)), 25u);\r
  h2 = i64_add(h2, carry1);\r
  h1 = i64_sub(h1, i64_left_shift(carry1, 25u));\r
  carry5 = i64_right_shift(i64_add(h5, i64_from_u32(1u << 24u)), 25u);\r
  h6 = i64_add(h6, carry5);\r
  h5 = i64_sub(h5, i64_left_shift(carry5, 25u));\r
\r
  /* |h1| <= 2^24; from now on fits into int32 */\r
  /* |h5| <= 2^24; from now on fits into int32 */\r
  /* |h2| <= 1.41*2^60 */\r
  /* |h6| <= 1.41*2^60 */\r
\r
  carry2 = i64_right_shift(i64_add(h2, i64_from_u32(1u << 25u)), 26u);\r
  h3 = i64_add(h3, carry2);\r
  h2 = i64_sub(h2, i64_left_shift(carry2, 26u));\r
  carry6 = i64_right_shift(i64_add(h6, i64_from_u32(1u << 25u)), 26u);\r
  h7 = i64_add(h7, carry6);\r
  h6 = i64_sub(h6, i64_left_shift(carry6, 26u));\r
  /* |h2| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h6| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h3| <= 1.71*2^59 */\r
  /* |h7| <= 1.71*2^59 */\r
\r
  carry3 = i64_right_shift(i64_add(h3, i64_from_u32(1u << 24u)), 25u);\r
  h4 = i64_add(h4, carry3);\r
  h3 = i64_sub(h3, i64_left_shift(carry3, 25u));\r
  carry7 = i64_right_shift(i64_add(h7, i64_from_u32(1u << 24u)), 25u);\r
  h8 = i64_add(h8, carry7);\r
  h7 = i64_sub(h7, i64_left_shift(carry7, 25u));\r
  /* |h3| <= 2^24; from now on fits into int32 unchanged */\r
  /* |h7| <= 2^24; from now on fits into int32 unchanged */\r
  /* |h4| <= 1.72*2^34 */\r
  /* |h8| <= 1.41*2^60 */\r
\r
  carry4 = i64_right_shift(i64_add(h4, i64_from_u32(1u << 25u)), 26u);\r
  h5 = i64_add(h5, carry4);\r
  h4 = i64_sub(h4, i64_left_shift(carry4, 26u));\r
  carry8 = i64_right_shift(i64_add(h8, i64_from_u32(1u << 25u)), 26u);\r
  h9 = i64_add(h9, carry8);\r
  h8 = i64_sub(h8, i64_left_shift(carry8, 26u));\r
  /* |h4| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h8| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h5| <= 1.01*2^24 */\r
  /* |h9| <= 1.71*2^59 */\r
\r
  carry9 = i64_right_shift(i64_add(h9, i64_from_u32(1u << 24u)), 25u);\r
  h0 = i64_add(h0, i64_mul_to_i64(i64_from_i32(19), carry9));\r
  h9 = i64_sub(h9, i64_left_shift(carry9, 25u));\r
  /* |h9| <= 2^24; from now on fits into int32 unchanged */\r
  /* |h0| <= 1.1*2^39 */\r
\r
  carry0 = i64_right_shift(i64_add(h0, i64_from_u32(1u << 25u)), 26u);\r
  h1 = i64_add(h1, carry0);\r
  h0 = i64_sub(h0, i64_left_shift(carry0, 26u));\r
  /* |h0| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h1| <= 1.01*2^24 */\r
\r
  return fe(\r
    bitcast<i32>(h0.lo), bitcast<i32>(h1.lo), bitcast<i32>(h2.lo), bitcast<i32>(h3.lo), bitcast<i32>(h4.lo),\r
    bitcast<i32>(h5.lo), bitcast<i32>(h6.lo), bitcast<i32>(h7.lo), bitcast<i32>(h8.lo), bitcast<i32>(h9.lo)\r
  );\r
}\r
\r
/*\r
In C:\r
\r
void fe_mul(fe h,const fe f,const fe g)\r
{\r
  crypto_int32 f0 = f[0];\r
  crypto_int32 f1 = f[1];\r
  crypto_int32 f2 = f[2];\r
  crypto_int32 f3 = f[3];\r
  crypto_int32 f4 = f[4];\r
  crypto_int32 f5 = f[5];\r
  crypto_int32 f6 = f[6];\r
  crypto_int32 f7 = f[7];\r
  crypto_int32 f8 = f[8];\r
  crypto_int32 f9 = f[9];\r
  crypto_int32 g0 = g[0];\r
  crypto_int32 g1 = g[1];\r
  crypto_int32 g2 = g[2];\r
  crypto_int32 g3 = g[3];\r
  crypto_int32 g4 = g[4];\r
  crypto_int32 g5 = g[5];\r
  crypto_int32 g6 = g[6];\r
  crypto_int32 g7 = g[7];\r
  crypto_int32 g8 = g[8];\r
  crypto_int32 g9 = g[9];\r
  crypto_int32 g1_19 = 19 * g1; /* 1.959375*2^29 */\r
  crypto_int32 g2_19 = 19 * g2; /* 1.959375*2^30; still ok */\r
  crypto_int32 g3_19 = 19 * g3;\r
  crypto_int32 g4_19 = 19 * g4;\r
  crypto_int32 g5_19 = 19 * g5;\r
  crypto_int32 g6_19 = 19 * g6;\r
  crypto_int32 g7_19 = 19 * g7;\r
  crypto_int32 g8_19 = 19 * g8;\r
  crypto_int32 g9_19 = 19 * g9;\r
  crypto_int32 f1_2 = 2 * f1;\r
  crypto_int32 f3_2 = 2 * f3;\r
  crypto_int32 f5_2 = 2 * f5;\r
  crypto_int32 f7_2 = 2 * f7;\r
  crypto_int32 f9_2 = 2 * f9;\r
  crypto_int64 f0g0    = f0   * (crypto_int64) g0;\r
  crypto_int64 f0g1    = f0   * (crypto_int64) g1;\r
  crypto_int64 f0g2    = f0   * (crypto_int64) g2;\r
  crypto_int64 f0g3    = f0   * (crypto_int64) g3;\r
  crypto_int64 f0g4    = f0   * (crypto_int64) g4;\r
  crypto_int64 f0g5    = f0   * (crypto_int64) g5;\r
  crypto_int64 f0g6    = f0   * (crypto_int64) g6;\r
  crypto_int64 f0g7    = f0   * (crypto_int64) g7;\r
  crypto_int64 f0g8    = f0   * (crypto_int64) g8;\r
  crypto_int64 f0g9    = f0   * (crypto_int64) g9;\r
  crypto_int64 f1g0    = f1   * (crypto_int64) g0;\r
  crypto_int64 f1g1_2  = f1_2 * (crypto_int64) g1;\r
  crypto_int64 f1g2    = f1   * (crypto_int64) g2;\r
  crypto_int64 f1g3_2  = f1_2 * (crypto_int64) g3;\r
  crypto_int64 f1g4    = f1   * (crypto_int64) g4;\r
  crypto_int64 f1g5_2  = f1_2 * (crypto_int64) g5;\r
  crypto_int64 f1g6    = f1   * (crypto_int64) g6;\r
  crypto_int64 f1g7_2  = f1_2 * (crypto_int64) g7;\r
  crypto_int64 f1g8    = f1   * (crypto_int64) g8;\r
  crypto_int64 f1g9_38 = f1_2 * (crypto_int64) g9_19;\r
  crypto_int64 f2g0    = f2   * (crypto_int64) g0;\r
  crypto_int64 f2g1    = f2   * (crypto_int64) g1;\r
  crypto_int64 f2g2    = f2   * (crypto_int64) g2;\r
  crypto_int64 f2g3    = f2   * (crypto_int64) g3;\r
  crypto_int64 f2g4    = f2   * (crypto_int64) g4;\r
  crypto_int64 f2g5    = f2   * (crypto_int64) g5;\r
  crypto_int64 f2g6    = f2   * (crypto_int64) g6;\r
  crypto_int64 f2g7    = f2   * (crypto_int64) g7;\r
  crypto_int64 f2g8_19 = f2   * (crypto_int64) g8_19;\r
  crypto_int64 f2g9_19 = f2   * (crypto_int64) g9_19;\r
  crypto_int64 f3g0    = f3   * (crypto_int64) g0;\r
  crypto_int64 f3g1_2  = f3_2 * (crypto_int64) g1;\r
  crypto_int64 f3g2    = f3   * (crypto_int64) g2;\r
  crypto_int64 f3g3_2  = f3_2 * (crypto_int64) g3;\r
  crypto_int64 f3g4    = f3   * (crypto_int64) g4;\r
  crypto_int64 f3g5_2  = f3_2 * (crypto_int64) g5;\r
  crypto_int64 f3g6    = f3   * (crypto_int64) g6;\r
  crypto_int64 f3g7_38 = f3_2 * (crypto_int64) g7_19;\r
  crypto_int64 f3g8_19 = f3   * (crypto_int64) g8_19;\r
  crypto_int64 f3g9_38 = f3_2 * (crypto_int64) g9_19;\r
  crypto_int64 f4g0    = f4   * (crypto_int64) g0;\r
  crypto_int64 f4g1    = f4   * (crypto_int64) g1;\r
  crypto_int64 f4g2    = f4   * (crypto_int64) g2;\r
  crypto_int64 f4g3    = f4   * (crypto_int64) g3;\r
  crypto_int64 f4g4    = f4   * (crypto_int64) g4;\r
  crypto_int64 f4g5    = f4   * (crypto_int64) g5;\r
  crypto_int64 f4g6_19 = f4   * (crypto_int64) g6_19;\r
  crypto_int64 f4g7_19 = f4   * (crypto_int64) g7_19;\r
  crypto_int64 f4g8_19 = f4   * (crypto_int64) g8_19;\r
  crypto_int64 f4g9_19 = f4   * (crypto_int64) g9_19;\r
  crypto_int64 f5g0    = f5   * (crypto_int64) g0;\r
  crypto_int64 f5g1_2  = f5_2 * (crypto_int64) g1;\r
  crypto_int64 f5g2    = f5   * (crypto_int64) g2;\r
  crypto_int64 f5g3_2  = f5_2 * (crypto_int64) g3;\r
  crypto_int64 f5g4    = f5   * (crypto_int64) g4;\r
  crypto_int64 f5g5_38 = f5_2 * (crypto_int64) g5_19;\r
  crypto_int64 f5g6_19 = f5   * (crypto_int64) g6_19;\r
  crypto_int64 f5g7_38 = f5_2 * (crypto_int64) g7_19;\r
  crypto_int64 f5g8_19 = f5   * (crypto_int64) g8_19;\r
  crypto_int64 f5g9_38 = f5_2 * (crypto_int64) g9_19;\r
  crypto_int64 f6g0    = f6   * (crypto_int64) g0;\r
  crypto_int64 f6g1    = f6   * (crypto_int64) g1;\r
  crypto_int64 f6g2    = f6   * (crypto_int64) g2;\r
  crypto_int64 f6g3    = f6   * (crypto_int64) g3;\r
  crypto_int64 f6g4_19 = f6   * (crypto_int64) g4_19;\r
  crypto_int64 f6g5_19 = f6   * (crypto_int64) g5_19;\r
  crypto_int64 f6g6_19 = f6   * (crypto_int64) g6_19;\r
  crypto_int64 f6g7_19 = f6   * (crypto_int64) g7_19;\r
  crypto_int64 f6g8_19 = f6   * (crypto_int64) g8_19;\r
  crypto_int64 f6g9_19 = f6   * (crypto_int64) g9_19;\r
  crypto_int64 f7g0    = f7   * (crypto_int64) g0;\r
  crypto_int64 f7g1_2  = f7_2 * (crypto_int64) g1;\r
  crypto_int64 f7g2    = f7   * (crypto_int64) g2;\r
  crypto_int64 f7g3_38 = f7_2 * (crypto_int64) g3_19;\r
  crypto_int64 f7g4_19 = f7   * (crypto_int64) g4_19;\r
  crypto_int64 f7g5_38 = f7_2 * (crypto_int64) g5_19;\r
  crypto_int64 f7g6_19 = f7   * (crypto_int64) g6_19;\r
  crypto_int64 f7g7_38 = f7_2 * (crypto_int64) g7_19;\r
  crypto_int64 f7g8_19 = f7   * (crypto_int64) g8_19;\r
  crypto_int64 f7g9_38 = f7_2 * (crypto_int64) g9_19;\r
  crypto_int64 f8g0    = f8   * (crypto_int64) g0;\r
  crypto_int64 f8g1    = f8   * (crypto_int64) g1;\r
  crypto_int64 f8g2_19 = f8   * (crypto_int64) g2_19;\r
  crypto_int64 f8g3_19 = f8   * (crypto_int64) g3_19;\r
  crypto_int64 f8g4_19 = f8   * (crypto_int64) g4_19;\r
  crypto_int64 f8g5_19 = f8   * (crypto_int64) g5_19;\r
  crypto_int64 f8g6_19 = f8   * (crypto_int64) g6_19;\r
  crypto_int64 f8g7_19 = f8   * (crypto_int64) g7_19;\r
  crypto_int64 f8g8_19 = f8   * (crypto_int64) g8_19;\r
  crypto_int64 f8g9_19 = f8   * (crypto_int64) g9_19;\r
  crypto_int64 f9g0    = f9   * (crypto_int64) g0;\r
  crypto_int64 f9g1_38 = f9_2 * (crypto_int64) g1_19;\r
  crypto_int64 f9g2_19 = f9   * (crypto_int64) g2_19;\r
  crypto_int64 f9g3_38 = f9_2 * (crypto_int64) g3_19;\r
  crypto_int64 f9g4_19 = f9   * (crypto_int64) g4_19;\r
  crypto_int64 f9g5_38 = f9_2 * (crypto_int64) g5_19;\r
  crypto_int64 f9g6_19 = f9   * (crypto_int64) g6_19;\r
  crypto_int64 f9g7_38 = f9_2 * (crypto_int64) g7_19;\r
  crypto_int64 f9g8_19 = f9   * (crypto_int64) g8_19;\r
  crypto_int64 f9g9_38 = f9_2 * (crypto_int64) g9_19;\r
  crypto_int64 h0 = f0g0+f1g9_38+f2g8_19+f3g7_38+f4g6_19+f5g5_38+f6g4_19+f7g3_38+f8g2_19+f9g1_38;\r
  crypto_int64 h1 = f0g1+f1g0   +f2g9_19+f3g8_19+f4g7_19+f5g6_19+f6g5_19+f7g4_19+f8g3_19+f9g2_19;\r
  crypto_int64 h2 = f0g2+f1g1_2 +f2g0   +f3g9_38+f4g8_19+f5g7_38+f6g6_19+f7g5_38+f8g4_19+f9g3_38;\r
  crypto_int64 h3 = f0g3+f1g2   +f2g1   +f3g0   +f4g9_19+f5g8_19+f6g7_19+f7g6_19+f8g5_19+f9g4_19;\r
  crypto_int64 h4 = f0g4+f1g3_2 +f2g2   +f3g1_2 +f4g0   +f5g9_38+f6g8_19+f7g7_38+f8g6_19+f9g5_38;\r
  crypto_int64 h5 = f0g5+f1g4   +f2g3   +f3g2   +f4g1   +f5g0   +f6g9_19+f7g8_19+f8g7_19+f9g6_19;\r
  crypto_int64 h6 = f0g6+f1g5_2 +f2g4   +f3g3_2 +f4g2   +f5g1_2 +f6g0   +f7g9_38+f8g8_19+f9g7_38;\r
  crypto_int64 h7 = f0g7+f1g6   +f2g5   +f3g4   +f4g3   +f5g2   +f6g1   +f7g0   +f8g9_19+f9g8_19;\r
  crypto_int64 h8 = f0g8+f1g7_2 +f2g6   +f3g5_2 +f4g4   +f5g3_2 +f6g2   +f7g1_2 +f8g0   +f9g9_38;\r
  crypto_int64 h9 = f0g9+f1g8   +f2g7   +f3g6   +f4g5   +f5g4   +f6g3   +f7g2   +f8g1   +f9g0   ;\r
  crypto_int64 carry0;\r
  crypto_int64 carry1;\r
  crypto_int64 carry2;\r
  crypto_int64 carry3;\r
  crypto_int64 carry4;\r
  crypto_int64 carry5;\r
  crypto_int64 carry6;\r
  crypto_int64 carry7;\r
  crypto_int64 carry8;\r
  crypto_int64 carry9;\r
\r
  /*\r
  |h0| <= (1.65*1.65*2^52*(1+19+19+19+19)+1.65*1.65*2^50*(38+38+38+38+38))\r
    i.e. |h0| <= 1.4*2^60; narrower ranges for h2, h4, h6, h8\r
  |h1| <= (1.65*1.65*2^51*(1+1+19+19+19+19+19+19+19+19))\r
    i.e. |h1| <= 1.7*2^59; narrower ranges for h3, h5, h7, h9\r
  */\r
\r
  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;\r
  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;\r
  /* |h0| <= 2^25 */\r
  /* |h4| <= 2^25 */\r
  /* |h1| <= 1.71*2^59 */\r
  /* |h5| <= 1.71*2^59 */\r
\r
  carry1 = (h1 + (crypto_int64) (1<<24)) >> 25; h2 += carry1; h1 -= carry1 << 25;\r
  carry5 = (h5 + (crypto_int64) (1<<24)) >> 25; h6 += carry5; h5 -= carry5 << 25;\r
  /* |h1| <= 2^24; from now on fits into int32 */\r
  /* |h5| <= 2^24; from now on fits into int32 */\r
  /* |h2| <= 1.41*2^60 */\r
  /* |h6| <= 1.41*2^60 */\r
\r
  carry2 = (h2 + (crypto_int64) (1<<25)) >> 26; h3 += carry2; h2 -= carry2 << 26;\r
  carry6 = (h6 + (crypto_int64) (1<<25)) >> 26; h7 += carry6; h6 -= carry6 << 26;\r
  /* |h2| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h6| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h3| <= 1.71*2^59 */\r
  /* |h7| <= 1.71*2^59 */\r
\r
  carry3 = (h3 + (crypto_int64) (1<<24)) >> 25; h4 += carry3; h3 -= carry3 << 25;\r
  carry7 = (h7 + (crypto_int64) (1<<24)) >> 25; h8 += carry7; h7 -= carry7 << 25;\r
  /* |h3| <= 2^24; from now on fits into int32 unchanged */\r
  /* |h7| <= 2^24; from now on fits into int32 unchanged */\r
  /* |h4| <= 1.72*2^34 */\r
  /* |h8| <= 1.41*2^60 */\r
\r
  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;\r
  carry8 = (h8 + (crypto_int64) (1<<25)) >> 26; h9 += carry8; h8 -= carry8 << 26;\r
  /* |h4| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h8| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h5| <= 1.01*2^24 */\r
  /* |h9| <= 1.71*2^59 */\r
\r
  carry9 = (h9 + (crypto_int64) (1<<24)) >> 25; h0 += carry9 * 19; h9 -= carry9 << 25;\r
  /* |h9| <= 2^24; from now on fits into int32 unchanged */\r
  /* |h0| <= 1.1*2^39 */\r
\r
  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;\r
  /* |h0| <= 2^25; from now on fits into int32 unchanged */\r
  /* |h1| <= 1.01*2^24 */\r
\r
  h[0] = h0;\r
  h[1] = h1;\r
  h[2] = h2;\r
  h[3] = h3;\r
  h[4] = h4;\r
  h[5] = h5;\r
  h[6] = h6;\r
  h[7] = h7;\r
  h[8] = h8;\r
  h[9] = h9;\r
}\r
*/`,Hf=`fn fe_sq(a: fe) -> fe {\r
  let f0_2: i32 = 2 * a[0];\r
  let f1_2: i32 = 2 * a[1];\r
  let f2_2: i32 = 2 * a[2];\r
  let f3_2: i32 = 2 * a[3];\r
  let f4_2: i32 = 2 * a[4];\r
  let f5_2: i32 = 2 * a[5];\r
  let f6_2: i32 = 2 * a[6];\r
  let f7_2: i32 = 2 * a[7];\r
  let f5_38: i32 = 38 * a[5]; /* 1.959375*2^30 */\r
  let f6_19: i32 = 19 * a[6]; /* 1.959375*2^30 */\r
  let f7_38: i32 = 38 * a[7]; /* 1.959375*2^30 */\r
  let f8_19: i32 = 19 * a[8]; /* 1.959375*2^30 */\r
  let f9_38: i32 = 38 * a[9]; /* 1.959375*2^30 */\r
  \r
  let f0f0: i64    = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(a[0]));\r
  let f0f1_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[1]));\r
  let f0f2_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[2]));\r
  let f0f3_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[3]));\r
  let f0f4_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[4]));\r
  let f0f5_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[5]));\r
  let f0f6_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[6]));\r
  let f0f7_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[7]));\r
  let f0f8_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[8]));\r
  let f0f9_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[9]));\r
  let f1f1_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[1]));\r
  let f1f2_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[2]));\r
  let f1f3_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f3_2));\r
  let f1f4_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[4]));\r
  let f1f5_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f5_2));\r
  let f1f6_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[6]));\r
  let f1f7_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f7_2));\r
  let f1f8_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[8]));\r
  let f1f9_76: i64 = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f9_38));\r
  let f2f2: i64    = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(a[2]));\r
  let f2f3_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[3]));\r
  let f2f4_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[4]));\r
  let f2f5_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[5]));\r
  let f2f6_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[6]));\r
  let f2f7_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[7]));\r
  let f2f8_38: i64 = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(f8_19));\r
  let f2f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(f9_38));\r
  let f3f3_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[3]));\r
  let f3f4_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[4]));\r
  let f3f5_4: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f5_2));\r
  let f3f6_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[6]));\r
  let f3f7_76: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f7_38));\r
  let f3f8_38: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f8_19));\r
  let f3f9_76: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f9_38));\r
  let f4f4: i64    = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(a[4]));\r
  let f4f5_2: i64  = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(a[5]));\r
  let f4f6_38: i64 = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(f6_19));\r
  let f4f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(f7_38));\r
  let f4f8_38: i64 = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(f8_19));\r
  let f4f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(f9_38));\r
  let f5f5_38: i64 = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(f5_38));\r
  let f5f6_38: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f6_19));\r
  let f5f7_76: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f7_38));\r
  let f5f8_38: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f8_19));\r
  let f5f9_76: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f9_38));\r
  let f6f6_19: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f6_19));\r
  let f6f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f7_38));\r
  let f6f8_38: i64 = i64_mul_to_i64(i64_from_i32(f6_2), i64_from_i32(f8_19));\r
  let f6f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f9_38));\r
  let f7f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(f7_38));\r
  let f7f8_38: i64 = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(f8_19));\r
  let f7f9_76: i64 = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(f9_38));\r
  let f8f8_19: i64 = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(f8_19));\r
  let f8f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(f9_38));\r
  let f9f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(f9_38));\r
  \r
  var h0: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f0, f1f9_76), f2f8_38), f3f7_76), f4f6_38), f5f5_38);\r
  var h1: i64 = i64_add(i64_add(i64_add(i64_add(f0f1_2, f2f9_38), f3f8_38), f4f7_38), f5f6_38);\r
  var h2: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f2_2, f1f1_2), f3f9_76), f4f8_38), f5f7_76), f6f6_19);\r
  var h3: i64 = i64_add(i64_add(i64_add(i64_add(f0f3_2, f1f2_2), f4f9_38), f5f8_38), f6f7_38);\r
  var h4: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f4_2, f1f3_4), f2f2), f5f9_76), f6f8_38), f7f7_38);\r
  var h5: i64 = i64_add(i64_add(i64_add(i64_add(f0f5_2, f1f4_2), f2f3_2), f6f9_38), f7f8_38);\r
  var h6: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f6_2, f1f5_4), f2f4_2), f3f3_2), f7f9_76), f8f8_19);\r
  var h7: i64 = i64_add(i64_add(i64_add(i64_add(f0f7_2, f1f6_2), f2f5_2), f3f4_2), f8f9_38);\r
  var h8: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f8_2, f1f7_4), f2f6_2), f3f5_4), f4f4), f9f9_38);\r
  var h9: i64 = i64_add(i64_add(i64_add(i64_add(f0f9_2, f1f8_2), f2f7_2), f3f6_2), f4f5_2);\r
  var carry0: i64 = i64_from_u32(0u);\r
  var carry1: i64 = i64_from_u32(0u);\r
  var carry2: i64 = i64_from_u32(0u);\r
  var carry3: i64 = i64_from_u32(0u);\r
  var carry4: i64 = i64_from_u32(0u);\r
  var carry5: i64 = i64_from_u32(0u);\r
  var carry6: i64 = i64_from_u32(0u);\r
  var carry7: i64 = i64_from_u32(0u);\r
  var carry8: i64 = i64_from_u32(0u);\r
  var carry9: i64 = i64_from_u32(0u);\r
\r
  carry0 = i64_right_shift(i64_add(h0, i64_from_u32(1u << 25u)), 26u);\r
  h1 = i64_add(h1, carry0);\r
  h0 = i64_sub(h0, i64_left_shift(carry0, 26u));\r
  carry4 = i64_right_shift(i64_add(h4, i64_from_u32(1u << 25u)), 26u);\r
  h5 = i64_add(h5, carry4);\r
  h4 = i64_sub(h4, i64_left_shift(carry4, 26u));\r
\r
  carry1 = i64_right_shift(i64_add(h1, i64_from_u32(1u << 24u)), 25u);\r
  h2 = i64_add(h2, carry1);\r
  h1 = i64_sub(h1, i64_left_shift(carry1, 25u));\r
  carry5 = i64_right_shift(i64_add(h5, i64_from_u32(1u << 24u)), 25u);\r
  h6 = i64_add(h6, carry5);\r
  h5 = i64_sub(h5, i64_left_shift(carry5, 25u));\r
\r
  carry2 = i64_right_shift(i64_add(h2, i64_from_u32(1u << 25u)), 26u);\r
  h3 = i64_add(h3, carry2);\r
  h2 = i64_sub(h2, i64_left_shift(carry2, 26u));\r
  carry6 = i64_right_shift(i64_add(h6, i64_from_u32(1u << 25u)), 26u);\r
  h7 = i64_add(h7, carry6);\r
  h6 = i64_sub(h6, i64_left_shift(carry6, 26u));\r
\r
  carry3 = i64_right_shift(i64_add(h3, i64_from_u32(1u << 24u)), 25u);\r
  h4 = i64_add(h4, carry3);\r
  h3 = i64_sub(h3, i64_left_shift(carry3, 25u));\r
  carry7 = i64_right_shift(i64_add(h7, i64_from_u32(1u << 24u)), 25u);\r
  h8 = i64_add(h8, carry7);\r
  h7 = i64_sub(h7, i64_left_shift(carry7, 25u));\r
\r
  carry4 = i64_right_shift(i64_add(h4, i64_from_u32(1u << 25u)), 26u);\r
  h5 = i64_add(h5, carry4);\r
  h4 = i64_sub(h4, i64_left_shift(carry4, 26u));\r
  carry8 = i64_right_shift(i64_add(h8, i64_from_u32(1u << 25u)), 26u);\r
  h9 = i64_add(h9, carry8);\r
  h8 = i64_sub(h8, i64_left_shift(carry8, 26u));\r
\r
  carry9 = i64_right_shift(i64_add(h9, i64_from_u32(1u << 24u)), 25u);\r
  h0 = i64_add(h0, i64_mul_to_i64(i64_from_i32(19), carry9));\r
  h9 = i64_sub(h9, i64_left_shift(carry9, 25u));\r
\r
  carry0 = i64_right_shift(i64_add(h0, i64_from_u32(1u << 25u)), 26u);\r
  h1 = i64_add(h1, carry0);\r
  h0 = i64_sub(h0, i64_left_shift(carry0, 26u));\r
\r
  return fe(\r
    bitcast<i32>(h0.lo), bitcast<i32>(h1.lo), bitcast<i32>(h2.lo), bitcast<i32>(h3.lo), bitcast<i32>(h4.lo),\r
    bitcast<i32>(h5.lo), bitcast<i32>(h6.lo), bitcast<i32>(h7.lo), bitcast<i32>(h8.lo), bitcast<i32>(h9.lo)\r
  );\r
}\r
\r
/*\r
In C:\r
\r
void fe_sq(fe h,const fe f)\r
{\r
  crypto_int32 f0 = f[0];\r
  crypto_int32 f1 = f[1];\r
  crypto_int32 f2 = f[2];\r
  crypto_int32 f3 = f[3];\r
  crypto_int32 f4 = f[4];\r
  crypto_int32 f5 = f[5];\r
  crypto_int32 f6 = f[6];\r
  crypto_int32 f7 = f[7];\r
  crypto_int32 f8 = f[8];\r
  crypto_int32 f9 = f[9];\r
  crypto_int32 f0_2 = 2 * f0;\r
  crypto_int32 f1_2 = 2 * f1;\r
  crypto_int32 f2_2 = 2 * f2;\r
  crypto_int32 f3_2 = 2 * f3;\r
  crypto_int32 f4_2 = 2 * f4;\r
  crypto_int32 f5_2 = 2 * f5;\r
  crypto_int32 f6_2 = 2 * f6;\r
  crypto_int32 f7_2 = 2 * f7;\r
  crypto_int32 f5_38 = 38 * f5; /* 1.959375*2^30 */\r
  crypto_int32 f6_19 = 19 * f6; /* 1.959375*2^30 */\r
  crypto_int32 f7_38 = 38 * f7; /* 1.959375*2^30 */\r
  crypto_int32 f8_19 = 19 * f8; /* 1.959375*2^30 */\r
  crypto_int32 f9_38 = 38 * f9; /* 1.959375*2^30 */\r
  crypto_int64 f0f0    = f0   * (crypto_int64) f0;\r
  crypto_int64 f0f1_2  = f0_2 * (crypto_int64) f1;\r
  crypto_int64 f0f2_2  = f0_2 * (crypto_int64) f2;\r
  crypto_int64 f0f3_2  = f0_2 * (crypto_int64) f3;\r
  crypto_int64 f0f4_2  = f0_2 * (crypto_int64) f4;\r
  crypto_int64 f0f5_2  = f0_2 * (crypto_int64) f5;\r
  crypto_int64 f0f6_2  = f0_2 * (crypto_int64) f6;\r
  crypto_int64 f0f7_2  = f0_2 * (crypto_int64) f7;\r
  crypto_int64 f0f8_2  = f0_2 * (crypto_int64) f8;\r
  crypto_int64 f0f9_2  = f0_2 * (crypto_int64) f9;\r
  crypto_int64 f1f1_2  = f1_2 * (crypto_int64) f1;\r
  crypto_int64 f1f2_2  = f1_2 * (crypto_int64) f2;\r
  crypto_int64 f1f3_4  = f1_2 * (crypto_int64) f3_2;\r
  crypto_int64 f1f4_2  = f1_2 * (crypto_int64) f4;\r
  crypto_int64 f1f5_4  = f1_2 * (crypto_int64) f5_2;\r
  crypto_int64 f1f6_2  = f1_2 * (crypto_int64) f6;\r
  crypto_int64 f1f7_4  = f1_2 * (crypto_int64) f7_2;\r
  crypto_int64 f1f8_2  = f1_2 * (crypto_int64) f8;\r
  crypto_int64 f1f9_76 = f1_2 * (crypto_int64) f9_38;\r
  crypto_int64 f2f2    = f2   * (crypto_int64) f2;\r
  crypto_int64 f2f3_2  = f2_2 * (crypto_int64) f3;\r
  crypto_int64 f2f4_2  = f2_2 * (crypto_int64) f4;\r
  crypto_int64 f2f5_2  = f2_2 * (crypto_int64) f5;\r
  crypto_int64 f2f6_2  = f2_2 * (crypto_int64) f6;\r
  crypto_int64 f2f7_2  = f2_2 * (crypto_int64) f7;\r
  crypto_int64 f2f8_38 = f2_2 * (crypto_int64) f8_19;\r
  crypto_int64 f2f9_38 = f2   * (crypto_int64) f9_38;\r
  crypto_int64 f3f3_2  = f3_2 * (crypto_int64) f3;\r
  crypto_int64 f3f4_2  = f3_2 * (crypto_int64) f4;\r
  crypto_int64 f3f5_4  = f3_2 * (crypto_int64) f5_2;\r
  crypto_int64 f3f6_2  = f3_2 * (crypto_int64) f6;\r
  crypto_int64 f3f7_76 = f3_2 * (crypto_int64) f7_38;\r
  crypto_int64 f3f8_38 = f3_2 * (crypto_int64) f8_19;\r
  crypto_int64 f3f9_76 = f3_2 * (crypto_int64) f9_38;\r
  crypto_int64 f4f4    = f4   * (crypto_int64) f4;\r
  crypto_int64 f4f5_2  = f4_2 * (crypto_int64) f5;\r
  crypto_int64 f4f6_38 = f4_2 * (crypto_int64) f6_19;\r
  crypto_int64 f4f7_38 = f4   * (crypto_int64) f7_38;\r
  crypto_int64 f4f8_38 = f4_2 * (crypto_int64) f8_19;\r
  crypto_int64 f4f9_38 = f4   * (crypto_int64) f9_38;\r
  crypto_int64 f5f5_38 = f5   * (crypto_int64) f5_38;\r
  crypto_int64 f5f6_38 = f5_2 * (crypto_int64) f6_19;\r
  crypto_int64 f5f7_76 = f5_2 * (crypto_int64) f7_38;\r
  crypto_int64 f5f8_38 = f5_2 * (crypto_int64) f8_19;\r
  crypto_int64 f5f9_76 = f5_2 * (crypto_int64) f9_38;\r
  crypto_int64 f6f6_19 = f6   * (crypto_int64) f6_19;\r
  crypto_int64 f6f7_38 = f6   * (crypto_int64) f7_38;\r
  crypto_int64 f6f8_38 = f6_2 * (crypto_int64) f8_19;\r
  crypto_int64 f6f9_38 = f6   * (crypto_int64) f9_38;\r
  crypto_int64 f7f7_38 = f7   * (crypto_int64) f7_38;\r
  crypto_int64 f7f8_38 = f7_2 * (crypto_int64) f8_19;\r
  crypto_int64 f7f9_76 = f7_2 * (crypto_int64) f9_38;\r
  crypto_int64 f8f8_19 = f8   * (crypto_int64) f8_19;\r
  crypto_int64 f8f9_38 = f8   * (crypto_int64) f9_38;\r
  crypto_int64 f9f9_38 = f9   * (crypto_int64) f9_38;\r
\r
  crypto_int64 h0 = f0f0  +f1f9_76+f2f8_38+f3f7_76+f4f6_38+f5f5_38;\r
  crypto_int64 h1 = f0f1_2+f2f9_38+f3f8_38+f4f7_38+f5f6_38;\r
  crypto_int64 h2 = f0f2_2+f1f1_2 +f3f9_76+f4f8_38+f5f7_76+f6f6_19;\r
  crypto_int64 h3 = f0f3_2+f1f2_2 +f4f9_38+f5f8_38+f6f7_38;\r
  crypto_int64 h4 = f0f4_2+f1f3_4 +f2f2   +f5f9_76+f6f8_38+f7f7_38;\r
  crypto_int64 h5 = f0f5_2+f1f4_2 +f2f3_2 +f6f9_38+f7f8_38;\r
  crypto_int64 h6 = f0f6_2+f1f5_4 +f2f4_2 +f3f3_2 +f7f9_76+f8f8_19;\r
  crypto_int64 h7 = f0f7_2+f1f6_2 +f2f5_2 +f3f4_2 +f8f9_38;\r
  crypto_int64 h8 = f0f8_2+f1f7_4 +f2f6_2 +f3f5_4 +f4f4   +f9f9_38;\r
  crypto_int64 h9 = f0f9_2+f1f8_2 +f2f7_2 +f3f6_2 +f4f5_2;\r
  crypto_int64 carry0;\r
  crypto_int64 carry1;\r
  crypto_int64 carry2;\r
  crypto_int64 carry3;\r
  crypto_int64 carry4;\r
  crypto_int64 carry5;\r
  crypto_int64 carry6;\r
  crypto_int64 carry7;\r
  crypto_int64 carry8;\r
  crypto_int64 carry9;\r
\r
  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;\r
  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;\r
\r
  carry1 = (h1 + (crypto_int64) (1<<24)) >> 25; h2 += carry1; h1 -= carry1 << 25;\r
  carry5 = (h5 + (crypto_int64) (1<<24)) >> 25; h6 += carry5; h5 -= carry5 << 25;\r
\r
  carry2 = (h2 + (crypto_int64) (1<<25)) >> 26; h3 += carry2; h2 -= carry2 << 26;\r
  carry6 = (h6 + (crypto_int64) (1<<25)) >> 26; h7 += carry6; h6 -= carry6 << 26;\r
\r
  carry3 = (h3 + (crypto_int64) (1<<24)) >> 25; h4 += carry3; h3 -= carry3 << 25;\r
  carry7 = (h7 + (crypto_int64) (1<<24)) >> 25; h8 += carry7; h7 -= carry7 << 25;\r
\r
  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;\r
  carry8 = (h8 + (crypto_int64) (1<<25)) >> 26; h9 += carry8; h8 -= carry8 << 26;\r
\r
  carry9 = (h9 + (crypto_int64) (1<<24)) >> 25; h0 += carry9 * 19; h9 -= carry9 << 25;\r
\r
  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;\r
\r
  h[0] = h0;\r
  h[1] = h1;\r
  h[2] = h2;\r
  h[3] = h3;\r
  h[4] = h4;\r
  h[5] = h5;\r
  h[6] = h6;\r
  h[7] = h7;\r
  h[8] = h8;\r
  h[9] = h9;\r
}\r
*/`,Wf=`fn fe_sq2(a: fe) -> fe {\r
  let f0_2: i32 = 2 * a[0];\r
  let f1_2: i32 = 2 * a[1];\r
  let f2_2: i32 = 2 * a[2];\r
  let f3_2: i32 = 2 * a[3];\r
  let f4_2: i32 = 2 * a[4];\r
  let f5_2: i32 = 2 * a[5];\r
  let f6_2: i32 = 2 * a[6];\r
  let f7_2: i32 = 2 * a[7];\r
  let f5_38: i32 = 38 * a[5]; /* 1.959375*2^30 */\r
  let f6_19: i32 = 19 * a[6]; /* 1.959375*2^30 */\r
  let f7_38: i32 = 38 * a[7]; /* 1.959375*2^30 */\r
  let f8_19: i32 = 19 * a[8]; /* 1.959375*2^30 */\r
  let f9_38: i32 = 38 * a[9]; /* 1.959375*2^30 */\r
  \r
  let f0f0: i64    = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(a[0]));\r
  let f0f1_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[1]));\r
  let f0f2_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[2]));\r
  let f0f3_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[3]));\r
  let f0f4_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[4]));\r
  let f0f5_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[5]));\r
  let f0f6_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[6]));\r
  let f0f7_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[7]));\r
  let f0f8_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[8]));\r
  let f0f9_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[9]));\r
  let f1f1_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[1]));\r
  let f1f2_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[2]));\r
  let f1f3_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f3_2));\r
  let f1f4_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[4]));\r
  let f1f5_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f5_2));\r
  let f1f6_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[6]));\r
  let f1f7_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f7_2));\r
  let f1f8_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[8]));\r
  let f1f9_76: i64 = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f9_38));\r
  let f2f2: i64    = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(a[2]));\r
  let f2f3_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[3]));\r
  let f2f4_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[4]));\r
  let f2f5_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[5]));\r
  let f2f6_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[6]));\r
  let f2f7_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[7]));\r
  let f2f8_38: i64 = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(f8_19));\r
  let f2f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(f9_38));\r
  let f3f3_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[3]));\r
  let f3f4_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[4]));\r
  let f3f5_4: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f5_2));\r
  let f3f6_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[6]));\r
  let f3f7_76: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f7_38));\r
  let f3f8_38: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f8_19));\r
  let f3f9_76: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f9_38));\r
  let f4f4: i64    = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(a[4]));\r
  let f4f5_2: i64  = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(a[5]));\r
  let f4f6_38: i64 = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(f6_19));\r
  let f4f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(f7_38));\r
  let f4f8_38: i64 = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(f8_19));\r
  let f4f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(f9_38));\r
  let f5f5_38: i64 = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(f5_38));\r
  let f5f6_38: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f6_19));\r
  let f5f7_76: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f7_38));\r
  let f5f8_38: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f8_19));\r
  let f5f9_76: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f9_38));\r
  let f6f6_19: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f6_19));\r
  let f6f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f7_38));\r
  let f6f8_38: i64 = i64_mul_to_i64(i64_from_i32(f6_2), i64_from_i32(f8_19));\r
  let f6f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f9_38));\r
  let f7f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(f7_38));\r
  let f7f8_38: i64 = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(f8_19));\r
  let f7f9_76: i64 = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(f9_38));\r
  let f8f8_19: i64 = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(f8_19));\r
  let f8f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(f9_38));\r
  let f9f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(f9_38));\r
  \r
  var h0: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f0, f1f9_76), f2f8_38), f3f7_76), f4f6_38), f5f5_38);\r
  var h1: i64 = i64_add(i64_add(i64_add(i64_add(f0f1_2, f2f9_38), f3f8_38), f4f7_38), f5f6_38);\r
  var h2: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f2_2, f1f1_2), f3f9_76), f4f8_38), f5f7_76), f6f6_19);\r
  var h3: i64 = i64_add(i64_add(i64_add(i64_add(f0f3_2, f1f2_2), f4f9_38), f5f8_38), f6f7_38);\r
  var h4: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f4_2, f1f3_4), f2f2), f5f9_76), f6f8_38), f7f7_38);\r
  var h5: i64 = i64_add(i64_add(i64_add(i64_add(f0f5_2, f1f4_2), f2f3_2), f6f9_38), f7f8_38);\r
  var h6: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f6_2, f1f5_4), f2f4_2), f3f3_2), f7f9_76), f8f8_19);\r
  var h7: i64 = i64_add(i64_add(i64_add(i64_add(f0f7_2, f1f6_2), f2f5_2), f3f4_2), f8f9_38);\r
  var h8: i64 = i64_add(i64_add(i64_add(i64_add(i64_add(f0f8_2, f1f7_4), f2f6_2), f3f5_4), f4f4), f9f9_38);\r
  var h9: i64 = i64_add(i64_add(i64_add(i64_add(f0f9_2, f1f8_2), f2f7_2), f3f6_2), f4f5_2);\r
  var carry0: i64 = i64_from_u32(0u);\r
  var carry1: i64 = i64_from_u32(0u);\r
  var carry2: i64 = i64_from_u32(0u);\r
  var carry3: i64 = i64_from_u32(0u);\r
  var carry4: i64 = i64_from_u32(0u);\r
  var carry5: i64 = i64_from_u32(0u);\r
  var carry6: i64 = i64_from_u32(0u);\r
  var carry7: i64 = i64_from_u32(0u);\r
  var carry8: i64 = i64_from_u32(0u);\r
  var carry9: i64 = i64_from_u32(0u);\r
\r
  h0 = i64_add(h0, h0);\r
  h1 = i64_add(h1, h1);\r
  h2 = i64_add(h2, h2);\r
  h3 = i64_add(h3, h3);\r
  h4 = i64_add(h4, h4);\r
  h5 = i64_add(h5, h5);\r
  h6 = i64_add(h6, h6);\r
  h7 = i64_add(h7, h7);\r
  h8 = i64_add(h8, h8);\r
  h9 = i64_add(h9, h9);\r
\r
  carry0 = i64_right_shift(i64_add(h0, i64_from_u32(1u << 25u)), 26u);\r
  h1 = i64_add(h1, carry0);\r
  h0 = i64_sub(h0, i64_left_shift(carry0, 26u));\r
  carry4 = i64_right_shift(i64_add(h4, i64_from_u32(1u << 25u)), 26u);\r
  h5 = i64_add(h5, carry4);\r
  h4 = i64_sub(h4, i64_left_shift(carry4, 26u));\r
\r
  carry1 = i64_right_shift(i64_add(h1, i64_from_u32(1u << 24u)), 25u);\r
  h2 = i64_add(h2, carry1);\r
  h1 = i64_sub(h1, i64_left_shift(carry1, 25u));\r
  carry5 = i64_right_shift(i64_add(h5, i64_from_u32(1u << 24u)), 25u);\r
  h6 = i64_add(h6, carry5);\r
  h5 = i64_sub(h5, i64_left_shift(carry5, 25u));\r
\r
  carry2 = i64_right_shift(i64_add(h2, i64_from_u32(1u << 25u)), 26u);\r
  h3 = i64_add(h3, carry2);\r
  h2 = i64_sub(h2, i64_left_shift(carry2, 26u));\r
  carry6 = i64_right_shift(i64_add(h6, i64_from_u32(1u << 25u)), 26u);\r
  h7 = i64_add(h7, carry6);\r
  h6 = i64_sub(h6, i64_left_shift(carry6, 26u));\r
\r
  carry3 = i64_right_shift(i64_add(h3, i64_from_u32(1u << 24u)), 25u);\r
  h4 = i64_add(h4, carry3);\r
  h3 = i64_sub(h3, i64_left_shift(carry3, 25u));\r
  carry7 = i64_right_shift(i64_add(h7, i64_from_u32(1u << 24u)), 25u);\r
  h8 = i64_add(h8, carry7);\r
  h7 = i64_sub(h7, i64_left_shift(carry7, 25u));\r
\r
  carry4 = i64_right_shift(i64_add(h4, i64_from_u32(1u << 25u)), 26u);\r
  h5 = i64_add(h5, carry4);\r
  h4 = i64_sub(h4, i64_left_shift(carry4, 26u));\r
  carry8 = i64_right_shift(i64_add(h8, i64_from_u32(1u << 25u)), 26u);\r
  h9 = i64_add(h9, carry8);\r
  h8 = i64_sub(h8, i64_left_shift(carry8, 26u));\r
\r
  carry9 = i64_right_shift(i64_add(h9, i64_from_u32(1u << 24u)), 25u);\r
  h0 = i64_add(h0, i64_mul_to_i64(i64_from_i32(19), carry9));\r
  h9 = i64_sub(h9, i64_left_shift(carry9, 25u));\r
\r
  carry0 = i64_right_shift(i64_add(h0, i64_from_u32(1u << 25u)), 26u);\r
  h1 = i64_add(h1, carry0);\r
  h0 = i64_sub(h0, i64_left_shift(carry0, 26u));\r
\r
  return fe(\r
    bitcast<i32>(h0.lo), bitcast<i32>(h1.lo), bitcast<i32>(h2.lo), bitcast<i32>(h3.lo), bitcast<i32>(h4.lo),\r
    bitcast<i32>(h5.lo), bitcast<i32>(h6.lo), bitcast<i32>(h7.lo), bitcast<i32>(h8.lo), bitcast<i32>(h9.lo)\r
  );\r
}\r
\r
/*\r
In C:\r
\r
void fe_sq2(fe h,const fe f)\r
{\r
  crypto_int32 f0 = f[0];\r
  crypto_int32 f1 = f[1];\r
  crypto_int32 f2 = f[2];\r
  crypto_int32 f3 = f[3];\r
  crypto_int32 f4 = f[4];\r
  crypto_int32 f5 = f[5];\r
  crypto_int32 f6 = f[6];\r
  crypto_int32 f7 = f[7];\r
  crypto_int32 f8 = f[8];\r
  crypto_int32 f9 = f[9];\r
  crypto_int32 f0_2 = 2 * f0;\r
  crypto_int32 f1_2 = 2 * f1;\r
  crypto_int32 f2_2 = 2 * f2;\r
  crypto_int32 f3_2 = 2 * f3;\r
  crypto_int32 f4_2 = 2 * f4;\r
  crypto_int32 f5_2 = 2 * f5;\r
  crypto_int32 f6_2 = 2 * f6;\r
  crypto_int32 f7_2 = 2 * f7;\r
  crypto_int32 f5_38 = 38 * f5; /* 1.959375*2^30 */\r
  crypto_int32 f6_19 = 19 * f6; /* 1.959375*2^30 */\r
  crypto_int32 f7_38 = 38 * f7; /* 1.959375*2^30 */\r
  crypto_int32 f8_19 = 19 * f8; /* 1.959375*2^30 */\r
  crypto_int32 f9_38 = 38 * f9; /* 1.959375*2^30 */\r
  crypto_int64 f0f0    = f0   * (crypto_int64) f0;\r
  crypto_int64 f0f1_2  = f0_2 * (crypto_int64) f1;\r
  crypto_int64 f0f2_2  = f0_2 * (crypto_int64) f2;\r
  crypto_int64 f0f3_2  = f0_2 * (crypto_int64) f3;\r
  crypto_int64 f0f4_2  = f0_2 * (crypto_int64) f4;\r
  crypto_int64 f0f5_2  = f0_2 * (crypto_int64) f5;\r
  crypto_int64 f0f6_2  = f0_2 * (crypto_int64) f6;\r
  crypto_int64 f0f7_2  = f0_2 * (crypto_int64) f7;\r
  crypto_int64 f0f8_2  = f0_2 * (crypto_int64) f8;\r
  crypto_int64 f0f9_2  = f0_2 * (crypto_int64) f9;\r
  crypto_int64 f1f1_2  = f1_2 * (crypto_int64) f1;\r
  crypto_int64 f1f2_2  = f1_2 * (crypto_int64) f2;\r
  crypto_int64 f1f3_4  = f1_2 * (crypto_int64) f3_2;\r
  crypto_int64 f1f4_2  = f1_2 * (crypto_int64) f4;\r
  crypto_int64 f1f5_4  = f1_2 * (crypto_int64) f5_2;\r
  crypto_int64 f1f6_2  = f1_2 * (crypto_int64) f6;\r
  crypto_int64 f1f7_4  = f1_2 * (crypto_int64) f7_2;\r
  crypto_int64 f1f8_2  = f1_2 * (crypto_int64) f8;\r
  crypto_int64 f1f9_76 = f1_2 * (crypto_int64) f9_38;\r
  crypto_int64 f2f2    = f2   * (crypto_int64) f2;\r
  crypto_int64 f2f3_2  = f2_2 * (crypto_int64) f3;\r
  crypto_int64 f2f4_2  = f2_2 * (crypto_int64) f4;\r
  crypto_int64 f2f5_2  = f2_2 * (crypto_int64) f5;\r
  crypto_int64 f2f6_2  = f2_2 * (crypto_int64) f6;\r
  crypto_int64 f2f7_2  = f2_2 * (crypto_int64) f7;\r
  crypto_int64 f2f8_38 = f2_2 * (crypto_int64) f8_19;\r
  crypto_int64 f2f9_38 = f2   * (crypto_int64) f9_38;\r
  crypto_int64 f3f3_2  = f3_2 * (crypto_int64) f3;\r
  crypto_int64 f3f4_2  = f3_2 * (crypto_int64) f4;\r
  crypto_int64 f3f5_4  = f3_2 * (crypto_int64) f5_2;\r
  crypto_int64 f3f6_2  = f3_2 * (crypto_int64) f6;\r
  crypto_int64 f3f7_76 = f3_2 * (crypto_int64) f7_38;\r
  crypto_int64 f3f8_38 = f3_2 * (crypto_int64) f8_19;\r
  crypto_int64 f3f9_76 = f3_2 * (crypto_int64) f9_38;\r
  crypto_int64 f4f4    = f4   * (crypto_int64) f4;\r
  crypto_int64 f4f5_2  = f4_2 * (crypto_int64) f5;\r
  crypto_int64 f4f6_38 = f4_2 * (crypto_int64) f6_19;\r
  crypto_int64 f4f7_38 = f4   * (crypto_int64) f7_38;\r
  crypto_int64 f4f8_38 = f4_2 * (crypto_int64) f8_19;\r
  crypto_int64 f4f9_38 = f4   * (crypto_int64) f9_38;\r
  crypto_int64 f5f5_38 = f5   * (crypto_int64) f5_38;\r
  crypto_int64 f5f6_38 = f5_2 * (crypto_int64) f6_19;\r
  crypto_int64 f5f7_76 = f5_2 * (crypto_int64) f7_38;\r
  crypto_int64 f5f8_38 = f5_2 * (crypto_int64) f8_19;\r
  crypto_int64 f5f9_76 = f5_2 * (crypto_int64) f9_38;\r
  crypto_int64 f6f6_19 = f6   * (crypto_int64) f6_19;\r
  crypto_int64 f6f7_38 = f6   * (crypto_int64) f7_38;\r
  crypto_int64 f6f8_38 = f6_2 * (crypto_int64) f8_19;\r
  crypto_int64 f6f9_38 = f6   * (crypto_int64) f9_38;\r
  crypto_int64 f7f7_38 = f7   * (crypto_int64) f7_38;\r
  crypto_int64 f7f8_38 = f7_2 * (crypto_int64) f8_19;\r
  crypto_int64 f7f9_76 = f7_2 * (crypto_int64) f9_38;\r
  crypto_int64 f8f8_19 = f8   * (crypto_int64) f8_19;\r
  crypto_int64 f8f9_38 = f8   * (crypto_int64) f9_38;\r
  crypto_int64 f9f9_38 = f9   * (crypto_int64) f9_38;\r
  crypto_int64 h0 = f0f0  +f1f9_76+f2f8_38+f3f7_76+f4f6_38+f5f5_38;\r
  crypto_int64 h1 = f0f1_2+f2f9_38+f3f8_38+f4f7_38+f5f6_38;\r
  crypto_int64 h2 = f0f2_2+f1f1_2 +f3f9_76+f4f8_38+f5f7_76+f6f6_19;\r
  crypto_int64 h3 = f0f3_2+f1f2_2 +f4f9_38+f5f8_38+f6f7_38;\r
  crypto_int64 h4 = f0f4_2+f1f3_4 +f2f2   +f5f9_76+f6f8_38+f7f7_38;\r
  crypto_int64 h5 = f0f5_2+f1f4_2 +f2f3_2 +f6f9_38+f7f8_38;\r
  crypto_int64 h6 = f0f6_2+f1f5_4 +f2f4_2 +f3f3_2 +f7f9_76+f8f8_19;\r
  crypto_int64 h7 = f0f7_2+f1f6_2 +f2f5_2 +f3f4_2 +f8f9_38;\r
  crypto_int64 h8 = f0f8_2+f1f7_4 +f2f6_2 +f3f5_4 +f4f4   +f9f9_38;\r
  crypto_int64 h9 = f0f9_2+f1f8_2 +f2f7_2 +f3f6_2 +f4f5_2;\r
  crypto_int64 carry0;\r
  crypto_int64 carry1;\r
  crypto_int64 carry2;\r
  crypto_int64 carry3;\r
  crypto_int64 carry4;\r
  crypto_int64 carry5;\r
  crypto_int64 carry6;\r
  crypto_int64 carry7;\r
  crypto_int64 carry8;\r
  crypto_int64 carry9;\r
\r
  h0 += h0;\r
  h1 += h1;\r
  h2 += h2;\r
  h3 += h3;\r
  h4 += h4;\r
  h5 += h5;\r
  h6 += h6;\r
  h7 += h7;\r
  h8 += h8;\r
  h9 += h9;\r
\r
  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;\r
  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;\r
\r
  carry1 = (h1 + (crypto_int64) (1<<24)) >> 25; h2 += carry1; h1 -= carry1 << 25;\r
  carry5 = (h5 + (crypto_int64) (1<<24)) >> 25; h6 += carry5; h5 -= carry5 << 25;\r
\r
  carry2 = (h2 + (crypto_int64) (1<<25)) >> 26; h3 += carry2; h2 -= carry2 << 26;\r
  carry6 = (h6 + (crypto_int64) (1<<25)) >> 26; h7 += carry6; h6 -= carry6 << 26;\r
\r
  carry3 = (h3 + (crypto_int64) (1<<24)) >> 25; h4 += carry3; h3 -= carry3 << 25;\r
  carry7 = (h7 + (crypto_int64) (1<<24)) >> 25; h8 += carry7; h7 -= carry7 << 25;\r
\r
  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;\r
  carry8 = (h8 + (crypto_int64) (1<<25)) >> 26; h9 += carry8; h8 -= carry8 << 26;\r
\r
  carry9 = (h9 + (crypto_int64) (1<<24)) >> 25; h0 += carry9 * 19; h9 -= carry9 << 25;\r
\r
  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;\r
\r
  h[0] = h0;\r
  h[1] = h1;\r
  h[2] = h2;\r
  h[3] = h3;\r
  h[4] = h4;\r
  h[5] = h5;\r
  h[6] = h6;\r
  h[7] = h7;\r
  h[8] = h8;\r
  h[9] = h9;\r
}\r
*/`,$f=`fn fe_neg(a: fe) -> fe {\r
  return fe(\r
    -a[0], -a[1], -a[2], -a[3], -a[4],\r
    -a[5], -a[6], -a[7], -a[8], -a[9]\r
  );\r
}\r
\r
/*\r
In C:\r
\r
void fe_neg(fe h,const fe f)\r
{\r
  crypto_int32 f0 = f[0];\r
  crypto_int32 f1 = f[1];\r
  crypto_int32 f2 = f[2];\r
  crypto_int32 f3 = f[3];\r
  crypto_int32 f4 = f[4];\r
  crypto_int32 f5 = f[5];\r
  crypto_int32 f6 = f[6];\r
  crypto_int32 f7 = f[7];\r
  crypto_int32 f8 = f[8];\r
  crypto_int32 f9 = f[9];\r
  crypto_int32 h0 = -f0;\r
  crypto_int32 h1 = -f1;\r
  crypto_int32 h2 = -f2;\r
  crypto_int32 h3 = -f3;\r
  crypto_int32 h4 = -f4;\r
  crypto_int32 h5 = -f5;\r
  crypto_int32 h6 = -f6;\r
  crypto_int32 h7 = -f7;\r
  crypto_int32 h8 = -f8;\r
  crypto_int32 h9 = -f9;\r
  h[0] = h0;\r
  h[1] = h1;\r
  h[2] = h2;\r
  h[3] = h3;\r
  h[4] = h4;\r
  h[5] = h5;\r
  h[6] = h6;\r
  h[7] = h7;\r
  h[8] = h8;\r
  h[9] = h9;\r
}\r
*/`,Qf=`fn fe_dbl(a: fe) -> fe {\r
  return fe_add(a, a);\r
}\r
`,Jf=`fn fe_invert(a: fe) -> fe {\r
  var t0: fe = fe_sq(a);\r
\r
  var t1: fe = fe_sq(t0);\r
  t1 = fe_sq(t1);\r
  t1 = fe_mul(a, t1);\r
\r
  t0 = fe_mul(t0, t1);\r
\r
  var t2: fe = fe_sq(t0);\r
\r
  t1 = fe_mul(t1, t2);\r
\r
  t2 = fe_sq(t1);\r
  for (var i: u32 = 1u; i < 5u; i++) {\r
    t2 = fe_sq(t2);\r
  }\r
  t1 = fe_mul(t2, t1);\r
\r
  t2 = fe_sq(t1);\r
  for (var i: u32 = 1u; i < 10u; i++) {\r
    t2 = fe_sq(t2);\r
  }\r
  t2 = fe_mul(t2, t1);\r
\r
  var t3: fe = fe_sq(t2);\r
  for (var i: u32 = 1u; i < 20u; i++) {\r
    t3 = fe_sq(t3);\r
  }\r
  t2 = fe_mul(t3, t2);\r
\r
  t2 = fe_sq(t2);\r
  for (var i: u32 = 1u; i < 10u; i++) {\r
    t2 = fe_sq(t2);\r
  }\r
  t1 = fe_mul(t2, t1);\r
\r
  t2 = fe_sq(t1);\r
  for (var i: u32 = 1u; i < 50u; i++) {\r
    t2 = fe_sq(t2);\r
  }\r
  t2 = fe_mul(t2, t1);\r
\r
  t3 = fe_sq(t2);\r
  for (var i: u32 = 1u; i < 100u; i++) {\r
    t3 = fe_sq(t3);\r
  }\r
  t2 = fe_mul(t3, t2);\r
\r
  t2 = fe_sq(t2);\r
  for (var i: u32 = 1u; i < 50u; i++) {\r
    t2 = fe_sq(t2);\r
  }\r
  t1 = fe_mul(t2, t1);\r
\r
  t1 = fe_sq(t1);\r
  for (var i: u32 = 1u; i < 5u; i++) {\r
    t1 = fe_sq(t1);\r
  }\r
\r
  return fe_mul(t1, t0);\r
}\r
\r
/*\r
In C:\r
\r
void fe_invert(fe out,const fe z)\r
{\r
  fe t0;\r
  fe t1;\r
  fe t2;\r
  fe t3;\r
  int i;\r
\r
  fe_sq(t0,z); for (i = 1;i < 1;++i) fe_sq(t0,t0);\r
\r
  fe_sq(t1,t0); for (i = 1;i < 2;++i) fe_sq(t1,t1);\r
\r
  fe_mul(t1,z,t1);\r
\r
  fe_mul(t0,t0,t1);\r
\r
  fe_sq(t2,t0); for (i = 1;i < 1;++i) fe_sq(t2,t2);\r
\r
  fe_mul(t1,t1,t2);\r
\r
  fe_sq(t2,t1); for (i = 1;i < 5;++i) fe_sq(t2,t2);\r
\r
  fe_mul(t1,t2,t1);\r
\r
  fe_sq(t2,t1); for (i = 1;i < 10;++i) fe_sq(t2,t2);\r
\r
  fe_mul(t2,t2,t1);\r
\r
  fe_sq(t3,t2); for (i = 1;i < 20;++i) fe_sq(t3,t3);\r
\r
  fe_mul(t2,t3,t2);\r
\r
  fe_sq(t2,t2); for (i = 1;i < 10;++i) fe_sq(t2,t2);\r
\r
  fe_mul(t1,t2,t1);\r
\r
  fe_sq(t2,t1); for (i = 1;i < 50;++i) fe_sq(t2,t2);\r
\r
  fe_mul(t2,t2,t1);\r
\r
  fe_sq(t3,t2); for (i = 1;i < 100;++i) fe_sq(t3,t3);\r
\r
  fe_mul(t2,t3,t2);\r
\r
  fe_sq(t2,t2); for (i = 1;i < 50;++i) fe_sq(t2,t2);\r
\r
  fe_mul(t1,t2,t1);\r
\r
  fe_sq(t1,t1); for (i = 1;i < 5;++i) fe_sq(t1,t1);\r
\r
  fe_mul(out,t1,t0);\r
\r
  return;\r
}\r
*/`,Vf=`const BYTE_MASK: i32 = 0x000000FF;\r
\r
fn fe_tobytes(h: fe) -> u256 {\r
  var h0: i32 = h[0];\r
  var h1: i32 = h[1];\r
  var h2: i32 = h[2];\r
  var h3: i32 = h[3];\r
  var h4: i32 = h[4];\r
  var h5: i32 = h[5];\r
  var h6: i32 = h[6];\r
  var h7: i32 = h[7];\r
  var h8: i32 = h[8];\r
  var h9: i32 = h[9];\r
\r
  var q: i32 = (19 * h9 + (i32(1) << 24)) >> 25;\r
  q = (h0 + q) >> 26;\r
  q = (h1 + q) >> 25;\r
  q = (h2 + q) >> 26;\r
  q = (h3 + q) >> 25;\r
  q = (h4 + q) >> 26;\r
  q = (h5 + q) >> 25;\r
  q = (h6 + q) >> 26;\r
  q = (h7 + q) >> 25;\r
  q = (h8 + q) >> 26;\r
  q = (h9 + q) >> 25;\r
\r
  /* Goal: Output h-(2^255-19)q, which is between 0 and 2^255-20. */\r
  h0 += 19 * q;\r
  /* Goal: Output h-2^255 q, which is between 0 and 2^255-20. */\r
\r
  let carry0: i32 = h0 >> 26; h1 += carry0; h0 -= carry0 << 26;\r
  let carry1: i32 = h1 >> 25; h2 += carry1; h1 -= carry1 << 25;\r
  let carry2: i32 = h2 >> 26; h3 += carry2; h2 -= carry2 << 26;\r
  let carry3: i32 = h3 >> 25; h4 += carry3; h3 -= carry3 << 25;\r
  let carry4: i32 = h4 >> 26; h5 += carry4; h4 -= carry4 << 26;\r
  let carry5: i32 = h5 >> 25; h6 += carry5; h5 -= carry5 << 25;\r
  let carry6: i32 = h6 >> 26; h7 += carry6; h6 -= carry6 << 26;\r
  let carry7: i32 = h7 >> 25; h8 += carry7; h7 -= carry7 << 25;\r
  let carry8: i32 = h8 >> 26; h9 += carry8; h8 -= carry8 << 26;\r
  let carry9: i32 = h9 >> 25;               h9 -= carry9 << 25;\r
                           /* h10 = carry9 */\r
\r
  /*\r
  Goal: Output h0+...+2^255 h10-2^255 q, which is between 0 and 2^255-20.\r
  Have h0+...+2^230 h9 between 0 and 2^255-1;\r
  evidently 2^255 h10-2^255 q = 0.\r
  Goal: Output h0+...+2^230 h9.\r
  */\r
\r
  // little-endian\r
  var s: u256 = u256(0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u);\r
\r
  // s[0] = bytes 0,1,2,3\r
  s[0] = bitcast<u32>(\r
      (((h0 >>  0) & BYTE_MASK) << 24)\r
    | (((h0 >>  8) & BYTE_MASK) << 16)\r
    | (((h0 >> 16) & BYTE_MASK)  <<  8)\r
    | ( ((h0 >> 24) | (h1 << 2)) & BYTE_MASK )\r
  );\r
\r
  // s[1] = bytes 4,5,6,7\r
  s[1] = bitcast<u32>(\r
      (((h1 >>  6) & BYTE_MASK) << 24)\r
    | (((h1 >> 14) & BYTE_MASK) << 16)\r
    | (( ((h1 >> 22) | (h2 << 3)) & BYTE_MASK ) << 8)\r
    | ((h2 >>  5) & BYTE_MASK)\r
  );\r
\r
  // s[2] = bytes 8,9,10,11\r
  s[2] = bitcast<u32>(\r
      (((h2 >> 13) & BYTE_MASK) << 24)\r
    | (( ((h2 >> 21) | (h3 << 5)) & BYTE_MASK ) << 16)\r
    | (((h3 >>  3) & BYTE_MASK) <<  8)\r
    | ((h3 >> 11) & BYTE_MASK)\r
  );\r
\r
  // s[3] = bytes 12,13,14,15\r
  s[3] = bitcast<u32>(\r
      ((((h3 >> 19) | (h4 << 6)) & BYTE_MASK) << 24)\r
    | (((h4 >>  2) & BYTE_MASK) << 16)\r
    | (((h4 >> 10) & BYTE_MASK) <<  8)\r
    | ((h4 >> 18) & BYTE_MASK)\r
  );\r
\r
  // s[5] = bytes 20,21,22,23\r
  s[4] = bitcast<u32>(\r
      (((h5 >>  0) & BYTE_MASK) << 24)\r
    | (((h5 >>  8) & BYTE_MASK) << 16)\r
    | (((h5 >> 16) & BYTE_MASK) <<  8)\r
    | ( ((h5 >> 24) | (h6 << 1)) & BYTE_MASK )\r
  );\r
\r
  // s[5] = bytes 11,10,9,8  (bits 95..64)\r
  s[5] = bitcast<u32>(\r
      (((h6 >>  7) & BYTE_MASK) << 24)\r
    | (((h6 >> 15) & BYTE_MASK) << 16)\r
    | (( ((h6 >> 23) | (h7 << 3)) & BYTE_MASK ) <<  8)\r
    | ((h7 >>  5) & BYTE_MASK)\r
  );\r
\r
  // s[6] = bytes 24,25,26,27\r
  s[6] = bitcast<u32>(\r
      (((h7 >> 13) & BYTE_MASK) << 24)\r
    | (( ((h7 >> 21) | (h8 << 4)) & BYTE_MASK ) << 16)\r
    | (((h8 >>  4) & BYTE_MASK) <<  8)\r
    | ((h8 >> 12) & BYTE_MASK)\r
  );\r
\r
  // s[7] = bytes 28,29,30,31\r
  s[7] = bitcast<u32>(\r
      ((((h8 >> 20) | (h9 << 6)) & BYTE_MASK) << 24)\r
    | (((h9 >> 2) & BYTE_MASK) << 16)\r
    | (((h9 >> 10) & BYTE_MASK) <<  8)\r
    | ((h9 >> 18) & BYTE_MASK)\r
  );\r
\r
  return s;\r
}\r
\r
/*\r
In C:\r
\r
/*\r
Preconditions:\r
  |h| bounded by 1.1*2^26,1.1*2^25,1.1*2^26,1.1*2^25,etc.\r
\r
Write p=2^255-19; q=floor(h/p).\r
Basic claim: q = floor(2^(-255)(h + 19 2^(-25)h9 + 2^(-1))).\r
\r
Proof:\r
  Have |h|<=p so |q|<=1 so |19^2 2^(-255) q|<1/4.\r
  Also have |h-2^230 h9|<2^231 so |19 2^(-255)(h-2^230 h9)|<1/4.\r
\r
  Write y=2^(-1)-19^2 2^(-255)q-19 2^(-255)(h-2^230 h9).\r
  Then 0<y<1.\r
\r
  Write r=h-pq.\r
  Have 0<=r<=p-1=2^255-20.\r
  Thus 0<=r+19(2^-255)r<r+19(2^-255)2^255<=2^255-1.\r
\r
  Write x=r+19(2^-255)r+y.\r
  Then 0<x<2^255 so floor(2^(-255)x) = 0 so floor(q+2^(-255)x) = q.\r
\r
  Have q+2^(-255)x = 2^(-255)(h + 19 2^(-25) h9 + 2^(-1))\r
  so floor(2^(-255)(h + 19 2^(-25) h9 + 2^(-1))) = q.\r
*/\r
\r
void fe_tobytes(unsigned char *s,const fe h)\r
{\r
  crypto_int32 h0 = h[0];\r
  crypto_int32 h1 = h[1];\r
  crypto_int32 h2 = h[2];\r
  crypto_int32 h3 = h[3];\r
  crypto_int32 h4 = h[4];\r
  crypto_int32 h5 = h[5];\r
  crypto_int32 h6 = h[6];\r
  crypto_int32 h7 = h[7];\r
  crypto_int32 h8 = h[8];\r
  crypto_int32 h9 = h[9];\r
  crypto_int32 q;\r
  crypto_int32 carry0;\r
  crypto_int32 carry1;\r
  crypto_int32 carry2;\r
  crypto_int32 carry3;\r
  crypto_int32 carry4;\r
  crypto_int32 carry5;\r
  crypto_int32 carry6;\r
  crypto_int32 carry7;\r
  crypto_int32 carry8;\r
  crypto_int32 carry9;\r
\r
  q = (19 * h9 + (((crypto_int32) 1) << 24)) >> 25;\r
  q = (h0 + q) >> 26;\r
  q = (h1 + q) >> 25;\r
  q = (h2 + q) >> 26;\r
  q = (h3 + q) >> 25;\r
  q = (h4 + q) >> 26;\r
  q = (h5 + q) >> 25;\r
  q = (h6 + q) >> 26;\r
  q = (h7 + q) >> 25;\r
  q = (h8 + q) >> 26;\r
  q = (h9 + q) >> 25;\r
\r
  /* Goal: Output h-(2^255-19)q, which is between 0 and 2^255-20. */\r
  h0 += 19 * q;\r
  /* Goal: Output h-2^255 q, which is between 0 and 2^255-20. */\r
\r
  carry0 = h0 >> 26; h1 += carry0; h0 -= carry0 << 26;\r
  carry1 = h1 >> 25; h2 += carry1; h1 -= carry1 << 25;\r
  carry2 = h2 >> 26; h3 += carry2; h2 -= carry2 << 26;\r
  carry3 = h3 >> 25; h4 += carry3; h3 -= carry3 << 25;\r
  carry4 = h4 >> 26; h5 += carry4; h4 -= carry4 << 26;\r
  carry5 = h5 >> 25; h6 += carry5; h5 -= carry5 << 25;\r
  carry6 = h6 >> 26; h7 += carry6; h6 -= carry6 << 26;\r
  carry7 = h7 >> 25; h8 += carry7; h7 -= carry7 << 25;\r
  carry8 = h8 >> 26; h9 += carry8; h8 -= carry8 << 26;\r
  carry9 = h9 >> 25;               h9 -= carry9 << 25;\r
                  /* h10 = carry9 */\r
\r
  /*\r
  Goal: Output h0+...+2^255 h10-2^255 q, which is between 0 and 2^255-20.\r
  Have h0+...+2^230 h9 between 0 and 2^255-1;\r
  evidently 2^255 h10-2^255 q = 0.\r
  Goal: Output h0+...+2^230 h9.\r
  */\r
\r
  s[0] = h0 >> 0;\r
  s[1] = h0 >> 8;\r
  s[2] = h0 >> 16;\r
  s[3] = (h0 >> 24) | (h1 << 2);\r
  s[4] = h1 >> 6;\r
  s[5] = h1 >> 14;\r
  s[6] = (h1 >> 22) | (h2 << 3);\r
  s[7] = h2 >> 5;\r
  s[8] = h2 >> 13;\r
  s[9] = (h2 >> 21) | (h3 << 5);\r
  s[10] = h3 >> 3;\r
  s[11] = h3 >> 11;\r
  s[12] = (h3 >> 19) | (h4 << 6);\r
  s[13] = h4 >> 2;\r
  s[14] = h4 >> 10;\r
  s[15] = h4 >> 18;\r
  s[16] = h5 >> 0;\r
  s[17] = h5 >> 8;\r
  s[18] = h5 >> 16;\r
  s[19] = (h5 >> 24) | (h6 << 1);\r
  s[20] = h6 >> 7;\r
  s[21] = h6 >> 15;\r
  s[22] = (h6 >> 23) | (h7 << 3);\r
  s[23] = h7 >> 5;\r
  s[24] = h7 >> 13;\r
  s[25] = (h7 >> 21) | (h8 << 4);\r
  s[26] = h8 >> 4;\r
  s[27] = h8 >> 12;\r
  s[28] = (h8 >> 20) | (h9 << 6);\r
  s[29] = h9 >> 2;\r
  s[30] = h9 >> 10;\r
  s[31] = h9 >> 18;\r
}\r
*/`,kf=`/*\r
In the comb method [2] the binary representation of k is\r
written in w rows, and the columns of the resulting rectangle are processed one\r
column at a time. We define [a_{w−1}, . . . , a2, a1, a0]P =\r
a_{w−1}2^{(w−1)d}P + · · · + a2 2^{2d}P + a1 2^d P + a0 P, where\r
d = ceil(t/w) and ai ∈ Z2.\r
\r
Algorithm 17. Fixed-base comb method\r
\r
INPUT: Window width w, d = ceil(t/w), k = (k_{t−1}, . . . , k1, k0)_2,\r
P ∈ E(F_{2^m}).\r
\r
OUTPUT: kP.\r
\r
1. Precomputation. Compute [a_{w−1}, . . . , a1, a0]P\r
   ∀(a_{w−1}, . . . , a1, a0) ∈ Z_2^w.\r
\r
2. By padding k on the left with 0’s if necessary, write\r
   k = K^{w−1} || · · · || K^1 || K^0,\r
   where each K^j is a bit string of length d. Let K_i^j denote the i-th\r
   bit of K^j.\r
\r
3. Q ← O.\r
\r
4. For i from d − 1 downto 0 do\r
   4.1 Q ← 2Q.\r
   4.2 Q ← Q + [K_i^{w−1}, . . . , K_i^1, K_i^0]P.\r
\r
5. Return(Q).\r
*/\r
\r
fn double_point(P: extended_point) -> extended_point {\r
  let A: fe = fe_sq(P.X);\r
  let B: fe = fe_sq(P.Y);\r
  let C: fe = fe_sq2(P.Z);\r
  let D: fe = fe_neg(A);\r
  let E: fe = fe_sub(\r
                  fe_sub(\r
                    fe_sq(fe_add(P.X, P.Y)),\r
                    A\r
                  ),\r
                  B\r
                );\r
  let G: fe = fe_add(D, B);\r
  let F: fe = fe_sub(G, C);\r
  let H: fe = fe_sub(D, B);\r
\r
  return extended_point(\r
    fe_mul(E, F),  // X\r
    fe_mul(G, H),  // Y\r
    fe_mul(E, H),  // T\r
    fe_mul(F, G)   // Z\r
  );\r
}\r
\r
fn add_points(P1: extended_point, P2: affine_niels_point) -> extended_point {\r
  let A: fe = fe_mul(fe_sub(P1.Y, P1.X), P2.YminusX);\r
  let B: fe = fe_mul(fe_add(P1.Y, P1.X), P2.YplusX);\r
  let C: fe = fe_mul(P2.kT, P1.T); \r
  let D: fe = fe_dbl(P1.Z);\r
\r
  let E: fe = fe_sub(B, A);\r
  let F: fe = fe_sub(D, C);\r
  let G: fe = fe_add(D, C);\r
  let H: fe = fe_add(B, A);\r
\r
  return extended_point(\r
    fe_mul(E, F),  // X\r
    fe_mul(G, H),  // Y\r
    fe_mul(E, H),  // T\r
    fe_mul(F, G)   // Z\r
  );\r
}\r
\r
@compute @workgroup_size(1)\r
fn multiply() {\r
  let k: u256 = reverse_scalar();\r
\r
  var Q: extended_point = IDENTITY;\r
  for(var i: i32 = i32(d) - 1; i >= 0; i--){\r
    Q = double_point(Q);\r
    Q = add_points(Q, get_precomputed_point(k, u32(i)));\r
  }\r
\r
  let inverted_z: fe = fe_invert(Q.Z);\r
  result[0] = fe_tobytes(fe_mul(Q.X, inverted_z));\r
  result[1] = fe_tobytes(fe_mul(Q.Y, inverted_z));\r
}\r
`;function r_(S){return S&&S.__esModule&&Object.prototype.hasOwnProperty.call(S,"default")?S.default:S}function f_(S){if(Object.prototype.hasOwnProperty.call(S,"__esModule"))return S;var p=S.default;if(typeof p=="function"){var l=function $(){return this instanceof $?Reflect.construct(p,arguments,this.constructor):p.apply(this,arguments)};l.prototype=p.prototype}else l={};return Object.defineProperty(l,"__esModule",{value:!0}),Object.keys(S).forEach(function($){var z=Object.getOwnPropertyDescriptor(S,$);Object.defineProperty(l,$,z.get?z:{enumerable:!0,get:function(){return S[$]}})}),l}function __(S){throw new Error('Could not dynamically require "'+S+'". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.')}var uf={exports:{}};const i_={},t_=Object.freeze(Object.defineProperty({__proto__:null,default:i_},Symbol.toStringTag,{value:"Module"})),n_=f_(t_);var Mf;function o_(){return Mf||(Mf=1,(function(S){(function(p){var l=function(f){var i,_=new Float64Array(16);if(f)for(i=0;i<f.length;i++)_[i]=f[i];return _},$=function(){throw new Error("no PRNG")},z=new Uint8Array(16),rr=new Uint8Array(32);rr[0]=9;var nr=l(),or=l([1]),vr=l([56129,1]),lr=l([30883,4953,19914,30187,55467,16705,2637,112,59544,30585,16505,36039,65139,11119,27886,20995]),pr=l([61785,9906,39828,60374,45398,33411,5274,224,53552,61171,33010,6542,64743,22239,55772,9222]),gr=l([54554,36645,11616,51542,42930,38181,51040,26924,56412,64982,57905,49316,21502,52590,14035,8553]),wr=l([26200,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214]),qr=l([41136,18958,6951,50414,58488,44335,6150,12099,55207,15867,153,11085,57099,20417,9344,11139]);function Or(f,i,_,r){f[i]=_>>24&255,f[i+1]=_>>16&255,f[i+2]=_>>8&255,f[i+3]=_&255,f[i+4]=r>>24&255,f[i+5]=r>>16&255,f[i+6]=r>>8&255,f[i+7]=r&255}function dr(f,i,_,r,t){var o,e=0;for(o=0;o<t;o++)e|=f[i+o]^_[r+o];return(1&e-1>>>8)-1}function sr(f,i,_,r){return dr(f,i,_,r,16)}function Ur(f,i,_,r){return dr(f,i,_,r,32)}function Fr(f,i,_,r){for(var t=r[0]&255|(r[1]&255)<<8|(r[2]&255)<<16|(r[3]&255)<<24,o=_[0]&255|(_[1]&255)<<8|(_[2]&255)<<16|(_[3]&255)<<24,e=_[4]&255|(_[5]&255)<<8|(_[6]&255)<<16|(_[7]&255)<<24,y=_[8]&255|(_[9]&255)<<8|(_[10]&255)<<16|(_[11]&255)<<24,g=_[12]&255|(_[13]&255)<<8|(_[14]&255)<<16|(_[15]&255)<<24,B=r[4]&255|(r[5]&255)<<8|(r[6]&255)<<16|(r[7]&255)<<24,x=i[0]&255|(i[1]&255)<<8|(i[2]&255)<<16|(i[3]&255)<<24,X=i[4]&255|(i[5]&255)<<8|(i[6]&255)<<16|(i[7]&255)<<24,v=i[8]&255|(i[9]&255)<<8|(i[10]&255)<<16|(i[11]&255)<<24,U=i[12]&255|(i[13]&255)<<8|(i[14]&255)<<16|(i[15]&255)<<24,M=r[8]&255|(r[9]&255)<<8|(r[10]&255)<<16|(r[11]&255)<<24,O=_[16]&255|(_[17]&255)<<8|(_[18]&255)<<16|(_[19]&255)<<24,C=_[20]&255|(_[21]&255)<<8|(_[22]&255)<<16|(_[23]&255)<<24,P=_[24]&255|(_[25]&255)<<8|(_[26]&255)<<16|(_[27]&255)<<24,K=_[28]&255|(_[29]&255)<<8|(_[30]&255)<<16|(_[31]&255)<<24,Y=r[12]&255|(r[13]&255)<<8|(r[14]&255)<<16|(r[15]&255)<<24,w=t,T=o,b=e,E=y,A=g,m=B,a=x,c=X,d=v,h=U,u=M,s=O,q=C,F=P,G=K,j=Y,n,R=0;R<20;R+=2)n=w+q|0,A^=n<<7|n>>>25,n=A+w|0,d^=n<<9|n>>>23,n=d+A|0,q^=n<<13|n>>>19,n=q+d|0,w^=n<<18|n>>>14,n=m+T|0,h^=n<<7|n>>>25,n=h+m|0,F^=n<<9|n>>>23,n=F+h|0,T^=n<<13|n>>>19,n=T+F|0,m^=n<<18|n>>>14,n=u+a|0,G^=n<<7|n>>>25,n=G+u|0,b^=n<<9|n>>>23,n=b+G|0,a^=n<<13|n>>>19,n=a+b|0,u^=n<<18|n>>>14,n=j+s|0,E^=n<<7|n>>>25,n=E+j|0,c^=n<<9|n>>>23,n=c+E|0,s^=n<<13|n>>>19,n=s+c|0,j^=n<<18|n>>>14,n=w+E|0,T^=n<<7|n>>>25,n=T+w|0,b^=n<<9|n>>>23,n=b+T|0,E^=n<<13|n>>>19,n=E+b|0,w^=n<<18|n>>>14,n=m+A|0,a^=n<<7|n>>>25,n=a+m|0,c^=n<<9|n>>>23,n=c+a|0,A^=n<<13|n>>>19,n=A+c|0,m^=n<<18|n>>>14,n=u+h|0,s^=n<<7|n>>>25,n=s+u|0,d^=n<<9|n>>>23,n=d+s|0,h^=n<<13|n>>>19,n=h+d|0,u^=n<<18|n>>>14,n=j+G|0,q^=n<<7|n>>>25,n=q+j|0,F^=n<<9|n>>>23,n=F+q|0,G^=n<<13|n>>>19,n=G+F|0,j^=n<<18|n>>>14;w=w+t|0,T=T+o|0,b=b+e|0,E=E+y|0,A=A+g|0,m=m+B|0,a=a+x|0,c=c+X|0,d=d+v|0,h=h+U|0,u=u+M|0,s=s+O|0,q=q+C|0,F=F+P|0,G=G+K|0,j=j+Y|0,f[0]=w>>>0&255,f[1]=w>>>8&255,f[2]=w>>>16&255,f[3]=w>>>24&255,f[4]=T>>>0&255,f[5]=T>>>8&255,f[6]=T>>>16&255,f[7]=T>>>24&255,f[8]=b>>>0&255,f[9]=b>>>8&255,f[10]=b>>>16&255,f[11]=b>>>24&255,f[12]=E>>>0&255,f[13]=E>>>8&255,f[14]=E>>>16&255,f[15]=E>>>24&255,f[16]=A>>>0&255,f[17]=A>>>8&255,f[18]=A>>>16&255,f[19]=A>>>24&255,f[20]=m>>>0&255,f[21]=m>>>8&255,f[22]=m>>>16&255,f[23]=m>>>24&255,f[24]=a>>>0&255,f[25]=a>>>8&255,f[26]=a>>>16&255,f[27]=a>>>24&255,f[28]=c>>>0&255,f[29]=c>>>8&255,f[30]=c>>>16&255,f[31]=c>>>24&255,f[32]=d>>>0&255,f[33]=d>>>8&255,f[34]=d>>>16&255,f[35]=d>>>24&255,f[36]=h>>>0&255,f[37]=h>>>8&255,f[38]=h>>>16&255,f[39]=h>>>24&255,f[40]=u>>>0&255,f[41]=u>>>8&255,f[42]=u>>>16&255,f[43]=u>>>24&255,f[44]=s>>>0&255,f[45]=s>>>8&255,f[46]=s>>>16&255,f[47]=s>>>24&255,f[48]=q>>>0&255,f[49]=q>>>8&255,f[50]=q>>>16&255,f[51]=q>>>24&255,f[52]=F>>>0&255,f[53]=F>>>8&255,f[54]=F>>>16&255,f[55]=F>>>24&255,f[56]=G>>>0&255,f[57]=G>>>8&255,f[58]=G>>>16&255,f[59]=G>>>24&255,f[60]=j>>>0&255,f[61]=j>>>8&255,f[62]=j>>>16&255,f[63]=j>>>24&255}function Wr(f,i,_,r){for(var t=r[0]&255|(r[1]&255)<<8|(r[2]&255)<<16|(r[3]&255)<<24,o=_[0]&255|(_[1]&255)<<8|(_[2]&255)<<16|(_[3]&255)<<24,e=_[4]&255|(_[5]&255)<<8|(_[6]&255)<<16|(_[7]&255)<<24,y=_[8]&255|(_[9]&255)<<8|(_[10]&255)<<16|(_[11]&255)<<24,g=_[12]&255|(_[13]&255)<<8|(_[14]&255)<<16|(_[15]&255)<<24,B=r[4]&255|(r[5]&255)<<8|(r[6]&255)<<16|(r[7]&255)<<24,x=i[0]&255|(i[1]&255)<<8|(i[2]&255)<<16|(i[3]&255)<<24,X=i[4]&255|(i[5]&255)<<8|(i[6]&255)<<16|(i[7]&255)<<24,v=i[8]&255|(i[9]&255)<<8|(i[10]&255)<<16|(i[11]&255)<<24,U=i[12]&255|(i[13]&255)<<8|(i[14]&255)<<16|(i[15]&255)<<24,M=r[8]&255|(r[9]&255)<<8|(r[10]&255)<<16|(r[11]&255)<<24,O=_[16]&255|(_[17]&255)<<8|(_[18]&255)<<16|(_[19]&255)<<24,C=_[20]&255|(_[21]&255)<<8|(_[22]&255)<<16|(_[23]&255)<<24,P=_[24]&255|(_[25]&255)<<8|(_[26]&255)<<16|(_[27]&255)<<24,K=_[28]&255|(_[29]&255)<<8|(_[30]&255)<<16|(_[31]&255)<<24,Y=r[12]&255|(r[13]&255)<<8|(r[14]&255)<<16|(r[15]&255)<<24,w=t,T=o,b=e,E=y,A=g,m=B,a=x,c=X,d=v,h=U,u=M,s=O,q=C,F=P,G=K,j=Y,n,R=0;R<20;R+=2)n=w+q|0,A^=n<<7|n>>>25,n=A+w|0,d^=n<<9|n>>>23,n=d+A|0,q^=n<<13|n>>>19,n=q+d|0,w^=n<<18|n>>>14,n=m+T|0,h^=n<<7|n>>>25,n=h+m|0,F^=n<<9|n>>>23,n=F+h|0,T^=n<<13|n>>>19,n=T+F|0,m^=n<<18|n>>>14,n=u+a|0,G^=n<<7|n>>>25,n=G+u|0,b^=n<<9|n>>>23,n=b+G|0,a^=n<<13|n>>>19,n=a+b|0,u^=n<<18|n>>>14,n=j+s|0,E^=n<<7|n>>>25,n=E+j|0,c^=n<<9|n>>>23,n=c+E|0,s^=n<<13|n>>>19,n=s+c|0,j^=n<<18|n>>>14,n=w+E|0,T^=n<<7|n>>>25,n=T+w|0,b^=n<<9|n>>>23,n=b+T|0,E^=n<<13|n>>>19,n=E+b|0,w^=n<<18|n>>>14,n=m+A|0,a^=n<<7|n>>>25,n=a+m|0,c^=n<<9|n>>>23,n=c+a|0,A^=n<<13|n>>>19,n=A+c|0,m^=n<<18|n>>>14,n=u+h|0,s^=n<<7|n>>>25,n=s+u|0,d^=n<<9|n>>>23,n=d+s|0,h^=n<<13|n>>>19,n=h+d|0,u^=n<<18|n>>>14,n=j+G|0,q^=n<<7|n>>>25,n=q+j|0,F^=n<<9|n>>>23,n=F+q|0,G^=n<<13|n>>>19,n=G+F|0,j^=n<<18|n>>>14;f[0]=w>>>0&255,f[1]=w>>>8&255,f[2]=w>>>16&255,f[3]=w>>>24&255,f[4]=m>>>0&255,f[5]=m>>>8&255,f[6]=m>>>16&255,f[7]=m>>>24&255,f[8]=u>>>0&255,f[9]=u>>>8&255,f[10]=u>>>16&255,f[11]=u>>>24&255,f[12]=j>>>0&255,f[13]=j>>>8&255,f[14]=j>>>16&255,f[15]=j>>>24&255,f[16]=a>>>0&255,f[17]=a>>>8&255,f[18]=a>>>16&255,f[19]=a>>>24&255,f[20]=c>>>0&255,f[21]=c>>>8&255,f[22]=c>>>16&255,f[23]=c>>>24&255,f[24]=d>>>0&255,f[25]=d>>>8&255,f[26]=d>>>16&255,f[27]=d>>>24&255,f[28]=h>>>0&255,f[29]=h>>>8&255,f[30]=h>>>16&255,f[31]=h>>>24&255}function Er(f,i,_,r){Fr(f,i,_,r)}function jr(f,i,_,r){Wr(f,i,_,r)}var mr=new Uint8Array([101,120,112,97,110,100,32,51,50,45,98,121,116,101,32,107]);function lf(f,i,_,r,t,o,e){var y=new Uint8Array(16),g=new Uint8Array(64),B,x;for(x=0;x<16;x++)y[x]=0;for(x=0;x<8;x++)y[x]=o[x];for(;t>=64;){for(Er(g,y,e,mr),x=0;x<64;x++)f[i+x]=_[r+x]^g[x];for(B=1,x=8;x<16;x++)B=B+(y[x]&255)|0,y[x]=B&255,B>>>=8;t-=64,i+=64,r+=64}if(t>0)for(Er(g,y,e,mr),x=0;x<t;x++)f[i+x]=_[r+x]^g[x];return 0}function df(f,i,_,r,t){var o=new Uint8Array(16),e=new Uint8Array(64),y,g;for(g=0;g<16;g++)o[g]=0;for(g=0;g<8;g++)o[g]=r[g];for(;_>=64;){for(Er(e,o,t,mr),g=0;g<64;g++)f[i+g]=e[g];for(y=1,g=8;g<16;g++)y=y+(o[g]&255)|0,o[g]=y&255,y>>>=8;_-=64,i+=64}if(_>0)for(Er(e,o,t,mr),g=0;g<_;g++)f[i+g]=e[g];return 0}function sf(f,i,_,r,t){var o=new Uint8Array(32);jr(o,r,t,mr);for(var e=new Uint8Array(8),y=0;y<8;y++)e[y]=r[y+16];return df(f,i,_,e,o)}function $r(f,i,_,r,t,o,e){var y=new Uint8Array(32);jr(y,o,e,mr);for(var g=new Uint8Array(8),B=0;B<8;B++)g[B]=o[B+16];return lf(f,i,_,r,t,g,y)}var Gr=function(f){this.buffer=new Uint8Array(16),this.r=new Uint16Array(10),this.h=new Uint16Array(10),this.pad=new Uint16Array(8),this.leftover=0,this.fin=0;var i,_,r,t,o,e,y,g;i=f[0]&255|(f[1]&255)<<8,this.r[0]=i&8191,_=f[2]&255|(f[3]&255)<<8,this.r[1]=(i>>>13|_<<3)&8191,r=f[4]&255|(f[5]&255)<<8,this.r[2]=(_>>>10|r<<6)&7939,t=f[6]&255|(f[7]&255)<<8,this.r[3]=(r>>>7|t<<9)&8191,o=f[8]&255|(f[9]&255)<<8,this.r[4]=(t>>>4|o<<12)&255,this.r[5]=o>>>1&8190,e=f[10]&255|(f[11]&255)<<8,this.r[6]=(o>>>14|e<<2)&8191,y=f[12]&255|(f[13]&255)<<8,this.r[7]=(e>>>11|y<<5)&8065,g=f[14]&255|(f[15]&255)<<8,this.r[8]=(y>>>8|g<<8)&8191,this.r[9]=g>>>5&127,this.pad[0]=f[16]&255|(f[17]&255)<<8,this.pad[1]=f[18]&255|(f[19]&255)<<8,this.pad[2]=f[20]&255|(f[21]&255)<<8,this.pad[3]=f[22]&255|(f[23]&255)<<8,this.pad[4]=f[24]&255|(f[25]&255)<<8,this.pad[5]=f[26]&255|(f[27]&255)<<8,this.pad[6]=f[28]&255|(f[29]&255)<<8,this.pad[7]=f[30]&255|(f[31]&255)<<8};Gr.prototype.blocks=function(f,i,_){for(var r=this.fin?0:2048,t,o,e,y,g,B,x,X,v,U,M,O,C,P,K,Y,w,T,b,E=this.h[0],A=this.h[1],m=this.h[2],a=this.h[3],c=this.h[4],d=this.h[5],h=this.h[6],u=this.h[7],s=this.h[8],q=this.h[9],F=this.r[0],G=this.r[1],j=this.r[2],n=this.r[3],R=this.r[4],Z=this.r[5],H=this.r[6],L=this.r[7],I=this.r[8],N=this.r[9];_>=16;)t=f[i+0]&255|(f[i+1]&255)<<8,E+=t&8191,o=f[i+2]&255|(f[i+3]&255)<<8,A+=(t>>>13|o<<3)&8191,e=f[i+4]&255|(f[i+5]&255)<<8,m+=(o>>>10|e<<6)&8191,y=f[i+6]&255|(f[i+7]&255)<<8,a+=(e>>>7|y<<9)&8191,g=f[i+8]&255|(f[i+9]&255)<<8,c+=(y>>>4|g<<12)&8191,d+=g>>>1&8191,B=f[i+10]&255|(f[i+11]&255)<<8,h+=(g>>>14|B<<2)&8191,x=f[i+12]&255|(f[i+13]&255)<<8,u+=(B>>>11|x<<5)&8191,X=f[i+14]&255|(f[i+15]&255)<<8,s+=(x>>>8|X<<8)&8191,q+=X>>>5|r,v=0,U=v,U+=E*F,U+=A*(5*N),U+=m*(5*I),U+=a*(5*L),U+=c*(5*H),v=U>>>13,U&=8191,U+=d*(5*Z),U+=h*(5*R),U+=u*(5*n),U+=s*(5*j),U+=q*(5*G),v+=U>>>13,U&=8191,M=v,M+=E*G,M+=A*F,M+=m*(5*N),M+=a*(5*I),M+=c*(5*L),v=M>>>13,M&=8191,M+=d*(5*H),M+=h*(5*Z),M+=u*(5*R),M+=s*(5*n),M+=q*(5*j),v+=M>>>13,M&=8191,O=v,O+=E*j,O+=A*G,O+=m*F,O+=a*(5*N),O+=c*(5*I),v=O>>>13,O&=8191,O+=d*(5*L),O+=h*(5*H),O+=u*(5*Z),O+=s*(5*R),O+=q*(5*n),v+=O>>>13,O&=8191,C=v,C+=E*n,C+=A*j,C+=m*G,C+=a*F,C+=c*(5*N),v=C>>>13,C&=8191,C+=d*(5*I),C+=h*(5*L),C+=u*(5*H),C+=s*(5*Z),C+=q*(5*R),v+=C>>>13,C&=8191,P=v,P+=E*R,P+=A*n,P+=m*j,P+=a*G,P+=c*F,v=P>>>13,P&=8191,P+=d*(5*N),P+=h*(5*I),P+=u*(5*L),P+=s*(5*H),P+=q*(5*Z),v+=P>>>13,P&=8191,K=v,K+=E*Z,K+=A*R,K+=m*n,K+=a*j,K+=c*G,v=K>>>13,K&=8191,K+=d*F,K+=h*(5*N),K+=u*(5*I),K+=s*(5*L),K+=q*(5*H),v+=K>>>13,K&=8191,Y=v,Y+=E*H,Y+=A*Z,Y+=m*R,Y+=a*n,Y+=c*j,v=Y>>>13,Y&=8191,Y+=d*G,Y+=h*F,Y+=u*(5*N),Y+=s*(5*I),Y+=q*(5*L),v+=Y>>>13,Y&=8191,w=v,w+=E*L,w+=A*H,w+=m*Z,w+=a*R,w+=c*n,v=w>>>13,w&=8191,w+=d*j,w+=h*G,w+=u*F,w+=s*(5*N),w+=q*(5*I),v+=w>>>13,w&=8191,T=v,T+=E*I,T+=A*L,T+=m*H,T+=a*Z,T+=c*R,v=T>>>13,T&=8191,T+=d*n,T+=h*j,T+=u*G,T+=s*F,T+=q*(5*N),v+=T>>>13,T&=8191,b=v,b+=E*N,b+=A*I,b+=m*L,b+=a*H,b+=c*Z,v=b>>>13,b&=8191,b+=d*R,b+=h*n,b+=u*j,b+=s*G,b+=q*F,v+=b>>>13,b&=8191,v=(v<<2)+v|0,v=v+U|0,U=v&8191,v=v>>>13,M+=v,E=U,A=M,m=O,a=C,c=P,d=K,h=Y,u=w,s=T,q=b,i+=16,_-=16;this.h[0]=E,this.h[1]=A,this.h[2]=m,this.h[3]=a,this.h[4]=c,this.h[5]=d,this.h[6]=h,this.h[7]=u,this.h[8]=s,this.h[9]=q},Gr.prototype.finish=function(f,i){var _=new Uint16Array(10),r,t,o,e;if(this.leftover){for(e=this.leftover,this.buffer[e++]=1;e<16;e++)this.buffer[e]=0;this.fin=1,this.blocks(this.buffer,0,16)}for(r=this.h[1]>>>13,this.h[1]&=8191,e=2;e<10;e++)this.h[e]+=r,r=this.h[e]>>>13,this.h[e]&=8191;for(this.h[0]+=r*5,r=this.h[0]>>>13,this.h[0]&=8191,this.h[1]+=r,r=this.h[1]>>>13,this.h[1]&=8191,this.h[2]+=r,_[0]=this.h[0]+5,r=_[0]>>>13,_[0]&=8191,e=1;e<10;e++)_[e]=this.h[e]+r,r=_[e]>>>13,_[e]&=8191;for(_[9]-=8192,t=(r^1)-1,e=0;e<10;e++)_[e]&=t;for(t=~t,e=0;e<10;e++)this.h[e]=this.h[e]&t|_[e];for(this.h[0]=(this.h[0]|this.h[1]<<13)&65535,this.h[1]=(this.h[1]>>>3|this.h[2]<<10)&65535,this.h[2]=(this.h[2]>>>6|this.h[3]<<7)&65535,this.h[3]=(this.h[3]>>>9|this.h[4]<<4)&65535,this.h[4]=(this.h[4]>>>12|this.h[5]<<1|this.h[6]<<14)&65535,this.h[5]=(this.h[6]>>>2|this.h[7]<<11)&65535,this.h[6]=(this.h[7]>>>5|this.h[8]<<8)&65535,this.h[7]=(this.h[8]>>>8|this.h[9]<<5)&65535,o=this.h[0]+this.pad[0],this.h[0]=o&65535,e=1;e<8;e++)o=(this.h[e]+this.pad[e]|0)+(o>>>16)|0,this.h[e]=o&65535;f[i+0]=this.h[0]>>>0&255,f[i+1]=this.h[0]>>>8&255,f[i+2]=this.h[1]>>>0&255,f[i+3]=this.h[1]>>>8&255,f[i+4]=this.h[2]>>>0&255,f[i+5]=this.h[2]>>>8&255,f[i+6]=this.h[3]>>>0&255,f[i+7]=this.h[3]>>>8&255,f[i+8]=this.h[4]>>>0&255,f[i+9]=this.h[4]>>>8&255,f[i+10]=this.h[5]>>>0&255,f[i+11]=this.h[5]>>>8&255,f[i+12]=this.h[6]>>>0&255,f[i+13]=this.h[6]>>>8&255,f[i+14]=this.h[7]>>>0&255,f[i+15]=this.h[7]>>>8&255},Gr.prototype.update=function(f,i,_){var r,t;if(this.leftover){for(t=16-this.leftover,t>_&&(t=_),r=0;r<t;r++)this.buffer[this.leftover+r]=f[i+r];if(_-=t,i+=t,this.leftover+=t,this.leftover<16)return;this.blocks(this.buffer,0,16),this.leftover=0}if(_>=16&&(t=_-_%16,this.blocks(f,i,t),i+=t,_-=t),_){for(r=0;r<_;r++)this.buffer[this.leftover+r]=f[i+r];this.leftover+=_}};function Qr(f,i,_,r,t,o){var e=new Gr(o);return e.update(_,r,t),e.finish(f,i),0}function pf(f,i,_,r,t,o){var e=new Uint8Array(16);return Qr(e,0,_,r,t,o),sr(f,i,e,0)}function Jr(f,i,_,r,t){var o;if(_<32)return-1;for($r(f,0,i,0,_,r,t),Qr(f,16,f,32,_-32,f),o=0;o<16;o++)f[o]=0;return 0}function Vr(f,i,_,r,t){var o,e=new Uint8Array(32);if(_<32||(sf(e,0,32,r,t),pf(i,16,i,32,_-32,e)!==0))return-1;for($r(f,0,i,0,_,r,t),o=0;o<32;o++)f[o]=0;return 0}function yr(f,i){var _;for(_=0;_<16;_++)f[_]=i[_]|0}function kr(f){var i,_,r=1;for(i=0;i<16;i++)_=f[i]+r+65535,r=Math.floor(_/65536),f[i]=_-r*65536;f[0]+=r-1+37*(r-1)}function Ar(f,i,_){for(var r,t=~(_-1),o=0;o<16;o++)r=t&(f[o]^i[o]),f[o]^=r,i[o]^=r}function Br(f,i){var _,r,t,o=l(),e=l();for(_=0;_<16;_++)e[_]=i[_];for(kr(e),kr(e),kr(e),r=0;r<2;r++){for(o[0]=e[0]-65517,_=1;_<15;_++)o[_]=e[_]-65535-(o[_-1]>>16&1),o[_-1]&=65535;o[15]=e[15]-32767-(o[14]>>16&1),t=o[15]>>16&1,o[14]&=65535,Ar(e,o,1-t)}for(_=0;_<16;_++)f[2*_]=e[_]&255,f[2*_+1]=e[_]>>8}function gf(f,i){var _=new Uint8Array(32),r=new Uint8Array(32);return Br(_,f),Br(r,i),Ur(_,0,r,0)}function mf(f){var i=new Uint8Array(32);return Br(i,f),i[0]&1}function rf(f,i){var _;for(_=0;_<16;_++)f[_]=i[2*_]+(i[2*_+1]<<8);f[15]&=32767}function cr(f,i,_){for(var r=0;r<16;r++)f[r]=i[r]+_[r]}function hr(f,i,_){for(var r=0;r<16;r++)f[r]=i[r]-_[r]}function D(f,i,_){var r,t,o=0,e=0,y=0,g=0,B=0,x=0,X=0,v=0,U=0,M=0,O=0,C=0,P=0,K=0,Y=0,w=0,T=0,b=0,E=0,A=0,m=0,a=0,c=0,d=0,h=0,u=0,s=0,q=0,F=0,G=0,j=0,n=_[0],R=_[1],Z=_[2],H=_[3],L=_[4],I=_[5],N=_[6],k=_[7],W=_[8],Q=_[9],J=_[10],V=_[11],fr=_[12],_r=_[13],ir=_[14],tr=_[15];r=i[0],o+=r*n,e+=r*R,y+=r*Z,g+=r*H,B+=r*L,x+=r*I,X+=r*N,v+=r*k,U+=r*W,M+=r*Q,O+=r*J,C+=r*V,P+=r*fr,K+=r*_r,Y+=r*ir,w+=r*tr,r=i[1],e+=r*n,y+=r*R,g+=r*Z,B+=r*H,x+=r*L,X+=r*I,v+=r*N,U+=r*k,M+=r*W,O+=r*Q,C+=r*J,P+=r*V,K+=r*fr,Y+=r*_r,w+=r*ir,T+=r*tr,r=i[2],y+=r*n,g+=r*R,B+=r*Z,x+=r*H,X+=r*L,v+=r*I,U+=r*N,M+=r*k,O+=r*W,C+=r*Q,P+=r*J,K+=r*V,Y+=r*fr,w+=r*_r,T+=r*ir,b+=r*tr,r=i[3],g+=r*n,B+=r*R,x+=r*Z,X+=r*H,v+=r*L,U+=r*I,M+=r*N,O+=r*k,C+=r*W,P+=r*Q,K+=r*J,Y+=r*V,w+=r*fr,T+=r*_r,b+=r*ir,E+=r*tr,r=i[4],B+=r*n,x+=r*R,X+=r*Z,v+=r*H,U+=r*L,M+=r*I,O+=r*N,C+=r*k,P+=r*W,K+=r*Q,Y+=r*J,w+=r*V,T+=r*fr,b+=r*_r,E+=r*ir,A+=r*tr,r=i[5],x+=r*n,X+=r*R,v+=r*Z,U+=r*H,M+=r*L,O+=r*I,C+=r*N,P+=r*k,K+=r*W,Y+=r*Q,w+=r*J,T+=r*V,b+=r*fr,E+=r*_r,A+=r*ir,m+=r*tr,r=i[6],X+=r*n,v+=r*R,U+=r*Z,M+=r*H,O+=r*L,C+=r*I,P+=r*N,K+=r*k,Y+=r*W,w+=r*Q,T+=r*J,b+=r*V,E+=r*fr,A+=r*_r,m+=r*ir,a+=r*tr,r=i[7],v+=r*n,U+=r*R,M+=r*Z,O+=r*H,C+=r*L,P+=r*I,K+=r*N,Y+=r*k,w+=r*W,T+=r*Q,b+=r*J,E+=r*V,A+=r*fr,m+=r*_r,a+=r*ir,c+=r*tr,r=i[8],U+=r*n,M+=r*R,O+=r*Z,C+=r*H,P+=r*L,K+=r*I,Y+=r*N,w+=r*k,T+=r*W,b+=r*Q,E+=r*J,A+=r*V,m+=r*fr,a+=r*_r,c+=r*ir,d+=r*tr,r=i[9],M+=r*n,O+=r*R,C+=r*Z,P+=r*H,K+=r*L,Y+=r*I,w+=r*N,T+=r*k,b+=r*W,E+=r*Q,A+=r*J,m+=r*V,a+=r*fr,c+=r*_r,d+=r*ir,h+=r*tr,r=i[10],O+=r*n,C+=r*R,P+=r*Z,K+=r*H,Y+=r*L,w+=r*I,T+=r*N,b+=r*k,E+=r*W,A+=r*Q,m+=r*J,a+=r*V,c+=r*fr,d+=r*_r,h+=r*ir,u+=r*tr,r=i[11],C+=r*n,P+=r*R,K+=r*Z,Y+=r*H,w+=r*L,T+=r*I,b+=r*N,E+=r*k,A+=r*W,m+=r*Q,a+=r*J,c+=r*V,d+=r*fr,h+=r*_r,u+=r*ir,s+=r*tr,r=i[12],P+=r*n,K+=r*R,Y+=r*Z,w+=r*H,T+=r*L,b+=r*I,E+=r*N,A+=r*k,m+=r*W,a+=r*Q,c+=r*J,d+=r*V,h+=r*fr,u+=r*_r,s+=r*ir,q+=r*tr,r=i[13],K+=r*n,Y+=r*R,w+=r*Z,T+=r*H,b+=r*L,E+=r*I,A+=r*N,m+=r*k,a+=r*W,c+=r*Q,d+=r*J,h+=r*V,u+=r*fr,s+=r*_r,q+=r*ir,F+=r*tr,r=i[14],Y+=r*n,w+=r*R,T+=r*Z,b+=r*H,E+=r*L,A+=r*I,m+=r*N,a+=r*k,c+=r*W,d+=r*Q,h+=r*J,u+=r*V,s+=r*fr,q+=r*_r,F+=r*ir,G+=r*tr,r=i[15],w+=r*n,T+=r*R,b+=r*Z,E+=r*H,A+=r*L,m+=r*I,a+=r*N,c+=r*k,d+=r*W,h+=r*Q,u+=r*J,s+=r*V,q+=r*fr,F+=r*_r,G+=r*ir,j+=r*tr,o+=38*T,e+=38*b,y+=38*E,g+=38*A,B+=38*m,x+=38*a,X+=38*c,v+=38*d,U+=38*h,M+=38*u,O+=38*s,C+=38*q,P+=38*F,K+=38*G,Y+=38*j,t=1,r=o+t+65535,t=Math.floor(r/65536),o=r-t*65536,r=e+t+65535,t=Math.floor(r/65536),e=r-t*65536,r=y+t+65535,t=Math.floor(r/65536),y=r-t*65536,r=g+t+65535,t=Math.floor(r/65536),g=r-t*65536,r=B+t+65535,t=Math.floor(r/65536),B=r-t*65536,r=x+t+65535,t=Math.floor(r/65536),x=r-t*65536,r=X+t+65535,t=Math.floor(r/65536),X=r-t*65536,r=v+t+65535,t=Math.floor(r/65536),v=r-t*65536,r=U+t+65535,t=Math.floor(r/65536),U=r-t*65536,r=M+t+65535,t=Math.floor(r/65536),M=r-t*65536,r=O+t+65535,t=Math.floor(r/65536),O=r-t*65536,r=C+t+65535,t=Math.floor(r/65536),C=r-t*65536,r=P+t+65535,t=Math.floor(r/65536),P=r-t*65536,r=K+t+65535,t=Math.floor(r/65536),K=r-t*65536,r=Y+t+65535,t=Math.floor(r/65536),Y=r-t*65536,r=w+t+65535,t=Math.floor(r/65536),w=r-t*65536,o+=t-1+37*(t-1),t=1,r=o+t+65535,t=Math.floor(r/65536),o=r-t*65536,r=e+t+65535,t=Math.floor(r/65536),e=r-t*65536,r=y+t+65535,t=Math.floor(r/65536),y=r-t*65536,r=g+t+65535,t=Math.floor(r/65536),g=r-t*65536,r=B+t+65535,t=Math.floor(r/65536),B=r-t*65536,r=x+t+65535,t=Math.floor(r/65536),x=r-t*65536,r=X+t+65535,t=Math.floor(r/65536),X=r-t*65536,r=v+t+65535,t=Math.floor(r/65536),v=r-t*65536,r=U+t+65535,t=Math.floor(r/65536),U=r-t*65536,r=M+t+65535,t=Math.floor(r/65536),M=r-t*65536,r=O+t+65535,t=Math.floor(r/65536),O=r-t*65536,r=C+t+65535,t=Math.floor(r/65536),C=r-t*65536,r=P+t+65535,t=Math.floor(r/65536),P=r-t*65536,r=K+t+65535,t=Math.floor(r/65536),K=r-t*65536,r=Y+t+65535,t=Math.floor(r/65536),Y=r-t*65536,r=w+t+65535,t=Math.floor(r/65536),w=r-t*65536,o+=t-1+37*(t-1),f[0]=o,f[1]=e,f[2]=y,f[3]=g,f[4]=B,f[5]=x,f[6]=X,f[7]=v,f[8]=U,f[9]=M,f[10]=O,f[11]=C,f[12]=P,f[13]=K,f[14]=Y,f[15]=w}function ar(f,i){D(f,i,i)}function xf(f,i){var _=l(),r;for(r=0;r<16;r++)_[r]=i[r];for(r=253;r>=0;r--)ar(_,_),r!==2&&r!==4&&D(_,_,i);for(r=0;r<16;r++)f[r]=_[r]}function bf(f,i){var _=l(),r;for(r=0;r<16;r++)_[r]=i[r];for(r=250;r>=0;r--)ar(_,_),r!==1&&D(_,_,i);for(r=0;r<16;r++)f[r]=_[r]}function Lr(f,i,_){var r=new Uint8Array(32),t=new Float64Array(80),o,e,y=l(),g=l(),B=l(),x=l(),X=l(),v=l();for(e=0;e<31;e++)r[e]=i[e];for(r[31]=i[31]&127|64,r[0]&=248,rf(t,_),e=0;e<16;e++)g[e]=t[e],x[e]=y[e]=B[e]=0;for(y[0]=x[0]=1,e=254;e>=0;--e)o=r[e>>>3]>>>(e&7)&1,Ar(y,g,o),Ar(B,x,o),cr(X,y,B),hr(y,y,B),cr(B,g,x),hr(g,g,x),ar(x,X),ar(v,y),D(y,B,y),D(B,g,X),cr(X,y,B),hr(y,y,B),ar(g,y),hr(B,x,v),D(y,B,vr),cr(y,y,x),D(B,B,y),D(y,x,v),D(x,g,t),ar(g,X),Ar(y,g,o),Ar(B,x,o);for(e=0;e<16;e++)t[e+16]=y[e],t[e+32]=B[e],t[e+48]=g[e],t[e+64]=x[e];var U=t.subarray(32),M=t.subarray(16);return xf(U,U),D(M,M,U),Br(f,M),0}function Rr(f,i){return Lr(f,i,rr)}function vf(f,i){return $(i,32),Rr(f,i)}function zr(f,i,_){var r=new Uint8Array(32);return Lr(r,_,i),jr(f,z,r,mr)}var wf=Jr,Yf=Vr;function Kf(f,i,_,r,t,o){var e=new Uint8Array(32);return zr(e,t,o),wf(f,i,_,r,e)}function Cf(f,i,_,r,t,o){var e=new Uint8Array(32);return zr(e,t,o),Yf(f,i,_,r,e)}var Ef=[1116352408,3609767458,1899447441,602891725,3049323471,3964484399,3921009573,2173295548,961987163,4081628472,1508970993,3053834265,2453635748,2937671579,2870763221,3664609560,3624381080,2734883394,310598401,1164996542,607225278,1323610764,1426881987,3590304994,1925078388,4068182383,2162078206,991336113,2614888103,633803317,3248222580,3479774868,3835390401,2666613458,4022224774,944711139,264347078,2341262773,604807628,2007800933,770255983,1495990901,1249150122,1856431235,1555081692,3175218132,1996064986,2198950837,2554220882,3999719339,2821834349,766784016,2952996808,2566594879,3210313671,3203337956,3336571891,1034457026,3584528711,2466948901,113926993,3758326383,338241895,168717936,666307205,1188179964,773529912,1546045734,1294757372,1522805485,1396182291,2643833823,1695183700,2343527390,1986661051,1014477480,2177026350,1206759142,2456956037,344077627,2730485921,1290863460,2820302411,3158454273,3259730800,3505952657,3345764771,106217008,3516065817,3606008344,3600352804,1432725776,4094571909,1467031594,275423344,851169720,430227734,3100823752,506948616,1363258195,659060556,3750685593,883997877,3785050280,958139571,3318307427,1322822218,3812723403,1537002063,2003034995,1747873779,3602036899,1955562222,1575990012,2024104815,1125592928,2227730452,2716904306,2361852424,442776044,2428436474,593698344,2756734187,3733110249,3204031479,2999351573,3329325298,3815920427,3391569614,3928383900,3515267271,566280711,3940187606,3454069534,4118630271,4000239992,116418474,1914138554,174292421,2731055270,289380356,3203993006,460393269,320620315,685471733,587496836,852142971,1086792851,1017036298,365543100,1126000580,2618297676,1288033470,3409855158,1501505948,4234509866,1607167915,987167468,1816402316,1246189591];function Af(f,i,_,r){for(var t=new Int32Array(16),o=new Int32Array(16),e,y,g,B,x,X,v,U,M,O,C,P,K,Y,w,T,b,E,A,m,a,c,d,h,u,s,q=f[0],F=f[1],G=f[2],j=f[3],n=f[4],R=f[5],Z=f[6],H=f[7],L=i[0],I=i[1],N=i[2],k=i[3],W=i[4],Q=i[5],J=i[6],V=i[7],fr=0;r>=128;){for(A=0;A<16;A++)m=8*A+fr,t[A]=_[m+0]<<24|_[m+1]<<16|_[m+2]<<8|_[m+3],o[A]=_[m+4]<<24|_[m+5]<<16|_[m+6]<<8|_[m+7];for(A=0;A<80;A++)if(e=q,y=F,g=G,B=j,x=n,X=R,v=Z,U=H,M=L,O=I,C=N,P=k,K=W,Y=Q,w=J,T=V,a=H,c=V,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=(n>>>14|W<<18)^(n>>>18|W<<14)^(W>>>9|n<<23),c=(W>>>14|n<<18)^(W>>>18|n<<14)^(n>>>9|W<<23),d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,a=n&R^~n&Z,c=W&Q^~W&J,d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,a=Ef[A*2],c=Ef[A*2+1],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,a=t[A%16],c=o[A%16],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,b=u&65535|s<<16,E=d&65535|h<<16,a=b,c=E,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=(q>>>28|L<<4)^(L>>>2|q<<30)^(L>>>7|q<<25),c=(L>>>28|q<<4)^(q>>>2|L<<30)^(q>>>7|L<<25),d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,a=q&F^q&G^F&G,c=L&I^L&N^I&N,d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,U=u&65535|s<<16,T=d&65535|h<<16,a=B,c=P,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=b,c=E,d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,B=u&65535|s<<16,P=d&65535|h<<16,F=e,G=y,j=g,n=B,R=x,Z=X,H=v,q=U,I=M,N=O,k=C,W=P,Q=K,J=Y,V=w,L=T,A%16===15)for(m=0;m<16;m++)a=t[m],c=o[m],d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=t[(m+9)%16],c=o[(m+9)%16],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,b=t[(m+1)%16],E=o[(m+1)%16],a=(b>>>1|E<<31)^(b>>>8|E<<24)^b>>>7,c=(E>>>1|b<<31)^(E>>>8|b<<24)^(E>>>7|b<<25),d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,b=t[(m+14)%16],E=o[(m+14)%16],a=(b>>>19|E<<13)^(E>>>29|b<<3)^b>>>6,c=(E>>>19|b<<13)^(b>>>29|E<<3)^(E>>>6|b<<26),d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,t[m]=u&65535|s<<16,o[m]=d&65535|h<<16;a=q,c=L,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=f[0],c=i[0],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,f[0]=q=u&65535|s<<16,i[0]=L=d&65535|h<<16,a=F,c=I,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=f[1],c=i[1],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,f[1]=F=u&65535|s<<16,i[1]=I=d&65535|h<<16,a=G,c=N,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=f[2],c=i[2],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,f[2]=G=u&65535|s<<16,i[2]=N=d&65535|h<<16,a=j,c=k,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=f[3],c=i[3],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,f[3]=j=u&65535|s<<16,i[3]=k=d&65535|h<<16,a=n,c=W,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=f[4],c=i[4],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,f[4]=n=u&65535|s<<16,i[4]=W=d&65535|h<<16,a=R,c=Q,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=f[5],c=i[5],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,f[5]=R=u&65535|s<<16,i[5]=Q=d&65535|h<<16,a=Z,c=J,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=f[6],c=i[6],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,f[6]=Z=u&65535|s<<16,i[6]=J=d&65535|h<<16,a=H,c=V,d=c&65535,h=c>>>16,u=a&65535,s=a>>>16,a=f[7],c=i[7],d+=c&65535,h+=c>>>16,u+=a&65535,s+=a>>>16,h+=d>>>16,u+=h>>>16,s+=u>>>16,f[7]=H=u&65535|s<<16,i[7]=V=d&65535|h<<16,fr+=128,r-=128}return r}function xr(f,i,_){var r=new Int32Array(8),t=new Int32Array(8),o=new Uint8Array(256),e,y=_;for(r[0]=1779033703,r[1]=3144134277,r[2]=1013904242,r[3]=2773480762,r[4]=1359893119,r[5]=2600822924,r[6]=528734635,r[7]=1541459225,t[0]=4089235720,t[1]=2227873595,t[2]=4271175723,t[3]=1595750129,t[4]=2917565137,t[5]=725511199,t[6]=4215389547,t[7]=327033209,Af(r,t,i,_),_%=128,e=0;e<_;e++)o[e]=i[y-_+e];for(o[_]=128,_=256-128*(_<112?1:0),o[_-9]=0,Or(o,_-8,y/536870912|0,y<<3),Af(r,t,o,_),e=0;e<8;e++)Or(f,8*e,r[e],t[e]);return 0}function Dr(f,i){var _=l(),r=l(),t=l(),o=l(),e=l(),y=l(),g=l(),B=l(),x=l();hr(_,f[1],f[0]),hr(x,i[1],i[0]),D(_,_,x),cr(r,f[0],f[1]),cr(x,i[0],i[1]),D(r,r,x),D(t,f[3],i[3]),D(t,t,pr),D(o,f[2],i[2]),cr(o,o,o),hr(e,r,_),hr(y,o,t),cr(g,o,t),cr(B,r,_),D(f[0],e,y),D(f[1],B,g),D(f[2],g,y),D(f[3],e,B)}function Bf(f,i,_){var r;for(r=0;r<4;r++)Ar(f[r],i[r],_)}function ff(f,i){var _=l(),r=l(),t=l();xf(t,i[2]),D(_,i[0],t),D(r,i[1],t),Br(f,r),f[31]^=mf(_)<<7}function _f(f,i,_){var r,t;for(yr(f[0],nr),yr(f[1],or),yr(f[2],or),yr(f[3],nr),t=255;t>=0;--t)r=_[t/8|0]>>(t&7)&1,Bf(f,i,r),Dr(i,f),Dr(f,f),Bf(f,i,r)}function Ir(f,i){var _=[l(),l(),l(),l()];yr(_[0],gr),yr(_[1],wr),yr(_[2],or),D(_[3],gr,wr),_f(f,_,i)}function tf(f,i,_){var r=new Uint8Array(64),t=[l(),l(),l(),l()],o;for(_||$(i,32),xr(r,i,32),r[0]&=248,r[31]&=127,r[31]|=64,Ir(t,r),ff(f,t),o=0;o<32;o++)i[o+32]=f[o];return 0}var Nr=new Float64Array([237,211,245,92,26,99,18,88,214,156,247,162,222,249,222,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16]);function nf(f,i){var _,r,t,o;for(r=63;r>=32;--r){for(_=0,t=r-32,o=r-12;t<o;++t)i[t]+=_-16*i[r]*Nr[t-(r-32)],_=Math.floor((i[t]+128)/256),i[t]-=_*256;i[t]+=_,i[r]=0}for(_=0,t=0;t<32;t++)i[t]+=_-(i[31]>>4)*Nr[t],_=i[t]>>8,i[t]&=255;for(t=0;t<32;t++)i[t]-=_*Nr[t];for(r=0;r<32;r++)i[r+1]+=i[r]>>8,f[r]=i[r]&255}function of(f){var i=new Float64Array(64),_;for(_=0;_<64;_++)i[_]=f[_];for(_=0;_<64;_++)f[_]=0;nf(f,i)}function Sf(f,i,_,r){var t=new Uint8Array(64),o=new Uint8Array(64),e=new Uint8Array(64),y,g,B=new Float64Array(64),x=[l(),l(),l(),l()];xr(t,r,32),t[0]&=248,t[31]&=127,t[31]|=64;var X=_+64;for(y=0;y<_;y++)f[64+y]=i[y];for(y=0;y<32;y++)f[32+y]=t[32+y];for(xr(e,f.subarray(32),_+32),of(e),Ir(x,e),ff(f,x),y=32;y<64;y++)f[y]=r[y];for(xr(o,f,_+64),of(o),y=0;y<64;y++)B[y]=0;for(y=0;y<32;y++)B[y]=e[y];for(y=0;y<32;y++)for(g=0;g<32;g++)B[y+g]+=o[y]*t[g];return nf(f.subarray(32),B),X}function Of(f,i){var _=l(),r=l(),t=l(),o=l(),e=l(),y=l(),g=l();return yr(f[2],or),rf(f[1],i),ar(t,f[1]),D(o,t,lr),hr(t,t,f[2]),cr(o,f[2],o),ar(e,o),ar(y,e),D(g,y,e),D(_,g,t),D(_,_,o),bf(_,_),D(_,_,t),D(_,_,o),D(_,_,o),D(f[0],_,o),ar(r,f[0]),D(r,r,o),gf(r,t)&&D(f[0],f[0],qr),ar(r,f[0]),D(r,r,o),gf(r,t)?-1:(mf(f[0])===i[31]>>7&&hr(f[0],nr,f[0]),D(f[3],f[0],f[1]),0)}function ef(f,i,_,r){var t,o=new Uint8Array(32),e=new Uint8Array(64),y=[l(),l(),l(),l()],g=[l(),l(),l(),l()];if(_<64||Of(g,r))return-1;for(t=0;t<_;t++)f[t]=i[t];for(t=0;t<32;t++)f[t+32]=r[t];if(xr(e,f,_),of(e),_f(y,g,e),Ir(g,i.subarray(32)),Dr(y,g),ff(o,y),_-=64,Ur(i,0,o,0)){for(t=0;t<_;t++)f[t]=0;return-1}for(t=0;t<_;t++)f[t]=i[t+64];return _}var af=32,Xr=24,Mr=32,Sr=16,Pr=32,Zr=32,Yr=32,Kr=32,cf=32,Tf=Xr,Ff=Mr,jf=Sr,ur=64,br=32,Tr=64,hf=32,yf=64;p.lowlevel={crypto_core_hsalsa20:jr,crypto_stream_xor:$r,crypto_stream:sf,crypto_stream_salsa20_xor:lf,crypto_stream_salsa20:df,crypto_onetimeauth:Qr,crypto_onetimeauth_verify:pf,crypto_verify_16:sr,crypto_verify_32:Ur,crypto_secretbox:Jr,crypto_secretbox_open:Vr,crypto_scalarmult:Lr,crypto_scalarmult_base:Rr,crypto_box_beforenm:zr,crypto_box_afternm:wf,crypto_box:Kf,crypto_box_open:Cf,crypto_box_keypair:vf,crypto_hash:xr,crypto_sign:Sf,crypto_sign_keypair:tf,crypto_sign_open:ef,crypto_secretbox_KEYBYTES:af,crypto_secretbox_NONCEBYTES:Xr,crypto_secretbox_ZEROBYTES:Mr,crypto_secretbox_BOXZEROBYTES:Sr,crypto_scalarmult_BYTES:Pr,crypto_scalarmult_SCALARBYTES:Zr,crypto_box_PUBLICKEYBYTES:Yr,crypto_box_SECRETKEYBYTES:Kr,crypto_box_BEFORENMBYTES:cf,crypto_box_NONCEBYTES:Tf,crypto_box_ZEROBYTES:Ff,crypto_box_BOXZEROBYTES:jf,crypto_sign_BYTES:ur,crypto_sign_PUBLICKEYBYTES:br,crypto_sign_SECRETKEYBYTES:Tr,crypto_sign_SEEDBYTES:hf,crypto_hash_BYTES:yf,gf:l,D:lr,L:Nr,pack25519:Br,unpack25519:rf,M:D,A:cr,S:ar,Z:hr,pow2523:bf,add:Dr,set25519:yr,modL:nf,scalarmult:_f,scalarbase:Ir};function qf(f,i){if(f.length!==af)throw new Error("bad key size");if(i.length!==Xr)throw new Error("bad nonce size")}function Gf(f,i){if(f.length!==Yr)throw new Error("bad public key size");if(i.length!==Kr)throw new Error("bad secret key size")}function er(){for(var f=0;f<arguments.length;f++)if(!(arguments[f]instanceof Uint8Array))throw new TypeError("unexpected type, use Uint8Array")}function Uf(f){for(var i=0;i<f.length;i++)f[i]=0}p.randomBytes=function(f){var i=new Uint8Array(f);return $(i,f),i},p.secretbox=function(f,i,_){er(f,i,_),qf(_,i);for(var r=new Uint8Array(Mr+f.length),t=new Uint8Array(r.length),o=0;o<f.length;o++)r[o+Mr]=f[o];return Jr(t,r,r.length,i,_),t.subarray(Sr)},p.secretbox.open=function(f,i,_){er(f,i,_),qf(_,i);for(var r=new Uint8Array(Sr+f.length),t=new Uint8Array(r.length),o=0;o<f.length;o++)r[o+Sr]=f[o];return r.length<32||Vr(t,r,r.length,i,_)!==0?null:t.subarray(Mr)},p.secretbox.keyLength=af,p.secretbox.nonceLength=Xr,p.secretbox.overheadLength=Sr,p.scalarMult=function(f,i){if(er(f,i),f.length!==Zr)throw new Error("bad n size");if(i.length!==Pr)throw new Error("bad p size");var _=new Uint8Array(Pr);return Lr(_,f,i),_},p.scalarMult.base=function(f){if(er(f),f.length!==Zr)throw new Error("bad n size");var i=new Uint8Array(Pr);return Rr(i,f),i},p.scalarMult.scalarLength=Zr,p.scalarMult.groupElementLength=Pr,p.box=function(f,i,_,r){var t=p.box.before(_,r);return p.secretbox(f,i,t)},p.box.before=function(f,i){er(f,i),Gf(f,i);var _=new Uint8Array(cf);return zr(_,f,i),_},p.box.after=p.secretbox,p.box.open=function(f,i,_,r){var t=p.box.before(_,r);return p.secretbox.open(f,i,t)},p.box.open.after=p.secretbox.open,p.box.keyPair=function(){var f=new Uint8Array(Yr),i=new Uint8Array(Kr);return vf(f,i),{publicKey:f,secretKey:i}},p.box.keyPair.fromSecretKey=function(f){if(er(f),f.length!==Kr)throw new Error("bad secret key size");var i=new Uint8Array(Yr);return Rr(i,f),{publicKey:i,secretKey:new Uint8Array(f)}},p.box.publicKeyLength=Yr,p.box.secretKeyLength=Kr,p.box.sharedKeyLength=cf,p.box.nonceLength=Tf,p.box.overheadLength=p.secretbox.overheadLength,p.sign=function(f,i){if(er(f,i),i.length!==Tr)throw new Error("bad secret key size");var _=new Uint8Array(ur+f.length);return Sf(_,f,f.length,i),_},p.sign.open=function(f,i){if(er(f,i),i.length!==br)throw new Error("bad public key size");var _=new Uint8Array(f.length),r=ef(_,f,f.length,i);if(r<0)return null;for(var t=new Uint8Array(r),o=0;o<t.length;o++)t[o]=_[o];return t},p.sign.detached=function(f,i){for(var _=p.sign(f,i),r=new Uint8Array(ur),t=0;t<r.length;t++)r[t]=_[t];return r},p.sign.detached.verify=function(f,i,_){if(er(f,i,_),i.length!==ur)throw new Error("bad signature size");if(_.length!==br)throw new Error("bad public key size");var r=new Uint8Array(ur+f.length),t=new Uint8Array(ur+f.length),o;for(o=0;o<ur;o++)r[o]=i[o];for(o=0;o<f.length;o++)r[o+ur]=f[o];return ef(t,r,r.length,_)>=0},p.sign.keyPair=function(){var f=new Uint8Array(br),i=new Uint8Array(Tr);return tf(f,i),{publicKey:f,secretKey:i}},p.sign.keyPair.fromSecretKey=function(f){if(er(f),f.length!==Tr)throw new Error("bad secret key size");for(var i=new Uint8Array(br),_=0;_<i.length;_++)i[_]=f[32+_];return{publicKey:i,secretKey:new Uint8Array(f)}},p.sign.keyPair.fromSeed=function(f){if(er(f),f.length!==hf)throw new Error("bad seed size");for(var i=new Uint8Array(br),_=new Uint8Array(Tr),r=0;r<32;r++)_[r]=f[r];return tf(i,_,!0),{publicKey:i,secretKey:_}},p.sign.publicKeyLength=br,p.sign.secretKeyLength=Tr,p.sign.seedLength=hf,p.sign.signatureLength=ur,p.hash=function(f){er(f);var i=new Uint8Array(yf);return xr(i,f,f.length),i},p.hash.hashLength=yf,p.verify=function(f,i){return er(f,i),f.length===0||i.length===0||f.length!==i.length?!1:dr(f,0,i,0,f.length)===0},p.setPRNG=function(f){$=f},(function(){var f=typeof self<"u"?self.crypto||self.msCrypto:null;if(f&&f.getRandomValues){var i=65536;p.setPRNG(function(_,r){var t,o=new Uint8Array(r);for(t=0;t<r;t+=i)f.getRandomValues(o.subarray(t,t+Math.min(r-t,i)));for(t=0;t<r;t++)_[t]=o[t];Uf(o)})}else typeof __<"u"&&(f=n_,f&&f.randomBytes&&p.setPRNG(function(_,r){var t,o=f.randomBytes(r);for(t=0;t<r;t++)_[t]=o[t];Uf(o)}))})()})(S.exports?S.exports:self.nacl=self.nacl||{})})(uf)),uf.exports}var e_=o_();const a_=r_(e_);function c_(){return zf+`
`+Df+`
`+If+`
`+Nf+`
`+Xf+`
`+Zf+`
`+Hf+`
`+Wf+`
`+$f+`
`+Qf+`
`+Jf+`
`+Vf+`
`+kf}async function h_(){const S=await fetch("./ed25519-comb-w4.bin");if(!S.ok)throw new Error(`Failed to load comb table: ${S.statusText}`);const p=await S.arrayBuffer();return new Uint32Array(p)}function y_(S){if(S.length<32){const l=new Uint8Array(32);l.set(S,32-S.length),S=l}const p=new Uint32Array(8);for(let l=0;l<8;l++)p[l]=S[l*4]<<24|S[l*4+1]<<16|S[l*4+2]<<8|S[l*4+3];return p}function Pf(S){const p=new Uint8Array(32);for(let l=0;l<8;l++)p[l*4]=S[l]>>24&255,p[l*4+1]=S[l]>>16&255,p[l*4+2]=S[l]>>8&255,p[l*4+3]=S[l]&255;return p}function u_(){return new Uint8Array(crypto.getRandomValues(new Uint8Array(32)))}async function l_(S){const p=await crypto.subtle.digest("SHA-512",S.buffer);let l=new Uint8Array(p.slice(0,32));return l[0]&=248,l[31]&=63,l[31]|=64,l}class d_{constructor(){Hr(this,"device",null);Hr(this,"combTable",null);Hr(this,"shaderCode","")}async init(){if(!navigator.gpu)throw alert("WebGPU not supported in this environment"),new Error("WebGPU not supported in this environment");const p=await navigator.gpu.requestAdapter();if(!p)throw alert("No appropriate GPUAdapter found"),new Error("No appropriate GPUAdapter found");this.device=await p.requestDevice(),this.shaderCode=c_(),this.combTable=await h_()}async multiply(p){if(!this.device||!this.combTable)throw new Error("Device not initialized. Call init() first.");const l=y_(p),$=this.device.createShaderModule({code:this.shaderCode}),z=this.device.createBuffer({size:this.combTable.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),rr=this.device.createBuffer({size:l.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),nr=this.device.createBuffer({size:64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),or=this.device.createBuffer({size:64,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),vr=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),lr=this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});this.device.queue.writeBuffer(z,0,this.combTable),this.device.queue.writeBuffer(rr,0,l);const pr=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),gr=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),wr=this.device.createBindGroup({layout:pr,entries:[{binding:0,resource:{buffer:z}}]}),qr=this.device.createBindGroup({layout:gr,entries:[{binding:0,resource:{buffer:rr}},{binding:1,resource:{buffer:nr}},{binding:2,resource:{buffer:vr}}]}),Or=await this.device.createComputePipelineAsync({layout:this.device.createPipelineLayout({bindGroupLayouts:[pr,gr]}),compute:{module:$,entryPoint:"multiply"}}),dr=this.device.createCommandEncoder(),sr=dr.beginComputePass();sr.setPipeline(Or),sr.setBindGroup(0,wr),sr.setBindGroup(1,qr),sr.dispatchWorkgroups(1),sr.end(),dr.copyBufferToBuffer(nr,0,or,0,64),dr.copyBufferToBuffer(vr,0,lr,0,8),this.device.queue.submit([dr.finish()]),await this.device.queue.onSubmittedWorkDone(),await or.mapAsync(GPUMapMode.READ);const Ur=or.getMappedRange(),Fr=new Uint32Array(Ur).slice(0);or.unmap(),await lr.mapAsync(GPUMapMode.READ),or.unmap();const Wr=Pf(Fr.slice(0,8)),Er=Pf(Fr.slice(8,16));return[Wr,Er]}}function s_(){const S=[];S.push({name:"Secret Key = 0",secretKey:new Uint8Array(32)});const p=new Uint8Array(32);p[31]=1,S.push({name:"Secret Key = 1",secretKey:p});const l=new Uint8Array(32);for(let z=0;z<32;z++)l[z]=255;S.push({name:"Secret Key = 0xFF...FF",secretKey:l});const $=new Uint8Array(32);$[31]=42,S.push({name:"Secret Key = 42",secretKey:$});for(let z=0;z<3;z++)S.push({name:`Random Secret Key ${z+1}`,secretKey:u_()});return S}function Cr(S){return Array.from(S).map(p=>p.toString(16).padStart(2,"0")).join("")}async function p_(){try{console.log("🚀 Starting Ed25519 Scalar Multiplication Test"),console.log("=".repeat(80));const S=new d_;await S.init();const p=s_();for(let l=0;l<p.length;l++){const $=p[l];console.log(`Test ${l+1}: ${$.name}`),console.log(`Secret Key: 0x${Cr($.secretKey)}`);try{const z=await l_($.secretKey);console.log(`Derived Scalar: 0x${Cr(z)}`),l===0&&console.log("⌛️ The first one will take a while to compute...");const rr=performance.now(),[nr,or]=await S.multiply(z),vr=performance.now();console.log(`WebGPU Result X: 0x${Cr(nr)}`),console.log(`WebGPU Result Y: 0x${Cr(or)}`);let lr=or;lr[31]|=nr[0]<<7;const pr=a_.sign.keyPair.fromSeed($.secretKey).publicKey;console.log(`TweetNaCl Public Key (reference): 0x${Cr(pr)}`);const gr=pr.every((wr,qr)=>wr===lr[qr]);console.log(`⌛️ Execution time: ${(vr-rr).toFixed(2)}ms`),console.log(gr?"✅ PASSED":"❌ POTENTIAL MISMATCH")}catch(z){console.error(`❌ Error: ${z}`)}console.log(`
`+"─".repeat(80)+`
`)}}catch(S){console.error("❌ Fatal Error:",S)}}p_();
