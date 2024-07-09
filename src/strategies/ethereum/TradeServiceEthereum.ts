import {ethers} from "ethers";

import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {ITradeService} from "../TradeServiceContext";
import {IntegrationUrlData, SwapQuotesData} from "../../models/Common";
import {KnownChainIds} from "../../models/Chain";

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

    exchangeGetQuotes(): Promise<SwapQuotesData> {
        throw new Error("Method not implemented.");
    }

    swapTokens(): Promise<{success: boolean}> {
        throw new Error("Method not implemented.");
    }

    getTradeUrl(): Promise<IntegrationUrlData> {
        throw new Error("Method not implemented.");
    }
}
