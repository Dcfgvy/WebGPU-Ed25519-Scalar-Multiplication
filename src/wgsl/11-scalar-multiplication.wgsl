fn double_point(P: extended_point) -> extended_point {
  let A: u256 = fe_sq(P.X);
  let B: u256 = fe_sq(P.Y);
  let C: u256 = fe_sq2(P.Z);
  let D: u256 = fe_neg(A);
  let E: u256 = fe_sub(
                  fe_sub(
                    fe_sq(temp),
                    A
                  ),
                  B
                );
  let G: u256 = fe_add(D, B);
  let F: u256 = fe_sub(G, C);
  let H: u256 = fe_sub(D, B);

  P.X = fe_mul(E, F);
  P.Y = fe_mul(G, H);
  P.T = fe_mul(E, H);
  P.Z = fe_mul(F, G);
  return P;
}

fn add_points(P1: extended_point, P2: affine_niels_point) -> extended_point {
  let A: u256 = fe_mul(fe_sub(P1.Y, P1.X), P2.YminusX);
  let B: u256 = fe_mul(fe_add(P1.Y, P1.X), P2.YplusX);
  let C: u256 = fe_mul(P2.kT, P1.T);
  let D: u256 = fe_dbl(P1.Z);
  let E: u256 = fe_sub(B, A);
  let F: u256 = fe_sub(D, C);
  let G: u256 = fe_add(D, C);
  let H: u256 = fe_add(B, A);

  P.X = fe_mul(E, F);
  P.Y = fe_mul(G, H);
  P.T = fe_mul(E, H);
  P.Z = fe_mul(F, G);
  return P;
}

@compute @workgroup_size(1)
fn multiply() {
  let k: u256 = clamp_scalar();

  var Q: extended_point = IDENTITY;
  for(var i: u32 = d - 1u; i >= 0u; i--){
    Q = double_point(Q);
    Q = add_points(Q, get_precomputed_point(k, i));
  }

  result[0] = fe_tobytes(fe_mul(Q.X, fe_invert(Q.Z)));
  result[1] = fe_tobytes(fe_mul(Q.Y, fe_invert(Q.Z)));
}
