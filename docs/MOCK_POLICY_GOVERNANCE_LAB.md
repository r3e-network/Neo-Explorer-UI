# Mock Policy Governance Lab

This testnet validation harness deploys a small owner-gated mock policy contract and then runs the governance multisig flow against that real contract.

The deployed contract simulates policy-style setters:

- `setFeePerByte`
- `setExecFeeFactor`
- `setStoragePrice`

Each setter requires `Runtime.CheckWitness(owner)`, and the owner is injected at deploy time as the temporary lower-threshold multisig account.

## What this validates

- contract compilation in this repo
- testnet deployment of a new contract
- lower-threshold multisig owner gating on-chain
- governance-style request persistence in Supabase
- signature collection persistence in Supabase
- witness assembly from collected signatures
- real broadcast on testnet
- on-chain verification that the setter values changed
- cleanup of temporary request/signature rows

## Required env

- `TESTNET_COUNCIL_WIF`

The script also reads local `.env` for:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:
- `MOCK_POLICY_LAB_RPC_URL`
- `MOCK_POLICY_LAB_THRESHOLD`
- `MOCK_POLICY_LAB_SIGNER_COUNT`
- `MOCK_POLICY_LAB_FUND_AMOUNT_RAW`

## Run

```bash
TESTNET_COUNCIL_WIF='<wif>' npm run validate:governance:mock-policy
```
