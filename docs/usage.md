# Contents

* [init](usage.md#init)
* [getInfo](usage.md#getinfo)
* [setUser](usage.md#setuser)
* [resetUser](usage.md#resetuser)
* [getBalance](usage.md#getbalance)
* [getCoinList](usage.md#getcoinlist)
* [getCoinPrice](usage.md#getcoinprice)
* [transferHbars](usage.md#transferhbars)
* [contractCallFunction](usage.md#contractcallfunction)
* [contractCallQueryFunction](usage.md#contractcallqueryfunction)
* [transferTokens](usage.md#transfertokens)
* [createScheduleTransaction](usage.md#createscheduletransaction)
* [signScheduleId](usage.md#signscheduleid)
* [createAccount](usage.md#createaccount)
* [getPendingAccount](usage.md#getpendingaccount)
* [deleteAccount](usage.md#deleteaccount)
* [getAccountInfo](usage.md#getaccountinfo)
* [getNodeList](usage.md#getnodelist)
* [stakeToNode](usage.md#staketonode)
* [getKeysFromMnemonic](usage.md#getkeysfrommnemonic)
* [searchAccounts](usage.md#searchaccounts)
* [dropTokens](usage.md#droptokens)
* [sign](usage.md#sign)
* [signVerify](usage.md#signverify)
* [ethersSign](usage.md#etherssign)
* [splitSignature](usage.md#splitsignature)
* [getParamsSignature](usage.md#getparamssignature)
* [getTransactions](usage.md#gettransactions)
* [getC14url](usage.md#getc14url)
* [exchangeGetQuotes](usage.md#exchangegetquotes)
* [swapTokens](usage.md#swaptokens)
* [getTradeUrl](usage.md#gettradeurl)
* [createToken](usage.md#createtoken)
* [associateToken](usage.md#associatetoken)
* [nftMint](usage.md#nftmint)
* [getTokenInfo](usage.md#gettokeninfo)

# Methods

## init

Inits instance of BladeSDK for correct work with Blade API and Hedera network.

`init(
        apiKey: string, 
        network: string, 
        dAppCode: string, 
        visitorId: string = "", 
        sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod, 
        sdkVersion: string = config.sdkVersion, 
        completionKey?: string): Promise<InfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `apiKey` | `string` | Unique key for API provided by Blade team. |
| `network` | `string` | "Mainnet" or "Testnet" of Hedera network |
| `dAppCode` | `string` | your dAppCode - request specific one by contacting Bladelabs team |
| `visitorId` | `string` | optional field to set client unique id. SDK will try to get it using fingerprintjs-pro library by default. |
| `sdkEnvironment` | `SdkEnvironment` | optional field to set BladeAPI environment (Prod, CI). Prod used by default. |
| `sdkVersion` | `string` | optional field, used for header X-SDK-VERSION |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<InfoData>` - status: "success" or "error"

#### Example

```javascript
const info = await bladeSdk.init("apiKey", "Mainnet", "dAppCode");
```

## getInfo

This method returns basic params of initialized instance of BladeSDK. This params may useful for support.

Returned object likely will contain next fields: `apiKey`, `dAppCode`, `network`, `visitorId`, `sdkEnvironment`, `sdkVersion`, `nonce`

In case of support please not provide full apiKey, limit yourself to the part of the code that includes a few characters at the beginning and at the end (eg. `AdR3....BFgd`)

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

Set account for further operations.

Currently supported two account providers: Hedera and Magic.

Hedera: pass accountId and privateKey as hex-encoded strings with DER-prefix (302e020100300506032b657004220420...)

Magic: pass email to accountIdOrEmail and empty string as privateKey. SDK will handle Magic authentication, and finish after user click on confirmation link in email.

After successful authentication, SDK will store public and private keys in memory and use them for further operations.

After that in each method call provide empty strings to accountId and accountPrivateKey. Otherwise, SDK will override current user with provided credentials as Hedera provider.

In case of calling method with `accountId` and `accountPrivateKey` arguments, SDK will override current user with this credentials.

It's optional method, you can pass accountId and accountPrivateKey in each method call. In further releases this method will be mandatory.

`setUser(
        accountProvider: AccountProvider, 
        accountIdOrEmail: string, 
        privateKey?: string, 
        completionKey?: string): Promise<UserInfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountProvider` | `AccountProvider` | Account provider (Hedera or Magic) |
| `accountIdOrEmail` | `string` | Hedera account id (0.0.xxxxx) or Magic email |
| `privateKey` | `string` | private key with DER-prefix (302e020100300506032b657004220420...) or empty string for Magic provider |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<UserInfoData>`

#### Example

```javascript
// Set account for Hedera provider
const userInfo = await bladeSdk.setUser(AccountProvider.Hedera, "0.0.45467464", "302e020100300506032b6570042204204323472EA5374E80B07346243234DEADBEEF25235235...");
// Set account for Magic provider
const userInfo = await bladeSdk.setUser(AccountProvider.Magic, "your_email@domain.com", "");
```

## resetUser

Clears current user credentials.

`resetUser(completionKey?: string): Promise<StatusResult>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<StatusResult>`

#### Example

```javascript
const result = await bladeSdk.resetUser();
```

## getBalance

Get hbar and token balances for specific account.

`getBalance(accountId: string,  completionKey?: string): Promise<BalanceData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountId` | `string` | Hedera account id (0.0.xxxxx) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<BalanceData>` - hbars: number, tokens: [{tokenId: string, balance: number}]

#### Example

```javascript
const balance = await bladeSdk.getBalance("0.0.45467464");
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

`getCoinPrice(
        search: string = "hbar", 
        currency: string = "usd", 
        completionKey?: string): Promise<CoinInfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `search` | `string` | coin alias (get one using getCoinList method) |
| `currency` | `string` | currency to get price in (usd, eur, etc.) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CoinInfoData>`

#### Example

```javascript
const coinInfo = await bladeSdk.getCoinPrice("hedera-hashgraph", "usd");
```

## transferHbars

Send hbars to specific account.

`transferHbars(
        accountId: string, 
        accountPrivateKey: string, 
        receiverId: string, 
        amount: string, 
        memo: string, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountId` | `string` | sender account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519 |
| `receiverId` | `string` | receiver account id (0.0.xxxxx) |
| `amount` | `string` | amount of hbars to send (decimal number) |
| `memo` | `string` | transaction memo |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const receipt = await bladeSdk.transferHbars("0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", "0.0.10002", "1.0", "test memo");
```

## contractCallFunction

Call contract function. Directly or via BladeAPI using paymaster account (fee will be paid by Paymaster account), depending on your dApp configuration.

`contractCallFunction(
        contractId: string, 
        functionName: string, 
        paramsEncoded: string | ParametersBuilder, 
        accountId: string, 
        accountPrivateKey: string, 
        gas: number = 100000, 
        usePaymaster: boolean = false, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `contractId` | `string` | contract id (0.0.xxxxx) |
| `functionName` | `string` | name of the contract function to call |
| `paramsEncoded` | `string \| ParametersBuilder` | function argument. Can be generated with ParametersBuilder  object |
| `accountId` | `string` | operator account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | operator's hex-encoded private key with DER-header, ECDSA or Ed25519 |
| `gas` | `number` | gas limit for the transaction |
| `usePaymaster` | `boolean` | if true, fee will be paid by Paymaster account (note: msg.sender inside the contract will be Paymaster account) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const params = new ParametersBuilder().addString("Hello");
const contractId = "0.0.123456";
const gas = 100000;
const receipt = await bladeSdk.contractCallFunction(contractId, "set_message", params, "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", gas, false);
```

## contractCallQueryFunction

Call query on contract function. Similar to {@link contractCallFunction} can be called directly or via BladeAPI using Paymaster account.

`contractCallQueryFunction(
        contractId: string, 
        functionName: string, 
        paramsEncoded: string | ParametersBuilder, 
        accountId: string, 
        accountPrivateKey: string, 
        gas: number = 100000, 
        usePaymaster: boolean = false, 
        resultTypes: string[], 
        completionKey?: string): Promise<ContractCallQueryRecordsData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `contractId` | `string` | - contract id (0.0.xxxxx) |
| `functionName` | `string` | - name of the contract function to call |
| `paramsEncoded` | `string \| ParametersBuilder` | - function argument. Can be generated with ParametersBuilder  object |
| `accountId` | `string` | - operator account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | - operator's hex-encoded private key with DER-header, ECDSA or Ed25519 |
| `gas` | `number` | - gas limit for the transaction |
| `usePaymaster` | `boolean` | - if true, the fee will be paid by paymaster account (note: msg.sender inside the contract will be Paymaster account) |
| `resultTypes` | `string[]` | - array of result types. Currently supported only plain data types |
| `completionKey` | `string` | - optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<ContractCallQueryRecordsData>`

#### Example

```javascript
const params = new ParametersBuilder();
const contractId = "0.0.123456";
const gas = 100000;
const result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", gas, false, ["string"]);
```

## transferTokens

Send token to specific account.

`transferTokens(
        tokenId: string, 
        accountId: string, 
        accountPrivateKey: string, 
        receiverID: string, 
        amountOrSerial: string, 
        memo: string, 
        usePaymaster: boolean = false, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenId` | `string` | token id to send (0.0.xxxxx) |
| `accountId` | `string` | sender account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519 |
| `receiverID` | `string` | receiver account id (0.0.xxxxx) |
| `amountOrSerial` | `string` | amount of fungible tokens to send (with token-decimals correction) on NFT serial number |
| `memo` | `string` | transaction memo |
| `usePaymaster` | `boolean` | if true, Paymaster account will pay fee transaction. Only for single dApp configured fungible-token. In that case tokenId not used |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const receipt = await bladeSdk.transferTokens("0.0.1337", "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", "0.0.10002", "1.0", "test memo", false);
```

## createScheduleTransaction

Create scheduled transaction

`createScheduleTransaction(
        accountId: string, 
        accountPrivateKey: string, 
        type: ScheduleTransactionType, 
        transfers: ScheduleTransactionTransfer[], 
        usePaymaster: boolean = false, 
        completionKey?: string): Promise<ScheduleResult>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountId` | `string` | account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | optional field if you need specify account key (hex encoded privateKey with DER-prefix) |
| `type` | `ScheduleTransactionType` | schedule transaction type (currently only TRANSFER supported) |
| `transfers` | `ScheduleTransactionTransfer[]` | array of transfers to schedule (HBAR, FT, NFT) |
| `usePaymaster` | `boolean` | if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<ScheduleResult>`

#### Example

```javascript
const receiverAccountId = "0.0.10001";
const receiverAccountPrivateKey = "302e020100300506032b65700422042043234DEADBEEF255...";
const senderAccountId = "0.0.10002";
const tokenId = "0.0.1337";
const nftId = "0.0.1234";
const {scheduleId} = await bladeSdk.createScheduleTransaction(
    receiverAccountId,
    receiverAccountPrivateKey,
    "TRANSFER", [
        {
            type: "HBAR",
            sender: senderAccountId,
            receiver: receiverAccountId,
            value: 1 * 10**8,
        },
        {
            type: "FT",
            sender: senderAccountId,
            receiver: receiverAccountId,
            tokenId: tokenId,
            value: 1
        },
        {
            type: "NFT",
            sender: senderAccountId,
            receiver: receiverAccountId,
            tokenId: nftId,
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
        accountId: string, 
        accountPrivateKey: string, 
        receiverAccountId?: string, 
        usePaymaster: boolean = false, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `scheduleId` | `string` | scheduled transaction id (0.0.xxxxx) |
| `accountId` | `string` | account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | optional field if you need specify account key (hex encoded privateKey with DER-prefix) |
| `receiverAccountId` | `string` | account id of receiver for additional validation in case of dApp freeSchedule transactions configured |
| `usePaymaster` | `boolean` | if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const scheduleId = "0.0.754583634";
const senderAccountId = "0.0.10002";
const senderAccountPrivateKey = "302e020100300506032b65700422042043234DEADBEEF255...";
const receiverAccountId = "0.0.10001";
const receipt = await bladeSdk.signScheduleId(scheduleId, senderAccountId, senderAccountPrivateKey, receiverAccountId, false);
```

## createAccount

Create new Hedera account (ECDSA). Only for configured dApps. Depending on dApp config Blade create account, associate tokens, etc.

In case of not using pre-created accounts pool and network high load, this method can return transactionId and no accountId.

In that case account creation added to queue, and you should wait some time and call `getPendingAccount()` method.

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

## getPendingAccount

Get account from queue (read more at `createAccount()`).

If account already created, return account data.

If account not created yet, response will be same as in `createAccount()` method if account in queue.

`getPendingAccount(
        transactionId: string, 
        mnemonic: string, 
        completionKey?: string): Promise<CreateAccountData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `transactionId` | `string` | returned from `createAccount()` method |
| `mnemonic` | `string` | returned from `createAccount()` method |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateAccountData>`

#### Example

```javascript
const account = await bladeSdk.createAccount();
if (account.status === "PENDING") {
  // wait some time and call getPendingAccount method
  account = await bladeSdk.getPendingAccount(account.transactionId, account.seedPhrase);
}
```

## deleteAccount

Delete Hedera account. This method requires account private key and operator private key. Operator is the one who paying fees

`deleteAccount(
        deleteAccountId: string, 
        deletePrivateKey: string, 
        transferAccountId: string, 
        operatorAccountId: string, 
        operatorPrivateKey: string, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `deleteAccountId` | `string` | account id of account to delete (0.0.xxxxx) |
| `deletePrivateKey` | `string` | account private key (DER encoded hex string) |
| `transferAccountId` | `string` | if any funds left on account, they will be transferred to this account (0.0.xxxxx) |
| `operatorAccountId` | `string` | operator account id (0.0.xxxxx). Used for fee |
| `operatorPrivateKey` | `string` | operator's account private key (DER encoded hex string) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const receipt = await bladeSdk.deleteAccount(accountToDelete.accountId, accountToDelete.privateKey, "0.0.10001", "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...");
```

## getAccountInfo

Get account info.

EvmAddress is address of Hedera account if exists. Else accountId will be converted to solidity address.

CalculatedEvmAddress is calculated from account public key. May be different from evmAddress.

`getAccountInfo(accountId: string,  completionKey?: string): Promise<AccountInfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountId` | `string` | Hedera account id (0.0.xxxxx) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<AccountInfoData>`

#### Example

```javascript
const accountInfo = await bladeSdk.getAccountInfo("0.0.10001");
```

## getNodeList

Get Node list

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

Stake/unstake account

`stakeToNode(
        accountId: string, 
        accountPrivateKey: string, 
        nodeId: number, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountId` | `string` | Hedera account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | account private key (DER encoded hex string) |
| `nodeId` | `number` | node id to stake to. If negative or null, account will be unstaked |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const receipt = await bladeSdk.stakeToNode("0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", 3);
```

## getKeysFromMnemonic



`getKeysFromMnemonic(
        mnemonicRaw: string, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        lookupNames: boolean = true, 
        completionKey?: string): Promise<PrivateKeyData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `mnemonicRaw` | `string` | BIP39 mnemonic |
| `lookupNames` | `boolean` | not used anymore, account search is mandatory |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<PrivateKeyData>`

#### Example

```javascript
const result = await bladeSdk.getKeysFromMnemonic("purity slab doctor swamp tackle rebuild summer bean craft toddler blouse switch");
```

## searchAccounts

Get accounts list and keys from private key or mnemonic

Supporting standard and legacy key derivation.

Every key with account will be returned.

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

`dropTokens(
        accountId: string, 
        accountPrivateKey: string, 
        secretNonce: string, 
        completionKey?: string): Promise<TokenDropData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountId` | `string` | Hedera account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | account private key (DER encoded hex string) |
| `secretNonce` | `string` | configured for dApp. Should be kept in secret |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TokenDropData>`

#### Example

```javascript
const drop = await bladeSdk.dropTokens("0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", "secret-nonce");
```

## sign

Sign base64-encoded message with private key. Returns hex-encoded signature.

`sign(messageString: string,  privateKey: string,  completionKey?: string): SignMessageData`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `messageString` | `string` | base64-encoded message to sign |
| `privateKey` | `string` | hex-encoded private key with DER header |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`SignMessageData`

#### Example

```javascript
const signed = await bladeSdk.sign(btoa("Hello"), "302e020100300506032b65700422042043234DEADBEEF255...");
```

## signVerify

Verify message signature by public key

`signVerify(
        messageString: string, 
        signature: string, 
        publicKey: string, 
        completionKey?: string): SignVerifyMessageData`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `messageString` | `string` | base64-encoded message (same as provided to `sign()` method) |
| `signature` | `string` | hex-encoded signature (result from `sign()` method) |
| `publicKey` | `string` | hex-encoded public key with DER header |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`SignVerifyMessageData`

#### Example

```javascript
const signature = "27cb9d51434cf1e76d7ac515b19442c619f641e6fccddbf4a3756b14466becb6992dc1d2a82268018147141fc8d66ff9ade43b7f78c176d070a66372d655f942";
const publicKey = "302d300706052b8104000a032200029dc73991b0d9cdbb59b2cd0a97a0eaff6de...";
const valid = await bladeSdk.signVerify(btoa("Hello"), signature, publicKey);
```

## ethersSign

Sign base64-encoded message with private key using ethers lib. Returns hex-encoded signature.

`ethersSign(messageString: string,  privateKey: string,  completionKey?: string): Promise<SignMessageData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `messageString` | `string` | base64-encoded message to sign |
| `privateKey` | `string` | hex-encoded private key with DER header |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignMessageData>`

#### Example

```javascript
const signed = await bladeSdk.ethersSign(btoa("Hello"), "302e020100300506032b65700422042043234DEADBEEF255...");
```

## splitSignature

Split signature to v-r-s format.

`splitSignature(signature: string,  completionKey?: string): SplitSignatureData`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `signature` | `string` | hex-encoded signature |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`SplitSignatureData`

#### Example

```javascript
const signature = "27cb9d51434cf1e76d7ac515b19442c619f641e6fccddbf4a3756b14466becb6992dc1d2a82268018147141fc8d66ff9ade43b7f78c176d070a66372d655f942";
const {v, r, s} = await bladeSdk.splitSignature(signature);
```

## getParamsSignature

Get v-r-s signature of contract function params

`getParamsSignature(
        paramsEncoded: string | ParametersBuilder, 
        privateKey: string, 
        completionKey?: string): Promise<SplitSignatureData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `paramsEncoded` | `string \| ParametersBuilder` | data to sign. Can be string or ParametersBuilder |
| `privateKey` | `string` | signer private key (hex-encoded with DER header) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

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
        accountId: string, 
        transactionType: string = "", 
        nextPage: string, 
        transactionsLimit: string = "10", 
        completionKey?: string): Promise<TransactionsHistoryData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountId` | `string` | account id to get transactions for (0.0.xxxxx) |
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

## getC14url

Get configured url for C14 integration (iframe or popup)

`getC14url(
        asset: string, 
        account: string, 
        amount: string, 
        completionKey?: string): Promise<IntegrationUrlData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `asset` | `string` | name (USDC or HBAR) |
| `account` | `string` | receiver account id (0.0.xxxxx) |
| `amount` | `string` | preset amount. May be overwritten if out of range (min/max) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<IntegrationUrlData>`

#### Example

```javascript
const {url} = await bladeSdk.getC14url("HBAR", "0.0.10001", "100");
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

## swapTokens

Swap tokens

`swapTokens(
        accountId: string, 
        accountPrivateKey: string, 
        sourceCode: string, 
        sourceAmount: number, 
        targetCode: string, 
        slippage: number, 
        serviceId: string, 
        completionKey?: string): Promise<StatusResult>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `accountId` | `string` | account id |
| `accountPrivateKey` | `string` | account private key |
| `sourceCode` | `string` | name (HBAR, KARATE, other token code) |
| `sourceAmount` | `number` | amount to swap |
| `targetCode` | `string` | name (HBAR, KARATE, other token code) |
| `slippage` | `number` | slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage. |
| `serviceId` | `string` | service id to use for swap (saucerswap, etc) |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<StatusResult>`

#### Example

```javascript
const result = await bladeSdk.swapTokens("0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", "HBAR", 1, "SAUCE", 0.5, "saucerswapV2");
```

## getTradeUrl

Get configured url to buy or sell tokens or fiat

`getTradeUrl(
        strategy: CryptoFlowServiceStrategy, 
        accountId: string, 
        sourceCode: string, 
        sourceAmount: number, 
        targetCode: string, 
        slippage: number, 
        serviceId: string, 
        redirectUrl: string = "", 
        completionKey?: string): Promise<IntegrationUrlData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `strategy` | `CryptoFlowServiceStrategy` | Buy / Sell |
| `accountId` | `string` | account id |
| `sourceCode` | `string` | name (HBAR, KARATE, USDC, other token code) |
| `sourceAmount` | `number` | amount to buy/sell |
| `targetCode` | `string` | name (HBAR, KARATE, USDC, other token code) |
| `slippage` | `number` | slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage. |
| `serviceId` | `string` | service id to use for swap (saucerswap, onmeta, etc) |
| `redirectUrl` | `string` | optional url to redirect after final step |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<IntegrationUrlData>`

#### Example

```javascript
const {url} = await bladeSdk.getTradeUrl(CryptoFlowServiceStrategy.BUY, "0.0.10001", "EUR", 50, "HBAR", 0.5, "saucerswapV2", redirectUrl);
```

## createToken

Create token (NFT or Fungible Token)

`createToken(
        treasuryAccountId: string, 
        supplyPrivateKey: string, 
        tokenName: string, 
        tokenSymbol: string, 
        isNft: boolean, 
        keys: KeyRecord[] | string, 
        decimals: number, 
        initialSupply: number, 
        maxSupply: number = 250, 
        completionKey?: string): Promise<CreateTokenResult>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `treasuryAccountId` | `string` | treasury account id |
| `supplyPrivateKey` | `string` | supply account private key |
| `tokenName` | `string` | token name (string up to 100 bytes) |
| `tokenSymbol` | `string` | token symbol (string up to 100 bytes) |
| `isNft` | `boolean` | set token type NFT |
| `keys` | `KeyRecord[] \| string` | token keys |
| `decimals` | `number` | token decimals (0 for nft) |
| `initialSupply` | `number` | token initial supply (0 for nft) |
| `maxSupply` | `number` | token max supply |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateTokenResult>`

#### Example

```javascript
const keys: KeyRecord[] = [
    {type: KeyType.admin, privateKey: adminKey},
    {type: KeyType.wipe, privateKey: wipeKey},
    {type: KeyType.pause, privateKey: pauseKey},
];
const treasuryAccountId = "0.0.10001";
const supplyKey = "302e020100300506032b65700422042043234DEADBEEF255...";
const result = await bladeSdk.createToken(
    treasuryAccountId, // treasuryAccountId
    supplyKey, // supplyPrivateKey
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

Associate token to account. Association fee will be covered by PayMaster, if tokenId configured in dApp

`associateToken(
        tokenId: string, 
        accountId: string, 
        accountPrivateKey: string, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenId` | `string` | token id to associate. Empty to associate all tokens configured in dApp |
| `accountId` | `string` | account id to associate token |
| `accountPrivateKey` | `string` | account private key |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceiptData>`

#### Example

```javascript
const result = await bladeSdk.associateToken("0.0.1337", "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...");
```

## nftMint

Mint one NFT

`nftMint(
        tokenId: string, 
        accountId: string, 
        accountPrivateKey: string, 
        file: File | string, 
        metadata: object, 
        storageConfig: NFTStorageConfig, 
        completionKey?: string): Promise<TransactionReceiptData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenId` | `string` | token id to mint NFT |
| `accountId` | `string` | token supply account id |
| `accountPrivateKey` | `string` | token supply private key |
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
    treasuryAccountId,
    supplyKey,
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

Get token info. Fungible or NFT. Also get NFT metadata if serial provided

`getTokenInfo(tokenId: string,  serial: string = "",  completionKey?: string): Promise<TokenInfoData>`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `tokenId` | `string` | token id |
| `serial` | `string` | serial number for NFT |
| `completionKey` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TokenInfoData>`

#### Example

```javascript
const tokenInfo = await bladeSdk.getTokenInfo("0.0.1234", "3");
```

