export interface MaskLayer {
	role: "body" | "relief" | "inlay" | "engrave";
	mat?: string;
	mat2?: string;
	split?: number;
	trim?: string;
	soft?: boolean;
	clip?: number;
	d: string;
	holes?: string;
}

export interface MaskGeometry {
	layers: MaskLayer[];
	eyes: [number, number][];
	eyeR: [number, number];
	box: [number, number, number, number];
}

export const GEOMETRY: Record<string, MaskGeometry>;
