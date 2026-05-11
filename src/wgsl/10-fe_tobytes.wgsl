fn fe_tobytes(h: fe) -> u256 {
  var h0: i32 = h[0];
  var h1: i32 = h[1];
  var h2: i32 = h[2];
  var h3: i32 = h[3];
  var h4: i32 = h[4];
  var h5: i32 = h[5];
  var h6: i32 = h[6];
  var h7: i32 = h[7];
  var h8: i32 = h[8];
  var h9: i32 = h[9];

  var q: i32 = (19 * h9 + (i32(1) << 24)) >> 25;
  q = (h0 + q) >> 26;
  q = (h1 + q) >> 25;
  q = (h2 + q) >> 26;
  q = (h3 + q) >> 25;
  q = (h4 + q) >> 26;
  q = (h5 + q) >> 25;
  q = (h6 + q) >> 26;
  q = (h7 + q) >> 25;
  q = (h8 + q) >> 26;
  q = (h9 + q) >> 25;

  /* Goal: Output h-(2^255-19)q, which is between 0 and 2^255-20. */
  h0 += 19 * q;
  /* Goal: Output h-2^255 q, which is between 0 and 2^255-20. */

  let carry0: i32 = h0 >> 26; h1 += carry0; h0 -= carry0 << 26;
  let carry1: i32 = h1 >> 25; h2 += carry1; h1 -= carry1 << 25;
  let carry2: i32 = h2 >> 26; h3 += carry2; h2 -= carry2 << 26;
  let carry3: i32 = h3 >> 25; h4 += carry3; h3 -= carry3 << 25;
  let carry4: i32 = h4 >> 26; h5 += carry4; h4 -= carry4 << 26;
  let carry5: i32 = h5 >> 25; h6 += carry5; h5 -= carry5 << 25;
  let carry6: i32 = h6 >> 26; h7 += carry6; h6 -= carry6 << 26;
  let carry7: i32 = h7 >> 25; h8 += carry7; h7 -= carry7 << 25;
  let carry8: i32 = h8 >> 26; h9 += carry8; h8 -= carry8 << 26;
  let carry9: i32 = h9 >> 25;               h9 -= carry9 << 25;
                                         /* h10 = carry9 */

  /*
  Goal: Output h0+...+2^255 h10-2^255 q, which is between 0 and 2^255-20.
  Have h0+...+2^230 h9 between 0 and 2^255-1;
  evidently 2^255 h10-2^255 q = 0.
  Goal: Output h0+...+2^230 h9.
  */

  var s: u256 = u256(0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u);

  // s[0] = bytes 31,30,29,28  (bits 254..224)
  // byte31 = h9>>18, byte30 = h9>>10, byte29 = h9>>2, byte28 = (h8>>20)|(h9<<6)
  s[0] = ((bitcast<u32>(h9) >> 18) << 24)
      | ((bitcast<u32>(h9) >> 10) << 16)
      | ((bitcast<u32>(h9) >> 2)  <<  8)
      | ((bitcast<u32>(h8) >> 20) | (bitcast<u32>(h9) << 6));

  // s[1] = bytes 27,26,25,24  (bits 223..192)
  // byte27 = h8>>12, byte26 = h8>>4, byte25 = (h7>>21)|(h8<<4), byte24 = h7>>13
  s[1] = ((bitcast<u32>(h8) >> 12) << 24)
      | ((bitcast<u32>(h8) >>  4) << 16)
      | (((bitcast<u32>(h7) >> 21) | (bitcast<u32>(h8) << 4)) << 8)
      | (bitcast<u32>(h7) >> 13);

  // s[2] = bytes 23,22,21,20  (bits 191..160)
  // byte23 = h7>>5, byte22 = (h6>>23)|(h7<<3), byte21 = h6>>15, byte20 = h6>>7
  s[2] = ((bitcast<u32>(h7) >>  5) << 24)
      | (((bitcast<u32>(h6) >> 23) | (bitcast<u32>(h7) << 3)) << 16)
      | ((bitcast<u32>(h6) >> 15) <<  8)
      | (bitcast<u32>(h6) >>  7);

  // s[3] = bytes 19,18,17,16  (bits 159..128)
  // byte19 = (h5>>24)|(h6<<1), byte18 = h5>>16, byte17 = h5>>8, byte16 = h5>>0
  s[3] = (((bitcast<u32>(h5) >> 24) | (bitcast<u32>(h6) << 1)) << 24)
      | ((bitcast<u32>(h5) >> 16) << 16)
      | ((bitcast<u32>(h5) >>  8) <<  8)
      | (bitcast<u32>(h5) >>  0);

  // s[4] = bytes 15,14,13,12  (bits 127..96)
  // byte15 = h4>>18, byte14 = h4>>10, byte13 = h4>>2, byte12 = (h3>>19)|(h4<<6)
  s[4] = ((bitcast<u32>(h4) >> 18) << 24)
      | ((bitcast<u32>(h4) >> 10) << 16)
      | ((bitcast<u32>(h4) >>  2) <<  8)
      | ((bitcast<u32>(h3) >> 19) | (bitcast<u32>(h4) << 6));

  // s[5] = bytes 11,10,9,8  (bits 95..64)
  // byte11 = h3>>11, byte10 = h3>>3, byte9 = (h2>>21)|(h3<<5), byte8 = h2>>13
  s[5] = ((bitcast<u32>(h3) >> 11) << 24)
      | ((bitcast<u32>(h3) >>  3) << 16)
      | (((bitcast<u32>(h2) >> 21) | (bitcast<u32>(h3) << 5)) <<  8)
      | (bitcast<u32>(h2) >> 13);

  // s[6] = bytes 7,6,5,4  (bits 63..32)
  // byte7 = h2>>5, byte6 = (h1>>22)|(h2<<3), byte5 = h1>>14, byte4 = h1>>6
  s[6] = ((bitcast<u32>(h2) >>  5) << 24)
      | (((bitcast<u32>(h1) >> 22) | (bitcast<u32>(h2) << 3)) << 16)
      | ((bitcast<u32>(h1) >> 14) <<  8)
      | (bitcast<u32>(h1) >>  6);

  // s[7] = bytes 3,2,1,0  (bits 31..0)
  // byte3 = (h0>>24)|(h1<<2), byte2 = h0>>16, byte1 = h0>>8, byte0 = h0>>0
  s[7] = (((bitcast<u32>(h0) >> 24) | (bitcast<u32>(h1) << 2)) << 24)
      | ((bitcast<u32>(h0) >> 16) << 16)
      | ((bitcast<u32>(h0) >>  8) <<  8)
      | (bitcast<u32>(h0) >>  0);

  return s;
}

/*
In C:

/*
Preconditions:
  |h| bounded by 1.1*2^26,1.1*2^25,1.1*2^26,1.1*2^25,etc.

Write p=2^255-19; q=floor(h/p).
Basic claim: q = floor(2^(-255)(h + 19 2^(-25)h9 + 2^(-1))).

Proof:
  Have |h|<=p so |q|<=1 so |19^2 2^(-255) q|<1/4.
  Also have |h-2^230 h9|<2^231 so |19 2^(-255)(h-2^230 h9)|<1/4.

  Write y=2^(-1)-19^2 2^(-255)q-19 2^(-255)(h-2^230 h9).
  Then 0<y<1.

  Write r=h-pq.
  Have 0<=r<=p-1=2^255-20.
  Thus 0<=r+19(2^-255)r<r+19(2^-255)2^255<=2^255-1.

  Write x=r+19(2^-255)r+y.
  Then 0<x<2^255 so floor(2^(-255)x) = 0 so floor(q+2^(-255)x) = q.

  Have q+2^(-255)x = 2^(-255)(h + 19 2^(-25) h9 + 2^(-1))
  so floor(2^(-255)(h + 19 2^(-25) h9 + 2^(-1))) = q.
*/

void fe_tobytes(unsigned char *s,const fe h)
{
  crypto_int32 h0 = h[0];
  crypto_int32 h1 = h[1];
  crypto_int32 h2 = h[2];
  crypto_int32 h3 = h[3];
  crypto_int32 h4 = h[4];
  crypto_int32 h5 = h[5];
  crypto_int32 h6 = h[6];
  crypto_int32 h7 = h[7];
  crypto_int32 h8 = h[8];
  crypto_int32 h9 = h[9];
  crypto_int32 q;
  crypto_int32 carry0;
  crypto_int32 carry1;
  crypto_int32 carry2;
  crypto_int32 carry3;
  crypto_int32 carry4;
  crypto_int32 carry5;
  crypto_int32 carry6;
  crypto_int32 carry7;
  crypto_int32 carry8;
  crypto_int32 carry9;

  q = (19 * h9 + (((crypto_int32) 1) << 24)) >> 25;
  q = (h0 + q) >> 26;
  q = (h1 + q) >> 25;
  q = (h2 + q) >> 26;
  q = (h3 + q) >> 25;
  q = (h4 + q) >> 26;
  q = (h5 + q) >> 25;
  q = (h6 + q) >> 26;
  q = (h7 + q) >> 25;
  q = (h8 + q) >> 26;
  q = (h9 + q) >> 25;

  /* Goal: Output h-(2^255-19)q, which is between 0 and 2^255-20. */
  h0 += 19 * q;
  /* Goal: Output h-2^255 q, which is between 0 and 2^255-20. */

  carry0 = h0 >> 26; h1 += carry0; h0 -= carry0 << 26;
  carry1 = h1 >> 25; h2 += carry1; h1 -= carry1 << 25;
  carry2 = h2 >> 26; h3 += carry2; h2 -= carry2 << 26;
  carry3 = h3 >> 25; h4 += carry3; h3 -= carry3 << 25;
  carry4 = h4 >> 26; h5 += carry4; h4 -= carry4 << 26;
  carry5 = h5 >> 25; h6 += carry5; h5 -= carry5 << 25;
  carry6 = h6 >> 26; h7 += carry6; h6 -= carry6 << 26;
  carry7 = h7 >> 25; h8 += carry7; h7 -= carry7 << 25;
  carry8 = h8 >> 26; h9 += carry8; h8 -= carry8 << 26;
  carry9 = h9 >> 25;               h9 -= carry9 << 25;
                  /* h10 = carry9 */

  /*
  Goal: Output h0+...+2^255 h10-2^255 q, which is between 0 and 2^255-20.
  Have h0+...+2^230 h9 between 0 and 2^255-1;
  evidently 2^255 h10-2^255 q = 0.
  Goal: Output h0+...+2^230 h9.
  */

  s[0] = h0 >> 0;
  s[1] = h0 >> 8;
  s[2] = h0 >> 16;
  s[3] = (h0 >> 24) | (h1 << 2);
  s[4] = h1 >> 6;
  s[5] = h1 >> 14;
  s[6] = (h1 >> 22) | (h2 << 3);
  s[7] = h2 >> 5;
  s[8] = h2 >> 13;
  s[9] = (h2 >> 21) | (h3 << 5);
  s[10] = h3 >> 3;
  s[11] = h3 >> 11;
  s[12] = (h3 >> 19) | (h4 << 6);
  s[13] = h4 >> 2;
  s[14] = h4 >> 10;
  s[15] = h4 >> 18;
  s[16] = h5 >> 0;
  s[17] = h5 >> 8;
  s[18] = h5 >> 16;
  s[19] = (h5 >> 24) | (h6 << 1);
  s[20] = h6 >> 7;
  s[21] = h6 >> 15;
  s[22] = (h6 >> 23) | (h7 << 3);
  s[23] = h7 >> 5;
  s[24] = h7 >> 13;
  s[25] = (h7 >> 21) | (h8 << 4);
  s[26] = h8 >> 4;
  s[27] = h8 >> 12;
  s[28] = (h8 >> 20) | (h9 << 6);
  s[29] = h9 >> 2;
  s[30] = h9 >> 10;
  s[31] = h9 >> 18;
}
*/