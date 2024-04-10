export type NftInfo = {
    account_id: string,
    token_id: string,
    delegating_spender?: string,
    spender_id?: string,
    created_timestamp: string,
    deleted: boolean,
    metadata: string,
    modified_timestamp: string,
    serial_number: number,
}

export type NftMetadata = {
    name: string,
    type: string,
    creator: string,
    author: string,
    properties: { [key: string]: unknown },
    image: string,
}
