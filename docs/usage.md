---
description: More details on how to use Blade-SDK.js
---

# Usage

## Class: BladeSDK

#### Methods

* [constructor](usage.md#constructor)
* [init](usage.md#init)
* [setUser](usage.md#setuser)
* [resetUser](usage.md#resetuser)
* [getBalance](usage.md#getbalance)
* [getCoinList](usage.md#getcoinlist)
* [getCoinPrice](usage.md#getcoinprice)
* [createAccount](usage.md#createaccount)
* [getPendingAccount](usage.md#getpendingaccount)
* [getAccountInfo](usage.md#getaccountinfo)
* [getNodeList](usage.md#getnodelist)
* [stakeToNode](usage.md#staketonode)
* [getKeysFromMnemonic](usage.md#getkeysfrommnemonic)
* [transferHbars](usage.md#transferhbars)
* [transferTokens](usage.md#transfertokens)
* [getTransactions](usage.md#gettransactions)
* [deleteAccount](usage.md#deleteaccount)
* [createToken](usage.md#createtoken)
* [associateToken](usage.md#associatetoken)
* [nftMint](usage.md#nftmint)
* [contractCallFunction](usage.md#contractcallfunction)
* [contractCallQueryFunction](usage.md#contractcallqueryfunction)
* [getParamsSignature](usage.md#getparamssignature)
* [sign](usage.md#sign)
* [signVerify](usage.md#signverify)
* [hethersSign](usage.md#hetherssign)
* [splitSignature](usage.md#splitsignature)
* [getC14url](usage.md#getc14url)
* [exchangeGetQuotes](usage.md#exchangeGetQuotes)
* [swapTokens](usage.md#swapTokens)
* [getTradeUrl](usage.md#getTradeUrl)
* [sendMessageToNative](usage.md#sendmessagetonative)

## Methods

### constructor

▸ **new BladeSDK**(`isWebView?`)

BladeSDK constructor.

#### Parameters

| Name        | Type      | Default value | Description                                                                                                   |
| ----------- | --------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `isWebView` | `boolean` | `false`       | true if you are using this SDK in webview of native app. It changes the way of communication with native app. |

### init

▸ **init**(`apiKey`, `network`, `dAppCode`, `fingerprint`, `completionKey?`): `Promise<InitData>`

Inits instance of BladeSDK for correct work with Blade API and Hedera network.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `apiKey`         | `string` | Unique key for API provided by Blade team.                    |
| `network`        | `string` | "Mainnet" or "Testnet" of Hedera network                      |
| `dAppCode`       | `string` | your dAppCode - request specific one by contacting us         |
| `fingerprint`    | `string` | client unique fingerprint                                     |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<InitData>` status: "success" or "error"

***

### setUser

▸ **setUser**(`accountProvider`, `accountIdOrEmail`, `privateKey?`, `completionKey?`): `Promise<{accountId, accountProvider}>`

Set account and privateKey as current user. SDK will use that credentials in case of empty `accountId`, `accountPrivateKey` in some methods. 

#### Parameters

| Name               | Type              | Description                                                                                                              |
|--------------------|-------------------|--------------------------------------------------------------------------------------------------------------------------|
| `accountProvider`  | `AccountProvider` | Enum of values [`Magic`](https://magic.link), `Hedera`...                                                                |
| `accountIdOrEmail` | `string`          | Hedera account id (0.0.xxxxx) or email (user@domain) in case of Magic `accountProvider` == [`Magic`](https://magic.link) |
| `privateKey?`      | `string`          | optional field in case of using Magic provider                                                                           |
| `completionKey?`   | `string`          | optional field bridge between mobile webViews and native apps                                                            |

#### Returns

`Promise<{accountId, accountProvider}>`

***

### resetUser

▸ **resetUser**(`completionKey?`): `Promise<success>`

Clears current user credentials.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<success>`

***

### getBalance

▸ **getBalance**(`accountId`, `completionKey?`): `Promise<BalanceData>`

Get hbar and token balances for specific account.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `accountId`      | `string` | Hedera account id (0.0.xxxxx)                                 |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<BalanceData>`

***

### getCoinList

▸ **getCoinList**(`completionKey?`): `Promise<CoinListData>`

Get list of all available coins on CoinGecko.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CoinListData>` coin list, with id, name, symbol, platforms.


***

### getCoinPrice

▸ **getCoinPrice**(`search`, `completionKey?`): `Promise<CoinInfoData>`

Get coin price and coin info from CoinGecko. Search can be coin id or address in one of the coin platforms.

#### Parameters

| Name             | Type     | Description                                                                                                 |
|------------------| -------- |-------------------------------------------------------------------------------------------------------------|
| `search`         | `string` | CoinGecko coinId, or address in one of the coin platforms or `hbar` (default, alias for `hedera-hashgraph`) |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps                                               |

#### Returns

`Promise<CoinInfoData>` coin price in USD and all coin info from CoinGecko.

***

### createAccount

▸ **createAccount**(`completionKey?`): `Promise<CreateAccountData>`

Create Hedera account (ECDSA). Only for configured dApps. Depending on dApp config Blade create account, associate tokens, etc. In case of not using pre-created accounts pool and network high load, this method can return transactionId and no accountId. In that case account creation added to queue, and you should wait some time and call `getPendingAccount()` method.

#### Parameters

| Name             | Type     | Description                                                   |
|------------------| -------- |---------------------------------------------------------------|
| `deviceId?`      | `string` | optional header for backend check                             |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateAccountData>`

***

### getPendingAccount

▸ **getPendingAccount**(`transactionId`, `mnemonic`, `completionKey?`): `Promise<CreateAccountData>`

Get account from queue (read more at `createAccount()`). If account already created, return account data. If account not created yet, response will be same as in `createAccount()` method if account in queue.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `transactionId`  | `string` | returned from `createAccount()` method                        |
| `mnemonic`       | `string` | returned from `createAccount()` method                        |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateAccountData>`

***

### getAccountInfo

▸ **getAccountInfo**(`accountId`, `completionKey?`): `Promise<AccountInfoData>`

Get account info. EvmAddress is address of Hedera account if exists. Else accountId will be converted to solidity address. CalculatedEvmAddress is calculated from account public key. May be different from evmAddress.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `accountId`      | `string` | Hedera account id (0.0.xxxxx)                                 |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<AccountInfoData>`

***

### getNodeList

▸ **getNodeList**(`completionKey?`): `Promise<{nodes: NodeList[]}>`

Get Node list

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<{nodes: NodeList[]}>`

***

### stakeToNode

▸ **stakeToNode**(`accountId`, `accountPrivateKey`, `nodeId`, `completionKey?`): `Promise<TransactionReceiptData>`

Stake/unstake account

#### Parameters

| Name                | Type     | Description                                                        |
|---------------------| -------- |--------------------------------------------------------------------|
| `accountId`         | `string` | Hedera account id (0.0.xxxxx)                                      |
| `accountPrivateKey` | `string` | account private key (DER encoded hex string)                       |
| `nodeId`            | `string` | node id to stake to. If negative or null, account will be unstaked |
| `completionKey?`    | `string` | optional field bridge between mobile webViews and native apps      |

#### Returns

`Promise<TransactionReceiptData>`

***

### getKeysFromMnemonic

▸ **getKeysFromMnemonic**(`mnemonicRaw`, `lookupNames`, `completionKey?`): `Promise<PrivateKeyData>`

Get ECDSA private key from mnemonic. Also try to find accountIds based on public key if lookupNames is true. Returned keys with DER header. EvmAddress computed from Public key.

#### Parameters

| Name             | Type      | Description                                                   |
| ---------------- | --------- | ------------------------------------------------------------- |
| `mnemonicRaw`    | `string`  | BIP39 mnemonic                                                |
| `lookupNames`    | `boolean` | if true, get accountIds from mirror node by public key        |
| `completionKey?` | `string`  | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<PrivateKeyData>`

***

### transferHbars

▸ **transferHbars**(`accountId`, `accountPrivateKey`, `receiverID`, `amount`, `completionKey?`): `Promise<TransactionResponse>`

Send hbars to specific account.

#### Parameters

| Name                | Type     | Description                                                                                              |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `accountId`         | `string` | sender account id (0.0.xxxxx)                                                                            |
| `accountPrivateKey` | `string` | sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519 |
| `receiverID`        | `string` | receiver account id (0.0.xxxxx)                                                                          |
| `amount`            | `string` | of hbars to send (decimal number)                                                                        |
| `completionKey?`    | `string` | optional field bridge between mobile webViews and native apps                                            |

#### Returns

`Promise<TransactionResponse>`

***

### transferTokens

▸ **transferTokens**(`tokenId`, `accountId`, `accountPrivateKey`, `receiverID`, `amountOrSerial`, `freeTransfer?`, `completionKey?`): `Promise<TransactionResponse>`

Send token to specific account.

#### Parameters

| Name                | Type      | Default value | Description                                                                                                   |
| ------------------- | --------- | ------------- |---------------------------------------------------------------------------------------------------------------|
| `tokenId`           | `string`  | `undefined`   | token id to send (0.0.xxxxx)                                                                                  |
| `accountId`         | `string`  | `undefined`   | sender account id (0.0.xxxxx)                                                                                 |
| `accountPrivateKey` | `string`  | `undefined`   | sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519      |
| `receiverID`        | `string`  | `undefined`   | receiver account id (0.0.xxxxx)                                                                               |
| `amountOrSerial`    | `string`  | `undefined`   | mount of fungible tokens to send (with token-decimals correction) on NFT serial number                        |
| `freeTransfer`      | `boolean` | `false`       | if true, Blade will pay fee transaction. Only for single dApp configured token. In that case tokenId not used |
| `completionKey?`    | `string`  | `undefined`   | optional field bridge between mobile webViews and native apps                                                 |

#### Returns

`Promise<TransactionResponse>`

***

### getTransactions

▸ **getTransactions**(`accountId`, `transactionType?`, `nextPage`, `transactionsLimit?`, `completionKey?`): `Promise<TransactionsHistoryData>`

Get transactions history for account. Can be filtered by transaction type. Transaction requested from mirror node. Every transaction requested for child transactions. Result are flattened. If transaction type is not provided, all transactions will be returned. If transaction type is CRYPTOTRANSFERTOKEN records will additionally contain plainData field with decoded data.

#### Parameters

| Name                | Type     | Default value | Description                                                                                         |
| ------------------- | -------- | ------------- | --------------------------------------------------------------------------------------------------- |
| `accountId`         | `string` | `undefined`   | account id to get transactions for (0.0.xxxxx)                                                      |
| `transactionType`   | `string` | `""`          | one of enum MirrorNodeTransactionType or "CRYPTOTRANSFERTOKEN"                                      |
| `nextPage`          | `string` | `undefined`   | link to next page of transactions from previous request                                             |
| `transactionsLimit` | `string` | `"10"`        | number of transactions to return. Speed of request depends on this value if transactionType is set. |
| `completionKey?`    | `string` | `undefined`   | optional field bridge between mobile webViews and native apps                                       |

#### Returns

`Promise<TransactionsHistoryData>`

***

### deleteAccount

▸ **deleteAccount**(`deleteAccountId`, `deletePrivateKey`, `transferAccountId`, `operatorAccountId`, `operatorPrivateKey`, `completionKey?`): `Promise<TransactionReceiptData>`

Delete Hedera account

#### Parameters

| Name                 | Type     | Description                                                                        |
| -------------------- | -------- | ---------------------------------------------------------------------------------- |
| `deleteAccountId`    | `string` | account id of account to delete (0.0.xxxxx)                                        |
| `deletePrivateKey`   | `string` | account private key (DER encoded hex string)                                       |
| `transferAccountId`  | `string` | if any funds left on account, they will be transferred to this account (0.0.xxxxx) |
| `operatorAccountId`  | `string` | operator account id (0.0.xxxxx). Used for fee                                      |
| `operatorPrivateKey` | `string` | operator's account private key (DER encoded hex string)                            |
| `completionKey?`     | `string` | optional field bridge between mobile webViews and native apps                      |

#### Returns

`Promise<TransactionReceiptData>`

***

### createToken

▸ **createToken**(`treasuryAccountId`, `supplyPrivateKey`, `tokenName`, `tokenSymbol`, `isNft`, `keys`, `decimals`, `initialSupply`, `maxSupply`, `completionKey?`): `Promise<{tokenId: string}>`

Create token (NFT or Fungible Token)

#### Parameters

| Name                | Type          | Description                                                   |
|---------------------|---------------|---------------------------------------------------------------|
| `treasuryAccountId` | `string`      | treasury account id                                           |
| `supplyPrivateKey`  | `string`      | supply account private key                                    |
| `tokenName`         | `string`      | token name (string up to 100 bytes)                           |
| `tokenSymbol`       | `string`      | token symbol (string up to 100 bytes)                         |
| `isNft`             | `boolean`     | set token type NFT                                            |
| `keys`              | `KeyRecord[]` | token keys                                                    |
| `decimals`          | `number`      | token decimals (0 for nft)                                    |
| `initialSupply`     | `number`      | token initial supply (0 for nft)                              |
| `maxSupply`         | `number`      | token max supply                                              |
| `completionKey`     | `string`      | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<{tokenId: string}>`

***

### associateToken

▸ **associateToken**(`tokenId`, `accountId`, `accountPrivateKey`, `completionKey?`): `Promise<TransactionReceiptData>`

Associate token to account

#### Parameters

| Name                | Type      | Description                                                   |
|---------------------|-----------|---------------------------------------------------------------|
| `tokenId`           | `string`  | token id                                                      |
| `accountId`         | `string`  | account id to associate token                                 |
| `accountPrivateKey` | `string`  | account private key                                           |
| `completionKey`     | `string`  | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

***

### nftMint

▸ **nftMint**(`tokenId`, `accountId`, `accountPrivateKey`, `file`: , `metadata`, `storageConfig`, `completionKey`): `Promise<TransactionReceiptData>`

Mint one NFT

#### Parameters

| Name                | Type               | Description                                                                                                               |
|---------------------|--------------------|---------------------------------------------------------------------------------------------------------------------------|
| `tokenId`           | `string`           | token id to mint NFT                                                                                                      |
| `accountId`         | `string`           | token supply account id                                                                                                   |
| `accountPrivateKey` | `string`           | token supply private key                                                                                                  |
| `file`              | `string`           | image to mint (File or bas64 DataUrl image, eg.: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAA...) |
| `metadata`          | `string`, `any{}`  | NFT metadata (JSON object)                                                                                                |
| `storageConfig`     | `NFTStorageConfig` | {NFTStorageConfig} IPFS provider config                                                                                   |
| `completionKey`     | `string`           | optional field bridge between mobile webViews and native apps                                                             |

#### Returns

`Promise<TransactionReceiptData>`

***

### contractCallFunction

▸ **contractCallFunction**(`contractId`, `functionName`, `paramsEncoded`, `accountId`, `accountPrivateKey`, `gas?`, `bladePayFee?`, `completionKey?`): `Promise<TransactionReceiptData>`

Call contract function. Directly or via Blade Payer account (fee will be paid by Blade), depending on your dApp configuration.

#### Parameters

| Name                | Type                                                       | Default value                                  | Description                                                                                           |
| ------------------- | ---------------------------------------------------------- |------------------------------------------------| ----------------------------------------------------------------------------------------------------- |
| `contractId`        | `string`                                                   | `undefined`                                    | contract id (0.0.xxxxx)                                                                               |
| `functionName`      | `string`                                                   | `undefined`                                    | name of the contract function to call                                                                 |
| `paramsEncoded`     | `string` \| [`ParametersBuilder`](parametersbuilder.md)    | `undefined`   | function argument. Can be generated with ParametersBuilder object                                     |
| `accountId`         | `string`                                                   | `undefined`                                    | operator account id (0.0.xxxxx)                                                                       |
| `accountPrivateKey` | `string`                                                   | `undefined`                                    | operator's hex-encoded private key with DER-header, ECDSA or Ed25519                                  |
| `gas`               | `number`                                                   | `100000`                                       | gas limit for the transaction                                                                         |
| `bladePayFee`       | `boolean`                                                  | `false`                                        | if true, fee will be paid by Blade (note: msg.sender inside the contract will be Blade Payer account) |
| `completionKey?`    | `string`                                                   | `undefined`                                    | optional field bridge between mobile webViews and native apps                                         |

#### Returns

`Promise<TransactionReceiptData>`

***

### contractCallQueryFunction

▸ **contractCallQueryFunction**(`contractId`, `functionName`, `paramsEncoded`, `accountId`, `accountPrivateKey`, `gas?`, `bladePayFee?`, `resultTypes`, `completionKey?`): `Promise<ContractCallQueryRecord[]>`

Call query on contract function. Similar to contractCallFunction can be called directly or via Blade Payer account.

#### Parameters

| Name                | Type                                                       | Default value                                  | Description                                                                                           |
| ------------------- | ---------------------------------------------------------- |------------------------------------------------| ----------------------------------------------------------------------------------------------------- |
| `contractId`        | `string`                                                   | `undefined`                                    | contract id (0.0.xxxxx)                                                                               |
| `functionName`      | `string`                                                   | `undefined`                                    | name of the contract function to call                                                                 |
| `paramsEncoded`     | `string` \| [`ParametersBuilder`](parametersbuilder.md)    | `undefined`   | function argument. Can be generated with ParametersBuilder object                                     |
| `accountId`         | `string`                                                   | `undefined`                                    | operator account id (0.0.xxxxx)                                                                       |
| `accountPrivateKey` | `string`                                                   | `undefined`                                    | operator's hex-encoded private key with DER-header, ECDSA or Ed25519                                  |
| `gas`               | `number`                                                   | `100000`                                       | gas limit for the transaction                                                                         |
| `bladePayFee`       | `boolean`                                                  | `false`                                        | if true, fee will be paid by Blade (note: msg.sender inside the contract will be Blade Payer account) |
| `resultTypes`       | `string`\[]                                                | `undefined`                                    | array of result types. Currently supported only plain data types                                      |
| `completionKey?`    | `string`                                                   | `undefined`                                    | optional field bridge between mobile webViews and native apps                                         |

#### Returns

`Promise<ContractCallQueryRecord[]>`

***

### getParamsSignature

▸ **getParamsSignature**(`paramsEncoded`, `privateKey`, `completionKey?`): `Promise<SplitSignatureData>`

Get v-r-s signature of contract function params

#### Parameters

| Name             | Type                                                       | Description                                             |
| ---------------- | ---------------------------------------------------------- |---------------------------------------------------------|
| `paramsEncoded`  | `string` \| [`ParametersBuilder`](parametersbuilder.md)    | data to sign. Can be string or ParametersBuilder              |
| `privateKey`     | `string`                                                   | signer private key (hex-encoded with DER header)        |
| `completionKey?` | `string`                                                   | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SplitSignatureData>`

***

### sign

▸ **sign**(`messageString`, `privateKey`, `completionKey?`): `Promise<SignMessageData>`

Sign base64-encoded message with private key. Returns hex-encoded signature.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `messageString`  | `string` | base64-encoded message to sign                                |
| `privateKey`     | `string` | hex-encoded private key with DER header                       |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignMessageData>`

***

### signVerify

▸ **signVerify**(`messageString`, `signature`, `publicKey`, `completionKey?`): `Promise<SignVerifyMessageData>`

Verify message signature by public key

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `messageString`  | `string` | base64-encoded message (same as provided to `sign()` method)  |
| `signature`      | `string` | hex-encoded signature (result from `sign()` method)           |
| `publicKey`      | `string` | hex-encoded public key with DER header                        |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignVerifyMessageData>`

***

### hethersSign

▸ **hethersSign**(`messageString`, `privateKey`, `completionKey?`): `Promise<SignMessageData>`

Sign base64-encoded message with private key using hethers lib. Returns hex-encoded signature.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `messageString`  | `string` | base64-encoded message to sign                                |
| `privateKey`     | `string` | hex-encoded private key with DER header                       |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignMessageData>`

***

### splitSignature

▸ **splitSignature**(`signature`, `completionKey?`): `Promise<SplitSignatureData>`

Split signature to v-r-s format.

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `signature`      | `string` | hex-encoded signature                                         |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SplitSignatureData>`

***

### getC14url

▸ **getC14url**(`asset`, `account`, `amount`, `completionKey?`): `Promise<IntegrationUrlData>`

Get configured url for C14 integration (iframe or popup)

#### Parameters

| Name             | Type     | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `asset`          | `string` | name (USDC or HBAR)                                           |
| `account`        | `string` | receiver account id (0.0.xxxxx)                               |
| `amount`         | `string` | preset amount. May be overwritten if out of range (min/max)   |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<IntegrationUrlData>`

### exchangeGetQuotes

▸ **exchangeGetQuotes**(`sourceCode`, `sourceAmount`, `targetCode`, `strategy`, `completionKey?`): `Promise<SwapQuotesData>`

Get swap quotes from different services

#### Parameters

| Name             | Type     | Description                                                        |
| ---------------- | -------- |--------------------------------------------------------------------|
| `sourceCode`     | `string` | name (HBAR, KARATE, other token code)                              |
| `sourceAmount`   | `string` | source amount swap, buy or sell                                    |
| `targetCode`     | `string` | target asset code (HBAR, KARATE, USDC, other token code)           |
| `strategy`       | `string` | strategy one of enum `CryptoFlowServiceStrategy` (Buy, Sell, Swap) |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps      |

#### Returns

`Promise<SwapQuotesData>`

***

### swapTokens

▸ **swapTokens**(`accountId`, `accountPrivateKey`, `sourceCode`, `sourceAmount`, `targetCode`, `slippage`, `serviceId`, `completionKey?`): `Promise<{success: boolean}>`

Swap tokens

#### Parameters

| Name                | Type     | Description                                                                                                         |
|---------------------| -------- |---------------------------------------------------------------------------------------------------------------------|
| `accountId`         | `string` | account id (0.0.xxxxx)                                                                                              |
| `accountPrivateKey` | `string` | hex-encoded private key with DER header                                                                             |
| `sourceCode`        | `string` | source asset code (HBAR, KARATE, other token code)                                                                  |
| `sourceAmount`      | `string` | source amount to swap                                                                                               |
| `targetCode`        | `string` | target asset code (HBAR, KARATE, USDC, other token code)                                                            |
| `slippage`          | `string` | slippage in percents (0.5). Transaction will revert if the price changes unfavorably by more than this percentage.  |
| `serviceId`         | `string` | service id to use for swap (saucerswap, etc)                                                                                             |
| `completionKey?`    | `string` | optional field bridge between mobile webViews and native apps                                                       |

#### Returns

`Promise<{success: boolean}>`

***

### getTradeUrl

▸ **getTradeUrl**(`strategy`, `accountId`, `sourceCode`, `sourceAmount`, `targetCode`, `slippage`, `serviceId`, `completionKey?`): `Promise<IntegrationUrlData>`

Get configured url to buy or sell tokens or fiat

#### Parameters

| Name                | Type     | Description                                                                                                        |
|---------------------| -------- |--------------------------------------------------------------------------------------------------------------------|
| `strategy`          | `string` | strategy (`buy` or `sell`)                                                                                         |
| `accountId`         | `string` | account id (0.0.xxxxx)                                                                                             |
| `sourceCode`        | `string` | source asset code (HBAR, KARATE, USDC, EUR, other token or fiat code)                                              |
| `sourceAmount`      | `string` | source amount to buy/sell                                                                                          |
| `targetCode`        | `string` | source asset code (HBAR, KARATE, USDC, EUR, other token or fiat code)                                              |
| `slippage`          | `string` | slippage in percents (0.5). Transaction will revert if the price changes unfavorably by more than this percentage. |
| `serviceId`         | `string` | service id to use for buy/sell (c14, etc)                                                                          |
| `completionKey?`    | `string` | optional field bridge between mobile webViews and native apps                                                      |

#### Returns
    
`Promise<IntegrationUrlData>`

***

### sendMessageToNative

▸ `Private` **sendMessageToNative**(`completionKey`, `data`, `error?`): `any`

Message that sends response back to native handler

#### Parameters

| Name            | Type     | Default value |
| --------------- | -------- | ------------- |
| `completionKey` | `string` | `undefined`   |
| `data`          | `any`    | `undefined`   |
| `error`         | `any`    | `null`        |

#### Returns

`any`
