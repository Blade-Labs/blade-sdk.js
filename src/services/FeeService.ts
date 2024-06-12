import {injectable, inject} from "inversify";
import "reflect-metadata";

import {Network} from "../models/Networks";
import {AccountId, Hbar, ScheduleCreateTransaction, Transaction, TransferTransaction} from "@hashgraph/sdk";
import {FeeManualOptions, FeeType} from "../models/CryptoFlow";
import {ChainMap, KnownChainIds} from "../models/Chain";
import BigNumber from "bignumber.js";
import ConfigService from "./ConfigService";
import {DAppConfig, FeeConfig} from "../models/Common";

export const HbarTokenId = "0.0.0";

type FeatureFeeConfig = {
    collector: string;
    min: number;
    amount: number; // Percentage value
    max: number;
    limitsCurrency: string;
};

export type RateData = {
    hbarPrice: BigNumber;
    usdPrice: BigNumber;
    decimals: number;
};

type APIRateData = {
    decimals: number;
    icon: string | null;
    id: string;
    name: string;
    price: string;
    priceUsd: number;
    symbol: string;
    dueDiligenceComplete: boolean;
    isFeeOnTransferToken: boolean;
    description: string | null;
    website: string | null;
    twitterHandle: string | null;
    timestampSecondsLastListingChange: number;
};

@injectable()
export default class FeeService {
    private cryptoExchangeRates: Record<Network, Record<string, RateData>> = {
        [Network.Mainnet]: {},
        [Network.Testnet]: {}
    };

    constructor(@inject("configService") private readonly configService: ConfigService) {}

    async createFeeTransaction(
        chainId: KnownChainIds,
        payerAccount: AccountId | string,
        manualOptions: FeeManualOptions
    ): Promise<TransferTransaction | null> {
        const tx = new TransferTransaction();
        const txWithFee = await this.addBladeFee<TransferTransaction>(tx, chainId, payerAccount, manualOptions);
        return txWithFee.hbarTransfers.size > 0 ? txWithFee : null;
    }

    async addBladeFee<T extends Transaction>(
        tx: T,
        chainId: KnownChainIds,
        payerAccount: AccountId | string,
        manualOptions: FeeManualOptions
    ): Promise<T> {
        try {
            if (tx.isFrozen()) {
                return tx;
            }

            const network = ChainMap[chainId].isTestnet ? Network.Testnet : Network.Mainnet;
            const feature: FeeType = manualOptions.type; // || detectFeeType(tx);
            const feesConfig = (this.configService.getConfig("fees") as Promise<DAppConfig["fees"]>)
            const featureConfig = feesConfig[feature];
            const feeAmount = await this.calculateFeeAmount(tx, network, featureConfig, manualOptions);
            this.modifyTransactionWithFee(tx, payerAccount, featureConfig.collector, feeAmount);

            return tx;
        } catch (e) {
            return tx;
        }
    }

    private async calculateFeeAmount(
        tx: Transaction,
        network: Network,
        config: FeatureFeeConfig,
        manualOptions: FeeManualOptions
    ): Promise<Hbar> {
        let spentAmount: BigNumber = BigNumber(0);
        let rate = BigNumber(1);
        let decimals = 8;
        if (manualOptions.amountTokenId !== HbarTokenId) {
            rate = await this.getHBARRateByTokenId(network, manualOptions.amountTokenId!);
            decimals = await this.getDecimalsForTokenId(network, manualOptions.amountTokenId!);
        }
        spentAmount = BigNumber(manualOptions.amount).shiftedBy(decimals).multipliedBy(rate);
        const feeAmount = spentAmount.multipliedBy(config.amount / 100);
        return this.applyLimits(feeAmount, network, config);
    }

    private modifyTransactionWithFee(
        tx: Transaction,
        payerAccount: AccountId | string,
        collectorAccount: AccountId | string,
        amount: Hbar
    ): void {
        if (amount.toBigNumber().eq(0) || amount.toBigNumber().lt(0)) {
            return;
        }

        if (tx instanceof ScheduleCreateTransaction) {
            const schedule = tx;
            // @ts-expect-error need to access private variable
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const scheduledTransaction = schedule._scheduledTransaction;
            if (scheduledTransaction instanceof TransferTransaction) {
                scheduledTransaction.addHbarTransfer(collectorAccount, amount);
                scheduledTransaction.addHbarTransfer(payerAccount, amount.negated());
            }
        } else if (tx instanceof TransferTransaction) {
            tx.addHbarTransfer(collectorAccount, amount);
            tx.addHbarTransfer(payerAccount, amount.negated());
        }
    }

    private async applyLimits(amount: BigNumber, network: Network, config: FeatureFeeConfig): Promise<Hbar> {
        const minInTinyHbars = await this.convertAmountToTinyBarsByCurrencyType(
            network,
            config.min,
            config.limitsCurrency
        );
        const maxInTinyHbars = await this.convertAmountToTinyBarsByCurrencyType(
            network,
            config.max,
            config.limitsCurrency
        );
        const limitedAmount = BigNumber.min(BigNumber.max(minInTinyHbars, amount), maxInTinyHbars);

        if (!limitedAmount.isFinite()) {
            return Hbar.fromTinybars(0);
        }

        return Hbar.fromTinybars(limitedAmount.toFixed(0, BigNumber.ROUND_CEIL));
    }

    private async convertAmountToTinyBarsByCurrencyType(
        network: Network,
        amount: number,
        type: string = "tinyhbar"
    ): Promise<BigNumber> {
        let rate = BigNumber(1);
        let decimalMultiplier = 8;

        switch (type) {
            case "usd": {
                rate = BigNumber(1).div(await this.getUSDRateForHBAR(network));
                break;
            }
            case "tinyhbar": {
                decimalMultiplier = 0;
                break;
            }
            case "hbar": {
                break;
            }
            default: {
                decimalMultiplier = await this.getDecimalsForTokenId(network, type);
                rate = await this.getHBARRateByTokenId(network, type);
            }
        }

        return BigNumber(amount).multipliedBy(rate).shiftedBy(decimalMultiplier);
    }

    private async getHBARRateByTokenId(network: Network, tokenId: string): Promise<BigNumber> {
        if (
            !this.cryptoExchangeRates ||
            !this.cryptoExchangeRates[network] ||
            !this.cryptoExchangeRates[network][tokenId]
        ) {
            await this.loadRatesPerNetwork(network);
        }
        return this.cryptoExchangeRates[network][tokenId]?.hbarPrice || BigNumber(0);
    }

    private async loadRatesPerNetwork(network: Network): Promise<void> {
        const apiRates = await this.fetchRates(network);
        this.cryptoExchangeRates[network] = apiRates.reduce((rates, rate) => {
            rates[rate.id] = {
                hbarPrice: BigNumber(rate.price).shiftedBy(-rate.decimals),
                usdPrice: BigNumber(rate.priceUsd),
                decimals: rate.decimals
            };
            return rates;
        }, {} as Record<string, RateData>);
    }

    private async fetchRates(network: Network): Promise<APIRateData[]> {
        const saucerswapApi: {[key in Network]: string} = JSON.parse(
            await this.configService.getConfig("saucerswapApi")
        );
        const url = `${saucerswapApi[network]}tokens`;
        return fetch(url)
            .then(result => result.json())
            .catch(() => []) as Promise<APIRateData[]>;
    }

    private async getDecimalsForTokenId(network: Network, tokenId: string): Promise<number> {
        if (
            !this.cryptoExchangeRates ||
            !this.cryptoExchangeRates[network] ||
            !this.cryptoExchangeRates[network][tokenId]
        ) {
            await this.loadRatesPerNetwork(network);
        }
        return this.cryptoExchangeRates[network][tokenId]?.decimals || 0;
    }

    private async getUSDRateForHBAR(network: Network): Promise<BigNumber | string> {
        const wrapHbar = JSON.parse(await this.configService.getConfig("swapWrapHbar"));
        const tokenId = wrapHbar[network][0];

        if (
            !this.cryptoExchangeRates ||
            !this.cryptoExchangeRates[network] ||
            !this.cryptoExchangeRates[network][tokenId]
        ) {
            await this.loadRatesPerNetwork(network);
        }

        return this.cryptoExchangeRates[network][tokenId]?.usdPrice || BigNumber(0);
    }
}
