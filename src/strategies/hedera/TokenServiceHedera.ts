import {
    TransactionResponse as TransactionResponseHedera,
    Hbar, HbarUnit, TransferTransaction
} from "@hashgraph/sdk";
import {Signer} from "@hashgraph/sdk"
import {ITokenService, TransferInitData} from "../ITokenService";

export default class TransferServiceHedera implements ITokenService {
    private readonly signer: Signer;

    constructor(signer: Signer) {
        this.signer = signer;
    }

    async transferBalance({from, to, amount, memo}: TransferInitData): Promise<TransactionResponseHedera> {
        const txAmount = Hbar.fromString(amount, HbarUnit.Hbar);
        return new TransferTransaction()
            .addHbarTransfer(from, txAmount.negated())
            .addHbarTransfer(to, txAmount)
            .setTransactionMemo(memo)
            .freezeWithSigner(this.signer)
            .then(tx => tx.signWithSigner(this.signer))
            .then(tx => tx.executeWithSigner(this.signer));
    }
}
