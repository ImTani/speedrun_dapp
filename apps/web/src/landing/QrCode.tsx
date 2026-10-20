import { qrMatrix, qrPath } from "./qr";

/**
 * A QR code for `value`, drawn on the server as one SVG path: dark modules on bone with the
 * standard four-module quiet zone (scanners need the light margin and dark-on-light).
 */
export function QrCode({
	value,
	size = 148,
	className,
}: {
	value: string;
	size?: number;
	className?: string | undefined;
}) {
	const m = qrMatrix(value, "M");
	const box = m.length + 8;
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox={`0 0 ${box} ${box}`}
			shapeRendering="crispEdges"
			aria-hidden="true"
			focusable="false"
		>
			<rect width={box} height={box} fill="#f3e6c8" />
			<path d={qrPath(m)} fill="#0b0807" />
		</svg>
	);
}
