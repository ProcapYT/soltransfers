# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Node.js CLI (ESM, Node v20) that sends SOL or SPL tokens from one wallet to a list of Solana addresses. All transfers are real on-chain transactions: the network comes from `SOLANA_NETWORK` in `.env` (passed to `clusterApiUrl`, e.g. `devnet` / `mainnet-beta`). Use `devnet` when testing changes.

## Commands

```bash
npm install
npm run seedPhrase   # derive base58 private key + address from a seed phrase (Phantom path m/44'/501'/0'/0')
npm run encode       # encrypt a private key with a password -> temp/privkey.txt + temp/privkey.json
npm start            # run the transfers listed in data/inputData.json (runs scripts/main.js)
```

There is no build step, linter, or test suite (`scripts/app.test.js` is gitignored and not part of the repo).

## Architecture

- `scripts/main.js` is a top-level-await script, not a module with exports. It runs top to bottom: checks connectivity via DNS, asks for the password, decrypts the key, opens the `Connection`, then loops over `data/inputData.json`.
  - Each entry is `{ address, TOKEN_MINT, amount, skip? }`. `TOKEN_MINT: "SOLANA"` is a sentinel for native SOL (`sendSOL`, 1 SOL = 1e9 lamports). Anything else is a mint address (`sendToken`): it creates the sender and receiver associated token accounts if needed and scales `amount` by the mint's on-chain decimals. Entries with `skip: true` are skipped.
  - Token symbols for logging come from `solana-token-list`, which is always filtered to `mainnet-beta` whatever `SOLANA_NETWORK` is set to.
  - Transfers run one after another. `handleTransactionErrors` matches substrings in the error stack: some cases call `terminalError` (exit 1), others only `WARN` and the loop moves on to the next entry.
  - Amounts are converted to integer base units with `toBaseUnits` (string-based, returns BigInt) to avoid floating point errors; amounts with more decimals than the mint supports abort the run.
- `scripts/privateKeyEncoder.js` uses AES-256-GCM with a PBKDF2-SHA256 key (100k iterations). The ciphertext goes to `temp/privkey.txt` and salt/iv/tag to `temp/privkey.json`. It exports `encodeFile`/`decodeFile`, and when run with `--encode` it also works as a CLI.
- `scripts/constants.cjs` is CommonJS on purpose (it uses `__dirname`) and holds the shared paths. All paths resolve against `process.cwd()`, so scripts must be run from the repo root.
- `scripts/input.js` handles prompts. With `hideCharacters=true` it puts stdin in raw mode and masks input with `*`, so it needs a TTY.
- `scripts/customLogs.js` provides `LOG` / `WARN` / `ERROR` with colored prefixes (via `samcolors`). Use these for output instead of plain `console.log`.

## Sensitive files

`temp/` (encrypted key), `.env` and `data/inputData.json` are gitignored and must never be committed. `data/inputData.json.example` is the template, and `data/mints-mainnet.txt` lists sample mint addresses that may be out of date. `.env.example` is the template for `.env`.
