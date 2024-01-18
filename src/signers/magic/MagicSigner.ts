import {
    AccountId,
    SignerSignature,
    AccountBalanceQuery,
    AccountInfoQuery,
    AccountRecordsQuery,
    TransactionId,
    PublicKey,
    Signer,
} from "@hashgraph/sdk";
import { shuffle } from '@magic-ext/hedera'
import {MagicProvider} from "./MagicProvider";

export class MagicSigner implements Signer {
    private readonly publicKey: PublicKey;
    private readonly signer: (message: Uint8Array) => Promise<any>;
    private readonly provider: MagicProvider;
    private readonly accountId: AccountId;

    constructor(accountId: AccountId | string, network: string, publicKey: string, magicSign: (Uint8Array) => Promise<Uint8Array>) {
        this.publicKey = PublicKey.fromString(publicKey);
        this.signer = magicSign;
        this.provider = new MagicProvider(network);
        this.accountId = typeof accountId === 'string' ? AccountId.fromString(accountId) : accountId;
    }

    getProvider() {
        return this.provider;
    }

    getAccountId() {
        return this.accountId;
    }

    getAccountKey() {
        return this.publicKey;
    }

    getLedgerId() {
        return this.provider == null ? null : this.provider.getLedgerId();
    }

    getNetwork() {
        return this.provider == null ? {} : this.provider.getNetwork();
    }

    getMirrorNetwork() {
        return this.provider == null ? [] : this.provider.getMirrorNetwork();
    }

    async sign(messages) {
        const sigantures = [];

        for (const message of messages) {
            sigantures.push(
                new SignerSignature({
                    publicKey: this.publicKey,
                    signature: await this.signer(message),
                    accountId: this.accountId,
                })
            );
        }

        return sigantures;
    }

    getAccountBalance() {
        return this.call(
            new AccountBalanceQuery().setAccountId(this.accountId)
        );
    }

    getAccountInfo() {
        return this.call(new AccountInfoQuery().setAccountId(this.accountId));
    }

    getAccountRecords() {
        return this.call(
            new AccountRecordsQuery().setAccountId(this.accountId)
        );
    }

    signTransaction(transaction) {
        return transaction.signWith(this.publicKey, this.signer);
    }

    checkTransaction(transaction) {
        const transactionId = transaction.transactionId;
        if (
            transactionId != null &&
            transactionId.accountId != null &&
            transactionId.accountId.compare(this.accountId) !== 0
        ) {
            throw new Error(
                "transaction's ID constructed with a different account ID"
            );
        }

        if (this.provider == null) {
            return Promise.resolve(transaction);
        }

        const nodeAccountIds = (
            transaction.nodeAccountIds != null ? transaction.nodeAccountIds : []
        ).map((nodeAccountId) => nodeAccountId.toString());
        const network = Object.values(this.provider.getNetwork()).map(
            (nodeAccountId) => nodeAccountId.toString()
        );

        if (
            !nodeAccountIds.reduce(
                (previous, current) => previous && network.includes(current),
                true
            )
        ) {
            throw new Error(
                "Transaction already set node account IDs to values not within the current network"
            );
        }

        return Promise.resolve(transaction);
    }

    populateTransaction(transaction) {
        transaction._freezeWithAccountId(this.accountId);

        if (transaction.transactionId == null) {
            transaction.setTransactionId(
                TransactionId.generate(this.accountId)
            );
        }

        if (
            transaction.nodeAccountIds != null &&
            transaction.nodeAccountIds.length !== 0
        ) {
            return Promise.resolve(transaction.freeze());
        }

        if (this.provider == null) {
            return Promise.resolve(transaction);
        }

        const nodeAccountIds = Object.values(this.provider.getNetwork()).map(
            (id) => (typeof id === "string" ? AccountId.fromString(id) : id)
        );
        shuffle(nodeAccountIds);
        transaction.setNodeAccountIds(
            nodeAccountIds.slice(0, (nodeAccountIds.length + 3 - 1) / 3)
        );

        return Promise.resolve(transaction.freeze());
    }

    call(request) {
        if (this.provider == null) {
            throw new Error(
                "cannot send request with an wallet that doesn't contain a provider"
            );
        }

        return this.provider.call(
            request._setOperatorWith(
                this.accountId,
                this.publicKey,
                this.signer
            )
        );
    }
}