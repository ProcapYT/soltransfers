# SOL TRANSFERS
This app transfers any token and amount of the solana blockchain from a private key to several public addresses. On the `data` folder you will find a file called `mints-mainnet.txt`, on this file you can find mint addresses of some coins of the solana blockchain, if you need the mint address of a coin that is not there you can go to https://coingecko.com and there you can search for the coin you need to get the mint adress.

> [!WARNING]
> If you want to get a mint of a token, you have to make sure that the mint adress is from the solana blockchain.

### REQUIREMENTS
* Node.js v20.12.2
* npm.js v10.5.0

### CONFIGURATION
1. `npm install`
2. In case you have a seed phrase of 12 words of phantom, there is a script that gives you the private key and the public adress (you will only need the private key) for the next step. To run the script you can either run `npm run seedPhrase` or `node scripts/seedPhraseToPrivateKey.js`
3. Encript your private key with a password so no one can see it:
    `npm run encode` or `node scripts/privateKeyEncoder.js --encode`
4. In the directory `data` you will find a json file called `inputData.json`, in this file you have to add the reciever address/addresses, the mint of the token and the amount e.g:
```json
[
    {
        "address": "ADDRESS_1",
        "TOKEN_MINT": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // jupiter's mint address
        "amount": 12
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

### USE
Once you have configured the app with your own needs you have to run `npm start` or `node scripts/main.js` to transfer the USDC to the public addresses 

> [!TIP]
> If you need to paste anything like the private key or the seed phrase just press right click or right click and then paste