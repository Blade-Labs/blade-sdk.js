# ENUMs


### AccountProvider

```typescript
export enum AccountProvider {
    Hedera = "Hedera",
    Magic = "Magic",
}
```


### CryptoFlowServiceStrategy

```typescript
export enum CryptoFlowServiceStrategy {
    BUY = "Buy",
    SELL = "Sell",
    SWAP = "Swap",
}
```


### CryptoKeyType

```typescript
export enum CryptoKeyType {
    ECDSA_SECP256K1 = "ECDSA_SECP256K1",
    ED25519 = "ED25519",
}
```


### KeyType

```typescript
export enum KeyType {
    admin = "admin",
    kyc = "kyc",
    freeze = "freeze",
    wipe = "wipe",
    pause = "pause",
    feeSchedule = "feeSchedule",
}
```


### MirrorNodeTransactionType

```typescript
export enum MirrorNodeTransactionType {
    CONSENSUSCREATETOPIC = "CONSENSUSCREATETOPIC",
    CONSENSUSDELETETOPIC = "CONSENSUSDELETETOPIC",
    CONSENSUSSUBMITMESSAGE = "CONSENSUSSUBMITMESSAGE",
    CONSENSUSUPDATETOPIC = "CONSENSUSUPDATETOPIC",
    CONTRACTCALL = "CONTRACTCALL",
    CONTRACTCREATEINSTANCE = "CONTRACTCREATEINSTANCE",
    CONTRACTDELETEINSTANCE = "CONTRACTDELETEINSTANCE",
    CONTRACTUPDATEINSTANCE = "CONTRACTUPDATEINSTANCE",
    CRYPTOADDLIVEHASH = "CRYPTOADDLIVEHASH",
    CRYPTOCREATEACCOUNT = "CRYPTOCREATEACCOUNT",
    CRYPTODELETE = "CRYPTODELETE",
    CRYPTODELETELIVEHASH = "CRYPTODELETELIVEHASH",
    CRYPTOTRANSFER = "CRYPTOTRANSFER",
    CRYPTOUPDATEACCOUNT = "CRYPTOUPDATEACCOUNT",
    FILEAPPEND = "FILEAPPEND",
    FILECREATE = "FILECREATE",
    FILEDELETE = "FILEDELETE",
    FILEUPDATE = "FILEUPDATE",
    FREEZE = "FREEZE",
    SCHEDULECREATE = "SCHEDULECREATE",
    SCHEDULEDELETE = "SCHEDULEDELETE",
    SCHEDULESIGN = "SCHEDULESIGN",
    SYSTEMDELETE = "SYSTEMDELETE",
    SYSTEMUNDELETE = "SYSTEMUNDELETE",
    TOKENASSOCIATE = "TOKENASSOCIATE",
    TOKENBURN = "TOKENBURN",
    TOKENCREATION = "TOKENCREATION",
    TOKENDELETION = "TOKENDELETION",
    TOKENDISSOCIATE = "TOKENDISSOCIATE",
    TOKENFEESCHEDULEUPDATE = "TOKENFEESCHEDULEUPDATE",
    TOKENFREEZE = "TOKENFREEZE",
    TOKENGRANTKYC = "TOKENGRANTKYC",
    TOKENMINT = "TOKENMINT",
    TOKENPAUSE = "TOKENPAUSE",
    TOKENREVOKEKYC = "TOKENREVOKEKYC",
    TOKENUNFREEZE = "TOKENUNFREEZE",
    TOKENUNPAUSE = "TOKENUNPAUSE",
    TOKENUPDATE = "TOKENUPDATE",
    TOKENWIPE = "TOKENWIPE",
    UNCHECKEDSUBMIT = "UNCHECKEDSUBMIT",
}
```


### NFTStorageProvider

```typescript
export enum NFTStorageProvider {
    nftStorage = "nftStorage",
}
```


### ScheduleTransactionType

```typescript
export enum ScheduleTransactionType {
    TRANSFER = "TRANSFER",
    SUBMIT_MESSAGE = "SUBMIT_MESSAGE",
    APPROVE_ALLOWANCE = "APPROVE_ALLOWANCE",
    TOKEN_MINT = "TOKEN_MINT",
    TOKEN_BURN = "TOKEN_BURN"
}
```


### ScheduleTransferType

```typescript
export enum ScheduleTransferType {
    HBAR = "HBAR",
    FT = "FT",
    NFT = "NFT"
}
```


### SdkEnvironment

```typescript
export enum SdkEnvironment {
    Prod = "Prod",
    CI = "CI",
    Test = "Test",
}
```



# Data types


### AccountInfoData

```typescript
export interface AccountInfoData {
    accountId: string;
    publicKey: string;
    evmAddress: string;
    stakingInfo: {
        pendingReward: number;
        stakedNodeId: number | null;
        stakePeriodStart: string | null;
    };
    calculatedEvmAddress?: string;
}
```


### AccountPrivateData

```typescript
export interface AccountPrivateData {
    accounts: AccountPrivateRecord[];
}
```


### AccountPrivateRecord

```typescript
export interface AccountPrivateRecord {
    privateKey: string;
    publicKey: string;
    evmAddress: string;
    address: string;
    path: string;
    keyType: CryptoKeyType;
}
```


### BalanceData

```typescript
export interface BalanceData {
    hbars: number;
    tokens: {
        tokenId: string;
        balance: number;
    }[];
}
```


### CoinData

```typescript
export interface CoinData {
    // partial
    id: string;
    symbol: string;
    name: string;
    web_slug: string;
    description: {
        en: string;
    };
    image: {
        thumb: string;
        small: string;
        large: string;
    };
    platforms: {
        name: string;
        address: string;
    }[];
    market_data: {
        current_price: {
            [key: string]: number;
        };
    };
}
```


### CoinInfoData

```typescript
export interface CoinInfoData {
    coin: CoinData;
    priceUsd: number;
    price: number | null;
    currency: string;
}
```


### CoinListData

```typescript
export interface CoinListData {
    coins: {
        id: string;
        symbol: string;
        name: string;
        platforms: {
            name: string;
            address: string;
        }[];
    }[];
}
```


### ContractCallQueryRecord

```typescript
export interface ContractCallQueryRecord {
    type: string;
    value: string | number | boolean;
}
```


### ContractCallQueryRecordsData

```typescript
export interface ContractCallQueryRecordsData {
    values: ContractCallQueryRecord[];
    gasUsed: number;
}
```


### CreateAccountData

```typescript
export interface CreateAccountData {
    seedPhrase: string;
    publicKey: string;
    privateKey: string;
    accountId: string | null;
    evmAddress: string;
    transactionId?: string | null;
    status: string;
    queueNumber?: number;
}
```


### CreateTokenResult

```typescript
export interface CreateTokenResult {
    tokenId: string;
}
```


### IAssetQuote

```typescript
export interface IAssetQuote {
    asset: ICryptoFlowAsset;
    amountExpected: number;
    totalFee: number | null;
}
```


### ICryptoFlowAsset

```typescript
export interface ICryptoFlowAsset {
    name: string;
    code: string;
    type: string;
    // crypto only
    address?: string;
    chainId?: number;
    decimals?: number;
    minAmount?: number;
    maxAmount?: number;
    // fiat only
    symbol?: string;
    // both
    imageUrl?: string;
}
```


### ICryptoFlowQuote

```typescript
export interface ICryptoFlowQuote {
    service: {
        id: string;
        name: string;
        logo: string;
        description?: string;
    };
    source: IAssetQuote;
    target: IAssetQuote;
    rate: number | null;
    widgetUrl: string;
    paymentMethods?: string[];
    path?: { tokenId: string, fee?: number }[];
}
```


### InfoData

```typescript
export interface InfoData {
    apiKey: string;
    dAppCode: string;
    network: string;
    visitorId: string;
    sdkEnvironment: SdkEnvironment;
    sdkVersion: string;
    nonce: number;
}
```


### IntegrationUrlData

```typescript
export interface IntegrationUrlData {
    url: string;
}
```


### KeyRecord

```typescript
export interface KeyRecord {
    privateKey: string;
    type: KeyType;
}
```


### NFTStorageConfig

```typescript
export interface NFTStorageConfig {
    provider: NFTStorageProvider;
    apiKey: string;
}
```


### NodeListData

```typescript
export interface NodeListData {
    nodes: NodeInfo[];
}
```


### PrivateKeyData

```typescript
export interface PrivateKeyData {
    privateKey: string;
    publicKey: string;
    accounts: string[];
    evmAddress: string;
}
```


### ScheduleResult

```typescript
export interface ScheduleResult {
    scheduleId: string;
}
```


### ScheduleTransactionTransfer

```typescript
export interface ScheduleTransactionTransfer {
    type: ScheduleTransferType;
    sender: string;
    receiver: string;
    value?: number;
    tokenId?: string;
    serial?: number;
}
```


### SignMessageData

```typescript
export interface SignMessageData {
    signedMessage: string;
}
```


### SignVerifyMessageData

```typescript
export interface SignVerifyMessageData {
    valid: boolean;
}
```


### SplitSignatureData

```typescript
export interface SplitSignatureData {
    v: number;
    r: string;
    s: string;
}
```


### StatusResult

```typescript
export interface StatusResult {
    success: boolean
}
```


### SwapQuotesData

```typescript
export interface SwapQuotesData {
    quotes: ICryptoFlowQuote[];
}
```


### TokenDropData

```typescript
export interface TokenDropData {
    status: string;
    statusCode: number;
    timestamp: string;
    executionStatus: string;
    requestId: string;
    accountId: string;
    redirectUrl: string;
}
```


### TokenInfoData

```typescript
export interface TokenInfoData {
    token: TokenInfo;
    nft: NftInfo | null;
    metadata: NftMetadata | null;
}
```


### TransactionData

```typescript
export interface TransactionData {
    transactionId: string;
    type: MirrorNodeTransactionType;
    time: Date;
    transfers: TransferData[];
    nftTransfers?: [];
    memo?: string;
    fee?: number;
    showDetailed?: boolean;
    plainData?: any;
    consensusTimestamp: string;
}
```


### TransactionReceiptData

```typescript
export interface TransactionReceiptData {
    status: string;
    contractId?: string;
    topicSequenceNumber?: string;
    totalSupply?: string;
    serials: string[];
}
```


### TransactionsHistoryData

```typescript
export interface TransactionsHistoryData {
    transactions: TransactionData[];
    nextPage: string | null;
}
```


### TransferData

```typescript
export interface TransferData {
    amount: number;
    account: string;
    token_id?: string;
}
```


### UserInfoData

```typescript
export interface UserInfoData {
    accountId: string;
    accountProvider: AccountProvider | null;
    userPrivateKey: string;
    userPublicKey: string;
}
```



