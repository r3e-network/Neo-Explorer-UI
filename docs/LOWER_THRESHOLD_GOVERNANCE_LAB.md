# Lower Threshold Governance Lab

This is a real testnet validation harness for the governance / multisig flow when the live council threshold is too high to complete manually.

It uses:
- one real testnet council signer from `TESTNET_COUNCIL_WIF`
- additional ephemeral local signers generated at runtime
- a lower-threshold multisig account, default `2-of-3`
- real Supabase `multisig_requests` / `multisig_signatures`
- real testnet funding, signature collection, witness assembly, broadcast, and cleanup

## What it validates

- council membership of the provided WIF
- lower-threshold multisig account generation
- funding the multisig account on testnet with GAS
- creating a real multisig request row
- storing multiple signature rows
- assembling a real multisig witness from stored signatures
- broadcasting a real signed transaction on testnet
- cleaning up the temporary Supabase request/signature rows

## Required env

- `TESTNET_COUNCIL_WIF`

Optional:
- `MULTISIG_LAB_RPC_URL` default `https://api.n3index.dev/testnet`
- `MULTISIG_LAB_THRESHOLD` default `2`
- `MULTISIG_LAB_SIGNER_COUNT` default `3`
- `MULTISIG_LAB_FUND_AMOUNT_RAW` default `3000000`
- `MULTISIG_LAB_TRANSFER_BACK_RAW` default `1500000`

The script also reads local `.env` for:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Run

```bash
TESTNET_COUNCIL_WIF='<wif>' npm run validate:governance:lab
```

## Output

The script prints a JSON report including:
- generated signer addresses
- multisig address
- funding txid
- broadcast txid
- final VM state
- Supabase cleanup result
