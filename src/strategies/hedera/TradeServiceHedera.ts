import {Signer} from "@hashgraph/sdk";

import {C14WidgetConfig, IntegrationUrlData, SwapQuotesData} from "../../models/Common";
import {ChainMap, KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {ITradeService} from "../TradeServiceContext";
import {
    CryptoFlowRoutes,
    CryptoFlowServiceStrategy, ICryptoFlowAssets,
    ICryptoFlowAssetsParams, ICryptoFlowQuote,
    ICryptoFlowQuoteParams,
    ICryptoFlowTransaction,
    ICryptoFlowTransactionParams
} from "../../models/CryptoFlow";
import CryptoFlowService from "../../services/CryptoFlowService";

export default class TradeServiceHedera implements ITradeService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;
    private readonly cryptoFlowService: CryptoFlowService;

    constructor(
        chainId: KnownChainIds,
        signer: Signer,
        apiService: ApiService,
        configService: ConfigService,
        cryptoFlowService: CryptoFlowService,
    ) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
        this.cryptoFlowService = cryptoFlowService;
    }

    async getC14url(asset: string, account: string, amount: string): Promise<IntegrationUrlData> {
        let clientId;

        // TODO get dAppCode from config

        // if (this.dAppCode.includes("karate")) {
        //     clientId = "17af1a19-2729-4ecc-8683-324a52eca6fc";
        // } else {
            const {token} = await this.apiService.getC14token();
            clientId = token;
        // }

        const url = new URL("https://pay.c14.money/");
        const purchaseParams: C14WidgetConfig = {
            clientId
        };

        switch (asset.toUpperCase()) {
            case "USDC": {
                purchaseParams.targetAssetId = "b0694345-1eb4-4bc4-b340-f389a58ee4f3";
                purchaseParams.targetAssetIdLock = true;
            } break;
            case "HBAR": {
                purchaseParams.targetAssetId = "d9b45743-e712-4088-8a31-65ee6f371022";
                purchaseParams.targetAssetIdLock = true;
            } break;
            case "KARATE": {
                purchaseParams.targetAssetId = "057d6b35-1af5-4827-bee2-c12842faa49e";
                purchaseParams.targetAssetIdLock = true;
            } break;
            default: {
                // check if asset is an uuid
                if (asset.split("-").length === 5) {
                    purchaseParams.targetAssetId = asset;
                    purchaseParams.targetAssetIdLock = true;
                }
            } break;
        }
        if (amount) {
            purchaseParams.sourceAmount = amount;
            purchaseParams.quoteAmountLock = true;
        }
        if (account) {
            purchaseParams.targetAddress = account;
            purchaseParams.targetAddressLock = true;
        }

        url.search = new URLSearchParams(purchaseParams as Record<keyof C14WidgetConfig, any>).toString();
        return {url: url.toString()};
    }

    async exchangeGetQuotes(sourceCode: string, sourceAmount: number, targetCode: string, strategy: CryptoFlowServiceStrategy):Promise<SwapQuotesData> {
        const useTestnet = ChainMap[this.chainId].isTestnet;
        const params: ICryptoFlowAssetsParams | ICryptoFlowQuoteParams | ICryptoFlowTransactionParams | any = {
            sourceCode,
            sourceAmount,
            targetCode,
            useTestnet,
        }

        switch (strategy.toLowerCase()) {
            case CryptoFlowServiceStrategy.BUY.toLowerCase(): {
                params.targetChainId = this.chainId;
                break;
            }
            case CryptoFlowServiceStrategy.SELL.toLowerCase(): {
                params.sourceChainId = this.chainId;
                const assets = await this.apiService.getCryptoFlowData(
                    CryptoFlowRoutes.ASSETS,
                    params,
                    strategy
                ) as ICryptoFlowAssets;

                if (assets?.limits?.rates && assets.limits.rates.length > 0) {
                    params.targetAmount = assets.limits.rates[0] * sourceAmount;
                }
                break;
            }
            case CryptoFlowServiceStrategy.SWAP.toLowerCase(): {
                params.sourceChainId = this.chainId;
                params.targetChainId = this.chainId;
                break;

            }
        }

        const quotes = await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.QUOTES,
            params,
            strategy
        ) as ICryptoFlowQuote[];
        return {quotes};
    }

    async swapTokens(accountAddress: string, sourceCode: string, sourceAmount: number, targetCode: string, slippage: number, serviceId: string): Promise<{success: boolean}> {
        const useTestnet = ChainMap[this.chainId].isTestnet;
        const quotes = await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.QUOTES,
            {
                sourceCode,
                sourceChainId: this.chainId,
                sourceAmount,
                targetCode,
                targetChainId: this.chainId,
                useTestnet,
            },
            CryptoFlowServiceStrategy.SWAP
        ) as ICryptoFlowQuote[];
        const selectedQuote = quotes.find((quote) => quote.service.id === serviceId);
        if (!selectedQuote) {
            throw new Error("Quote not found");
        }

        const txData: ICryptoFlowTransaction = await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.TRANSACTION,
            {
                serviceId,
                sourceCode,
                sourceChainId: this.chainId,
                sourceAddress: selectedQuote.source.asset.address,
                sourceAmount,
                targetCode,
                targetChainId: this.chainId,
                targetAddress: selectedQuote.target.asset.address,
                walletAddress: accountAddress,
                slippage,
                useTestnet
            }
        ) as ICryptoFlowTransaction;

        if (await this.cryptoFlowService.validateMessage(txData)) {
            await this.cryptoFlowService.executeAllowanceApprove(selectedQuote, accountAddress, this.chainId, this.signer!, true);
            try {
                await this.cryptoFlowService.executeHederaSwapTx(txData.calldata, this.signer!);
            } catch (e) {
                await this.cryptoFlowService.executeAllowanceApprove(selectedQuote, accountAddress, this.chainId, this.signer!, false);
                throw e
            }
            await this.cryptoFlowService.executeHederaBladeFeeTx(selectedQuote, accountAddress, this.chainId, this.signer!);
        } else {
            throw new Error("Invalid signature of txData");
        }
        return {success: true};
    }

    async getTradeUrl(strategy: CryptoFlowServiceStrategy, accountId: string, sourceCode: string, sourceAmount: number, targetCode: string, slippage: number, serviceId: string): Promise<IntegrationUrlData> {
        const useTestnet = ChainMap[this.chainId].isTestnet;

        const params: ICryptoFlowAssetsParams | ICryptoFlowQuoteParams | ICryptoFlowTransactionParams | any = {
            sourceCode,
            sourceAmount,
            targetCode,
            useTestnet,
            walletAddress: accountId,
            slippage
        }

        switch (strategy.toLowerCase()) {
            case CryptoFlowServiceStrategy.BUY.toLowerCase(): {
                params.targetChainId = this.chainId;
                break;
            }
            case CryptoFlowServiceStrategy.SELL.toLowerCase(): {
                params.sourceChainId = this.chainId;
                const assets = await this.apiService.getCryptoFlowData(
                    CryptoFlowRoutes.ASSETS,
                    params,
                    strategy
                ) as ICryptoFlowAssets;

                if (assets?.limits?.rates && assets.limits.rates.length > 0) {
                    params.targetAmount = assets.limits.rates[0] * sourceAmount;
                }
                break;
            }
        }

        const quotes = await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.QUOTES,
            params,
            strategy
        ) as ICryptoFlowQuote[];
        const selectedQuote = quotes.find((quote) => quote.service.id === serviceId);
        if (!selectedQuote) {
            throw new Error("Quote not found");
        }

        return {url: selectedQuote.widgetUrl || ""};
    }
}
