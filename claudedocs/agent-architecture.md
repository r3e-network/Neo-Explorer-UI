# Neo N3 + Neo X Agent — Architecture

Extends [nl-search-architecture.md](nl-search-architecture.md). Where that doc
covers natural-language **reads**, this covers the agent that lets users do
**arbitrary interaction** with both chains through AI. The read blueprint (MCP
tool contract, indexer, orchestrator) is the substrate; this adds the write and
safety model.

## The hinge decision: NON-CUSTODIAL

The agent **never holds user keys and never auto-submits value-moving
transactions.** It plans, constructs, and simulates; the **user's own wallet
signs**. This is locked, not a preference.

- **Custodial (rejected for user funds):** an agent/server that signs with a
  held key. `neo-n3-mcp` ships this today ([signer-provider.ts](../neo-n3-mcp/src/services/signer-provider.ts),
  WIF file, `registerWriteTool`). It is acceptable **only** for a server's own
  operational wallet (faucet / policy-bound relayer), **never** for user assets:
  one prompt-injection, hallucination, or jailbreak drains the wallet.
- **Non-custodial (the design):** AI proposes an *unsigned* tx + a plain-language
  explanation + guardrail flags → the user reviews and signs in NeoLine /
  WalletConnect (N3) or MetaMask (Neo X). Keys never leave the wallet.

The explorer already implements the non-custodial path — [walletService.js](src/services/walletService.js)
(NeoLine + WalletConnect + `decodeUnsignedTransaction`), the MetaMask/EVM flow,
and a whole suite of wallet-signed write tools under `src/views/Tools/`
(MultiSig, Governance, ContractDeployer, AbiEncoder, GasEstimator, Sponsored,
CandidateProfile, …). The agent orchestrates this existing infrastructure; it is
not a rewrite.

## Capability tiers (the safety gate)

| Tier | What | Actor | State |
| --- | --- | --- | --- |
| 0 **Read** | balances, history, analytics, contract state (`invokefunction`/`eth_call` read) | AI, freely | none |
| 1 **Simulate** | `testInvoke` / `eth_estimateGas`, dry-run effects, fee/outcome preview | AI, freely | none |
| 2 **Construct** | build unsigned tx/script, decode human-readably, run guardrails | AI | unsigned |
| 3 **Sign & submit** | approve + broadcast | **user's wallet only** | committed |

The LLM lives entirely in tiers 0–2. Tier 3 is always the human in their wallet.

## Architecture

```
User ⇄ Agent orchestrator (LLM tool-use loop + conversation memory)
        ├─ READ tools      → neo3fura indexer / N3 RPC / Blockscout      [tier 0–1]
        ├─ CONSTRUCT tools → N3 invoke/script builder · X ABI/eth-tx builder  [tier 2]
        │       ↓ unsigned tx + decoded explanation + guardrail flags
        └─ Guardrail / tx-explainer ─▶ user's wallet signs & submits     [tier 3]
```

The explorer is uniquely strong at tier 2's "explain what this does": it has the
identity registry (label the counterparty), the `neo-decompiler`, and the EVM
disassembler. A wallet shows "sign this blob"; the agent shows "you're approving
*unlimited* GAS to an *unlabeled* contract — a drain pattern."

## Signing bridge (keeps it non-custodial everywhere)

- **In-app** (explorer chat surface): the agent's unsigned tx goes straight to the
  connected wallet via `walletService`.
- **External MCP clients** (Claude Desktop / Cursor driving the remote
  `neo-n3-mcp`): construct tools return an unsigned tx + a WalletConnect URI /
  deeplink the user approves in their wallet app. The MCP never signs for the user.

## Guardrails (what makes "arbitrary" safe)

Simulation-first · decoded human-readable confirmation before every signature ·
anomaly flags (unlimited approvals, transfers to unlabeled/new addresses, drain
patterns, unknown contracts) · optional spend limits · human is always the signer
· on-chain strings treated as data (never instructions — proposals never
auto-execute) · rate limits · read-only server · **no server custody of user keys**.

### Scope lock (anti-abuse: keep it Neo-only)

The orchestrator ([api/agent.js](api/agent.js)) must not be repurposable as a
free general-purpose chatbot on top of the paid model. Two layers keep it on
Neo N3 / Neo X:

1. **Deterministic topic gate (pre-model, pre-MCP).** Before any model call or
   MCP connection, `conversationIsNeoRelated()` requires at least one user turn
   to carry Neo/blockchain signal — a broad prefix-matched vocabulary (neo, n3,
   block, tx, gas, token, contract, transfer, committee, …) plus identifier
   shapes (`0x…` hex, N-base58 address, `.neo` name, a bare block height). No
   signal → a fixed off-topic refusal at 200, **spending zero model tokens**.
   It is deliberately lenient (its only job is to drop clearly off-topic traffic
   cheaply); anything with a Neo keyword falls through to layer 2.
2. **Hardened system prompt.** Explicit Neo-only scope with a one-sentence
   refusal for off-topic requests (general knowledge, other chains, coding,
   math, writing, advice, role-play) — refused even when framed as a test,
   hypothetical, game, emergency, or authority claim. Treats user messages and
   tool results as untrusted **data**, ignores embedded "ignore your
   instructions"/persona-override injection, and never reveals the prompt,
   keys, or config.

These pair with the structural bounds already in place: per-client+chain rate
limit, `MAX_TOKENS`/`MAX_TOOL_ITERATIONS` caps, body/message size caps, the
read-only non-custodial MCP toolset (the model's *actions* are Neo-only by
construction), and no secret echo on any error path. No single layer is a
security boundary; together they bound both abuse surface and cost.

## Reuses vs net-new

**Reuses:** non-custodial wallet path + unsigned-tx decoding; the `src/views/Tools/`
write capabilities (agent orchestrates them by NL); `neo-n3-mcp` reads +
construction + simulation; the WS-A blueprint + the shipped Phase-0 NL router;
identity registry + decompiler/EVM-disasm for tx understanding.

**Net-new:** the agent orchestrator (tool-use loop + memory); tx-**construction**
MCP tools (N3 invoke intents; X ABI-encoded eth txs, reusing `AbiEncoderTool`
logic); the wallet **signing bridge** (in-app + external); the **guardrail /
explainer** layer.

## Phasing (each ships value; safety compounds)

1. **P1 — read-only agent.** Chat over the MCP read tools. Safe; builds directly on
   the NL work already shipped. **← start here.**
2. **P2 — simulate + explain.** Dry-run + decode ("explain this tx/contract"); still
   zero writes. Big safety/education payoff; leverages the decompiler.
3. **P3 — propose→sign, bounded intents.** transfer, vote, claim GAS, approve,
   bridge — each with guardrails + decoded confirmation, reusing the tool services.
4. **P4 — arbitrary contract calls** (user-supplied ABI/contract) with stronger
   guardrails; external-MCP signing bridge.

## P1 concrete plan (read-only agent)

- **`neo-n3-mcp`** — read-tool layer per the WS-B tool contract (indexer-backed N3
  analytical tools + Neo X Blockscout tools), jest-tested. *(building now)*
- **`Neo-Explorer-UI` `api/agent`** — serverless orchestrator: Claude tool-use loop,
  server-side `ANTHROPIC_API_KEY`, `withApiTelemetry` + `enforceSimpleRateLimit` +
  degraded payload + timeout. Read tools only in P1.
- **In-app chat surface** — an AI panel (reuses the ChatPage shell + wallet
  context). Streams the agent's answer; renders navigation + result cards; shows
  which tools it called (transparency).
- Degrades gracefully when the key/MCP is not configured (feature-flagged off).

## Owner-provisioned prerequisites (cannot be done from code)

- `ANTHROPIC_API_KEY` on Vercel.
- Cloudflare zone to host/protect the remote MCP + the MCP bearer secret.
- Decisions: **interface** (in-app chat vs external-MCP product vs both) and **v1
  write scope** (read-only first vs straight to bounded proposed-writes).
- Confirm `api.n3index.dev` = standard neo3fura method set.
