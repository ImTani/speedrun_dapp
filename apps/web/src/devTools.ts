/**
 * The review tools (the /preview harness, the /_brand pages, `?intro`) exist in development and
 * on Vercel preview deployments (staging), never in a production deployment.
 * NEXT_PUBLIC_STAGING is set at build time in next.config.ts.
 */
export const devTools =
	process.env.NODE_ENV !== "production" ||
	process.env.NEXT_PUBLIC_STAGING === "1";
