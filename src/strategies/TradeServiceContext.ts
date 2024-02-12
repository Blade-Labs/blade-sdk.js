import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {Signer} from "@hashgraph/sdk"
import {
    ChainType, IntegrationUrlData, SwapQuotesData
} from "../models/Common";
import TradeServiceHedera from "./hedera/TradeServiceHedera";
import TradeServiceEthereum from "./ethereum/TradeServiceEthereum";
import { ethers } from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";
import {CryptoFlowServiceStrategy} from "../models/CryptoFlow";
import CryptoFlowService from "../services/CryptoFlowService";

export interface ITradeService {
    getC14url(asset: string, account: string, amount: string): Promise<IntegrationUrlData>
    exchangeGetQuotes(sourceCode: string, sourceAmount: number, targetCode: string, strategy: CryptoFlowServiceStrategy):Promise<SwapQuotesData>
    swapTokens(accountAddress: string, sourceCode: string, sourceAmount: number, targetCode: string, slippage: number, serviceId: string): Promise<{success: boolean}>
    getTradeUrl(strategy: CryptoFlowServiceStrategy, accountId: string, sourceCode: string, sourceAmount: number, targetCode: string, slippage: number, serviceId: string): Promise<IntegrationUrlData>
}

@injectable()
export default class TradeServiceContext implements ITradeService {
    private chainType: ChainType | null = null;
    private signer: Signer | ethers.Signer | null = null
    private strategy: ITradeService | null = null;

    constructor(
        @inject('apiService') private readonly apiService: ApiService,
        @inject('configService') private readonly configService: ConfigService,
        @inject('cryptoFlowService') private readonly cryptoFlowService: CryptoFlowService,
    ) {}

    init(chainType: ChainType, network: Network, signer: Signer | ethers.Signer) {
        this.chainType = chainType;
        this.signer = signer;

        switch (chainType) {
            case ChainType.Hedera:
                this.strategy = new TradeServiceHedera(network, signer as Signer, this.apiService, this.configService, this.cryptoFlowService);
                break;
            case ChainType.Ethereum:
                this.strategy = new TradeServiceEthereum(network, signer as ethers.Signer, this.apiService, this.configService);
                break;
            default:
                throw new Error("Unsupported chain type");
        }
    }

    getC14url(asset: string, account: string, amount: string): Promise<IntegrationUrlData> {
        this.checkInit();
        return this.strategy!.getC14url(asset, account, amount);
    }

    exchangeGetQuotes(sourceCode: string, sourceAmount: number, targetCode: string, strategy: CryptoFlowServiceStrategy):Promise<SwapQuotesData> {
        this.checkInit();
        return this.strategy!.exchangeGetQuotes(sourceCode, sourceAmount, targetCode, strategy);
    }

    swapTokens(accountAddress: string, sourceCode: string, sourceAmount: number, targetCode: string, slippage: number, serviceId: string): Promise<{success: boolean}> {
        this.checkInit();
        return this.strategy!.swapTokens(accountAddress, sourceCode, sourceAmount, targetCode, slippage, serviceId);
    }

    getTradeUrl(strategy: CryptoFlowServiceStrategy, accountId: string, sourceCode: string, sourceAmount: number, targetCode: string, slippage: number, serviceId: string): Promise<IntegrationUrlData> {
        this.checkInit();
        return this.strategy!.getTradeUrl(strategy, accountId, sourceCode, sourceAmount, targetCode, slippage, serviceId);
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("TokenService not initialized");
        }
    }
}
