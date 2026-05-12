/**
 * Fixed-base comb precomputation for Ed25519 base point B.
 *
 * Fixed-base comb method:
 *   Parameters: window width w, d = ceil(t/w), k in {0..2^w-1}
 *   Precomputed table: T[k] for k = 0..2^w-1
 *   where T[k] = sum_{j : bit j of k is 1} (2^(j*d) * B)
 *
 * Output format per point: (Y-X, Y+X, 2*d*X*Y) in extended twisted Edwards coordinates,
 * each coordinate serialised as 10 32-bit limbs, ordered in little-endian order -> 120 bytes per entry.
 *
 * Usage:  node src/precompute.js [w] [t] [outfile]
 *   w       window width  (default 4)
 *   t       scalar bits   (default 255, the Ed25519 scalar size)
 *   outfile output path   (default ed25519-comb-table.bin)
 */

'use strict';

import fs from 'fs'

// ── Ed25519 field parameters ────────────────────────────────────────────────

// p = 2^255 - 19
const P = (1n << 255n) - 19n;

// Curve constant  d = -121665/121666 mod p
// Pre-computed value (from RFC 8032):
const D = 37095705934669439343138083508754565189542113879843219016388785533085940283555n;

// Base-point coordinates (from RFC 8032)
const GX = 15112221349535807912866137220509078750507884956996801842395676840639929736953n;
const GY = 46316835694926478169428394003475163141307993866256225615783033011972563770048n;

// Field arithmetic mod P ─────────────────────────────────────────────────────

function mod(a) {
  return ((a % P) + P) % P;
}

function addF(a, b) { return mod(a + b); }
function subF(a, b) { return mod(a - b); }
function mulF(a, b) { return mod(a * b); }

// Modular exponentiation
function powF(base, exp, m) {
  let result = 1n;
  base = base % m;
  while (exp > 0n) {
    if (exp & 1n) result = result * base % m;
    base = base * base % m;
    exp >>= 1n;
  }
  return result;
}

function invF(a) { return powF(mod(a), P - 2n, P); }

// ── Extended twisted Edwards point arithmetic ────────────────────────────────
// Representation: (X, Y, Z, T) with x = X/Z, y = Y/Z, x*y = T/Z
// Identity: (0, Z, Z, 0) for any Z≠0

function pointIdentity() {
  return { X: 0n, Y: 1n, Z: 1n, T: 0n };
}

function pointFromAffine(x, y) {
  return { X: mod(x), Y: mod(y), Z: 1n, T: mod(x * y) };
}

// Unified addition in extended coords (Hisil et al. 2008 – complete for Ed25519)
// https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
function pointAdd(P1, P2) {
  const { X: X1, Y: Y1, Z: Z1, T: T1 } = P1;
  const { X: X2, Y: Y2, Z: Z2, T: T2 } = P2;

  const A = mulF(subF(Y1, X1), subF(Y2, X2));
  const B = mulF(addF(Y1, X1), addF(Y2, X2));
  const C = mulF(mulF(2n, D), mulF(T1, T2));
  const DD = mulF(2n, mulF(Z1, Z2));
  const E = subF(B, A);
  const F = subF(DD, C);
  const G = addF(DD, C);
  const H = addF(B, A);

  return {
    X: mulF(E, F),
    Y: mulF(G, H),
    Z: mulF(F, G),
    T: mulF(E, H),
  };
}

// Point doubling (faster than generic add)
// https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
function pointDouble(P1) {
  const { X, Y, Z } = P1;

  const A = mulF(X, X);
  const B = mulF(Y, Y);
  const C = mulF(2n, mulF(Z, Z));
  const H = addF(A, B);
  const E = subF(H, mulF(addF(X, Y), addF(X, Y)));
  // E = H - (X+Y)^2 = -(2XY)
  const G = subF(A, B);
  const F = addF(C, G);

  return {
    X: mulF(E, F),
    Y: mulF(G, H),
    Z: mulF(F, G),
    T: mulF(E, H),
  };
}

// Scalar multiplication (double-and-add)
function pointMul(k, P1) {
  let Q = pointIdentity();
  let R = { ...P1 };
  while (k > 0n) {
    if (k & 1n) Q = pointAdd(Q, R);
    R = pointDouble(R);
    k >>= 1n;
  }
  return Q;
}

// Convert to affine
function toAffine(pt) {
  const zi = invF(pt.Z);
  return { x: mulF(pt.X, zi), y: mulF(pt.Y, zi) };
}

// ── Serialisation ─────────────────────────────────────────────────────────────

// Convert a field element to 10 25.5-bit limbs (as in ref10)
// Output format: 10 32-bit numbers (40 bytes total)
// Limb widths alternate: 26, 25, 26, 25, 26, 25, 26, 25, 26, 25 bits
// t = t[0] + 2^26*t[1] + 2^51*t[2] + 2^77*t[3] + 2^102*t[4] + ... + 2^230*t[9]
function fieldTo10Limbs(n) {
  n = mod(n);
  const limbs = new Array(10);
  const limbWidths = [26, 25, 26, 25, 26, 25, 26, 25, 26, 25];

  for (let i = 0; i < 10; i++) {
    const width = limbWidths[i];
    limbs[i] = Number(n & ((1n << BigInt(width)) - 1n));
    n >>= BigInt(width);
  }

  const buf = Buffer.alloc(40);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32LE(limbs[i], i * 4);  // TODO was BE
  }
  return buf;
}

// Encode one precomputed point as (Y-X, Y+X, 2*d*X*Y) using 10-limb ref10 format
// Each coordinate is 40 bytes (10 × 32-bit limbs) → 120 bytes per entry
function encodePoint(pt) {
  const { x, y } = toAffine(pt);
  const ymx  = subF(y, x);                   // Y - X
  const ypx  = addF(y, x);                   // Y + X
  const dxy2 = mulF(mulF(2n, D), mulF(x, y)); // 2 * curve_d * X * Y
  return Buffer.concat([fieldTo10Limbs(ymx), fieldTo10Limbs(ypx), fieldTo10Limbs(dxy2)]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const args    = process.argv.slice(2);
  const w       = parseInt(args[0] ?? '4',   10);
  const t       = parseInt(args[1] ?? '255', 10);
  const outfile = args[2] ?? 'ed25519-comb-table.bin';

  // d = ceil(t / w)
  const d = Math.ceil(t / w);

  console.log(`Ed25519 fixed-base comb precomputation (ref10 10-limb format)`);
  console.log(`  w = ${w}, t = ${t}, d = ${d}`);
  console.log(`  Table size: 2^${w} = ${1 << w} entries × 120 bytes (3 coords × 40 bytes)`);

  const B = pointFromAffine(GX, GY);

  // Pre-compute  step[j] = 2^(j*d) * B  for j = 0..w-1
  // step[0] = B
  // step[j] = 2^(d*(j)) * B = pointMul(2^(d*(j)), B)
  console.log(`\nPrecomputing ${w} step points (2^(j*d)*B)…`);
  const steps = [];
  {
    // step[0] = B
    // To get step[j] from step[j-1], double d times.
    let cur = B;
    for (let j = 0; j < w; j++) {
      if (j > 0) {
        process.stdout.write(`  step[${j}] = 2^${j * d} * B … `);
        for (let s = 0; s < d; s++) cur = pointDouble(cur);
        console.log('done');
      } else {
        console.log(`  step[0] = B`);
      }
      steps.push({ ...cur });
    }
  }

  // Build the look-up table: T[k] for k = 0..2^w - 1
  // T[k] = sum_{j=0}^{w-1} bit_j(k) * step[j]
  // We build it by iterating over k from 0 to 2^w - 1.
  // An efficient way: walk through all 2^w values and accumulate.
  const tableSize = 1 << w;
  console.log(`\nBuilding ${tableSize}-entry look-up table…`);

  const table = new Array(tableSize);
  table[0] = pointIdentity();

  for (let k = 1; k < tableSize; k++) {
    // Find the lowest set bit j of k
    const j = Math.floor(Math.log2(k & -k));  // position of lowest set bit
    // T[k] = T[k ^ (1<<j)] + step[j]
    table[k] = pointAdd(table[k ^ (1 << j)], steps[j]);

    if (k % 4 === 0 || k === tableSize - 1) {
      process.stdout.write(`\r  ${k + 1}/${tableSize} entries computed`);
    }
  }
  console.log('\n');

  // Serialise and write
  console.log(`Serialising to "${outfile}"…`);
  const chunks = [];
  for (let k = 0; k < tableSize; k++) {
    chunks.push(encodePoint(table[k]));
  }
  const output = Buffer.concat(chunks);
  fs.writeFileSync(outfile, output);

  console.log(`Done. Wrote ${output.length} bytes (${tableSize} points × 120 bytes).`);

  // ── Sanity check ────────────────────────────────────────────────────────────
  // Verify entry 1 (should be B) by decoding the limbs back
  console.log('\nSanity check:');
  {
    const buf = output.slice(120, 240); // entry k=1: should be B (120 bytes per entry)
    // Decode Y-X and Y+X from limbs
    const limbWidths = [26, 25, 26, 25, 26, 25, 26, 25, 26, 25];
    
    function limbsToField(limbBuf) {
      let result = 0n;
      let shift = 0n;
      for (let i = 0; i < 10; i++) {
        const limb = BigInt(limbBuf.readUInt32BE(i * 4));
        result += limb << shift;
        shift += BigInt(limbWidths[i]);
      }
      return result;
    }
    
    const ymx = limbsToField(buf.slice(0, 40));
    const ypx = limbsToField(buf.slice(40, 80));
    
    const y = mulF(addF(ymx, ypx), invF(2n));
    const x = subF(ypx, y);
    console.log(`  Entry 1 x matches GX: ${mod(x) === mod(GX)}`);
    console.log(`  Entry 1 y matches GY: ${mod(y) === mod(GY)}`);
  }

  // Verify entry 3 = step[0] + step[1] = B + 2^d*B = (2^d + 1)*B
  {
    const expected = pointAdd(steps[0], steps[1]);
    const actual   = table[3]; // k=0b11 → bit 0 and bit 1 set
    const ea = toAffine(expected);
    const aa = toAffine(actual);
    console.log(`  Entry 3 (B + 2^d*B) matches: ${ea.x === aa.x && ea.y === aa.y}`);
  }
}

main();