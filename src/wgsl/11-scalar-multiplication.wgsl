fn double_point(P: extended_point) -> extended_point {
  let A: fe = fe_sq(P.X);
  let B: fe = fe_sq(P.Y);
  let C: fe = fe_sq2(P.Z);
  let D: fe = fe_neg(A);
  let E: fe = fe_sub(
                  fe_sub(
                    fe_sq(fe_add(P.X, P.Y)),
                    A
                  ),
                  B
                );
  let G: fe = fe_add(D, B);
  let F: fe = fe_sub(G, C);
  let H: fe = fe_sub(D, B);

  return extended_point(
    fe_mul(E, F),  // X
    fe_mul(G, H),  // Y
    fe_mul(E, H),  // T
    fe_mul(F, G)   // Z
  );
}

fn add_points(P1: extended_point, P2: affine_niels_point) -> extended_point {
  // TODO
  let A: fe = fe_mul(fe_sub(P1.Y, P1.X), P2.YminusX);
  let B: fe = fe_mul(fe_add(P1.Y, P1.X), P2.YplusX);
  let C: fe = fe_mul(P2.kT, P1.T); 
  let D: fe = fe_dbl(P1.Z);

  // let A: fe = fe(1, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  // let B: fe = fe(1, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  // let C: fe = fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  // let D: fe = fe(2, 0, 0, 0, 0, 0, 0, 0, 0, 0);

  let E: fe = fe_sub(B, A);
  let F: fe = fe_sub(D, C);
  let G: fe = fe_add(D, C);
  let H: fe = fe_add(B, A);

  return extended_point(
    fe_mul(E, F),  // X
    fe_mul(G, H),  // Y
    fe_mul(E, H),  // T
    fe_mul(F, G)   // Z
  );
}

@compute @workgroup_size(1)
fn multiply() {
  let k: u256 = scalar;  // TODO

  // var table_index: u32 = 0u;
  // // index of the bit in k from 0 = MSB to 255 = LSB
  // var bit_index: u32 = (d - 1u) - 62u;

  // for(var j: i32 = i32(w) - 1; j >= 0; j--){
  //   // index of the 32-bit chunk = bit_index / 32 = bit_index >> 5
  //   // index of the bit in the 32-bit chunk = bit_index % 32 = bit_index & 31

  //   // bit * 2^j
  //   table_index += ((k[bit_index >> 5u] << (bit_index & 31u)) >> 31u) << u32(j);

  //   // go 1 row down in the matrix
  //   bit_index += d;
  // }

  // DEBUG[0] = table_index;
  // DEBUG[1] = bitcast<u32>(comb_table[table_index * 30u + 20]);
  // DEBUG[0] = bitcast<u32>((fe_mul(fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0), fe(0, 0, 0, 0, 0, 0, 0, 0, 0, 0)))[9]);

  var Q: extended_point = IDENTITY;
  for(var i: i32 = i32(d) - 1; i >= 0; i--){
    Q = double_point(Q);
    Q = add_points(Q, get_precomputed_point(k, u32(i))); // TODO
    // Q = add_points(Q, IDENTITY_AFFINE);
  }

  let inverted_z: fe = fe_invert(Q.Z);
  result[0] = fe_tobytes(fe_mul(Q.X, inverted_z));
  result[1] = fe_tobytes(fe_mul(Q.Y, inverted_z));
}
