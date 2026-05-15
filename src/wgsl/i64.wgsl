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

fn i64_add(a: i64, b: i64) -> i64 {
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


fn mul32(x: u32, y: u32) -> i64 {
    let x0: u32 = x & 0xFFFF;
    let x1: u32 = x >> 16;
    let y0: u32 = y & 0xFFFF;
    let y1: u32 = y >> 16;

    let p00: u32 = x0 * y0;
    let p01: u32 = x0 * y1;
    let p10: u32 = x1 * y0;
    let p11: u32 = x1 * y1;

    let middle: u32 =
        (p00 >> 16) +
        (p01 & 0xFFFF) +
        (p10 & 0xFFFF);

    return i64(
        (p00 & 0xFFFF) |
        (middle << 16),


        p11 +
        (p01 >> 16) +
        (p10 >> 16) +
        (middle >> 16)
    );
}

fn i64_mul_to_i64(x: i64, y: i64) -> i64 {
    // low*low -> 64 bits
    let p0 = mul32(x.lo, y.lo);

    // cross products
    let p1 = mul32(x.lo, y.hi);
    let p2 = mul32(x.hi, y.lo);

    // low 32 bits come directly from p0
    let lo = p0.lo;

    // upper 32 bits:
    // p0.hi + low32(p1) + low32(p2)
    let hi =
        p0.hi +
        p1.lo +
        p2.lo;

    return i64(lo, hi);
}