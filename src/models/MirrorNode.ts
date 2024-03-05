import {MirrorNodeTransactionType} from "./TransactionType";

export type AccountInfoMirrorResponse = APIPagination & {
    accounts: AccountInfo[]
};

export type MirrorNodeListResponse = APIPagination & {
    nodes: NodeInfo[]
};

export type APIPagination = {
    links: {
        next: string|null
    }
}

export type MirrorNodeKey = {
    _type: string,
    key: string
}

export type AccountInfo = {
    account: string,
    alias: string | null,
    auto_renew_period?: number,
    balance: {
        balance: number,
        timestamp: string,
        tokens?: {
            token_id: string,
            balance: number
        }[]
    },
    decline_reward: boolean,
    deleted: boolean,
    ethereum_nonce: number,
    pending_reward: number,
    evm_address: string | null,
    expiry_timestamp: string | null,
    key: MirrorNodeKey,
    max_automatic_token_associations: number,
    memo: string,
    receiver_sig_required: boolean,
    staked_account_id: string | null,
    staked_node_id: number | null,
    stake_period_start: string | null
}

export type NodeInfo = {
    description: string,
    file_id: string,
    max_stake: number,
    memo: string,
    min_stake: number,
    node_id: number,
    node_account_id: string,
    node_cert_hash: string,
    public_key: string,
    reward_rate_start: number,
    service_endpoints: [
        {
            ip_address_v4: string,
            port: number
        }
    ],
    stake: number,
    stake_not_rewarded: number,
    stake_rewarded: number,
    stake_total: number,
    staking_period: {
        from: string,
        to: string
    },
    timestamp: {
        from: string,
        to: null
    }
}

export type TokenInfo = {
    admin_key: MirrorNodeKey,
    auto_renew_account: string,
    auto_renew_period: number,
    created_timestamp: string,
    custom_fees: {
        created_timestamp: string,
        fixed_fees: [],
        fractional_fees: []
    },
    decimals: string,
    deleted: boolean,
    expiry_timestamp: number,
    fee_schedule_key: MirrorNodeKey | null,
    freeze_default: boolean,
    freeze_key: MirrorNodeKey | null,
    initial_supply: string,
    kyc_key: MirrorNodeKey | null,
    max_supply: string,
    memo: string,
    modified_timestamp: string,
    name: string,
    pause_key: MirrorNodeKey | null,
    pause_status: 'NOT_APPLICABLE' | 'UNPAUSED' | 'PAUSED',
    supply_key: MirrorNodeKey,
    supply_type: 'INFINITE' | 'FINITE',
    symbol: string,
    token_id: string,
    total_supply: string,
    treasury_account_id: string,
    type: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE',
    wipe_key: MirrorNodeKey | null
}

export type TransferDetail = {
    token_id?: string,
    account: string,
    amount: number,
    is_approval: boolean
}

export type NftTransferDetail = {
    is_approval: boolean,
    receiver_account_id: string,
    sender_account_id: string,
    serial_number: number,
    token_id: string
}

export type TransactionDetails = {
    bytes: any, // ?
    charged_tx_fee: number,
    consensus_timestamp: string,
    entity_id: any, // ?
    max_fee: string,
    memo_base64: string,
    name: MirrorNodeTransactionType,
    nft_transfers: NftTransferDetail[],
    node: string,
    nonce: number,
    parent_consensus_timestamp: any, // ?
    result: string,
    scheduled: boolean,
    staking_reward_transfers: TransferDetail[],
    token_transfers: TransferDetail[],
    transaction_hash: string,
    transaction_id: string,
    transfers: TransferDetail[],
    valid_duration_seconds: string,
    valid_start_timestamp: string
}

export type TransactionDetailsResponse = {
    transactions: TransactionDetails[]
}