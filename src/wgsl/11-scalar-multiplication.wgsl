/*
In the comb method [2] the binary representation of k is
written in w rows, and the columns of the resulting rectangle are processed one
column at a time. We define [a_{w−1}, . . . , a2, a1, a0]P =
a_{w−1}2^{(w−1)d}P + · · · + a2 2^{2d}P + a1 2^d P + a0 P, where
d = ceil(t/w) and ai ∈ Z2.

Algorithm 17. Fixed-base comb method

INPUT: Window width w, d = ceil(t/w), k = (k_{t−1}, . . . , k1, k0)_2,
P ∈ E(F_{2^m}).

OUTPUT: kP.

1. Precomputation. Compute [a_{w−1}, . . . , a1, a0]P
   ∀(a_{w−1}, . . . , a1, a0) ∈ Z_2^w.

2. By padding k on the left with 0’s if necessary, write
   k = K^{w−1} || · · · || K^1 || K^0,
   where each K^j is a bit string of length d. Let K_i^j denote the i-th
   bit of K^j.

3. Q ← O.

4. For i from d − 1 downto 0 do
   4.1 Q ← 2Q.
   4.2 Q ← Q + [K_i^{w−1}, . . . , K_i^1, K_i^0]P.

5. Return(Q).
*/

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
  let A: fe = fe_mul(fe_sub(P1.Y, P1.X), P2.YminusX);
  let B: fe = fe_mul(fe_add(P1.Y, P1.X), P2.YplusX);
  let C: fe = fe_mul(P2.kT, P1.T); 
  let D: fe = fe_dbl(P1.Z);

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
  let k: u256 = reverse_scalar();

  var Q: extended_point = IDENTITY;
  for(var i: i32 = i32(d) - 1; i >= 0; i--){
    Q = double_point(Q);
    Q = add_points(Q, get_precomputed_point(k, u32(i)));
  }

  let inverted_z: fe = fe_invert(Q.Z);
  result[0] = fe_tobytes(fe_mul(Q.X, inverted_z));
  result[1] = fe_tobytes(fe_mul(Q.Y, inverted_z));
}
