import {AccountBalanceQuery, AccountInfoQuery, AccountRecordsQuery, Client, Provider, TransactionReceiptQuery } from "@hashgraph/sdk";

export default class HederaProvider implements Provider {
    private readonly _client: Client;

    constructor(props: {client: Client}) {
        if (props != null && props.client != null) {
            this._client = props.client;
            return;
        }
        throw new Error("HederaProvider requires client to be set");
    }

    static fromClient(client: Client) {
        return new HederaProvider({ client });
    }

    getLedgerId() {
        return this._client.ledgerId;
    }

    getNetwork() {
        return this._client.network;
    }

    getMirrorNetwork() {
        return this._client.mirrorNetwork;
    }

    getAccountBalance(accountId: any) {
        return new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getAccountInfo(accountId: any) {
        return new AccountInfoQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getAccountRecords(accountId: any) {
        return new AccountRecordsQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getTransactionReceipt(transactionId: any) {
        return new TransactionReceiptQuery()
            .setTransactionId(transactionId)
            .execute(this._client);
    }

    waitForReceipt(response: any) {
        return new TransactionReceiptQuery()
            .setNodeAccountIds([response.nodeId])
            .setTransactionId(response.transactionId)
            .execute(this._client);
    }

    call(request: any) {
        return request.execute(this._client);
    }

    close() {
        this._client.close();
    }
}
