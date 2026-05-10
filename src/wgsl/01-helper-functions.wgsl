fn get_k() -> u256 {
  let k: u256 = scalar;
  k[7] &= 0xFFFFFFF8u;  // clear the lowest 3 bits
  k[0] &= 0x7FFFFFFFu;  // clear the highest bit
  k[0] |= 0x40000000u;  // set the second-highest bit
  return k;
}

fn get_precomputed_point(k: u256, i: u32) -> AffineNielsPoint {
  var table_index: u32 = 0u;
  // index of the bit in k from 0 = MSB to 255 = LSB
  var bit_index: u32 = (d - 1u) - i;

  for(var j: u32 = w - 1u; j >= 0u; j++){
    // go 1 row down in the matrix
    bit_index += d;

    // index of the 32-bit chunk = bit_index / 32 = bit_index >> 5
    // index of the bit in the 32-bit chunk = bit_index % 32 = bit_index & 31

    // bit * 2^j
    table_index += ((k[bit_index >> 5] << (bit_index & 31)) >> 31) << j;
  }
  // for w = 4 and i = 63 table index should be [0, 0 + d, 0 + 2d, 0 + 3d]

  // cti = comb table index. times 30 because every point takes 3 coordinates * 10 32-bit limbs = 30 u32s
  let cti: u32 = table_index * 30u;
  return AffineNielsPoint(
    fe(
      comb_table[cti],       comb_table[cti + 1u],  comb_table[cti + 2u],  comb_table[cti + 3u],  comb_table[cti + 4u],
      comb_table[cti + 5u],  comb_table[cti + 6u],  comb_table[cti + 7u],  comb_table[cti + 8u],  comb_table[cti + 9u]
    ),
    fe(
      comb_table[cti + 10u], comb_table[cti + 11u], comb_table[cti + 12u], comb_table[cti + 13u], comb_table[cti + 14u],
      comb_table[cti + 15u], comb_table[cti + 16u], comb_table[cti + 17u], comb_table[cti + 18u], comb_table[cti + 19u]
    ),
    fe(
      comb_table[cti + 20u], comb_table[cti + 21u], comb_table[cti + 22u], comb_table[cti + 23u], comb_table[cti + 24u],
      comb_table[cti + 25u], comb_table[cti + 26u], comb_table[cti + 27u], comb_table[cti + 28u], comb_table[cti + 29u]
    )
  );
}