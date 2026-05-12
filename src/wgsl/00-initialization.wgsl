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

const t: u32 = 255u;  // scalar length
const w: u32 = 4u;  // max value = 27; w is window width or column size     TODO 25 or 27
const d: u32 = 64u;  // ceil(t / w); d is the number of columns
const TABLE_SIZE: u32 = 480u;  // 2^w * 120 bytes per point / 4 bytes per u32

/*
  Field element (basically an integer n 0 <= n < 2^255 - 19).
  An element t, entries t[0]...t[9], represents the integer
  t[0] + 2^26 t[1] + 2^51 t[2] + 2^77 t[3] + 2^102 t[4] + ... + 2^230 t[9]
  So the limb sizes alternate between 26 and 25. 26 for even indices, 25 for odd indices.
  t[0] holds the least significant bits -> the order of the limbs is little-endian
*/
alias fe = array<i32, 10>;
alias u256 = array<u32, 8>;  // big-endian

@group(0) @binding(0) var<storage, read> comb_table: array<i32, TABLE_SIZE>;
@group(1) @binding(0) var<storage, read> scalar: u256;
@group(1) @binding(1) var<storage, read_write> result: array<u256, 2>;  // X, Y in affine coordinates
@group(1) @binding(2) var<storage, read_write> DEBUG_precomputed_point_0: affine_niels_point;

// Extended twisted Edwards coordinates [1] section 3
struct extended_point {
  X: fe,
  Y: fe,
  T: fe,
  Z: fe
}

// precomputed in this format for faster operations
struct affine_niels_point {
  YminusX: fe,  // Y - X
  YplusX: fe,   // Y + x
  kT: fe        // 2 * d' * X * Y
}

const IDENTITY: extended_point = extended_point(
  fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  fe(1, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  fe(1, 0, 0, 0, 0, 0, 0, 0, 0, 0)
);
