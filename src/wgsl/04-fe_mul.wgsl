fn fe_mul(a: fe, b: fe) -> fe {
  let g1_19: i32 = 19 * b[1]; /* 1.959375*2^29 */
  let g2_19: i32 = 19 * b[2]; /* 1.959375*2^30; still ok */
  let g3_19: i32 = 19 * b[3];
  let g4_19: i32 = 19 * b[4];
  let g5_19: i32 = 19 * b[5];
  let g6_19: i32 = 19 * b[6];
  let g7_19: i32 = 19 * b[7];
  let g8_19: i32 = 19 * b[8];
  let g9_19: i32 = 19 * b[9];
  let f1_2: i32 = 2 * a[1];
  let f3_2: i32 = 2 * a[3];
  let f5_2: i32 = 2 * a[5];
  let f7_2: i32 = 2 * a[7];
  let f9_2: i32 = 2 * a[9];

  let f0g0: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[0]));
  let f0g1: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[1]));
  let f0g2: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[2]));
  let f0g3: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[3]));
  let f0g4: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[4]));
  let f0g5: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[5]));
  let f0g6: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[6]));
  let f0g7: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[7]));
  let f0g8: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[8]));
  let f0g9: i64      = i64_mul_to_i64(i64_from_i32(a[0]), i64_from_i32(b[9]));
  let f1g0: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[0]));
  let f1g1_2: i64    = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(b[1]));
  let f1g2: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[2]));
  let f1g3_2: i64    = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(b[3]));
  let f1g4: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[4]));
  let f1g5_2: i64    = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(b[5]));
  let f1g6: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[6]));
  let f1g7_2: i64    = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(b[7]));
  let f1g8: i64      = i64_mul_to_i64(i64_from_i32(a[1]), i64_from_i32(b[8]));
  let f1g9_38: i64   = i64_mul_to_i64(i64_from_i32(f1_2), i64_from_i32(g9_19));
  let f2g0: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[0]));
  let f2g1: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[1]));
  let f2g2: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[2]));
  let f2g3: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[3]));
  let f2g4: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[4]));
  let f2g5: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[5]));
  let f2g6: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[6]));
  let f2g7: i64      = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(b[7]));
  let f2g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(g8_19));
  let f2g9_19: i64   = i64_mul_to_i64(i64_from_i32(a[2]), i64_from_i32(g9_19));
  let f3g0: i64      = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(b[0]));
  let f3g1_2: i64    = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(b[1]));
  let f3g2: i64      = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(b[2]));
  let f3g3_2: i64    = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(b[3]));
  let f3g4: i64      = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(b[4]));
  let f3g5_2: i64    = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(b[5]));
  let f3g6: i64      = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(b[6]));
  let f3g7_38: i64   = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(g7_19));
  let f3g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[3]), i64_from_i32(g8_19));
  let f3g9_38: i64   = i64_mul_to_i64(i64_from_i32(f3_2), i64_from_i32(g9_19));
  let f4g0: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[0]));
  let f4g1: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[1]));
  let f4g2: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[2]));
  let f4g3: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[3]));
  let f4g4: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[4]));
  let f4g5: i64      = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(b[5]));
  let f4g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(g6_19));
  let f4g7_19: i64   = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(g7_19));
  let f4g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(g8_19));
  let f4g9_19: i64   = i64_mul_to_i64(i64_from_i32(a[4]), i64_from_i32(g9_19));
  let f5g0: i64      = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(b[0]));
  let f5g1_2: i64    = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(b[1]));
  let f5g2: i64      = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(b[2]));
  let f5g3_2: i64    = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(b[3]));
  let f5g4: i64      = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(b[4]));
  let f5g5_38: i64   = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(g5_19));
  let f5g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(g6_19));
  let f5g7_38: i64   = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(g7_19));
  let f5g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[5]), i64_from_i32(g8_19));
  let f5g9_38: i64   = i64_mul_to_i64(i64_from_i32(f5_2), i64_from_i32(g9_19));
  let f6g0: i64      = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(b[0]));
  let f6g1: i64      = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(b[1]));
  let f6g2: i64      = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(b[2]));
  let f6g3: i64      = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(b[3]));
  let f6g4_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g4_19));
  let f6g5_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g5_19));
  let f6g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g6_19));
  let f6g7_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g7_19));
  let f6g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g8_19));
  let f6g9_19: i64   = i64_mul_to_i64(i64_from_i32(a[6]), i64_from_i32(g9_19));
  let f7g0: i64      = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(b[0]));
  let f7g1_2: i64    = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(b[1]));
  let f7g2: i64      = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(b[2]));
  let f7g3_38: i64   = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(g3_19));
  let f7g4_19: i64   = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(g4_19));
  let f7g5_38: i64   = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(g5_19));
  let f7g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(g6_19));
  let f7g7_38: i64   = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(g7_19));
  let f7g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[7]), i64_from_i32(g8_19));
  let f7g9_38: i64   = i64_mul_to_i64(i64_from_i32(f7_2), i64_from_i32(g9_19));
  let f8g0: i64      = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(b[0]));
  let f8g1: i64      = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(b[1]));
  let f8g2_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g2_19));
  let f8g3_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g3_19));
  let f8g4_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g4_19));
  let f8g5_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g5_19));
  let f8g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g6_19));
  let f8g7_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g7_19));
  let f8g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g8_19));
  let f8g9_19: i64   = i64_mul_to_i64(i64_from_i32(a[8]), i64_from_i32(g9_19));
  let f9g0: i64      = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(b[0]));
  let f9g1_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g1_19));
  let f9g2_19: i64   = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(g2_19));
  let f9g3_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g3_19));
  let f9g4_19: i64   = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(g4_19));
  let f9g5_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g5_19));
  let f9g6_19: i64   = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(g6_19));
  let f9g7_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g7_19));
  let f9g8_19: i64   = i64_mul_to_i64(i64_from_i32(a[9]), i64_from_i32(g8_19));
  let f9g9_38: i64   = i64_mul_to_i64(i64_from_i32(f9_2), i64_from_i32(g9_19));

  
  var h0: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g0, f1g9_38), f2g8_19), f3g7_38), f4g6_19), f5g5_38), f6g4_19), f7g3_38), f8g2_19), f9g1_38);
  var h1: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g1, f1g0), f2g9_19), f3g8_19), f4g7_19), f5g6_19), f6g5_19), f7g4_19), f8g3_19), f9g2_19);
  var h2: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g2, f1g1_2), f2g0), f3g9_38), f4g8_19), f5g7_38), f6g6_19), f7g5_38), f8g4_19), f9g3_38);
  var h3: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g3, f1g2), f2g1), f3g0), f4g9_19), f5g8_19), f6g7_19), f7g6_19), f8g5_19), f9g4_19);
  var h4: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g4, f1g3_2), f2g2), f3g1_2), f4g0), f5g9_38), f6g8_19), f7g7_38), f8g6_19), f9g5_38);
  var h5: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g5, f1g4), f2g3), f3g2), f4g1), f5g0), f6g9_19), f7g8_19), f8g7_19), f9g6_19);
  var h6: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g6, f1g5_2), f2g4), f3g3_2), f4g2), f5g1_2), f6g0), f7g9_38), f8g8_19), f9g7_38);
  var h7: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g7, f1g6), f2g5), f3g4), f4g3), f5g2), f6g1), f7g0), f8g9_19), f9g8_19);
  var h8: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g8, f1g7_2), f2g6), f3g5_2), f4g4), f5g3_2), f6g2), f7g1_2), f8g0), f9g9_38);
  var h9: i64 = i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(i64_sum(f0g9, f1g8), f2g7), f3g6), f4g5), f5g4), f6g3), f7g2), f8g1), f9g0);
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

  /*
  |h0| <= (1.65*1.65*2^52*(1+19+19+19+19)+1.65*1.65*2^50*(38+38+38+38+38))
    i.e. |h0| <= 1.4*2^60; narrower ranges for h2, h4, h6, h8
  |h1| <= (1.65*1.65*2^51*(1+1+19+19+19+19+19+19+19+19))
    i.e. |h1| <= 1.7*2^59; narrower ranges for h3, h5, h7, h9
  */

  carry0 = i64_right_shift(i64_sum(h0, i64_from_u32(1u << 25)), 26);
  h1 = i64_sum(h1, carry0);
  h0 = i64_sub(h0, i64_left_shift(carry0, 26));
  carry4 = i64_right_shift(i64_sum(h4, i64_from_u32(1u << 25)), 26);
  h5 = i64_sum(h5, carry4);
  h4 = i64_sub(h4, i64_left_shift(carry4, 26));

  /* |h0| <= 2^25 */
  /* |h4| <= 2^25 */
  /* |h1| <= 1.71*2^59 */
  /* |h5| <= 1.71*2^59 */

  carry1 = i64_right_shift(i64_sum(h1, i64_from_u32(1u << 24)), 25);
  h2 = i64_sum(h2, carry1);
  h1 = i64_sub(h1, i64_left_shift(carry1, 25));
  carry5 = i64_right_shift(i64_sum(h5, i64_from_u32(1u << 24)), 25);
  h6 = i64_sum(h6, carry5);
  h5 = i64_sub(h5, i64_left_shift(carry5, 25));

  /* |h1| <= 2^24; from now on fits into int32 */
  /* |h5| <= 2^24; from now on fits into int32 */
  /* |h2| <= 1.41*2^60 */
  /* |h6| <= 1.41*2^60 */

  carry2 = i64_right_shift(i64_sum(h2, i64_from_u32(1u << 25)), 26);
  h3 = i64_sum(h3, carry2);
  h2 = i64_sub(h2, i64_left_shift(carry2, 26));
  carry6 = i64_right_shift(i64_sum(h6, i64_from_u32(1u << 25)), 26);
  h7 = i64_sum(h7, carry6);
  h6 = i64_sub(h6, i64_left_shift(carry6, 26));
  /* |h2| <= 2^25; from now on fits into int32 unchanged */
  /* |h6| <= 2^25; from now on fits into int32 unchanged */
  /* |h3| <= 1.71*2^59 */
  /* |h7| <= 1.71*2^59 */

  carry3 = i64_right_shift(i64_sum(h3, i64_from_u32(1u << 24)), 25);
  h4 = i64_sum(h4, carry3);
  h3 = i64_sub(h3, i64_left_shift(carry3, 25));
  carry7 = i64_right_shift(i64_sum(h7, i64_from_u32(1u << 24)), 25);
  h8 = i64_sum(h8, carry7);
  h7 = i64_sub(h7, i64_left_shift(carry7, 25));
  /* |h3| <= 2^24; from now on fits into int32 unchanged */
  /* |h7| <= 2^24; from now on fits into int32 unchanged */
  /* |h4| <= 1.72*2^34 */
  /* |h8| <= 1.41*2^60 */

  carry4 = i64_right_shift(i64_sum(h4, i64_from_u32(1u << 25)), 26);
  h5 = i64_sum(h5, carry4);
  h4 = i64_sub(h4, i64_left_shift(carry4, 26));
  carry8 = i64_right_shift(i64_sum(h8, i64_from_u32(1u << 25)), 26);
  h9 = i64_sum(h9, carry8);
  h8 = i64_sub(h8, i64_left_shift(carry8, 26));
  /* |h4| <= 2^25; from now on fits into int32 unchanged */
  /* |h8| <= 2^25; from now on fits into int32 unchanged */
  /* |h5| <= 1.01*2^24 */
  /* |h9| <= 1.71*2^59 */

  carry9 = i64_right_shift(i64_sum(h9, i64_from_u32(1u << 24)), 25);
  h0 = i64_sum(h0, i64_mul_to_i64(i64_from_i32(19), carry9));
  h9 = i64_sub(h9, i64_left_shift(carry9, 25));
  /* |h9| <= 2^24; from now on fits into int32 unchanged */
  /* |h0| <= 1.1*2^39 */

  carry0 = i64_right_shift(i64_sum(h0, i64_from_u32(1u << 25)), 26);
  h1 = i64_sum(h1, carry0);
  h0 = i64_sub(h0, i64_left_shift(carry0, 26));
  /* |h0| <= 2^25; from now on fits into int32 unchanged */
  /* |h1| <= 1.01*2^24 */

  return fe(h0, h1, h2, h3, h4, h5, h6, h7, h8, h9);
}

/*
In C:

void fe_mul(fe h,const fe f,const fe g)
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
  crypto_int32 g0 = g[0];
  crypto_int32 g1 = g[1];
  crypto_int32 g2 = g[2];
  crypto_int32 g3 = g[3];
  crypto_int32 g4 = g[4];
  crypto_int32 g5 = g[5];
  crypto_int32 g6 = g[6];
  crypto_int32 g7 = g[7];
  crypto_int32 g8 = g[8];
  crypto_int32 g9 = g[9];
  crypto_int32 g1_19 = 19 * g1; /* 1.959375*2^29 */
  crypto_int32 g2_19 = 19 * g2; /* 1.959375*2^30; still ok */
  crypto_int32 g3_19 = 19 * g3;
  crypto_int32 g4_19 = 19 * g4;
  crypto_int32 g5_19 = 19 * g5;
  crypto_int32 g6_19 = 19 * g6;
  crypto_int32 g7_19 = 19 * g7;
  crypto_int32 g8_19 = 19 * g8;
  crypto_int32 g9_19 = 19 * g9;
  crypto_int32 f1_2 = 2 * f1;
  crypto_int32 f3_2 = 2 * f3;
  crypto_int32 f5_2 = 2 * f5;
  crypto_int32 f7_2 = 2 * f7;
  crypto_int32 f9_2 = 2 * f9;
  crypto_int64 f0g0    = f0   * (crypto_int64) g0;
  crypto_int64 f0g1    = f0   * (crypto_int64) g1;
  crypto_int64 f0g2    = f0   * (crypto_int64) g2;
  crypto_int64 f0g3    = f0   * (crypto_int64) g3;
  crypto_int64 f0g4    = f0   * (crypto_int64) g4;
  crypto_int64 f0g5    = f0   * (crypto_int64) g5;
  crypto_int64 f0g6    = f0   * (crypto_int64) g6;
  crypto_int64 f0g7    = f0   * (crypto_int64) g7;
  crypto_int64 f0g8    = f0   * (crypto_int64) g8;
  crypto_int64 f0g9    = f0   * (crypto_int64) g9;
  crypto_int64 f1g0    = f1   * (crypto_int64) g0;
  crypto_int64 f1g1_2  = f1_2 * (crypto_int64) g1;
  crypto_int64 f1g2    = f1   * (crypto_int64) g2;
  crypto_int64 f1g3_2  = f1_2 * (crypto_int64) g3;
  crypto_int64 f1g4    = f1   * (crypto_int64) g4;
  crypto_int64 f1g5_2  = f1_2 * (crypto_int64) g5;
  crypto_int64 f1g6    = f1   * (crypto_int64) g6;
  crypto_int64 f1g7_2  = f1_2 * (crypto_int64) g7;
  crypto_int64 f1g8    = f1   * (crypto_int64) g8;
  crypto_int64 f1g9_38 = f1_2 * (crypto_int64) g9_19;
  crypto_int64 f2g0    = f2   * (crypto_int64) g0;
  crypto_int64 f2g1    = f2   * (crypto_int64) g1;
  crypto_int64 f2g2    = f2   * (crypto_int64) g2;
  crypto_int64 f2g3    = f2   * (crypto_int64) g3;
  crypto_int64 f2g4    = f2   * (crypto_int64) g4;
  crypto_int64 f2g5    = f2   * (crypto_int64) g5;
  crypto_int64 f2g6    = f2   * (crypto_int64) g6;
  crypto_int64 f2g7    = f2   * (crypto_int64) g7;
  crypto_int64 f2g8_19 = f2   * (crypto_int64) g8_19;
  crypto_int64 f2g9_19 = f2   * (crypto_int64) g9_19;
  crypto_int64 f3g0    = f3   * (crypto_int64) g0;
  crypto_int64 f3g1_2  = f3_2 * (crypto_int64) g1;
  crypto_int64 f3g2    = f3   * (crypto_int64) g2;
  crypto_int64 f3g3_2  = f3_2 * (crypto_int64) g3;
  crypto_int64 f3g4    = f3   * (crypto_int64) g4;
  crypto_int64 f3g5_2  = f3_2 * (crypto_int64) g5;
  crypto_int64 f3g6    = f3   * (crypto_int64) g6;
  crypto_int64 f3g7_38 = f3_2 * (crypto_int64) g7_19;
  crypto_int64 f3g8_19 = f3   * (crypto_int64) g8_19;
  crypto_int64 f3g9_38 = f3_2 * (crypto_int64) g9_19;
  crypto_int64 f4g0    = f4   * (crypto_int64) g0;
  crypto_int64 f4g1    = f4   * (crypto_int64) g1;
  crypto_int64 f4g2    = f4   * (crypto_int64) g2;
  crypto_int64 f4g3    = f4   * (crypto_int64) g3;
  crypto_int64 f4g4    = f4   * (crypto_int64) g4;
  crypto_int64 f4g5    = f4   * (crypto_int64) g5;
  crypto_int64 f4g6_19 = f4   * (crypto_int64) g6_19;
  crypto_int64 f4g7_19 = f4   * (crypto_int64) g7_19;
  crypto_int64 f4g8_19 = f4   * (crypto_int64) g8_19;
  crypto_int64 f4g9_19 = f4   * (crypto_int64) g9_19;
  crypto_int64 f5g0    = f5   * (crypto_int64) g0;
  crypto_int64 f5g1_2  = f5_2 * (crypto_int64) g1;
  crypto_int64 f5g2    = f5   * (crypto_int64) g2;
  crypto_int64 f5g3_2  = f5_2 * (crypto_int64) g3;
  crypto_int64 f5g4    = f5   * (crypto_int64) g4;
  crypto_int64 f5g5_38 = f5_2 * (crypto_int64) g5_19;
  crypto_int64 f5g6_19 = f5   * (crypto_int64) g6_19;
  crypto_int64 f5g7_38 = f5_2 * (crypto_int64) g7_19;
  crypto_int64 f5g8_19 = f5   * (crypto_int64) g8_19;
  crypto_int64 f5g9_38 = f5_2 * (crypto_int64) g9_19;
  crypto_int64 f6g0    = f6   * (crypto_int64) g0;
  crypto_int64 f6g1    = f6   * (crypto_int64) g1;
  crypto_int64 f6g2    = f6   * (crypto_int64) g2;
  crypto_int64 f6g3    = f6   * (crypto_int64) g3;
  crypto_int64 f6g4_19 = f6   * (crypto_int64) g4_19;
  crypto_int64 f6g5_19 = f6   * (crypto_int64) g5_19;
  crypto_int64 f6g6_19 = f6   * (crypto_int64) g6_19;
  crypto_int64 f6g7_19 = f6   * (crypto_int64) g7_19;
  crypto_int64 f6g8_19 = f6   * (crypto_int64) g8_19;
  crypto_int64 f6g9_19 = f6   * (crypto_int64) g9_19;
  crypto_int64 f7g0    = f7   * (crypto_int64) g0;
  crypto_int64 f7g1_2  = f7_2 * (crypto_int64) g1;
  crypto_int64 f7g2    = f7   * (crypto_int64) g2;
  crypto_int64 f7g3_38 = f7_2 * (crypto_int64) g3_19;
  crypto_int64 f7g4_19 = f7   * (crypto_int64) g4_19;
  crypto_int64 f7g5_38 = f7_2 * (crypto_int64) g5_19;
  crypto_int64 f7g6_19 = f7   * (crypto_int64) g6_19;
  crypto_int64 f7g7_38 = f7_2 * (crypto_int64) g7_19;
  crypto_int64 f7g8_19 = f7   * (crypto_int64) g8_19;
  crypto_int64 f7g9_38 = f7_2 * (crypto_int64) g9_19;
  crypto_int64 f8g0    = f8   * (crypto_int64) g0;
  crypto_int64 f8g1    = f8   * (crypto_int64) g1;
  crypto_int64 f8g2_19 = f8   * (crypto_int64) g2_19;
  crypto_int64 f8g3_19 = f8   * (crypto_int64) g3_19;
  crypto_int64 f8g4_19 = f8   * (crypto_int64) g4_19;
  crypto_int64 f8g5_19 = f8   * (crypto_int64) g5_19;
  crypto_int64 f8g6_19 = f8   * (crypto_int64) g6_19;
  crypto_int64 f8g7_19 = f8   * (crypto_int64) g7_19;
  crypto_int64 f8g8_19 = f8   * (crypto_int64) g8_19;
  crypto_int64 f8g9_19 = f8   * (crypto_int64) g9_19;
  crypto_int64 f9g0    = f9   * (crypto_int64) g0;
  crypto_int64 f9g1_38 = f9_2 * (crypto_int64) g1_19;
  crypto_int64 f9g2_19 = f9   * (crypto_int64) g2_19;
  crypto_int64 f9g3_38 = f9_2 * (crypto_int64) g3_19;
  crypto_int64 f9g4_19 = f9   * (crypto_int64) g4_19;
  crypto_int64 f9g5_38 = f9_2 * (crypto_int64) g5_19;
  crypto_int64 f9g6_19 = f9   * (crypto_int64) g6_19;
  crypto_int64 f9g7_38 = f9_2 * (crypto_int64) g7_19;
  crypto_int64 f9g8_19 = f9   * (crypto_int64) g8_19;
  crypto_int64 f9g9_38 = f9_2 * (crypto_int64) g9_19;
  crypto_int64 h0 = f0g0+f1g9_38+f2g8_19+f3g7_38+f4g6_19+f5g5_38+f6g4_19+f7g3_38+f8g2_19+f9g1_38;
  crypto_int64 h1 = f0g1+f1g0   +f2g9_19+f3g8_19+f4g7_19+f5g6_19+f6g5_19+f7g4_19+f8g3_19+f9g2_19;
  crypto_int64 h2 = f0g2+f1g1_2 +f2g0   +f3g9_38+f4g8_19+f5g7_38+f6g6_19+f7g5_38+f8g4_19+f9g3_38;
  crypto_int64 h3 = f0g3+f1g2   +f2g1   +f3g0   +f4g9_19+f5g8_19+f6g7_19+f7g6_19+f8g5_19+f9g4_19;
  crypto_int64 h4 = f0g4+f1g3_2 +f2g2   +f3g1_2 +f4g0   +f5g9_38+f6g8_19+f7g7_38+f8g6_19+f9g5_38;
  crypto_int64 h5 = f0g5+f1g4   +f2g3   +f3g2   +f4g1   +f5g0   +f6g9_19+f7g8_19+f8g7_19+f9g6_19;
  crypto_int64 h6 = f0g6+f1g5_2 +f2g4   +f3g3_2 +f4g2   +f5g1_2 +f6g0   +f7g9_38+f8g8_19+f9g7_38;
  crypto_int64 h7 = f0g7+f1g6   +f2g5   +f3g4   +f4g3   +f5g2   +f6g1   +f7g0   +f8g9_19+f9g8_19;
  crypto_int64 h8 = f0g8+f1g7_2 +f2g6   +f3g5_2 +f4g4   +f5g3_2 +f6g2   +f7g1_2 +f8g0   +f9g9_38;
  crypto_int64 h9 = f0g9+f1g8   +f2g7   +f3g6   +f4g5   +f5g4   +f6g3   +f7g2   +f8g1   +f9g0   ;
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

  /*
  |h0| <= (1.65*1.65*2^52*(1+19+19+19+19)+1.65*1.65*2^50*(38+38+38+38+38))
    i.e. |h0| <= 1.4*2^60; narrower ranges for h2, h4, h6, h8
  |h1| <= (1.65*1.65*2^51*(1+1+19+19+19+19+19+19+19+19))
    i.e. |h1| <= 1.7*2^59; narrower ranges for h3, h5, h7, h9
  */

  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;
  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;
  /* |h0| <= 2^25 */
  /* |h4| <= 2^25 */
  /* |h1| <= 1.71*2^59 */
  /* |h5| <= 1.71*2^59 */

  carry1 = (h1 + (crypto_int64) (1<<24)) >> 25; h2 += carry1; h1 -= carry1 << 25;
  carry5 = (h5 + (crypto_int64) (1<<24)) >> 25; h6 += carry5; h5 -= carry5 << 25;
  /* |h1| <= 2^24; from now on fits into int32 */
  /* |h5| <= 2^24; from now on fits into int32 */
  /* |h2| <= 1.41*2^60 */
  /* |h6| <= 1.41*2^60 */

  carry2 = (h2 + (crypto_int64) (1<<25)) >> 26; h3 += carry2; h2 -= carry2 << 26;
  carry6 = (h6 + (crypto_int64) (1<<25)) >> 26; h7 += carry6; h6 -= carry6 << 26;
  /* |h2| <= 2^25; from now on fits into int32 unchanged */
  /* |h6| <= 2^25; from now on fits into int32 unchanged */
  /* |h3| <= 1.71*2^59 */
  /* |h7| <= 1.71*2^59 */

  carry3 = (h3 + (crypto_int64) (1<<24)) >> 25; h4 += carry3; h3 -= carry3 << 25;
  carry7 = (h7 + (crypto_int64) (1<<24)) >> 25; h8 += carry7; h7 -= carry7 << 25;
  /* |h3| <= 2^24; from now on fits into int32 unchanged */
  /* |h7| <= 2^24; from now on fits into int32 unchanged */
  /* |h4| <= 1.72*2^34 */
  /* |h8| <= 1.41*2^60 */

  carry4 = (h4 + (crypto_int64) (1<<25)) >> 26; h5 += carry4; h4 -= carry4 << 26;
  carry8 = (h8 + (crypto_int64) (1<<25)) >> 26; h9 += carry8; h8 -= carry8 << 26;
  /* |h4| <= 2^25; from now on fits into int32 unchanged */
  /* |h8| <= 2^25; from now on fits into int32 unchanged */
  /* |h5| <= 1.01*2^24 */
  /* |h9| <= 1.71*2^59 */

  carry9 = (h9 + (crypto_int64) (1<<24)) >> 25; h0 += carry9 * 19; h9 -= carry9 << 25;
  /* |h9| <= 2^24; from now on fits into int32 unchanged */
  /* |h0| <= 1.1*2^39 */

  carry0 = (h0 + (crypto_int64) (1<<25)) >> 26; h1 += carry0; h0 -= carry0 << 26;
  /* |h0| <= 2^25; from now on fits into int32 unchanged */
  /* |h1| <= 1.01*2^24 */

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