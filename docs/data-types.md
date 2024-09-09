# ENUMs


### AccountProvider

```typescript
export enum AccountProvider {
    PrivateKey = "PrivateKey",
    Magic = "Magic"
}
```


### CryptoKeyType

```typescript
export enum CryptoKeyType {
    ECDSA_SECP256K1 = "ECDSA_SECP256K1",
    ED25519 = "ED25519"
}
```


### ExchangeStrategy

```typescript
export enum ExchangeStrategy {
    BUY = "Buy",
    SELL = "Sell",
    SWAP = "Swap"
}
```


### JobStatus

```typescript
export enum JobStatus {
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    PROCESSING = "PROCESSING",
    RETRY = "RETRY",
    FAILED = "FAILED"
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
    feeSchedule = "feeSchedule"
}
```


### KnownChains

```typescript
export enum KnownChains { // namespace : chainId
    ETHEREUM_MAINNET = "eip155:1",
    ETHEREUM_SEPOLIA = "eip155:11155111",
    HEDERA_MAINNET = "hedera:295",
    HEDERA_TESTNET = "hedera:296"
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
    UNCHECKEDSUBMIT = "UNCHECKEDSUBMIT"
}
```


### NFTStorageProvider

```typescript
export enum NFTStorageProvider {
    nftStorage = "nftStorage"
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
    Test = "Test"
}
```


### SupportedEncoding

```typescript
export enum SupportedEncoding {
    base64 = "base64",
    hex = "hex",
    utf8 = "utf8"
}
```



# Data types


### AccountInfoData

```typescript
export interface AccountInfoData {
    accountAddress: string;
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
    balance: string;
    rawBalance: string;
    decimals: number;
    tokens: TokenBalanceData[];
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
    accountAddress: string;
    evmAddress: string;
    status: JobStatus;
}
```


### CreateScheduleData

```typescript
export interface CreateScheduleData {
    scheduleId: string
}
```


### CreateTokenData

```typescript
export interface CreateTokenData {
    tokenId: string
}
```


### ExchangeAsset

```typescript
export interface ExchangeAsset {
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


### ExchangeQuote

```typescript
export interface ExchangeQuote {
    service: {
        id: string;
        name: string;
        logo: string;
        description?: string;
    };
    source: IAssetQuote;
    target: IAssetQuote;
    rate: number | null;
    widgetUrl?: string;
    paymentMethods?: string[];
    path?: {
        tokenId: string;
        fee?: number;
    }[];
}
```


### IAssetQuote

```typescript
export interface IAssetQuote {
    asset: ExchangeAsset;
    amountExpected: number;
    totalFee: number | null;
}
```


### InfoData

```typescript
export interface InfoData {
    apiKey: string;
    dAppCode: string;
    isTestnet: boolean;
    chain: KnownChains;
    visitorId: string;
    sdkEnvironment: SdkEnvironment;
    sdkVersion: string;
    nonce: number;
    user: UserInfoData;
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


### NftTransferData

```typescript
export interface NftTransferData {
    receiverAddress: string;
    senderAddress: string;
    serial: string;
    tokenAddress: string;
}
```


### NodeListData

```typescript
export interface NodeListData {
    nodes: NodeInfo[];
}
```


### ResultData

```typescript
export interface ResultData {
    success: boolean;
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


### SwapQuotesData

```typescript
export interface SwapQuotesData {
    quotes: ExchangeQuote[];
}
```


### TokenBalanceData

```typescript
export interface TokenBalanceData {
    balance: string;
    decimals: number;
    name: string;
    symbol: string;
    address: string;
    rawBalance: string;
}
```


### TokenDropData

```typescript
export interface TokenDropData {
    status: string;
    accountAddress: string;
    dropStatuses: {
       [key: string]: DropStatus;
    };
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
    nftTransfers: NftTransferData[];
    memo?: string;
    fee?: number;
    plainData?: any;
    consensusTimestamp: string;
}
```


### TransactionReceiptData

```typescript
export interface TransactionReceiptData {
    status: string;
    contractAddress?: string;
    topicSequenceNumber?: string;
    totalSupply?: string;
    serials: string[];
    transactionHash: string;
}
```


### TransactionResponseData

```typescript
export interface TransactionResponseData {
    transactionHash: string;
    transactionId: string;
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
    account: string;
    amount: number;
    tokenAddress?: string;
    asset: string;
}
```


### UserInfoData

```typescript
export interface UserInfoData {
    address: string;
    accountProvider: AccountProvider | null;
    privateKey: string;
    publicKey: string;
}
```



