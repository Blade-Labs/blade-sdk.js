import {Network} from "../models/Networks";
import {AccountId, Hbar, ScheduleCreateTransaction, Transaction, TransferTransaction} from "@hashgraph/sdk";
import {FeeManualOptions, FeeType} from "../models/CryptoFlow";
import BigNumber from "bignumber.js";
import Long from "long";
import {getConfig} from "./ConfigService";

type FeatureFeeConfig = {
    collector: string,
    min: number,
    amount: number, // Percentage value
    max: number,
    limitsCurrency: string
}

export type RateData = {
    hbarPrice: BigNumber;
    usdPrice: BigNumber;
    decimals: number;
}

type APIRateData = {
    decimals: number,
    icon: string | null,
    id: string,
    name: string,
    price: string,
    priceUsd: number,
    symbol: string,
    dueDiligenceComplete: boolean,
    isFeeOnTransferToken: boolean,
    description: string | null,
    website: string | null,
    twitterHandle: string | null,
    timestampSecondsLastListingChange: number
}

export const createFeeTransaction = async (
    network: Network,
    payerAccount: AccountId | string,
    manualOptions: FeeManualOptions
): Promise<TransferTransaction | null> => {
    const tx = new TransferTransaction();
    const txWithFee = await addBladeFee<TransferTransaction>(tx, network, payerAccount, manualOptions);
    return txWithFee.hbarTransfers.size > 0 ? txWithFee : null;
}

export const addBladeFee = async <T extends Transaction>(
    tx: T,
    network: Network,
    payerAccount: AccountId | string,
    manualOptions: FeeManualOptions
): Promise<T> => {
    try {
        if (tx.isFrozen()) {
            return tx;
        }

        const feature: FeeType = manualOptions.type;// || detectFeeType(tx);
        const feesConfig = JSON.parse(await getConfig("feesConfig"));
        const featureConfig = feesConfig[network][feature];
        const feeAmount = await calculateFeeAmount(tx, network, featureConfig, manualOptions);
        modifyTransactionWithFee(tx, payerAccount, featureConfig.collector, feeAmount);

        return tx;
    } catch (e) {
        return tx;
    }
}

async function calculateFeeAmount(
    tx: Transaction,
    network: Network,
    config: FeatureFeeConfig,
    manualOptions: FeeManualOptions
): Promise<Hbar> {
    let spentAmount: BigNumber = BigNumber(0);
    let rate = BigNumber(1);
    let decimals = 8;
    if (manualOptions.amountTokenId !== "0.0.0") {
        rate = await getHBARRateByTokenId(network, manualOptions.amountTokenId);
        decimals = await getDecimalsForTokenId(network, manualOptions.amountTokenId);
    }
    spentAmount = BigNumber(manualOptions.amount).shiftedBy(decimals).multipliedBy(rate);
    const feeAmount = spentAmount.multipliedBy(config.amount / 100);
    return applyLimits(feeAmount, network, config);
}

function modifyTransactionWithFee(
    tx: Transaction,
    payerAccount: AccountId | string,
    collectorAccount: AccountId | string,
    amount: Hbar
): void {
    if (amount.toBigNumber().eq(0) || amount.toBigNumber().lt(0)) {
        return;
    }

    if (tx instanceof ScheduleCreateTransaction) {
        const schedule = (tx as ScheduleCreateTransaction);
        // @ts-ignore
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

async function getHBAREquivalentAmountFromTransferTransaction(tx: TransferTransaction, network: Network): Promise<BigNumber> {
    let amount: BigNumber = BigNumber(0);
    if (tx.tokenTransfers?.size > 0) {
        for (const [tokenId, accountMap] of tx.tokenTransfers) {
            const spentAmount = [...accountMap.values()]
                .filter(v => v.gt(0))
                .reduce((summ, val) => summ.add(val), Long.ZERO);
            const rate = await getHBARRateByTokenId(network, tokenId.toString());
            amount = amount.plus(BigNumber(spentAmount.toNumber()).multipliedBy(rate));
        }
    }
    if (tx.hbarTransfers?.size > 0) {
        const spentAmount = [...tx.hbarTransfers.values()]
            .filter(h => !h.isNegative())
            .reduce((summ, h) => summ.plus(h.toTinybars().toNumber()), BigNumber(0));
        amount = amount.plus(spentAmount);
    }
    return amount;
}

async function applyLimits(amount: BigNumber, network: Network, config: FeatureFeeConfig): Promise<Hbar> {
    const minInTinyHbars = await convertAmountToTinyBarsByCurrencyType(network, config.min, config.limitsCurrency);
    const maxInTinyHbars = await convertAmountToTinyBarsByCurrencyType(network, config.max, config.limitsCurrency);
    const limitedAmount = BigNumber.min(BigNumber.max(minInTinyHbars, amount), maxInTinyHbars);

    if (!limitedAmount.isFinite()) {
        return Hbar.fromTinybars(0);
    }

    return Hbar.fromTinybars(limitedAmount.toFixed(0, BigNumber.ROUND_CEIL));
}

async function convertAmountToTinyBarsByCurrencyType(
    network: Network,
    amount: number,
    type: string = "tinyhbar"
): Promise<BigNumber> {
    let rate = BigNumber(1);
    let decimalMultiplier = 8;

    switch (type) {
        case "usd": {
            rate = BigNumber(1).div(await getUSDRateForHBAR(network));
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
            decimalMultiplier = await getDecimalsForTokenId(network, type);
            rate = await getHBARRateByTokenId(network, type);
        }
    }

    return BigNumber(amount).multipliedBy(rate).shiftedBy(decimalMultiplier);
}

const cryptoExchangeRates: Record<Network, Record<string, RateData>> = {
    [Network.Mainnet]: {},
    [Network.Testnet]: {}
}

async function getHBARRateByTokenId(network: Network, tokenId: string): Promise<BigNumber> {
    if (!cryptoExchangeRates || !cryptoExchangeRates[network] || !cryptoExchangeRates[network][tokenId]) {
        await loadRatesPerNetwork(network);
    }
    return cryptoExchangeRates[network][tokenId]?.hbarPrice || BigNumber(0);
}

async function loadRatesPerNetwork(network: Network): Promise<void> {
    const apiRates = await fetchRates(network);
    cryptoExchangeRates[network] = apiRates
        .reduce((rates, rate) => {
            rates[rate.id] = {
                hbarPrice: BigNumber(rate.price).shiftedBy(-rate.decimals),
                usdPrice: BigNumber(rate.priceUsd),
                decimals: rate.decimals
            };
            return rates;
        }, {} as Record<string, RateData>);
}

async function fetchRates(network: Network): Promise<APIRateData[]> {
    const saucerswapApi = JSON.parse(await getConfig("saucerswapApi"));
    const url = `${saucerswapApi[network]}tokens`;
    return fetch(url).then(result => result.json()).catch(() => []) as Promise<APIRateData[]>;
}

async function getDecimalsForTokenId(network: Network, tokenId: string): Promise<number> {
    if (!cryptoExchangeRates || !cryptoExchangeRates[network] || !cryptoExchangeRates[network][tokenId]) {
        await loadRatesPerNetwork(network);
    }
    return cryptoExchangeRates[network][tokenId]?.decimals || 0;
}

async function getUSDRateForHBAR(network: Network): Promise<BigNumber | string> {
    const wrapHbar = JSON.parse(await getConfig("swapWrapHbar"));
    const tokenId = wrapHbar[network][0];

    if (!cryptoExchangeRates || !cryptoExchangeRates[network] || !cryptoExchangeRates[network][tokenId]) {
        await loadRatesPerNetwork(network);
    }

    return cryptoExchangeRates[network][tokenId]?.usdPrice || BigNumber(0);
}