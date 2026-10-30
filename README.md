# SOL TRANSFERS

This app make transfers of SOL or SPL-tokens, from an origin wallet to a set of solana addresses. This scripts will work only for the Solana blockchain.


### REQUIREMENTS

* Node.js v20.12.2
* npm.js v10.5.0

### CONFIGURATION AND SET-UP

1. Initialize and load libraries 

```bash
npm install
```

2. (Optional) In case you don't have the private key, but you do have the seed phrase, there is a script that derives the private key and the public adress (you will only need the private key) from the seed phrase. To do that, run the script: 

```bash
npm run seedPhrase    
``` 

3. Encript your private key with a password so no one can see it. To do so, run the script:

```bash
npm run encode
```

4. Choose the network. Copy `.env.example` to `.env` and set `SOLANA_NETWORK` to `mainnet-beta` for real transfers, or `devnet` for testing.

```bash
cp .env.example .env
```

5. (Optional) Create your addressbook, to write names instead of solana addresses in the transfers (see [Addressbook](#addressbook)).

```bash
cp data/addressbook.txt.example data/addressbook.txt
```

6. Create the transfers file and fill it in (see [Transfers file](#transfers-file)).

```bash
cp data/inputData.json.example data/inputData.json
```

### TOKENS

Tokens are identified by their symbol (`"USDC"`, `"JUP"`...), not by their mint address. The symbols are resolved with the mints file of the network set in `.env`:

* `data/mints-mainnet-beta.txt`
* `data/mints-devnet.txt`

`SOL` is native, so it doesn't need to be in the file. Symbols are case insensitive.

To transfer a token that is not in the file, add a line with its symbol and its mint address (also called "contract address"). Lines starting with `#` are comments:

```
BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
```

> [!WARNING]
> Anyone can create a token called "USDC" on Solana, so double check the mint address before adding it. You can find it in CoinGecko:
> - Go to https://www.coingecko.com/
> - Search for the token (for example USDC) --> https://www.coingecko.com/en/coins/usdc
> - On the Info section --> contract --> Select the Solana address for the token

### ADDRESSBOOK

`data/addressbook.txt` gives names to the recipients addresses, one `NAME: address` per line. It's the same for every network, it's optional, and it's ignored by git. Names are case insensitive:

```
Alice-wallet: SOLANA_ADDRESS_OF_ALICE
Bob-wallet: SOLANA_ADDRESS_OF_BOB
```

### TRANSFERS FILE

`data/inputData.json` lists the transfers to make. Each entry has:

* `address`: a name from the addressbook, or a raw solana address.
* `token`: a symbol from the mints file, or `SOL`.
* `amount`: in token units (`1.5` USDC, not the base units). It can't have more decimals than the token.
* `skip` (optional): `true` to ignore the entry.

Here's an example, transfer 5 SOL to Alice-wallet and 100 USDC to a raw address. The JUP transfer is skipped:

```json
[
    {
        "address": "Alice-wallet", // name from the addressbook
        "token": "JUP",
        "amount": 12,
        "skip": true // to skip this transaction
    },
    {
        "address": "Alice-wallet", // you can repeat addresses to send several tokens to the same wallet
        "token": "SOL",
        "amount": 5
    },
    {
        "address": "SOLANA_ADDRESS", // raw solana address
        "token": "USDC",
        "amount": 100
    },
    ...
]
```

> [!IMPORTANT]
> The old `TOKEN_MINT` field is no longer supported. Replace it with `token` and the symbol of the token (for example `"TOKEN_MINT": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"` becomes `"token": "USDC"`).

### MAKE TRANSFERS
Once you have initialized the app and set everything up, to execute the transfers you just have to run:

```bash
npm start
```

Before asking for the password, every entry of the transfers file is validated (address, token and amount). If any entry is wrong, all the errors are listed and nothing is sent. Then the transfers are made one after another, in the order of the file.

### TESTING ON DEVNET

Try any change on devnet before using it on mainnet:

1. Set `SOLANA_NETWORK=devnet` in `.env`.
2. Use a wallet only for testing, and encrypt its key with `npm run encode`. This overwrites `temp/`, so back up your real encrypted key outside the repo first (for example `cp -r temp ~/soltransfers-key-backup`), and restore it when you go back to mainnet.
3. Get devnet SOL at https://faucet.solana.com (it asks to log in with GitHub, and rejects GitHub accounts that are too new). The airdrop through the public RPC (`solana airdrop`) is closed.
4. The tokens must be in `data/mints-devnet.txt`, with their devnet mint addresses (they are different from the mainnet ones).
