"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { avalancheFuji } from "viem/chains";

export function Providers({ children }: { children: ReactNode }) {
	return (
		<PrivyProvider
			appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
			config={{
				loginMethods: ["email"],
				appearance: { theme: "dark", accentColor: "#8e1218" },
				embeddedWallets: {
					ethereum: { createOnLogin: "users-without-wallets" },
					showWalletUIs: false,
				},
				defaultChain: avalancheFuji,
				supportedChains: [avalancheFuji],
			}}
		>
			{children}
		</PrivyProvider>
	);
}
