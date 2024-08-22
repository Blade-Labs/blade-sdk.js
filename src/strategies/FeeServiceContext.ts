import {inject, injectable} from "inversify";
import "reflect-metadata";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {ChainMap, ChainServiceStrategy, KnownChains} from "../models/Chain";
import FeeServiceHedera from "./hedera/FeeServiceHedera";
import FeeServiceEthereum from "./ethereum/FeeServiceEthereum";
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

@injectable()
export default class FeeServiceContext {
    private strategy: IFeeService | null = null;
    private chain: KnownChains = KnownChains.HEDERA_TESTNET;

    constructor(
        @inject("apiService") private readonly apiService: ApiService,
        @inject("configService") private readonly configService: ConfigService
    ) {}

    init(chain: KnownChains) {
        this.chain = chain;

        switch (ChainMap[this.chain].serviceStrategy as ChainServiceStrategy) {
            case ChainServiceStrategy.Hedera:
                this.strategy = new FeeServiceHedera(
                    chain,
                    this.apiService,
                    this.configService
                );
                break;
            case ChainServiceStrategy.Ethereum:
                this.strategy = new FeeServiceEthereum(
                    chain,
                    this.apiService,
                    this.configService
                );
                break;
            default:
                throw new Error(`Unsupported chain id: ${this.chain}`);
        }
    }

    async addBladeFee<T>(
        tx: T,
        chain: KnownChains,
        payerAccount: string,
        manualOptions?: FeeManualOptions
    ): Promise<T> {
        this.checkInit();
        return this.strategy!.addBladeFee(tx as any, chain, payerAccount, manualOptions) as Promise<T>;
    }

    async createFeeTransaction<R>(
        chain: KnownChains,
        payerAccount: string,
        manualOptions?: FeeManualOptions
    ): Promise<R | null> {
        this.checkInit();
        return this.strategy!.createFeeTransaction(chain, payerAccount, manualOptions) as Promise<R | null>;
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("FeeServiceContext not initialized (no signer, call setUser() first)");
        }
    }
}
