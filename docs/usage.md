# Contents

* [init](usage.md#init)
* [getInfo](usage.md#getinfo)
* [setUser](usage.md#setuser)
* [resetUser](usage.md#resetuser)
* [getBalance](usage.md#getbalance)
* [transferBalance](usage.md#transferbalance)
* [transferTokens](usage.md#transfertokens)
* [getCoinList](usage.md#getcoinlist)
* [getCoinPrice](usage.md#getcoinprice)
* [contractCallFunction](usage.md#contractcallfunction)
* [contractCallQueryFunction](usage.md#contractcallqueryfunction)
* [createScheduleTransaction](usage.md#createscheduletransaction)
* [signScheduleId](usage.md#signscheduleid)
* [createAccount](usage.md#createaccount)
* [deleteAccount](usage.md#deleteaccount)
* [getAccountInfo](usage.md#getaccountinfo)
* [getNodeList](usage.md#getnodelist)
* [stakeToNode](usage.md#staketonode)
* [searchAccounts](usage.md#searchaccounts)
* [dropTokens](usage.md#droptokens)
* [sign](usage.md#sign)
* [verify](usage.md#verify)
* [splitSignature](usage.md#splitsignature)
* [getParamsSignature](usage.md#getparamssignature)
* [getTransactions](usage.md#gettransactions)
* [exchangeGetQuotes](usage.md#exchangegetquotes)
* [getTradeUrl](usage.md#gettradeurl)
* [swapTokens](usage.md#swaptokens)
* [createToken](usage.md#createtoken)
* [associateToken](usage.md#associatetoken)
* [nftMint](usage.md#nftmint)
* [getTokenInfo](usage.md#gettokeninfo)

# Methods

## init

Init instance of BladeSDK for correct work with Blade API and other endpoints.

`init(
        apiKey: string, 
        chainId: string | KnownChainIds, 
        dAppCode: string, 
        visitorId: string, 
        sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod, 
        sdkVersion: string = config.sdkVersion, 
        completionKey?: string): Promise<InfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `apiKey` | `string` | Unique key for API provided by Blade team. |
| `chainId` | `string \| KnownChainIds` | one of supported chains from KnownChainIds |
| `dAppCode` | `string` | your dAppCode - request specific one by contacting BladeLabs team |
| `visitorId` | `string` | client unique id. If not provided, SDK will try to get it using fingerprintjs-pro library |
| `sdkEnvironment` | `SdkEnvironment` | environment to choose BladeAPI server (Prod, CI). Prod used by default. |
| `sdkVersion` | `string` | used for header X-SDK-VERSION |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<InfoData>` - status: "success" or "error"

#### Example

```javascript
const info = await bladeSdk.init("apiKey", KnownChainIds.HEDERA_MAINNET, "dAppCode");
```

## getInfo

Returns information about initialized instance of BladeSDK.

`getInfo(completionKey?: string): InfoData`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`InfoData`

#### Example

```javascript
const info = bladeSdk.getInfo();
```

## setUser

Set active user for further operations.

`setUser(
        accountProvider: AccountProvider, 
        accountIdOrEmail: string, 
        privateKey?: string, 
        completionKey?: string): Promise<UserInfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountProvider` | `AccountProvider` | one of supported providers: PrivateKey or Magic |
| `accountIdOrEmail` | `string` | account id (0.0.xxxxx, 0xABCDEF..., EMAIL) or empty string for some ChainId |
| `privateKey` | `string` | private key for account (hex encoded privateKey with DER-prefix or 0xABCDEF...) In case of Magic provider - empty string |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<UserInfoData>`

#### Example

```javascript
// Set account for PrivateKey provider
const userInfo = await bladeSdk.setUser(AccountProvider.PrivateKey, "0.0.45467464", "302e020100300506032b6570042204204323472EA5374E80B07346243234DEADBEEF25235235...");
// Set account for Magic provider
const userInfo = await bladeSdk.setUser(AccountProvider.Magic, "your_email@domain.com", "");
```

## resetUser

Clear active user from SDK instance.

`resetUser(completionKey?: string): Promise<UserInfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<UserInfoData>`

#### Example

```javascript
const result = await bladeSdk.resetUser();
```

## getBalance

Get balance and token balances for specific account.

`getBalance(accountAddress: string,  completionKey?: string): Promise<BalanceData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountAddress` | `string` | Hedera account id (0.0.xxxxx) or Ethereum address (0x00ABCD00...) or empty string to use current user account |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<BalanceData>` - balance and tokens

#### Example

```javascript
const balance = await bladeSdk.getBalance("0.0.45467464");
```

## transferBalance

Send account balance (HBAR/ETH) to specific account.

`transferBalance(
        receiverAddress: string, 
        amount: string, 
        memo: string, 
        completionKey?: string): Promise<TransactionResponseData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `receiverAddress` | `string` | receiver address (0.0.xxxxx, 0x123456789abcdef...) |
| `amount` | `string` | amount of currency to send, as a string representing a decimal number (e.g., "211.3424324") |
| `memo` | `string` | transaction memo (limited to 100 characters) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionResponseData>`

#### Example

```javascript
const transactionResponse = await bladeSdk.transferBalance("0.0.10002", "1.0", "test memo");
```

## transferTokens

Send token to specific address.

`transferTokens(
        tokenAddress: string, 
        receiverAddress: string, 
        amountOrSerial: string, 
        memo: string, 
        usePaymaster: boolean = false, 
        completionKey?: string): Promise<TransactionResponseData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenAddress` | `string` | token address to send (0.0.xxxxx or 0x123456789abcdef...) |
| `receiverAddress` | `string` | receiver account address (0.0.xxxxx or 0x123456789abcdef...) |
| `amountOrSerial` | `string` | amount of fungible tokens to send (with token-decimals correction) or NFT serial number. (e.g. amount "0.01337" when token decimals 8 will send 1337000 units of token) |
| `memo` | `string` | transaction memo (limited to 100 characters) |
| `usePaymaster` | `boolean` | if true, Paymaster account will pay fee transaction. Only for single dApp configured fungible-token. In that case tokenId not used |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionResponseData>`

#### Example

```javascript
const transactionResponse = await bladeSdk.transferTokens("0.0.1337", "0.0.10002", "1", "test memo");
```

## getCoinList

Get list of all available coins on CoinGecko.

`getCoinList(completionKey?: string): Promise<CoinListData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CoinListData>`

#### Example

```javascript
const coinList = await bladeSdk.getCoinList();
```

## getCoinPrice

Get coin price and coin info from CoinGecko. Search can be coin id or address in one of the coin platforms.

In addition to the price in USD, the price in the currency you specified is returned

`getCoinPrice(
        search: string = "hbar", 
        currency: string = "usd", 
        completionKey?: string): Promise<CoinInfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `search` | `string` | coinId (e.g. "hbar", "hedera-hashgraph"). You can get valid one using .getCoinList() method |
| `currency` | `string` | currency to get price in (e.g. "uah", "pln", "usd") |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CoinInfoData>`

#### Example

```javascript
const coinInfo = await bladeSdk.getCoinPrice("hedera-hashgraph", "uah");
```

## contractCallFunction

Call contract function. Directly or via BladeAPI using paymaster account (fee will be paid by Paymaster account), depending on your dApp configuration.

`contractCallFunction(
        contractAddress: string, 
        functionName: string, 
        paramsEncoded: string | ParametersBuilder, 
        gas: number = 100000, 
        usePaymaster: boolean = false, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `contractAddress` | `string` | - contract address (0.0.xxxxx or 0x123456789abcdef...) |
| `functionName` | `string` | - name of the contract function to call |
| `paramsEncoded` | `string \| ParametersBuilder` | - function argument. Can be generated with ParametersBuilder  object |
| `gas` | `number` | - gas limit for the transaction |
| `usePaymaster` | `boolean` | - if true, fee will be paid by Paymaster account (note: msg.sender inside the contract will be Paymaster account) |
| `completionKey` | `string` | - optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const params = new ParametersBuilder().addString("Hello");
const contractId = "0.0.123456";
const gas = 100000;
const receipt = await bladeSdk.contractCallFunction(contractId, "set_message", params, gas);
```

## contractCallQueryFunction

Call query on contract function. Similar to {@link contractCallFunction} can be called directly or via BladeAPI using Paymaster account.

`contractCallQueryFunction(
        contractAddress: string, 
        functionName: string, 
        paramsEncoded: string | ParametersBuilder, 
        gas: number = 100000, 
        usePaymaster: boolean = false, 
        resultTypes: string[], 
        completionKey?: string): Promise<ContractCallQueryRecordsData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `contractAddress` | `string` | contract address (0.0.xxxxx or 0x123456789abcdef...) |
| `functionName` | `string` | name of the contract function to call |
| `paramsEncoded` | `string \| ParametersBuilder` | function argument. Can be generated with ParametersBuilder  object |
| `gas` | `number` | gas limit for the transaction |
| `usePaymaster` | `boolean` | if true, the fee will be paid by paymaster account (note: msg.sender inside the contract will be Paymaster account) |
| `resultTypes` | `string[]` | array of result types. Currently supported only plain data types |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<ContractCallQueryRecordsData>`

#### Example

```javascript
const params = new ParametersBuilder();
const contractId = "0.0.123456";
const gas = 100000;
const result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, gas, false, ["string"]);
```

## createScheduleTransaction

Create scheduled transaction

`createScheduleTransaction(
        type: ScheduleTransactionType, 
        transfers: ScheduleTransactionTransfer[], 
        usePaymaster: boolean = false, 
        completionKey?: string): Promise<CreateScheduleData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `type` | `ScheduleTransactionType` | schedule transaction type (currently only TRANSFER supported) |
| `transfers` | `ScheduleTransactionTransfer[]` | array of transfers to schedule (HBAR, FT, NFT) |
| `usePaymaster` | `boolean` | if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateScheduleData>`

#### Example

```javascript
const receiverAccountAddress = "0.0.10001";
const senderAccountAddress = "0.0.10002";
const tokenAddress = "0.0.1337";
const nftAddress = "0.0.1234";
const {scheduleId} = await bladeSdk.createScheduleTransaction(
    "TRANSFER",
    [
        {
            type: "HBAR",
            sender: senderAccountAddress,
            receiver: receiverAccountAddress,
            value: 1 * 10**8,
        },
        {
            type: "FT",
            sender: senderAccountAddress,
            receiver: receiverAccountAddress,
            tokenId: tokenAddress,
            value: 1
        },
        {
            type: "NFT",
            sender: senderAccountAddress,
            receiver: receiverAccountAddress,
            tokenId: nftAddress,
            serial: 4
        },
    ],
    false
);
```

## signScheduleId

Sign scheduled transaction

`signScheduleId(
        scheduleId: string, 
        receiverAccountAddress?: string, 
        usePaymaster?: boolean, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `scheduleId` | `string` | scheduled transaction id (0.0.xxxxx) |
| `receiverAccountAddress` | `string` | account id of receiver for additional validation in case of dApp freeSchedule transactions configured |
| `usePaymaster` | `boolean` | if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const scheduleId = "0.0.754583634";
const receiverAccountAddress = "0.0.10001";
const receipt = await bladeSdk.signScheduleId(scheduleId, receiverAccountId, false);
```

## createAccount

Create new account (ECDSA by default). Depending on dApp config Blade will create an account, associate tokens, etc.

`createAccount(privateKey?: string,  deviceId?: string,  completionKey?: string): Promise<CreateAccountData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `privateKey` | `string` | optional field if you need specify account key (hex encoded privateKey with DER-prefix) |
| `deviceId` | `string` | optional field for headers for backend check |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateAccountData>`

#### Example

```javascript
const account = await bladeSdk.createAccount();
```

## deleteAccount

Delete Hedera account

`deleteAccount(
        deleteAccountAddress: string, 
        deletePrivateKey: string, 
        transferAccountAddress: string, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `deleteAccountAddress` | `string` | account address to delete (0.0.xxxxx) |
| `deletePrivateKey` | `string` | account private key (DER encoded hex string) |
| `transferAccountAddress` | `string` | if any funds left on account, they will be transferred to this account address (0.0.xxxxx) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const receipt = await bladeSdk.deleteAccount(accountToDelete.accountAddress, accountToDelete.privateKey, "0.0.10001");
```

## getAccountInfo

Get account info.

EvmAddress is address of Hedera account if exists. Else accountId will be converted to solidity address.

CalculatedEvmAddress is calculated from account public key. May be different from evmAddress.

`getAccountInfo(accountAddress: string,  completionKey?: string): Promise<AccountInfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountAddress` | `string` | account address (0.0.xxxxx) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<AccountInfoData>`

#### Example

```javascript
const accountInfo = await bladeSdk.getAccountInfo("0.0.10001");
```

## getNodeList

Get Hedera node list available for stake

`getNodeList(completionKey?: string): Promise<NodeListData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<NodeListData>`

#### Example

```javascript
const nodeList = await bladeSdk.getNodeList();
```

## stakeToNode

Stake/unstake hedera account

`stakeToNode(nodeId: number,  completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `nodeId` | `number` | node id to stake to. If negative or null, account will be unstaked |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const receipt = await bladeSdk.stakeToNode(3);
```

## searchAccounts

Get accounts list and keys from private key or mnemonic

Supporting standard and legacy key derivation.

Returned keys with DER header.

EvmAddress computed from ECDSA Public key.

`searchAccounts(keyOrMnemonic: string,  completionKey?: string): Promise<AccountPrivateData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `keyOrMnemonic` | `string` | BIP39 mnemonic, private key with DER header |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<AccountPrivateData>`

#### Example

```javascript
const resultKey = await bladeSdk.searchAccounts("302e020100300506032b65700422042043234DEADBEEF255...");
const resultSeed = await bladeSdk.searchAccounts("purity slab doctor swamp tackle rebuild summer bean craft toddler blouse switch");
```

## dropTokens

Bladelink drop to account

`dropTokens(secretNonce: string,  completionKey?: string): Promise<TokenDropData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `secretNonce` | `string` | configured for dApp. Should be kept in secret |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TokenDropData>`

#### Example

```javascript
const drop = await bladeSdk.dropTokens("secret-nonce");
```

## sign

Sign encoded message with private key. Returns hex-encoded signature.

`sign(
        encodedMessage: string, 
        encoding: SupportedEncoding, 
        likeEthers: boolean, 
        completionKey?: string): Promise<SignMessageData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `encodedMessage` | `string` | encoded message to sign |
| `encoding` | `SupportedEncoding` | one of the supported encodings (hex/base64/utf8) |
| `likeEthers` | `boolean` | to get signature in ethers format. Works only for ECDSA keys. Ignored on chains other than Hedera |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignMessageData>`

#### Example

```javascript
const signResult = await bladeSdk.sign("Hello", SupportedEncoding.utf8, false);
```

## verify

Verify message signature by public key

`verify(
        encodedMessage: string, 
        encoding: SupportedEncoding, 
        signature: string, 
        addressOrPublicKey: string, 
        completionKey?: string): Promise<SignVerifyMessageData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `encodedMessage` | `string` | encoded message (same as provided to `sign()` method) |
| `encoding` | `SupportedEncoding` | one of the supported encodings (hex/base64/utf8) |
| `signature` | `string` | hex-encoded signature (result from `sign()` method) |
| `addressOrPublicKey` | `string` | EVM-address, publicKey, or Hedera address (0x11f8D856FF2aF6700CCda4999845B2ed4502d8fB, 0x0385a2fa81f8acbc47fcfbae4aeee6608c2d50ac2756ed88262d102f2a0a07f5b8, 0.0.1512, or empty for current account) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignVerifyMessageData>`

#### Example

```javascript
const signature = "27cb9d51434cf1e76d7ac515b19442c619f641e6fccddbf4a3756b14466becb6992dc1d2a82268018147141fc8d66ff9ade43b7f78c176d070a66372d655f942";
const publicKey = "302d300706052b8104000a032200029dc73991b0d9cdbb59b2cd0a97a0eaff6de...";
const valid = await bladeSdk.verify("Hello", SupportedEncoding.utf8, signature, publicKey);
```

## splitSignature

Split signature to v-r-s format.

`splitSignature(signature: string,  completionKey?: string): Promise<SplitSignatureData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `signature` | `string` | hex-encoded signature |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SplitSignatureData>`

#### Example

```javascript
const signature = "27cb9d51434cf1e76d7ac515b19442c619f641e6fccddbf4a3756b14466becb6992dc1d2a82268018147141fc8d66ff9ade43b7f78c176d070a66372d655f942";
const {v, r, s} = await bladeSdk.splitSignature(signature);
```

## getParamsSignature

Get v-r-s signature of contract function params

`getParamsSignature(
        paramsEncoded: string | ParametersBuilder, 
        completionKey?: string): Promise<SplitSignatureData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `paramsEncoded` | `string \| ParametersBuilder` | - data to sign. Can be string or ParametersBuilder |
| `completionKey` | `string` | - optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SplitSignatureData>`

#### Example

```javascript
const params = new ParametersBuilder().addAddress(accountId).addString("Hello");
const result = await bladeSdk.getParamsSignature(params, "302e020100300506032b65700422042043234DEADBEEF255...");
```

## getTransactions

Get transactions history for account. Can be filtered by transaction type.

Transaction requested from mirror node. Every transaction requested for child transactions. Result are flattened.

If transaction type is not provided, all transactions will be returned.

If transaction type is CRYPTOTRANSFERTOKEN records will additionally contain plainData field with decoded data.

`getTransactions(
        accountAddress: string, 
        transactionType: string = "", 
        nextPage: string, 
        transactionsLimit: string = "10", 
        completionKey?: string): Promise<TransactionsHistoryData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountAddress` | `string` | account address (0.0.xxxxx or 0x123456789abcdef...) or empty string for current user |
| `transactionType` | `string` | one of enum MirrorNodeTransactionType or "CRYPTOTRANSFERTOKEN" |
| `nextPage` | `string` | link to next page of transactions from previous request |
| `transactionsLimit` | `string` | number of transactions to return. Speed of request depends on this value if transactionType is set. |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionsHistoryData>`

#### Example

```javascript
const transactions = await bladeSdk.getTransactions("0.0.10001");
```

## exchangeGetQuotes

Get quotes from different services for buy, sell or swap

`exchangeGetQuotes(
        sourceCode: string, 
        sourceAmount: number, 
        targetCode: string, 
        strategy: CryptoFlowServiceStrategy, 
        completionKey?: string): Promise<SwapQuotesData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `sourceCode` | `string` | name (HBAR, KARATE, other token code) |
| `sourceAmount` | `number` | amount to swap, buy or sell |
| `targetCode` | `string` | name (HBAR, KARATE, USDC, other token code) |
| `strategy` | `CryptoFlowServiceStrategy` | one of enum CryptoFlowServiceStrategy (Buy, Sell, Swap) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SwapQuotesData>`

#### Example

```javascript
const quotes = await bladeSdk.exchangeGetQuotes("EUR", 100, "HBAR", CryptoFlowServiceStrategy.BUY);
```

## getTradeUrl

Get configured url to buy or sell tokens or fiat

`getTradeUrl(
        strategy: CryptoFlowServiceStrategy, 
        accountAddress: string, 
        sourceCode: string, 
        sourceAmount: number, 
        targetCode: string, 
        slippage: string, 
        serviceId: string, 
        redirectUrl: string, 
        completionKey?: string): Promise<IntegrationUrlData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `strategy` | `CryptoFlowServiceStrategy` | Buy / Sell |
| `accountAddress` | `string` | account address (0.0.xxxxx or 0x123456789abcdef...) or empty string for current user |
| `sourceCode` | `string` | name (HBAR, KARATE, USDC, other token code) |
| `sourceAmount` | `number` | amount to buy/sell |
| `targetCode` | `string` | name (HBAR, KARATE, USDC, other token code) |
| `slippage` | `string` | slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage. |
| `serviceId` | `string` | service id to use for swap (saucerswap, onmeta, etc) |
| `redirectUrl` | `string` | url to redirect after final step |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<IntegrationUrlData>`

#### Example

```javascript
const {url} = await bladeSdk.getTradeUrl(CryptoFlowServiceStrategy.BUY, "0.0.10001", "EUR", 50, "HBAR", 0.5, "saucerswapV2", redirectUrl);
```

## swapTokens

Swap tokens

`swapTokens(
        sourceCode: string, 
        sourceAmount: number, 
        targetCode: string, 
        slippage: string, 
        serviceId: string, 
        completionKey?: string): Promise<ResultData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `sourceCode` | `string` | name (HBAR, KARATE, other token code) |
| `sourceAmount` | `number` | amount to swap |
| `targetCode` | `string` | name (HBAR, KARATE, other token code) |
| `slippage` | `string` | slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage. |
| `serviceId` | `string` | service id to use for swap (saucerswap, etc) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<ResultData>`

#### Example

```javascript
const result = await bladeSdk.swapTokens("HBAR", 1, "SAUCE", 0.5, "saucerswapV2");
```

## createToken

Create token (NFT or Fungible Token)

`createToken(
        tokenName: string, 
        tokenSymbol: string, 
        isNft: boolean, 
        keys: KeyRecord[] | string, 
        decimals: number, 
        initialSupply: number, 
        maxSupply: number = 250, 
        completionKey?: string): Promise<CreateTokenData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenName` | `string` | token name (string up to 100 bytes) |
| `tokenSymbol` | `string` | token symbol (string up to 100 bytes) |
| `isNft` | `boolean` | set token type NFT |
| `keys` | `KeyRecord[] \| string` | token keys |
| `decimals` | `number` | token decimals (0 for nft) |
| `initialSupply` | `number` | token initial supply (0 for nft) |
| `maxSupply` | `number` | token max supply |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateTokenData>`

#### Example

```javascript
const keys: KeyRecord[] = [
    {type: KeyType.admin, privateKey: adminKey},
    {type: KeyType.wipe, privateKey: wipeKey},
    {type: KeyType.pause, privateKey: pauseKey},
];
const result = await bladeSdk.createToken(
    tokenName,
    tokenSymbol,
    true, // isNft
    keys,
    0, // decimals
    0, // initialSupply
    250, // maxSupply
);
```

## associateToken

Associate token to hedera account. Association fee will be covered by PayMaster, if tokenId configured in dApp

`associateToken(tokenIdOrCampaign: string,  completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenIdOrCampaign` | `string` | token id to associate. Empty to associate all tokens configured in dApp. Campaign name to associate on demand |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const result = await bladeSdk.associateToken("0.0.1337");
const result = await bladeSdk.associateToken("CampaignName");
```

## nftMint

Mint one NFT

`nftMint(
        tokenAddress: string, 
        file: File | string, 
        metadata: object, 
        storageConfig: NFTStorageConfig, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenAddress` | `string` | token id to mint NFT |
| `file` | `File \| string` | image to mint (File or base64 DataUrl image, eg.: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAA...) |
| `metadata` | `object` | NFT metadata (JSON object) |
| `storageConfig` | `NFTStorageConfig` | IPFS provider config |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const receipt = await bladeSdk.nftMint(
    tokenId,
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAARUlEQVR42u3PMREAAAgEIO1fzU5vBlcPGtCVTD3QIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIXCyqyi6fIALs1AAAAAElFTkSuQmCC", // TODO upload file base64
    {
        author: "GaryDu",
        other: "metadata",
        some: "more properties"
    },
    {
        provider: NFTStorageProvider.nftStorage,
        apiKey: nftStorageApiKey,
    }
);
```

## getTokenInfo

Get FT or NFT token info

`getTokenInfo(
        tokenAddress: string, 
        serial: string = "", 
        completionKey?: string): Promise<TokenInfoData | null>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenAddress` | `string` | token address (0.0.xxxxx or 0x123456789abcdef...) |
| `serial` | `string` | serial number in case of NFT token |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TokenInfoData | null>`

#### Example

```javascript
const tokenInfo = await bladeSdk.getTokenInfo("0.0.1234", "3");
```

