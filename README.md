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

4. Set the recipients addresses, the tokens to transfer, and the ammounts. In the directory `data` you will find a json file called `inputData.json.example`. Rename it to `inputData.json` and include the target addresses for the transfers.

This part is tricky.

To identify the Token you want to transfer, you will identify the token using the token "mint address", or the "contract address". On the `data/mints-mainnet.txt`, you can find some examples for some tokens. Warning: by the time you read this, they may be outdated.

You can find the token smart contract (mint) address, in CoinGecko:
    - Go to https://www.coingecko.com/
    - Search for the token (for example USDC) --> https://www.coingecko.com/en/coins/usdc
    - On the Info section --> contract --> Select the Solana address for the token

Here's an example of the inputData.json file, transfer 12 JUP to ADDRESS_1, 5 SOL to ADDRESS_2, and 100 USDC to ADDRESS_2

```json
[
    {
        "address": "ADDRESS_1",
        "TOKEN_MINT": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // jupiter's mint address
        "amount": 12,
        "skip": true // to skip this transaction
    },
    {
        "address": "ADDRESS_2",
        "TOKEN_MINT": "SOLANA", // solana doesn't have a mint address
        "amount": 5
    },
    {
        "address": "ADDRESS_2", // you can repeat addresses to send several tokens to the same wallet
        "TOKEN_MINT": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // mint address of USDC
        "amount": 100
    },
    ...
]
```

> [!IMPORTANT] 
> Solana doesn't have a mint address so on the TOKEN_MINT in the json file just put "SOLANA" and it will make the transfer with solana just like it would with any other token

### MAKE TRANSFERS
Once you have initialized the app and set everything up, to execute the transfers you just needs you have to run:

```bash
npm start
```
