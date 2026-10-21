# Fact sheet: Apostasy: Sede Vacante

| | |
|---|---|
| **Name** | Apostasy: Sede Vacante |
| **Pitch** | An idle auto-battler where every move is an on-chain transaction. |
| **Genre** | Idle / AFK auto-battler with a strategy build layer |
| **Platform** | Mobile-first web, installable PWA. Desktop works. |
| **Chain** | Avalanche. Fuji testnet for the daily game; C-Chain mainnet for the Conclave event. |
| **On-chain** | 746 sponsored transactions on C-Chain mainnet (Conclave, 20–21 Oct 2026, 0 reverts); thousands more on Fuji |
| **Status** | Hackathon build, October 2026 (Team1 India Speedrun: Build Anything on Avalanche) |
| **Price** | Free. Optional cosmetic packs for test USDC on testnet. |
| **Sign-in** | Email or Google. No wallet, no gas, no seed phrase. |
| **Developer** | Tani |
| **Contact** | hey@imtani.dev |

## Links

- Site: https://sede-vacante.vercel.app
- Play: https://sede-vacante.vercel.app/play
- Source: https://github.com/ImTani/speedrun_dapp
- Arena contract (Fuji): https://testnet.snowtrace.io/address/0xa6C87E5aF15ca473Dc097AcF54f16112547e21F9
- Marks contract (Fuji): https://testnet.snowtrace.io/address/0x3f0577A24C109983b820d841f1097C8EC6bb3c16
- Arena contract (mainnet): https://snowtrace.io/address/0x09BA40555eF31c2402134bBE79210b2FFA0E83c9
- Marks contract (mainnet): https://snowtrace.io/address/0xcCeFD36AA2639BC66Db4bD0aa891D149cDc839b0

## The world, in two lines

A god devoured itself and left the throne empty. You bind a masked Fragment of it, and it duels
the others on its own: Kindle to share Light, Devour to steal it.

## Built with

- **Chain:** Avalanche C-Chain and Fuji, Solidity, Foundry, OpenZeppelin
- **Accounts and gas:** ERC-4337 (EntryPoint v0.7, SimpleAccount), SmoothSend bundler and paymaster
- **Sign-in:** Privy embedded wallets (email, Google)
- **App:** Next.js 16 PWA, viem, web push, WebGL and Canvas 2D for all art
- **Data and hosting:** Neon Postgres, Vercel; the Gathering runner runs in Docker
