export type AccountInfoMirrorResponse = APIPagination & {
    accounts: AccountInfo[]
};

export type APIPagination = {
    links: {
        next: string|null
    }
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
    key: { _type: string, key: string },
    max_automatic_token_associations: number,
    memo: string,
    receiver_sig_required: boolean,
    staked_account_id: string | null,
    staked_node_id: number | null,
    stake_period_start: string | null
}
