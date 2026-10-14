import { encodeAbiParameters, type Hex, keccak256 } from "viem";

/**
 * Fisher–Yates over [0, n), identical to Arena.sol `_permutation`:
 * for i = n-1 down to 1: j = uint256(keccak256(abi.encode(seed, i))) % (i + 1); swap(i, j).
 */
export function permutation(seed: Hex, n: number): number[] {
	const perm = Array.from({ length: n }, (_, i) => i);
	for (let i = n - 1; i > 0; i--) {
		const hash = keccak256(
			encodeAbiParameters(
				[{ type: "bytes32" }, { type: "uint256" }],
				[seed, BigInt(i)],
			),
		);
		const j = Number(BigInt(hash) % BigInt(i + 1));
		[perm[i], perm[j]] = [perm[j] as number, perm[i] as number];
	}
	return perm;
}

/**
 * Opponent for each participant index in one match, mirroring Arena.sol `_partnerOf`:
 * permutation positions (0,1), (2,3), … are paired; with odd n the last position sits out (null).
 */
export function pairings(seed: Hex, n: number): (number | null)[] {
	const perm = permutation(seed, n);
	const partner: (number | null)[] = Array.from({ length: n }, () => null);
	for (let pos = 0; pos + 1 < n; pos += 2) {
		const a = perm[pos] as number;
		const b = perm[pos + 1] as number;
		partner[a] = b;
		partner[b] = a;
	}
	return partner;
}
