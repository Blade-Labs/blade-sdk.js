import {
    Signer,
    TransactionResponse as TransactionResponseHedera,
    Hbar, HbarUnit, TransferTransaction, Transaction
} from "@hashgraph/sdk";
import {Buffer} from "buffer";

import {ITokenService, TransferInitData, TransferTokenInitData} from "../ITokenService";
import {BalanceData, TransactionResponseData} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {Network} from "../../models/Networks";

export default class TokenServiceHedera implements ITokenService {
    private readonly network: Network;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        network: Network,
        signer: Signer,
        apiService: ApiService,
        configService: ConfigService,
    ) {
        this.network = network;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async getBalance(address: string): Promise<BalanceData> {
        const [account, tokenBalances] = await Promise.all([
            this.apiService.getAccountInfo(this.network, address),
            this.apiService.getAccountTokens(this.network, address)
        ]);

        return {
            balance: (account.balance.balance / 10 ** 8).toString(),
            rawBalance: account.balance.balance.toString(),
            decimals: 8,
            tokens: tokenBalances
        }
    }

    async transferBalance({from, to, amount, memo}: TransferInitData): Promise<TransactionResponseData> {
        const txAmount = Hbar.fromString(amount, HbarUnit.Hbar);
        return new TransferTransaction()
            .addHbarTransfer(from, txAmount.negated())
            .addHbarTransfer(to, txAmount)
            .setTransactionMemo(memo || "")
            .freezeWithSigner(this.signer)
            .then(tx => tx.signWithSigner(this.signer))
            .then(tx => tx.executeWithSigner(this.signer))
            .then((response: TransactionResponseHedera) => {
                return {
                    transactionId: response.transactionId.toString(),
                    transactionHash: response.transactionHash.toString(),
                }
            });
    }

    async transferToken({amountOrSerial, from, to, tokenAddress, memo, freeTransfer}: TransferTokenInitData): Promise<TransactionResponseData> {
        const meta = await this.apiService.requestTokenInfo(this.network, tokenAddress);
        let isNFT = false;
        if (meta.type === "NON_FUNGIBLE_UNIQUE") {
            isNFT = true;
            if (freeTransfer) {
                throw new Error("NFT free transfer is not supported");
            }
        }
        const correctedAmount = parseFloat(amountOrSerial) * (10 ** parseInt(meta.decimals, 10));

        if (freeTransfer) {
            const options = {
                receiverAccountId: to,
                senderAccountId: from,
                amount: correctedAmount,
                decimals: null,
                memo
                // no tokenId, backend pick first token from list for currend dApp
            };

            const {transactionBytes} = await this.apiService.transferTokens(this.network, options);
            const buffer = Buffer.from(transactionBytes, "base64");
            const transaction = Transaction.fromBytes(buffer);

            return transaction
                .freezeWithSigner(this.signer!)
                .then(tx => tx.signWithSigner(this.signer!))
                .then(tx => tx.executeWithSigner(this.signer!))
                .then(data => {
                    return {
                        transactionId: data.transactionId.toString(),
                        transactionHash: data.transactionHash.toString(),
                    }
                });
        } else {
            const tokenTransferTx = new TransferTransaction()
                .setTransactionMemo(memo || "");

            if (isNFT) {
                tokenTransferTx
                    .addNftTransfer(tokenAddress, parseInt(amountOrSerial, 10), from, to);
            } else {
                tokenTransferTx
                    .addTokenTransfer(tokenAddress, to, correctedAmount)
                    .addTokenTransfer(tokenAddress, from, -1 * correctedAmount);
            }

            // TODO add fees if needed
            // tx = await this.feesService.addBladeFee(tx, chain, address);

            return tokenTransferTx
                .freezeWithSigner(this.signer!)
                .then(tx => tx.signWithSigner(this.signer!))
                .then(tx => tx.executeWithSigner(this.signer!))
                .then(data => {
                    return {
                        transactionId: data.transactionId.toString(),
                        transactionHash: data.transactionHash.toString(),
                    }
                });
        }
    }
}
