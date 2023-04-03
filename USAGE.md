---
description: More details on how to use Blade-SDK.js
---

# Usage

## Class: BladeSDK

#### Methods

* [constructor](USAGE.md#constructor)
* [init](USAGE.md#init)
* [getBalance](USAGE.md#getbalance)
* [createAccount](USAGE.md#createaccount)
* [getPendingAccount](USAGE.md#getpendingaccount)
* [getAccountInfo](USAGE.md#getaccountinfo)
* [getKeysFromMnemonic](USAGE.md#getkeysfrommnemonic)
* [transferHbars](USAGE.md#transferhbars)
* [transferTokens](USAGE.md#transfertokens)
* [getTransactions](USAGE.md#gettransactions)
* [deleteAccount](USAGE.md#deleteaccount)
* [contractCallFunction](USAGE.md#contractcallfunction)
* [contractCallQueryFunction](USAGE.md#contractcallqueryfunction)
* [getParamsSignature](USAGE.md#getparamssignature)
* [sign](USAGE.md#sign)
* [signVerify](USAGE.md#signverify)
* [hethersSign](USAGE.md#hetherssign)
* [splitSignature](USAGE.md#splitsignature)
* [getC14url](USAGE.md#getc14url)
* [sendMessageToNative](USAGE.md#sendmessagetonative)


## Methods

### constructor

▸ **new BladeSDK**(`isWebView?`)

BladeSDK constructor.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `isWebView` | `boolean` | `false` | true if you are using this SDK in webview of native app. It changes the way of communication with native app. |


### init

▸ **init**(`apiKey`, `network`, `dAppCode`, `fingerprint`, `completionKey?`): `Promise<InitData>`

Inits instance of BladeSDK for correct work with Blade API and Hedera network.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiKey` | `string` | Unique key for API provided by Blade team. |
| `network` | `string` | "Mainnet" or "Testnet" of Hedera network |
| `dAppCode` | `string` | your dAppCode - request specific one by contacting us |
| `fingerprint` | `string` | client unique fingerprint |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<InitData>` status: "success" or "error"

___

### getBalance

▸ **getBalance**(`accountId`, `completionKey?`): `Promise<BalanceData>`

Get hbar and token balances for specific account.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `accountId` | `string` | Hedera account id (0.0.xxxxx) |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<BalanceData>` hbars, tokens[]

___

### createAccount

▸ **createAccount**(`completionKey?`): `Promise<CreateAccountData>`

Create Hedera account (ECDSA). Only for configured dApps. Depending on dApp config Blade create account, associate tokens, etc.
In case of not using pre-created accounts pool and network high load, this method can return transactionId and no accountId.
In that case account creation added to queue, and you should wait some time and call `getPendingAccount()` method.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateAccountData>`

___

### getPendingAccount

▸ **getPendingAccount**(`transactionId`, `mnemonic`, `completionKey?`): `Promise<CreateAccountData>`

Get account from queue (read more at `createAccount()`).
If account already created, return account data.
If account not created yet, response will be same as in `createAccount()` method if account in queue.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `transactionId` | `string` | returned from `createAccount()` method |
| `mnemonic` | `string` | returned from `createAccount()` method |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<CreateAccountData>`

___

### getAccountInfo

▸ **getAccountInfo**(`accountId`, `completionKey?`): `Promise<AccountInfoData>`

Get account info.
EvmAddress is address of Hedera account if exists. Else accountId will be converted to solidity address.
CalculatedEvmAddress is calculated from account public key. May be different from evmAddress.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `accountId` | `string` | Hedera account id (0.0.xxxxx) |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<AccountInfoData>`

___

### getKeysFromMnemonic

▸ **getKeysFromMnemonic**(`mnemonicRaw`, `lookupNames`, `completionKey?`): `Promise<PrivateKeyData>`

Get ECDSA private key from mnemonic. Also try to find accountIds based on public key if lookupNames is true.
Returned keys with DER header.
EvmAddress computed from Public key.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `mnemonicRaw` | `string` | BIP39 mnemonic |
| `lookupNames` | `boolean` | if true, get accountIds from mirror node by public key |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<PrivateKeyData>`

___

### transferHbars

▸ **transferHbars**(`accountId`, `accountPrivateKey`, `receiverID`, `amount`, `completionKey?`): `Promise<TransactionResponse>`

Send hbars to specific account.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `accountId` | `string` | sender account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519 |
| `receiverID` | `string` | receiver account id (0.0.xxxxx) |
| `amount` | `string` | of hbars to send (decimal number) |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionResponse>`

___

### transferTokens

▸ **transferTokens**(`tokenId`, `accountId`, `accountPrivateKey`, `receiverID`, `amount`, `freeTransfer?`, `completionKey?`): `Promise<TransactionResponse>`

Send token to specific account.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `tokenId` | `string` | `undefined` | token id to send (0.0.xxxxx) |
| `accountId` | `string` | `undefined` | sender account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | `undefined` | sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519 |
| `receiverID` | `string` | `undefined` | receiver account id (0.0.xxxxx) |
| `amount` | `string` | `undefined` | of tokens to send (with token-decimals correction) |
| `freeTransfer` | `boolean` | `false` | if true, Blade will pay fee transaction. Only for single dApp configured token. In that case tokenId not used |
| `completionKey?` | `string` | `undefined` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionResponse>`

___

### getTransactions

▸ **getTransactions**(`accountId`, `transactionType?`, `nextPage`, `transactionsLimit?`, `completionKey?`): `Promise<TransactionsHistoryData>`

Get transactions history for account. Can be filtered by transaction type.
Transaction requested from mirror node. Every transaction requested for child transactions. Result are flattened.
If transaction type is not provided, all transactions will be returned.
If transaction type is CRYPTOTRANSFERTOKEN records will additionally contain plainData field with decoded data.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `accountId` | `string` | `undefined` | account id to get transactions for (0.0.xxxxx) |
| `transactionType` | `string` | `""` | one of enum MirrorNodeTransactionType or "CRYPTOTRANSFERTOKEN" |
| `nextPage` | `string` | `undefined` | link to next page of transactions from previous request |
| `transactionsLimit` | `string` | `"10"` | number of transactions to return. Speed of request depends on this value if transactionType is set. |
| `completionKey?` | `string` | `undefined` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionsHistoryData>`

___

### deleteAccount

▸ **deleteAccount**(`deleteAccountId`, `deletePrivateKey`, `transferAccountId`, `operatorAccountId`, `operatorPrivateKey`, `completionKey?`): `Promise<TransactionReceipt>`

Delete Hedera account

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deleteAccountId` | `string` | account id of account to delete (0.0.xxxxx) |
| `deletePrivateKey` | `string` | account private key (DER encoded hex string) |
| `transferAccountId` | `string` | if any funds left on account, they will be transferred to this account (0.0.xxxxx) |
| `operatorAccountId` | `string` | operator account id (0.0.xxxxx). Used for fee |
| `operatorPrivateKey` | `string` | operator's account private key (DER encoded hex string) |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<TransactionReceipt>`

___

### contractCallFunction

▸ **contractCallFunction**(`contractId`, `functionName`, `paramsEncoded`, `accountId`, `accountPrivateKey`, `gas?`, `bladePayFee?`, `completionKey?`): `Promise<Partial<TransactionReceipt>>`

Call contract function. Directly or via Blade Payer account (fee will be paid by Blade), depending on your dApp configuration.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `contractId` | `string` | `undefined` | contract id (0.0.xxxxx) |
| `functionName` | `string` | `undefined` | name of the contract function to call |
| `paramsEncoded` | `string` \| [`ParametersBuilder`](ParametersBuilder.md) | `undefined` | function argument. Can be generated with ParametersBuilder object |
| `accountId` | `string` | `undefined` | operator account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | `undefined` | operator's hex-encoded private key with DER-header, ECDSA or Ed25519 |
| `gas` | `number` | `100000` | gas limit for the transaction |
| `bladePayFee` | `boolean` | `false` | if true, fee will be paid by Blade (note: msg.sender inside the contract will be Blade Payer account) |
| `completionKey?` | `string` | `undefined` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<Partial<TransactionReceipt>>`

___

### contractCallQueryFunction

▸ **contractCallQueryFunction**(`contractId`, `functionName`, `paramsEncoded`, `accountId`, `accountPrivateKey`, `gas?`, `bladePayFee?`, `resultTypes`, `completionKey?`): `Promise<ContractCallQueryRecord[]>`

Call query on contract function. Similar to contractCallFunction can be called directly or via Blade Payer account.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `contractId` | `string` | `undefined` | contract id (0.0.xxxxx) |
| `functionName` | `string` | `undefined` | name of the contract function to call |
| `paramsEncoded` | `string` \| [`ParametersBuilder`](ParametersBuilder.md) | `undefined` | function argument. Can be generated with ParametersBuilder object |
| `accountId` | `string` | `undefined` | operator account id (0.0.xxxxx) |
| `accountPrivateKey` | `string` | `undefined` | operator's hex-encoded private key with DER-header, ECDSA or Ed25519 |
| `gas` | `number` | `100000` | gas limit for the transaction |
| `bladePayFee` | `boolean` | `false` | if true, fee will be paid by Blade (note: msg.sender inside the contract will be Blade Payer account) |
| `resultTypes` | `string`[] | `undefined` | array of result types. Currently supported only plain data types |
| `completionKey?` | `string` | `undefined` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<ContractCallQueryRecord[]>`

___

### getParamsSignature

▸ **getParamsSignature**(`paramsEncoded`, `privateKey`, `completionKey?`): `Promise<SplitSignatureData>`

Get v-r-s signature of contract function params

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `paramsEncoded` | `string` \| [`ParametersBuilder`](ParametersBuilder.md) | data to sign. Can be string or ParametersBuilder |
| `privateKey` | `string` | signer private key (hex-encoded with DER header) |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SplitSignatureData>`

___

### sign

▸ **sign**(`messageString`, `privateKey`, `completionKey?`): `Promise<SignMessageData>`

Sign base64-encoded message with private key. Returns hex-encoded signature.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `messageString` | `string` | base64-encoded message to sign |
| `privateKey` | `string` | hex-encoded private key with DER header |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignMessageData>`

___

### signVerify

▸ **signVerify**(`messageString`, `signature`, `publicKey`, `completionKey?`): `Promise<SignVerifyMessageData>`

Verify message signature by public key

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `messageString` | `string` | base64-encoded message (same as provided to `sign()` method) |
| `signature` | `string` | hex-encoded signature (result from `sign()` method) |
| `publicKey` | `string` | hex-encoded public key with DER header |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignVerifyMessageData>`

___

### hethersSign

▸ **hethersSign**(`messageString`, `privateKey`, `completionKey?`): `Promise<SignMessageData>`

Sign base64-encoded message with private key using hethers lib. Returns hex-encoded signature.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `messageString` | `string` | base64-encoded message to sign |
| `privateKey` | `string` | hex-encoded private key with DER header |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SignMessageData>`

___

### splitSignature

▸ **splitSignature**(`signature`, `completionKey?`): `Promise<SplitSignatureData>`

Split signature to v-r-s format.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signature` | `string` | hex-encoded signature |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<SplitSignatureData>`

___

### getC14url

▸ **getC14url**(`asset`, `account`, `amount`, `completionKey?`): `Promise<IntegrationUrlData>`

Get configured url for C14 integration (iframe or popup)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `asset` | `string` | name (USDC or HBAR) |
| `account` | `string` | receiver account id (0.0.xxxxx) |
| `amount` | `string` | preset amount. May be overwritten if out of range (min/max) |
| `completionKey?` | `string` | optional field bridge between mobile webViews and native apps |

#### Returns

`Promise<IntegrationUrlData>`

___

### sendMessageToNative

▸ `Private` **sendMessageToNative**(`completionKey`, `data`, `error?`): `any`

Message that sends response back to native handler

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `completionKey` | `string` | `undefined` |
| `data` | `any` | `undefined` |
| `error` | `any` | `null` |

#### Returns

`any`

