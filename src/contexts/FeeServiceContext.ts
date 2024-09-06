import {KnownChains} from "../models/Chain";
import {FeeManualOptions} from "../models/Exchange";
import {TransactionRequest} from "ethers";
import {Transaction} from "@hashgraph/sdk";

export interface IFeeService {
    addBladeFee<T extends Transaction>(
        tx: T,
        chain: KnownChains,
        payerAccount: string,
        manualOptions?: FeeManualOptions
    ): Promise<T>;
    createFeeTransaction<T extends Transaction>(
        chain: KnownChains,
        payerAccount: string,
        manualOptions?: FeeManualOptions
    ): Promise<T | null>;
    createFeeTransaction<T extends TransactionRequest>(
        chain: KnownChains,
        payerAccount: string,
        manualOptions?: FeeManualOptions
    ): Promise<T | null>;
}

export default class FeeServiceContext {
    constructor(private strategy: IFeeService) {}

    async addBladeFee<T>(
        tx: T,
        chain: KnownChains,
        payerAccount: string,
        manualOptions?: FeeManualOptions
    ): Promise<T> {
        return this.strategy.addBladeFee(tx as any, chain, payerAccount, manualOptions) as Promise<T>;
    }

    async createFeeTransaction<R>(
        chain: KnownChains,
        payerAccount: string,
        manualOptions?: FeeManualOptions
    ): Promise<R | null> {
        return this.strategy.createFeeTransaction(chain, payerAccount, manualOptions) as Promise<R | null>;
    }
}
