import { keccak256, toHex } from "viem";
import { describe, expect, it } from "vitest";
import { pairings, permutation } from "../src/index.ts";

describe("pairings", () => {
	it("matches Arena.sol's permutation (vector pinned in Arena.t.sol test_permutationVector)", () => {
		expect(permutation(keccak256(toHex("arena")), 7)).toEqual([
			6, 3, 1, 0, 2, 4, 5,
		]);
	});

	it("pairs consecutive permutation positions and sits out the odd one", () => {
		// perm [6,3,1,0,2,4,5] → pairs (6,3) (1,0) (2,4); 5 sits out.
		expect(pairings(keccak256(toHex("arena")), 7)).toEqual([
			1,
			0,
			4,
			6,
			2,
			null,
			3,
		]);
	});

	it("is symmetric and covers everyone when n is even", () => {
		const p = pairings(keccak256(toHex("even")), 24);
		p.forEach((partner, i) => {
			expect(partner).not.toBeNull();
			expect(p[partner as number]).toBe(i);
		});
	});
});
