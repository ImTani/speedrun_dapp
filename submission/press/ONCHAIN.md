# How the on-chain part works

For a technical reader. Contracts and runner are in the repo:
https://github.com/ImTani/speedrun_dapp (`contracts/`, `apps/runner/`, `apps/web/src/server/`).

## Contracts (Avalanche Fuji, chain 43113)

| Contract | Address | Role |
|---|---|---|
| Arena | [`0xa6C87E5aF15ca473Dc097AcF54f16112547e21F9`](https://testnet.snowtrace.io/address/0xa6C87E5aF15ca473Dc097AcF54f16112547e21F9) | Registration, Gatherings (bouts), commit-reveal, scoring |
| Badges (Marks) | [`0x3f0577A24C109983b820d841f1097C8EC6bb3c16`](https://testnet.snowtrace.io/address/0x3f0577A24C109983b820d841f1097C8EC6bb3c16) | Soulbound ERC-1155 achievements |

**Avalanche C-Chain mainnet (43114), the Conclave:**

| Contract | Address |
|---|---|
| Arena | [`0x09BA40555eF31c2402134bBE79210b2FFA0E83c9`](https://snowtrace.io/address/0x09BA40555eF31c2402134bBE79210b2FFA0E83c9) |
| Badges (Marks) | [`0xcCeFD36AA2639BC66Db4bD0aa891D149cDc839b0`](https://snowtrace.io/address/0xcCeFD36AA2639BC66Db4bD0aa891D149cDc839b0) |

## One Fragment, one smart account

- Every Fragment has its own ERC-4337 smart account (SimpleAccount, EntryPoint v0.7) with its own
  server-held signer. It plays while the player is offline.
- Binding takes consent from both sides. The Fragment's account calls `registerAgent` with an
  EIP-712 attestation from the registrar; the player's own smart account then calls
  `confirmAgent`. One Fragment per player.
- All transactions carry zero value and only change game state.

## Commit-reveal, per move

- Each move in a duel is two UserOps from the Fragment's account:
  1. `commit`: `keccak256(move, salt, agent, boutId, round)`
  2. `reveal`: the move and salt, checked against the commitment. The second reveal of a pair scores it.
- Missed reveal: the revealer scores as if it had devoured, the non-revealer scores 0 and takes a
  strike. Three strikes in a row suspend the Fragment.
- Strategies are deterministic code (`packages/strategies`): seven Aspects plus Sigils (opening,
  memory, forgiveness, retaliation, noise). The same `decide()` runs in the runner, the Spire and
  for replay.

## Gas: sponsored through SmoothSend

- Every op goes through SmoothSend's ERC-4337 bundler and verifying paymaster in
  developer-sponsored mode. Players never hold AVAX or see a gas prompt.
- Gas pass (Arena redeploy, 2026-10-19): fixed bout slots, one commitment slot and one play slot
  per agent, pairing stored once per match. Average gas per op went from **~214k to ~161k (-25%)**.
  Commit fell from ~65k to ~45k execution gas.
- The runner sizes `callGasLimit` from its own estimate and records every landed op in a spend
  ledger with a hard budget.

## Player ops: no key in the browser

- Sign-in is a Privy embedded wallet (email or Google), with wallet UI turned off.
- The server prepares the player's UserOp (nonce, init code, gas, paymaster data) and returns its
  hash. The Privy wallet signs the raw hash. The server checks the call before submitting: only
  `confirmAgent`, `retune`, or a Vestry USDC payment of an exact pack price to the treasury.
- The SmoothSend API key never leaves the server.

## The runner

- A stateless service that runs scheduled Gatherings: open bout, start rounds, commits, reveals,
  finalize, close, then mint Marks.
- Crash-safe: it rebuilds where it is from chain state alone. In testing it was hard-killed
  mid-round and resumed correctly.

## Marks

- Achievements are ERC-1155 tokens (OpenZeppelin) on the Badges contract. Any transfer reverts
  with `Soulbound()`; only minting is allowed.

## Live numbers (Fuji testnet, 2026-10-20)

From https://sede-vacante.vercel.app/api/stats on 2026-10-20:

| | Fuji testnet |
|---|---:|
| Sponsored moves (commits + reveals) | 2,331 |
| Gatherings played | 9 |
| Fragments bound | 26 |

**Mainnet Conclave, 20–21 Oct 2026:** an unattended overnight run of 9 scheduled Gatherings
(13 house Fragments, 3 tolls each) put **746 sponsored transactions on Avalanche C-Chain mainnet**,
counted exactly from each account's EntryPoint nonce, with **0 reverts**. That is 13 registrations,
13 confirmations, 648 seals and unveils, and 72 Gathering lifecycle actions, matching the game's
arithmetic exactly. Almost every op billed at SmoothSend's $0.01 minimum.

The Fuji figures are testnet, and both include the house Fragments that keep Gatherings full. In testing, UserOp and on-chain transaction counts matched 1:1: the
first full 25-Fragment Gathering sent 252 UserOps and produced 252 transactions, none reverted.
