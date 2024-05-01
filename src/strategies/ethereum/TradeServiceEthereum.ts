import { ethers } from "ethers";

import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import { ITradeService } from "../TradeServiceContext";
import { IntegrationUrlData, SwapQuotesData } from "../../models/Common";
import { CryptoFlowServiceStrategy } from "../../models/CryptoFlow";
import { KnownChainIds } from "../../models/Chain";

export default class TradeServiceEthereum implements ITradeService {
    private readonly chainId: KnownChainIds;
    private readonly signer: ethers.Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chainId: KnownChainIds, signer: ethers.Signer, apiService: ApiService, configService: ConfigService) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async getC14url(asset: string, account: string, amount: string): Promise<IntegrationUrlData> {
        throw new Error("Method not implemented.");
    }

    async exchangeGetQuotes(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: CryptoFlowServiceStrategy
    ): Promise<SwapQuotesData> {
        throw new Error("Method not implemented.");
    }

    async swapTokens(
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: number,
        serviceId: string
    ): Promise<{ success: boolean }> {
        throw new Error("Method not implemented.");
    }

    async getTradeUrl(
        strategy: CryptoFlowServiceStrategy,
        accountId: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: number,
        serviceId: string
    ): Promise<IntegrationUrlData> {
        throw new Error("Method not implemented.");
    }
}
