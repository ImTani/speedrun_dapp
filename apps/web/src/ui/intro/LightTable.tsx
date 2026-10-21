/**
 * The Light table: what one toll pays for each pair of choices, as a 2 x 2 grid. Rows are
 * your Fragment's choice, columns the rival's; the big number is yours, the small one the
 * rival's. The numbers are the real payoff (@arena/strategies scoreTurn).
 *
 *   <LightTable />
 */
import { Move, scoreTurn } from "@arena/strategies";
import { codex } from "@/lexicon/codex";
import { DevourGlyph, KindleGlyph } from "./glyphs";
import s from "./intro.module.css";

const T = codex.table;
const MOVES = [Move.Cooperate, Move.Defect] as const;
type M = (typeof MOVES)[number];

const word = (m: M) => (m === Move.Cooperate ? T.kindles : T.devours);
const spoken = (m: M) => (m === Move.Cooperate ? T.kindleWord : T.devourWord);
const glyph = (m: M) =>
	m === Move.Cooperate ? <KindleGlyph size={22} /> : <DevourGlyph size={22} />;
/** The tone of a cell: shared, you took, you were taken from, both lost. */
const tone = (a: M, b: M) =>
	a === b
		? a === Move.Cooperate
			? "share"
			: "ruin"
		: a === Move.Defect
			? "took"
			: "taken";

export function LightTable({ className }: { className?: string }) {
	return (
		<table className={className ? `${s.table} ${className}` : s.table}>
			<thead>
				<tr>
					<td className={s.corner} />
					<th scope="colgroup" colSpan={2} className={s.axis}>
						{T.rival}
					</th>
				</tr>
				<tr>
					<th scope="col" className={s.axis}>
						{T.yours}
					</th>
					{MOVES.map((b) => (
						<th key={b} scope="col" className={s.colHead}>
							{glyph(b)}
							<span>{word(b)}</span>
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{MOVES.map((a) => (
					<tr key={a}>
						<th scope="row" className={s.rowHead}>
							{glyph(a)}
							<span>{word(a)}</span>
						</th>
						{MOVES.map((b) => {
							const [mine, theirs] = scoreTurn(a, b);
							return (
								<td
									key={b}
									className={s.cell}
									data-tone={tone(a, b)}
									aria-label={T.cell(spoken(a), spoken(b), mine, theirs)}
								>
									<span className={s.mine} aria-hidden="true">
										{mine > 0 ? `+${mine}` : mine}
									</span>
									<span className={s.theirs} aria-hidden="true">
										{T.rivalGets(theirs)}
									</span>
								</td>
							);
						})}
					</tr>
				))}
			</tbody>
		</table>
	);
}
