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

    static fromClient(client) {
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

    getAccountBalance(accountId) {
        return new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getAccountInfo(accountId) {
        return new AccountInfoQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getAccountRecords(accountId) {
        return new AccountRecordsQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getTransactionReceipt(transactionId) {
        return new TransactionReceiptQuery()
            .setTransactionId(transactionId)
            .execute(this._client);
    }

    waitForReceipt(response) {
        return new TransactionReceiptQuery()
            .setNodeAccountIds([response.nodeId])
            .setTransactionId(response.transactionId)
            .execute(this._client);
    }

    call(request) {
        return request.execute(this._client);
    }

    close() {
        this._client.close();
    }
}
