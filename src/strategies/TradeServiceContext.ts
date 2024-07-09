import {injectable, inject} from "inversify";
import "reflect-metadata";

import {Signer} from "@hashgraph/sdk";
import {IntegrationUrlData, SwapQuotesData} from "../models/Common";
import {ChainMap, ChainServiceStrategy, KnownChainIds} from "../models/Chain";
import TradeServiceHedera from "./hedera/TradeServiceHedera";
import TradeServiceEthereum from "./ethereum/TradeServiceEthereum";
import {ethers} from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {CryptoFlowServiceStrategy} from "../models/CryptoFlow";
import CryptoFlowService from "../services/CryptoFlowService";

export interface ITradeService {
    exchangeGetQuotes(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: CryptoFlowServiceStrategy
    ): Promise<SwapQuotesData>;
    swapTokens(
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string
    ): Promise<{success: boolean}>;
    getTradeUrl(
        strategy: CryptoFlowServiceStrategy,
        accountId: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string,
        redirectUrl: string,
    ): Promise<IntegrationUrlData>;
}

@injectable()
export default class TradeServiceContext implements ITradeService {
    private chainId: KnownChainIds | null = null;
    private signer: Signer | ethers.Signer | null = null;
    private strategy: ITradeService | null = null;

    constructor(
        @inject("apiService") private readonly apiService: ApiService,
        @inject("configService") private readonly configService: ConfigService,
        @inject("cryptoFlowService") private readonly cryptoFlowService: CryptoFlowService
    ) {}

    init(chainId: KnownChainIds, signer: Signer | ethers.Signer | null) {
        this.chainId = chainId;
        this.signer = signer;

        switch (ChainMap[this.chainId].serviceStrategy) {
            case ChainServiceStrategy.Hedera:
                this.strategy = new TradeServiceHedera(
                    chainId,
                    signer as Signer,
                    this.apiService,
                    this.configService,
                    this.cryptoFlowService
                );
                break;
            case ChainServiceStrategy.Ethereum:
                this.strategy = new TradeServiceEthereum(
                    chainId,
                    signer as ethers.Signer,
                    this.apiService,
                    this.configService
                );
                break;
            default:
                throw new Error(`Unsupported chain id: ${this.chainId}`);
        }
    }

    exchangeGetQuotes(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: CryptoFlowServiceStrategy
    ): Promise<SwapQuotesData> {
        this.checkInit();
        return this.strategy!.exchangeGetQuotes(sourceCode, sourceAmount, targetCode, strategy);
    }

    swapTokens(
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string
    ): Promise<{success: boolean}> {
        this.checkSigner();
        return this.strategy!.swapTokens(accountAddress, sourceCode, sourceAmount, targetCode, slippage, serviceId);
    }

    getTradeUrl(
        strategy: CryptoFlowServiceStrategy,
        accountId: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string,
        redirectUrl: string,
    ): Promise<IntegrationUrlData> {
        this.checkInit();
        return this.strategy!.getTradeUrl(
            strategy,
            accountId,
            sourceCode,
            sourceAmount,
            targetCode,
            slippage,
            serviceId,
            redirectUrl
        );
    }

    private checkInit() {
        // check if strategy is initialized. Useful for getBalance() for example
        if (!this.strategy) {
            throw new Error("TradeService not initialized");
        }
    }

    private checkSigner() {
        // next step. Signer required for transaction signing (transfer, mint, etc)
        if (!this.signer) {
            throw new Error("TradeService not initialized (no signer, call setUser() first)");
        }
    }
}
