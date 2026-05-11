struct i64 {
    lo: u32,
    hi: u32
};

// --- Constructors ---

fn i64_from_i32(x: i32) -> i64 {
    // Sign-extend: if x is negative, high word is all 1s; if positive, all 0s.
    let lo = bitcast<u32>(x);
    let hi = bitcast<u32>(x >> 31);   // arithmetic right shift fills with sign bit
    return i64(lo, hi);
}

fn i64_from_u32(x: u32) -> i64 {
    // Zero-extend: high word is always 0, value is never negative.
    return i64(x, 0u);
}

// --- Addition ---

fn i64_sum(a: i64, b: i64) -> i64 {
    let lo    = a.lo + b.lo;
    let carry = u32(lo < a.lo);       // wrapping overflow detection
    let hi    = a.hi + b.hi + carry;
    return i64(lo, hi);
}

// --- Subtraction ---

fn i64_sub(a: i64, b: i64) -> i64 {
    let lo     = a.lo - b.lo;
    let borrow = u32(a.lo < b.lo);    // borrow if lo underflowed
    let hi     = a.hi - b.hi - borrow;
    return i64(lo, hi);
}

// --- Left shift (0 < shift < 32) ---

fn i64_left_shift(a: i64, shift: u32) -> i64 {
    // Bits shifted out of lo.high end move into hi.
    let lo = a.lo << shift;
    let hi = (a.hi << shift) | (a.lo >> (32u - shift));
    return i64(lo, hi);
}

// --- Arithmetic right shift (0 < shift < 32) ---

fn i64_right_shift(a: i64, shift: u32) -> i64 {
    // Bits shifted out of hi.low end move into lo.
    // hi is sign-extended via arithmetic shift on its i32 reinterpretation.
    let lo = (a.lo >> shift) | (a.hi << (32u - shift));
    let hi = bitcast<u32>(bitcast<i32>(a.hi) >> shift);  // arithmetic, preserves sign
    return i64(lo, hi);
}

fn i64_mul_to_i64(a: i64, b: i64) -> i64 {
    // Full 64-bit lo*lo product via 16-bit schoolbook,
    // since WGSL has no 32x32->64 multiply.
    //
    // Split each lo into 16-bit halves:
    //   a.lo = a1 * 2^16 + a0
    //   b.lo = b1 * 2^16 + b0
    //
    // a.lo * b.lo = a1*b1 * 2^32          <- goes into hi
    //             + (a1*b0 + a0*b1) * 2^16
    //             + a0*b0

    let a0 = a.lo & 0xFFFFu;
    let a1 = a.lo >> 16u;
    let b0 = b.lo & 0xFFFFu;
    let b1 = b.lo >> 16u;

    let p00 = a0 * b0;                     // fits in u32
    let p01 = a0 * b1;                     // fits in u32
    let p10 = a1 * b0;                     // fits in u32
    let p11 = a1 * b1;                     // fits in u32

    // Accumulate lo, tracking carry into hi
    let mid  = p01 + p10;                  // may carry out of u32
    let mid_carry = u32(mid < p01);        // 1 if mid wrapped

    let lo   = p00 + (mid << 16u);
    let lo_carry = u32(lo < p00);          // 1 if lo wrapped

    // Accumulate hi
    // p11       sits at 2^32 (directly in hi)
    // mid >> 16 is the high half of the middle terms
    // mid_carry << 16 accounts for the carry out of mid
    // lo_carry  accounts for the carry out of lo
    let hi = p11
           + (mid >> 16u) + (mid_carry << 16u)
           + lo_carry
           + a.hi * b.lo                  // cross terms: only contribute to hi
           + a.lo * b.hi;                 // (a.hi * b.hi would be 2^64, discarded)

    return i64(lo, hi);
}