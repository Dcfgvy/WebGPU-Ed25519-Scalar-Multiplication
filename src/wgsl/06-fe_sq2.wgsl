fn fe_sq2(a: fe) -> fe {
  let f0_2: i32 = 2 * a[0];
  let f1_2: i32 = 2 * a[1];
  let f2_2: i32 = 2 * a[2];
  let f3_2: i32 = 2 * a[3];
  let f4_2: i32 = 2 * a[4];
  let f5_2: i32 = 2 * a[5];
  let f6_2: i32 = 2 * a[6];
  let f7_2: i32 = 2 * a[7];
  let f5_38: i32 = 38 * a[5]; /* 1.959375*2^30 */
  let f6_19: i32 = 19 * a[6]; /* 1.959375*2^30 */
  let f7_38: i32 = 38 * a[7]; /* 1.959375*2^30 */
  let f8_19: i32 = 19 * a[8]; /* 1.959375*2^30 */
  let f9_38: i32 = 38 * a[9]; /* 1.959375*2^30 */
  
  let f0f0: i64    = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(a[0]));
  let f0f1_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[1]));
  let f0f2_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[2]));
  let f0f3_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[3]));
  let f0f4_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[4]));
  let f0f5_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[5]));
  let f0f6_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[6]));
  let f0f7_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[7]));
  let f0f8_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[8]));
  let f0f9_2: i64  = i64_mul_to_i64(i64_from_i32(f0_2), i64_from_i32(a[9]));
  let f1f1_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[1]));
  let f1f2_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[2]));
  let f1f3_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f3_2));
  let f1f4_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[4]));
  let f1f5_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f5_2));
  let f1f6_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[6]));
  let f1f7_4: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f7_2));
  let f1f8_2: i64  = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(a[8]));
  let f1f9_76: i64 = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(f9_38));
  let f2f2: i64    = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(a[2]));
  let f2f3_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[3]));
  let f2f4_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[4]));
  let f2f5_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[5]));
  let f2f6_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[6]));
  let f2f7_2: i64  = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(a[7]));
  let f2f8_38: i64 = i64_mul_to_i64(i64_from_i32(f2_2), i64_from_i32(f8_19));
  let f2f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(f9_38));
  let f3f3_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[3]));
  let f3f4_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[4]));
  let f3f5_4: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f5_2));
  let f3f6_2: i64  = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(a[6]));
  let f3f7_76: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f7_38));
  let f3f8_38: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f8_19));
  let f3f9_76: i64 = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(f9_38));
  let f4f4: i64    = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(a[4]));
  let f4f5_2: i64  = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(a[5]));
  let f4f6_38: i64 = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(f6_19));
  let f4f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(f7_38));
  let f4f8_38: i64 = i64_mul_to_i64(i64_from_i32(f4_2), i64_from_i32(f8_19));
  let f4f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(f9_38));
  let f5f5_38: i64 = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(f5_38));
  let f5f6_38: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f6_19));
  let f5f7_76: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f7_38));
  let f5f8_38: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f8_19));
  let f5f9_76: i64 = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(f9_38));
  let f6f6_19: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f6_19));
  let f6f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f7_38));
  let f6f8_38: i64 = i64_mul_to_i64(i64_from_i32(f6_2), i64_from_i32(f8_19));
  let f6f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(f9_38));
  let f7f7_38: i64 = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(f7_38));
  let f7f8_38: i64 = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(f8_19));
  let f7f9_76: i64 = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(f9_38));
  let f8f8_19: i64 = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(f8_19));
  let f8f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(f9_38));
  let f9f9_38: i64 = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(f9_38));
  
  var h0: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0f0, f1f9_76), f2f8_38), f3f7_76), f4f6_38), f5f5_38);
  var h1: i64 = i64_sum(i64_sum(i64_sum(i64_sum(f0f1_2, f2f9_38), f3f8_38), f4f7_38), f5f6_38);
  var h2: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0f2_2, f1f1_2), f3f9_76), f4f8_38), f5f7_76), f6f6_19);
  var h3: i64 = i64_sum(i64_sum(i64_sum(i64_sum(f0f3_2, f1f2_2), f4f9_38), f5f8_38), f6f7_38);
  var h4: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0f4_2, f1f3_4), f2f2), f5f9_76), f6f8_38), f7f7_38);
  var h5: i64 = i64_sum(i64_sum(i64_sum(i64_sum(f0f5_2, f1f4_2), f2f3_2), f6f9_38), f7f8_38);
  var h6: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0f6_2, f1f5_4), f2f4_2), f3f3_2), f7f9_76), f8f8_19);
  var h7: i64 = i64_sum(i64_sum(i64_sum(i64_sum(f0f7_2, f1f6_2), f2f5_2), f3f4_2), f8f9_38);
  var h8: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0f8_2, f1f7_4), f2f6_2), f3f5_4), f4f4), f9f9_38);
  var h9: i64 = i64_sum(i64_sum(i64_sum(i64_sum(f0f9_2, f1f8_2), f2f7_2), f3f6_2), f4f5_2);
  var carry0: i64 = i64_from_u32(0u);
  var carry1: i64 = i64_from_u32(0u);
  var carry2: i64 = i64_from_u32(0u);
  var carry3: i64 = i64_from_u32(0u);
  var carry4: i64 = i64_from_u32(0u);
  var carry5: i64 = i64_from_u32(0u);
  var carry6: i64 = i64_from_u32(0u);
  var carry7: i64 = i64_from_u32(0u);
  var carry8: i64 = i64_from_u32(0u);
  var carry9: i64 = i64_from_u32(0u);

  h0 = i64_sum(h0, h0);
  h1 = i64_sum(h1, h1);
  h2 = i64_sum(h2, h2);
  h3 = i64_sum(h3, h3);
  h4 = i64_sum(h4, h4);
  h5 = i64_sum(h5, h5);
  h6 = i64_sum(h6, h6);
  h7 = i64_sum(h7, h7);
  h8 = i64_sum(h8, h8);
  h9 = i64_sum(h9, h9);

  carry0 = i64_right_shift(i64_sum(h0, i64_from_u32(1u << 25u)), 26u);
  h1 = i64_sum(h1, carry0);
  h0 = i64_sub(h0, i64_left_shift(carry0, 26u));
  carry4 = i64_right_shift(i64_sum(h4, i64_from_u32(1u << 25u)), 26u);
  h5 = i64_sum(h5, carry4);
  h4 = i64_sub(h4, i64_left_shift(carry4, 26u));

  carry1 = i64_right_shift(i64_sum(h1, i64_from_u32(1u << 24u)), 25u);
  h2 = i64_sum(h2, carry1);
  h1 = i64_sub(h1, i64_left_shift(carry1, 25u));
  carry5 = i64_right_shift(i64_sum(h5, i64_from_u32(1u << 24u)), 25u);
  h6 = i64_sum(h6, carry5);
  h5 = i64_sub(h5, i64_left_shift(carry5, 25u));

  carry2 = i64_right_shift(i64_sum(h2, i64_from_u32(1u << 25u)), 26u);
  h3 = i64_sum(h3, carry2);
  h2 = i64_sub(h2, i64_left_shift(carry2, 26u));
  carry6 = i64_right_shift(i64_sum(h6, i64_from_u32(1u << 25u)), 26u);
  h7 = i64_sum(h7, carry6);
  h6 = i64_sub(h6, i64_left_shift(carry6, 26u));

  carry3 = i64_right_shift(i64_sum(h3, i64_from_u32(1u << 24u)), 25u);
  h4 = i64_sum(h4, carry3);
  h3 = i64_sub(h3, i64_left_shift(carry3, 25u));
  carry7 = i64_right_shift(i64_sum(h7, i64_from_u32(1u << 24u)), 25u);
  h8 = i64_sum(h8, carry7);
  h7 = i64_sub(h7, i64_left_shift(carry7, 25u));

  carry4 = i64_right_shift(i64_sum(h4, i64_from_u32(1u << 25u)), 26u);
  h5 = i64_sum(h5, carry4);
  h4 = i64_sub(h4, i64_left_shift(carry4, 26u));
  carry8 = i64_right_shift(i64_sum(h8, i64_from_u32(1u << 25u)), 26u);
  h9 = i64_sum(h9, carry8);
  h8 = i64_sub(h8, i64_left_shift(carry8, 26u));

  carry9 = i64_right_shift(i64_sum(h9, i64_from_u32(1u << 24u)), 25u);
  h0 = i64_sum(h0, i64_mul_to_i64(i64_from_i32(19), carry9));
  h9 = i64_sub(h9, i64_left_shift(carry9, 25u));

  carry0 = i64_right_shift(i64_sum(h0, i64_from_u32(1u << 25u)), 26u);
  h1 = i64_sum(h1, carry0);
  h0 = i64_sub(h0, i64_left_shift(carry0, 26u));

  return fe(
    bitcast<i32>(h0.lo), bitcast<i32>(h1.lo), bitcast<i32>(h2.lo), bitcast<i32>(h3.lo), bitcast<i32>(h4.lo),
    bitcast<i32>(h5.lo), bitcast<i32>(h6.lo), bitcast<i32>(h7.lo), bitcast<i32>(h8.lo), bitcast<i32>(h9.lo)
  );
}

/*
In C:

void fe_sq2(fe h,const fe f)
{
  crypto_int32 f0 = f[0];
  crypto_int32 f1 = f[1];
  crypto_int32 f2 = f[2];
  crypto_int32 f3 = f[3];
  crypto_int32 f4 = f[4];
  crypto_int32 f5 = f[5];
  crypto_int32 f6 = f[6];
  crypto_int32 f7 = f[7];
  crypto_int32 f8 = f[8];
  crypto_int32 f9 = f[9];
  crypto_int32 f0_2 = 2 * f0;
  crypto_int32 f1_2 = 2 * f1;
  crypto_int32 f2_2 = 2 * f2;
  crypto_int32 f3_2 = 2 * f3;
  crypto_int32 f4_2 = 2 * f4;
  crypto_int32 f5_2 = 2 * f5;
  crypto_int32 f6_2 = 2 * f6;
  crypto_int32 f7_2 = 2 * f7;
  crypto_int32 f5_38 = 38 * f5; /* 1.959375*2^30 */
  crypto_int32 f6_19 = 19 * f6; /* 1.959375*2^30 */
  crypto_int32 f7_38 = 38 * f7; /* 1.959375*2^30 */
  crypto_int32 f8_19 = 19 * f8; /* 1.959375*2^30 */
  crypto_int32 f9_38 = 38 * f9; /* 1.959375*2^30 */
  crypto_int64 f0f0    = f0   * (crypto_int64) f0;
  crypto_int64 f0f1_2  = f0_2 * (crypto_int64) f1;
  crypto_int64 f0f2_2  = f0_2 * (crypto_int64) f2;
  crypto_int64 f0f3_2  = f0_2 * (crypto_int64) f3;
  crypto_int64 f0f4_2  = f0_2 * (crypto_int64) f4;
  crypto_int64 f0f5_2  = f0_2 * (crypto_int64) f5;
  crypto_int64 f0f6_2  = f0_2 * (crypto_int64) f6;
  crypto_int64 f0f7_2  = f0_2 * (crypto_int64) f7;
  crypto_int64 f0f8_2  = f0_2 * (crypto_int64) f8;
  crypto_int64 f0f9_2  = f0_2 * (crypto_int64) f9;
  crypto_int64 f1f1_2  = f1_2 * (crypto_int64) f1;
  crypto_int64 f1f2_2  = f1_2 * (crypto_int64) f2;
  crypto_int64 f1f3_4  = f1_2 * (crypto_int64) f3_2;
  crypto_int64 f1f4_2  = f1_2 * (crypto_int64) f4;
  crypto_int64 f1f5_4  = f1_2 * (crypto_int64) f5_2;
  crypto_int64 f1f6_2  = f1_2 * (crypto_int64) f6;
  crypto_int64 f1f7_4  = f1_2 * (crypto_int64) f7_2;
  crypto_int64 f1f8_2  = f1_2 * (crypto_int64) f8;
  crypto_int64 f1f9_76 = f1_2 * (crypto_int64) f9_38;
  crypto_int64 f2f2    = f2   * (crypto_int64) f2;
  crypto_int64 f2f3_2  = f2_2 * (crypto_int64) f3;
  crypto_int64 f2f4_2  = f2_2 * (crypto_int64) f4;
  crypto_int64 f2f5_2  = f2_2 * (crypto_int64) f5;
  crypto_int64 f2f6_2  = f2_2 * (crypto_int64) f6;
  crypto_int64 f2f7_2  = f2_2 * (crypto_int64) f7;
  crypto_int64 f2f8_38 = f2_2 * (crypto_int64) f8_19;
  crypto_int64 f2f9_38 = f2   * (crypto_int64) f9_38;
  crypto_int64 f3f3_2  = f3_2 * (crypto_int64) f3;
  crypto_int64 f3f4_2  = f3_2 * (crypto_int64) f4;
  crypto_int64 f3f5_4  = f3_2 * (crypto_int64) f5_2;
  crypto_int64 f3f6_2  = f3_2 * (crypto_int64) f6;
  crypto_int64 f3f7_76 = f3_2 * (crypto_int64) f7_38;
  crypto_int64 f3f8_38 = f3_2 * (crypto_int64) f8_19;
  crypto_int64 f3f9_76 = f3_2 * (crypto_int64) f9_38;
  crypto_int64 f4f4    = f4   * (crypto_int64) f4;
  crypto_int64 f4f5_2  = f4_2 * (crypto_int64) f5;
  crypto_int64 f4f6_38 = f4_2 * (crypto_int64) f6_19;
  crypto_int64 f4f7_38 = f4   * (crypto_int64) f7_38;
  crypto_int64 f4f8_38 = f4_2 * (crypto_int64) f8_19;
  crypto_int64 f4f9_38 = f4   * (crypto_int64) f9_38;
  crypto_int64 f5f5_38 = f5   * (crypto_int64) f5_38;
  crypto_int64 f5f6_38 = f5_2 * (crypto_int64) f6_19;
  crypto_int64 f5f7_76 = f5_2 * (crypto_int64) f7_38;
  crypto_int64 f5f8_38 = f5_2 * (crypto_int64) f8_19;
  crypto_int64 f5f9_76 = f5_2 * (crypto_int64) f9_38;
  crypto_int64 f6f6_19 = f6   * (crypto_int64) f6_19;
  crypto_int64 f6f7_38 = f6   * (crypto_int64) f7_38;
  crypto_int64 f6f8_38 = f6_2 * (crypto_int64) f8_19;
  crypto_int64 f6f9_38 = f6   * (crypto_int64) f9_38;
  crypto_int64 f7f7_38 = f7   * (crypto_int64) f7_38;
  crypto_int64 f7f8_38 = f7_2 * (crypto_int64) f8_19;
  crypto_int64 f7f9_76 = f7_2 * (crypto_int64) f9_38;
  crypto_int64 f8f8_19 = f8   * (crypto_int64) f8_19;
  crypto_int64 f8f9_38 = f8   * (crypto_int64) f9_38;
  crypto_int64 f9f9_38 = f9   * (crypto_int64) f9_38;
  crypto_int64 h0 = f0f0  +f1f9_76+f2f8_38+f3f7_76+f4f6_38+f5f5_38;
  crypto_int64 h1 = f0f1_2+f2f9_38+f3f8_38+f4f7_38+f5f6_38;
  crypto_int64 h2 = f0f2_2+f1f1_2 +f3f9_76+f4f8_38+f5f7_76+f6f6_19;
  crypto_int64 h3 = f0f3_2+f1f2_2 +f4f9_38+f5f8_38+f6f7_38;
  crypto_int64 h4 = f0f4_2+f1f3_4 +f2f2   +f5f9_76+f6f8_38+f7f7_38;
  crypto_int64 h5 = f0f5_2+f1f4_2 +f2f3_2 +f6f9_38+f7f8_38;
  crypto_int64 h6 = f0f6_2+f1f5_4 +f2f4_2 +f3f3_2 +f7f9_76+f8f8_19;
  crypto_int64 h7 = f0f7_2+f1f6_2 +f2f5_2 +f3f4_2 +f8f9_38;
  crypto_int64 h8 = f0f8_2+f1f7_4 +f2f6_2 +f3f5_4 +f4f4   +f9f9_38;
  crypto_int64 h9 = f0f9_2+f1f8_2 +f2f7_2 +f3f6_2 +f4f5_2;
  crypto_int64 carry0;
  crypto_int64 carry1;
  crypto_int64 carry2;
  crypto_int64 carry3;
  crypto_int64 carry4;
  crypto_int64 carry5;
  crypto_int64 carry6;
  crypto_int64 carry7;
  crypto_int64 carry8;
  crypto_int64 carry9;

  h0 += h0;
  h1 += h1;
  h2 += h2;
  h3 += h3;
  h4 += h4;
  h5 += h5;
  h6 += h6;
  h7 += h7;
  h8 += h8;
  h9 += h9;

  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;
  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;

  carry1 = (h1 + (crypto_int64) (1<<24)) >> 25; h2 += carry1; h1 -= carry1 << 25;
  carry5 = (h5 + (crypto_int64) (1<<24)) >> 25; h6 += carry5; h5 -= carry5 << 25;

  carry2 = (h2 + (crypto_int64) (1<<25)) >> 26; h3 += carry2; h2 -= carry2 << 26;
  carry6 = (h6 + (crypto_int64) (1<<25)) >> 26; h7 += carry6; h6 -= carry6 << 26;

  carry3 = (h3 + (crypto_int64) (1<<24)) >> 25; h4 += carry3; h3 -= carry3 << 25;
  carry7 = (h7 + (crypto_int64) (1<<24)) >> 25; h8 += carry7; h7 -= carry7 << 25;

  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;
  carry8 = (h8 + (crypto_int64) (1<<25)) >> 26; h9 += carry8; h8 -= carry8 << 26;

  carry9 = (h9 + (crypto_int64) (1<<24)) >> 25; h0 += carry9 * 19; h9 -= carry9 << 25;

  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;

  h[0] = h0;
  h[1] = h1;
  h[2] = h2;
  h[3] = h3;
  h[4] = h4;
  h[5] = h5;
  h[6] = h6;
  h[7] = h7;
  h[8] = h8;
  h[9] = h9;
}
*/