export interface StageSide {
	name: string;
	sub?: string;
	/** Aspect index 0..6 */
	aspect: number;
	mine?: boolean;
	/** Medallions already lit (0..25) */
	lit?: number;
}
export interface StageDuelSide extends StageSide {
	/** 0 = Kindle, 1 = Devour */
	move: number;
	/** Light gained this duel */
	gain: number;
}
export interface StageDuel {
	a: StageDuelSide;
	b: StageDuelSide;
	title: string;
	line1?: string;
	line2?: string;
	announce?: string;
	speed?: number;
}
export interface Stage {
	setPair(a: StageSide, b: StageSide): void;
	play(duel: StageDuel): Promise<void>;
	destroy(): void;
}
export function mountStage(
	root: HTMLElement,
	opts?: { passLabel?: string },
): Promise<Stage>;
