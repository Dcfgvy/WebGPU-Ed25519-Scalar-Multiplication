/*
  Implementation of Ed25519 scalar multiplication in WGSL using a fixed-base comb method
  Based on:
    [1] "Twisted Edwards Curves Revisited" by Huseyin Hisil, Kenneth Koon-Ho Wong, Gary Carter, and Ed Dawson available at https://link.springer.com/chapter/10.1007/978-3-540-89255-7_20
    [2] Algorithm 17 in "Software Implementation of Elliptic Curve Cryptography over Binary Fields" by Darrel Hankerson, Julio López Hernandez, and Alfred Menezes available at https://link.springer.com/chapter/10.1007/3-540-44499-8_1
    [3] "High-speed high-security signatures" by Daniel J. Bernstein, Niels Duif, Tanja Lange, Peter Schwabe, and Bo-Yin Yang available at https://link.springer.com/article/10.1007/s13389-012-0027-1
    [4] Daniel J. Bernstein's ref10 reference implementation available at https://github.com/floodyberry/supercop/tree/master/crypto_sign/ed25519/ref10
  Copyright (c) 2026 Ivan Kusliy <ipkusliywork@gmail.com>
  Licensed under the MIT License
*/

// TODO mix extended affine with extended twisted edwards coordinates as described in [1] section 4.3

const t: u32 = 256u;  // scalar length

/*
  Window or "comb" width or "column" size. See [2]
  Max value = 9, limited by the size of uniform buffers (64 KiB), since the table size grows exponentially with w
*/
const w: u32 = 4u;

/*
  Number of "columns" = ceil(t / w)
  Number of field element multiplications in the cycle is proportional to d
*/
const d: u32 = 64u;

const PRECOMPUTED_COMB_TABLE_SIZE: u32 = 480u;  // 2^w * 120 bytes per point / 4 bytes per u32

/*
  Field element (basically an integer n 0 <= n < 2^255 - 19).
  An element t, entries t[0]...t[9], represents the integer
  t[0] + 2^26 t[1] + 2^51 t[2] + 2^77 t[3] + 2^102 t[4] + ... + 2^230 t[9]
  So the limb sizes alternate between 26 and 25. 26 for even indices, 25 for odd indices.
  t[0] holds the least significant bits -> the order of the limbs is little-endian
*/
alias fe = array<i32, 10>;

alias u256 = array<u32, 8>;

// Extended twisted Edwards coordinates [1] section 3
struct extended_point {
  X: fe,
  Y: fe,
  T: fe,
  Z: fe
}

// Precomputed in this format for faster operations
struct affine_niels_point {
  YminusX: fe,  // Y - X
  YplusX: fe,   // Y + X
  kT: fe        // 2 * d' * X * Y
}

/*
  Precomputed point as described in [2], sorted by their indices in asending order
  Each point is represented in affine_niels_point format, therefore takes up 120 bytes or 30 array elements
*/
@group(0) @binding(0) var<uniform> comb_table: array<i32, PRECOMPUTED_COMB_TABLE_SIZE>;

/*
  The scalar in little-endian bit-packed form
  That means scalar[0] >> 24 is the least significant byte
*/
@group(1) @binding(0) var<uniform> scalar: u256;

/*
  The result is a point = scalar * B, where B is the base point with y = 4/5 and x is positive (LSB is 0)
  The resulting point is represented in affine coordinates with a pair of 256-bit integers X and Y
  X and Y are also bit-packed little-endian integers
*/
@group(1) @binding(1) var<storage, read_write> result: array<u256, 2>;

@group(1) @binding(2) var<storage, read_write> DEBUG: array<u32, 2>;

const IDENTITY: extended_point = extended_point(
  fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  fe(1, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  fe(1, 0, 0, 0, 0, 0, 0, 0, 0, 0)
);
