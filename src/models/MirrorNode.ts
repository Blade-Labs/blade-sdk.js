import {CryptoKeyType} from "./Chain";

export type AccountInfoMirrorResponse = APIPagination & {
    accounts: AccountInfo[];
};

export type NodeListMirrorResponse = APIPagination & {
    nodes: NodeInfo[];
};

export type TokenRelationshipMirrorResponse = APIPagination & {
    tokens: TokenRelationship[];
};

export type TransactionsMirrorResponse = APIPagination & {
    transactions: TransactionMirrorDetails[];
};

export type APIPagination = {
    links: {
        next: string | null;
    };
};

export type TokenRelationship = {
    automatic_association: boolean;
    balance: number;
    created_timestamp: string;
    decimals: number;
    token_id: string;
    freeze_status: string;
    kyc_status: string;
}

export type HederaKey = {
    _type: CryptoKeyType;
    key: string;
};

export type AccountInfo = {
    account: string;
    alias: string | null;
    auto_renew_period?: number;
    balance: {
        balance: number;
        timestamp: string;
        tokens?: {
            token_id: string;
            balance: number;
        }[];
    };
    decline_reward: boolean;
    deleted: boolean;
    ethereum_nonce: number;
    pending_reward: number;
    evm_address: string | null;
    expiry_timestamp: string | null;
    key: HederaKey;
    max_automatic_token_associations: number;
    memo: string;
    receiver_sig_required: boolean;
    staked_account_id: string | null;
    staked_node_id: number | null;
    stake_period_start: string | null;
};

export type NodeInfo = {
    description: string;
    file_id: string;
    max_stake: number;
    memo: string;
    min_stake: number;
    node_id: number;
    node_account_id: string;
    node_cert_hash: string;
    public_key: string;
    reward_rate_start: number;
    service_endpoints: [
        {
            ip_address_v4: string;
            port: number;
        }
    ];
    stake: number;
    stake_not_rewarded: number;
    stake_rewarded: number;
    stake_total: number;
    staking_period: {
        from: string;
        to: string;
    };
    timestamp: {
        from: string;
        to: null;
    };
};

export type TokenInfo = {
    admin_key: HederaKey;
    auto_renew_account: string;
    auto_renew_period: number;
    created_timestamp: string;
    custom_fees: {
        // todo: define this type
        created_timestamp: string;
        fixed_fees: [];
        royalty_fees: [];
    };
    decimals: string;
    deleted: boolean;
    expiry_timestamp: number;
    fee_schedule_key: HederaKey | null;
    freeze_default: boolean;
    freeze_key: HederaKey | null;
    initial_supply: string;
    kyc_key: HederaKey | null;
    max_supply: string;
    memo: string;
    modified_timestamp: string;
    name: string;
    pause_key: HederaKey | null;
    pause_status: string;
    supply_key: HederaKey | null;
    supply_type: string;
    symbol: string;
    token_id: string;
    total_supply: string;
    treasury_account_id: string;
    type: string;
    wipe_key: HederaKey | null;
};

export type NftInfo = {
    account_id: string;
    token_id: string;
    delegating_spender: string | null;
    spender_id: string | null;
    created_timestamp: string;
    deleted: boolean;
    metadata: string;
    modified_timestamp: string;
    serial_number: number;
};

export type NftMetadata = {
    name: string;
    type: string;
    creator: string;
    author: string;
    properties: {[key: string]: unknown};
    image: string;
};

export type TransferDetail = {
    token_id?: string;
    account: string;
    amount: number;
    is_approval: boolean;
};

export type NftTransferDetail = {
    is_approval: boolean;
    receiver_account_id: string | null;
    sender_account_id: string | null;
    serial_number: number;
    token_id: string | null;
};

export type TransactionMirrorDetails = {
    bytes: string | null;
    charged_tx_fee: number;
    consensus_timestamp: string;
    entity_id: string | null;
    max_fee: string;
    memo_base64: string | null;
    name: MirrorNodeTransactionType;
    nft_transfers: NftTransferDetail[];
    node: string | null;
    nonce: number;
    parent_consensus_timestamp: string | null;
    result: string;
    scheduled: boolean;
    staking_reward_transfers: TransferDetail[];
    token_transfers: TransferDetail[];
    transaction_hash: string;
    transaction_id: string;
    transfers: TransferDetail[];
    valid_duration_seconds: string;
    valid_start_timestamp: string;
};

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


export type Trans11actionDetailsResponse = {
    transactions: TransactionMirrorDetails[];
};
