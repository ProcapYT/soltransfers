# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Node.js CLI (ESM, Node v20) that sends SOL or SPL tokens from one wallet to a list of Solana addresses. All transfers are real on-chain transactions: the network comes from `SOLANA_NETWORK` in `.env` (passed to `clusterApiUrl`, e.g. `devnet` / `mainnet-beta`). Use `devnet` when testing changes.

## Commands

```bash
npm install
npm run seedPhrase   # derive base58 private key + address from a seed phrase (Phantom path m/44'/501'/0'/0')
npm run encode       # encrypt a private key with a password -> temp/privkey.txt + temp/privkey.json
npm start            # validate and run the transfers listed in data/inputData.json (runs scripts/main.js)
```

There is no build step, linter, or test suite (`scripts/app.test.js` is gitignored and not part of the repo).

To test a change, run it on devnet from a copy of the repo with its own `temp/`, `.env`, `data/inputData.json` and `data/addressbook.txt`, so the user's real files are never touched. The public RPC airdrop is closed (`410`), so a devnet wallet has to be funded by the user through https://faucet.solana.com. `npm run encode` and the password prompt need a TTY; drive them with `script -qfec "<command>" /dev/null`. A run with a wrong password checks the validation without sending anything, because the password is asked after validating.

## Architecture

- `scripts/main.js` is a top-level-await script, not a module with exports. It runs top to bottom: checks connectivity via DNS, opens the `Connection`, loads the mints file and the addressbook, validates every entry of `data/inputData.json` (`prepareTransfers`), and only then asks for the password, decrypts the key and sends the transfers one after another.
  - Each entry is `{ address, token, amount, skip? }`. `address` is a name from `data/addressbook.txt` (case insensitive, the file is optional) or a raw solana address. `token` is a symbol (case insensitive): `SOL` is native (`sendSOL`), anything else is looked up in `data/mints-${SOLANA_NETWORK}.txt` (`sendToken`, which creates the sender and receiver associated token accounts if needed). Raw mint addresses are not accepted, and the legacy `TOKEN_MINT` field is rejected with an error on purpose.
  - `prepareTransfers` collects all the errors (bad address, unknown token, mint missing on the network, invalid amount, too many decimals) and exits before sending anything. Keep new checks there so a run never stops halfway.
  - Amounts are converted to integer base units with `toBaseUnits` (string-based, returns BigInt) using the mint's on-chain decimals (9 for SOL), to avoid floating point errors.
  - `handleTransactionErrors` matches substrings in the error stack: some cases call `terminalError` (exit 1), others only `WARN` and the loop moves on to the next entry.
- `scripts/addressFiles.js` parses the mints files and the addressbook, which share the `NAME: address` format (`#` comments). Duplicated names or invalid addresses abort the run, and `SOL` can't be in a mints file. There is one mints file per network because mints differ between mainnet and devnet; the addressbook is the same for every network.
- `scripts/privateKeyEncoder.js` uses AES-256-GCM with a PBKDF2-SHA256 key (100k iterations). The ciphertext goes to `temp/privkey.txt` and salt/iv/tag to `temp/privkey.json`. It exports `encodeFile`/`decodeFile`, and when run with `--encode` it also works as a CLI.
- `scripts/constants.cjs` is CommonJS on purpose (it uses `__dirname`) and holds the shared paths. All paths resolve against `process.cwd()`, so scripts must be run from the repo root.
- `scripts/input.js` handles prompts. With `hideCharacters=true` it puts stdin in raw mode and masks input with `*`, so it needs a TTY.
- `scripts/customLogs.js` provides `LOG` / `WARN` / `ERROR` with colored prefixes (via `samcolors`). Use these for output instead of plain `console.log`.

## Sensitive files

`temp/` (encrypted key), `.env`, `data/inputData.json` and `data/addressbook.txt` are gitignored and must never be committed. `data/inputData.json.example` and `data/addressbook.txt.example` are their templates. `.env.example` is the template for `.env`.
