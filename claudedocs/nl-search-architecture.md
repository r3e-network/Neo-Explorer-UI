# Natural-Language Interaction — Joint Architecture (indexer + MCP + LLM + explorer)

Shared blueprint for four repos + two hosting platforms. Decisions locked with the
project owner: **(A)** remote MCP via the Anthropic MCP connector; **(N3 + Neo X)**
both chains; all repos cloned under `~/git/r3e/`.

## Projects

| Repo | Role | Language | State |
| --- | --- | --- | --- |
| `neo3fura` | N3 indexer, 146 query methods, backs `api.n3index.dev` | Go | exists |
| `neo-n3-mcp` | MCP server (stdio + REST); RPC reads + name resolution + gated writes | TS, v3.1.0 | exists — **extend** |
| `Neo-Explorer-UI` | explorer SPA + `api/*` serverless; the NL front door | Vue 3 | exists (this hub) |
| Claude | LLM orchestrator / intent translator | — | Anthropic API |

Neo X data (EVM) comes from Blockscout (`xexplorer.neo.org`) today, self-hosted
`neox-rs` + fura later — same tool contract, swap the backend.

## Topology

```
User ─▶ Cloudflare (DNS · WAF · bot · per-IP rate limit · CDN cache)
          ├─▶ Vercel: Neo-Explorer-UI SPA
          └─▶ Vercel: api/nl-query   (orchestrator; holds ANTHROPIC_API_KEY)
                 │  Anthropic API — Claude agent loop, MCP connector
                 ▼
          Cloudflare Worker / hosted origin: neo-n3-mcp  (Streamable HTTP MCP, bearer auth, READ-ONLY)
                 │  tool calls
                 ├─ N3 tools  ─▶ neo3fura (api.n3index.dev, 146 methods) + N3 RPC
                 └─ X  tools  ─▶ Blockscout (xexplorer) → later neox-rs/fura
```

Division of labor: **Vercel** owns the SPA + `api/nl-query` (tight coupling to
existing `api/lib`). **Cloudflare** owns edge protection + hosts the remote MCP so
Claude Desktop / Cursor / other clients reuse the same tools (the point of approach A).

## MCP tool contract (the cross-repo API)

Read-only. Every tool maps 1:1 to an indexer/Blockscout method the backend can
actually answer — no tool the data layer can't back. `network` ∈
`n3-mainnet | n3-testnet | neox-mainnet | neox-testnet`.

### N3 tools → neo3fura

| Tool | neo3fura method | Purpose |
| --- | --- | --- |
| `n3_resolve_entity` | n3index name/hash resolve | "the bridge", "GAS" → hash/address |
| `n3_get_address` | GetAddressInfoByAddress | balances, counts |
| `n3_list_transfers_by_address` | GetTransferByAddress / GetTransferTxByAddressAsset | transfers in/out, by asset |
| `n3_list_transactions_by_address` | GetRawTransactionByAddress | tx history |
| `n3_asset_holders` | GetAssetHoldersByContractHash | top holders of a token |
| `n3_assets_held_by_address` | GetAssetsHeldByAddress | portfolio |
| `n3_active_addresses` | GetActiveAddresses | activity window |
| `n3_daily_transactions` | GetDailyTransactions | trend series |
| `n3_fee_burn` | GetCumulativeFeeBurn / GetNetFeeRange | burn / fee stats |
| `n3_committee` | GetCommittee / GetCandidateByAddress | governance |
| `n3_contract` | GetContractByContractHash / GetContractListByName | contract lookup |
| `n3_application_log` | GetApplicationLogByTransactionHash | events/notifications |

### Neo X tools → Blockscout

| Tool | Blockscout endpoint | Purpose |
| --- | --- | --- |
| `x_search` | /search | typed entity search |
| `x_get_address` | /addresses/{h} | balance, flags, name |
| `x_list_transactions_by_address` | /addresses/{h}/transactions | tx history (cursor) |
| `x_list_token_transfers` | /addresses/{h}/token-transfers | transfers (cursor) |
| `x_token_holders` | /tokens/{h}/holders | top holders |
| `x_token_info` | /tokens/{h} | supply, holders, meta |
| `x_stats_chart` | stats service line | daily txns / gas trend |
| `x_block` / `x_transaction` | /blocks, /transactions | detail |

## Orchestrator contract (`api/nl-query`)

1. **Gate** — identifier inputs (hash / height / address / NNS) never reach the LLM;
   the existing regex classifier answers them instantly. Only prose enters here.
2. **Agent loop** — Claude (Haiku for routing/navigation; escalate for multi-step
   analysis), MCP connector to the remote neo-n3-mcp, bounded max tool calls + rows +
   wall-clock. Chain hint from the current route/network.
3. **Two products** — `navigate` (a route the SPA pushes, instant/cheap) or
   `answer` (a rendered result card from tool rows — the analytical payoff).
4. **Envelope** — reuse `api/lib`: `withApiTelemetry`, `enforceSimpleRateLimit`,
   `api/prices`-style degraded payload, hard timeout. Server-side key only.

## Security model (non-negotiable)

- **Read-only end to end.** neo-n3-mcp runs with `NEO_ENABLE_WRITES=false`; no signer
  WIF anywhere in the web path.
- **Keys** — `ANTHROPIC_API_KEY` only on Vercel; MCP endpoint behind a bearer + CORS
  allowlist; never shipped to the client.
- **Prompt injection** — on-chain strings (contract names, token symbols, decoded
  UTF-8 input) are attacker-controlled: treated as data, the LLM only
  translates→calls tools→formats, never acts on their content.
- **Abuse/cost** — Cloudflare WAF + per-IP limit at the edge, `api/lib` limiter at the
  function, identical-query cache, bounded tool budget. LLM never emits a
  hash/number that did not come from a tool result.

## Phased plan (workstreams)

- **WS-A** — this blueprint + tool schema. ✅
- **WS-B** (`neo-n3-mcp`) — indexer-backed analytical tools + Neo X toolset +
  Streamable HTTP MCP transport (bearer). jest-tested.
- **WS-C** (`Neo-Explorer-UI`) — `api/nl-query` orchestrator + SearchBox prose wiring +
  result-card rendering; **Phase 0** offline intent/entity router as the fast path
  (ships independently, no LLM).
- **WS-D** — Cloudflare (host remote MCP, WAF, rate limit, cache) + Vercel (function
  config, env/secrets). Secrets are user-provisioned.

## Owner-provisioned prerequisites (cannot be done from code)

- Anthropic API key (Vercel env `ANTHROPIC_API_KEY`).
- Cloudflare account/zone for the remote-MCP host + WAF rules.
- MCP bearer secret shared between Vercel orchestrator and the MCP host.
- Confirm `api.n3index.dev` = standard neo3fura method set (assumed here).
