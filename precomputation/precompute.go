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
 * Usage:
 * 	 go install
 * 	 go run . -w {window width} -out {output path}
 */

package main

import (
	"encoding/binary"
	"flag"
	"fmt"
	"math/big"
	"os"

	"filippo.io/edwards25519"
)

// -----------------------------------------------------------------------------
// Edwards25519 constants
// -----------------------------------------------------------------------------

var (
	fieldPrime *big.Int
	edwardsD   *big.Int
	twoD       *big.Int
)

func init() {
	// p = 2^255 - 19
	fieldPrime = new(big.Int).Sub(
		new(big.Int).Lsh(big.NewInt(1), 255),
		big.NewInt(19),
	)

	// d = -121665 / 121666 mod p
	edwardsD, _ = new(big.Int).SetString(
		"37095705934669439343138083508754565189542113879843219016388785533085940283555",
		10,
	)

	twoD = new(big.Int).Lsh(edwardsD, 1)
	twoD.Mod(twoD, fieldPrime)
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

func reverseBytes(b []byte) {
	for i, j := 0, len(b)-1; i < j; i, j = i+1, j-1 {
		b[i], b[j] = b[j], b[i]
	}
}

func littleEndianToBigInt(b []byte) *big.Int {
	r := make([]byte, len(b))
	copy(r, b)
	reverseBytes(r)
	return new(big.Int).SetBytes(r)
}

func bigIntToLittleEndian32(x *big.Int) []byte {
	b := x.Bytes()
	out := make([]byte, 32)

	for i := 0; i < len(b); i++ {
		out[i] = b[len(b)-1-i]
	}

	return out
}

func modInverse(x *big.Int) *big.Int {
	return new(big.Int).ModInverse(x, fieldPrime)
}

func modMul(a, b *big.Int) *big.Int {
	z := new(big.Int).Mul(a, b)
	z.Mod(z, fieldPrime)
	return z
}

func modAdd(a, b *big.Int) *big.Int {
	z := new(big.Int).Add(a, b)
	z.Mod(z, fieldPrime)
	return z
}

func modSub(a, b *big.Int) *big.Int {
	z := new(big.Int).Sub(a, b)
	z.Mod(z, fieldPrime)
	if z.Sign() < 0 {
		z.Add(z, fieldPrime)
	}
	return z
}

// -----------------------------------------------------------------------------
// Decode compressed Edwards point -> affine X,Y
// -----------------------------------------------------------------------------

func decodeAffine(p *edwards25519.Point) (*big.Int, *big.Int) {
	compressed := p.Bytes()

	// Extract Y
	yBytes := make([]byte, 32)
	copy(yBytes, compressed)
	yBytes[31] &= 0x7f
	y := littleEndianToBigInt(yBytes)

	// x sign bit
	xSign := (compressed[31] >> 7) & 1

	// Recover X from curve equation:
	// x^2 = (y^2 - 1) / (d*y^2 + 1)

	y2 := modMul(y, y)
	numerator := modSub(y2, big.NewInt(1))
	denominator := modAdd(modMul(edwardsD, y2), big.NewInt(1))

	x2 := modMul(numerator, modInverse(denominator))

	// Since p = 5 mod 8:
	// sqrt(x2) = x2^((p+3)/8)
	exp := new(big.Int).Add(fieldPrime, big.NewInt(3))
	exp.Rsh(exp, 3)

	x := new(big.Int).Exp(x2, exp, fieldPrime)

	// Verify root
	check := modMul(x, x)
	if check.Cmp(x2) != 0 {
		// multiply by sqrt(-1)
		I, _ := new(big.Int).SetString(
			"19681161376707505956807079304988542015446066515923890162744021073123829784752",
			10,
		)
		x = modMul(x, I)
	}

	// Match sign bit
	if x.Bit(0) != uint(xSign) {
		x.Sub(fieldPrime, x)
		x.Mod(x, fieldPrime)
	}

	return x, y
}

// -----------------------------------------------------------------------------
// Convert field element to radix-2^25.5 representation
// -----------------------------------------------------------------------------

func fieldElementToLimbs(x *big.Int) [10]uint32 {
	var limbs [10]uint32

	v := new(big.Int).Set(x)

	for i := 0; i < 10; i++ {
		bits := 26
		if i%2 == 1 {
			bits = 25
		}

		mask := new(big.Int).Sub(
			new(big.Int).Lsh(big.NewInt(1), uint(bits)),
			big.NewInt(1),
		)

		limb := new(big.Int).And(v, mask)
		limbs[i] = uint32(limb.Uint64())

		v.Rsh(v, uint(bits))
	}

	return limbs
}

func writeFieldElement(f *os.File, x *big.Int) error {
	limbs := fieldElementToLimbs(x)

	for i := 0; i < 10; i++ {
		if err := binary.Write(f, binary.LittleEndian, limbs[i]); err != nil {
			return err
		}
	}

	return nil
}

// -----------------------------------------------------------------------------
// Write affine point as:
//   Y - X
//   Y + X
//   2*d*X*Y
// -----------------------------------------------------------------------------

func writePrecomputedPoint(f *os.File, x, y *big.Int) error {
	ymX := modSub(y, x)
	ypX := modAdd(y, x)
	xy := modMul(x, y)
	txy := modMul(twoD, xy)

	if err := writeFieldElement(f, ymX); err != nil {
		return err
	}

	if err := writeFieldElement(f, ypX); err != nil {
		return err
	}

	if err := writeFieldElement(f, txy); err != nil {
		return err
	}

	return nil
}

// -----------------------------------------------------------------------------
// Compute 2^(k*d) * B
// -----------------------------------------------------------------------------

func basePower(k, d int) *edwards25519.Point {
	shift := k * d

	// scalar = 2^(k*d)
	s := new(big.Int).Lsh(big.NewInt(1), uint(shift))
	scalarBytes := bigIntToLittleEndian32(s)

	scalar, err := new(edwards25519.Scalar).SetCanonicalBytes(scalarBytes)
	if err != nil {
		panic(err)
	}

	return new(edwards25519.Point).ScalarBaseMult(scalar)
}

// -----------------------------------------------------------------------------
// Main precomputation
// -----------------------------------------------------------------------------

func main() {
	var (
		w     = flag.Int("w", 4, "comb width")
		out   = flag.String("out", "precomp.bin", "output file")
		tBits = flag.Int("t", 255, "scalar bit length")
	)

	flag.Parse()

	d := (*tBits + *w - 1) / *w

	fmt.Printf("w = %d\n", *w)
	fmt.Printf("t = %d\n", *tBits)
	fmt.Printf("d = %d\n", d)
	fmt.Printf("points = %d\n", 1<<*w)

	f, err := os.Create(*out)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	// Precompute basis points:
	//   P_i = 2^(i*d) * B
	basis := make([]*edwards25519.Point, *w)

	for i := 0; i < *w; i++ {
		basis[i] = basePower(i, d)
	}

	total := 1 << *w

	for idx := 0; idx < total; idx++ {
		acc := edwards25519.NewIdentityPoint()

		for bit := 0; bit < *w; bit++ {
			if ((idx >> bit) & 1) == 1 {
				acc.Add(acc, basis[bit])
			}
		}

		x, y := decodeAffine(acc)

		if err := writePrecomputedPoint(f, x, y); err != nil {
			panic(err)
		}
	}

	fmt.Printf("Wrote %d points (%d bytes) to %s\n",
		total,
		total*120,
		*out,
	)
}
