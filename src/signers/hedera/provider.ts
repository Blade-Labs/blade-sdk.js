import {
    AccountBalance,
    AccountBalanceQuery,
    AccountId,
    AccountInfo,
    AccountInfoQuery,
    AccountRecordsQuery,
    Client,
    Executable,
    Provider,
    TransactionId,
    TransactionReceipt,
    TransactionReceiptQuery,
    TransactionRecord,
    TransactionResponse
} from "@hashgraph/sdk";

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
        return new HederaProvider({client});
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

    getAccountBalance(accountId: string | AccountId): Promise<AccountBalance> {
        return new AccountBalanceQuery().setAccountId(accountId).execute(this._client);
    }

    getAccountInfo(accountId: string | AccountId): Promise<AccountInfo> {
        return new AccountInfoQuery().setAccountId(accountId).execute(this._client);
    }

    getAccountRecords(accountId: string | AccountId): Promise<TransactionRecord[]> {
        return new AccountRecordsQuery().setAccountId(accountId).execute(this._client);
    }

    getTransactionReceipt(transactionId: string | TransactionId): Promise<TransactionReceipt> {
        return new TransactionReceiptQuery().setTransactionId(transactionId).execute(this._client);
    }

    waitForReceipt(response: TransactionResponse): Promise<TransactionReceipt> {
        return new TransactionReceiptQuery()
            .setNodeAccountIds([response.nodeId])
            .setTransactionId(response.transactionId)
            .execute(this._client);
    }

    call<RequestT, ResponseT, OutputT>(request: Executable<RequestT, ResponseT, OutputT>): Promise<OutputT> {
        return request.execute(this._client);
    }

    close() {
        this._client.close();
    }
}
