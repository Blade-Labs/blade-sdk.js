import type {TransactionResponse} from "@ethersproject/abstract-provider";
import {ethers} from "ethers"
import {ITokenService, TransferInitData} from "../ITokenService";

export default class TransferServiceEthereum implements ITokenService {
    private readonly signer: ethers.Signer;

    constructor(signer: ethers.Signer) {
        this.signer = signer;
    }

    async transferBalance({from, to, amount}: TransferInitData): Promise<TransactionResponse> {
        const transaction = {
            from,
            to,
            value: ethers.utils.parseUnits(amount, 'ether')
        }
        return this.signer.sendTransaction(transaction);
    }
}
