import {getBladeConfig, getEnvironment} from "./ApiService";
import {SdkEnvironment} from "../models/Common";

let config: any = null;

export const getConfig = async (key: string): Promise<string> => {
    if (!config) {
        config = await getBladeConfig();
    }
    if (config[key] !== undefined) {
        return config[key];
    }


    const environment = getEnvironment()
    switch (key) {
        case "feesConfig":
            return environment === SdkEnvironment.CI
                ? `{"Mainnet": {"AccountCreate": {"collector": "0.0.1753455","min": 0.44,"amount": 0,"max": 0.44,"limitsCurrency": "usd"},"TradeNFT": {"collector": "0.0.1454571","min": 0.5,"amount": 2,"max": 1000,"limitsCurrency": "usd"},"TransferHBAR": {"collector": "0.0.1753448","min": 0.02,"amount": 2,"max": 0.2,"limitsCurrency": "usd"},"TransferToken": {"collector": "0.0.1753458","min": 0.02,"amount": 2,"max": 0.2,"limitsCurrency": "usd"},"TransferNFT": {"collector": "0.0.1753576","min": 0.1,"amount": 0,"max": 0.1,"limitsCurrency": "usd"},"ScheduledTransferHBAR": {"collector": "0.0.1753448","min": 0.01,"amount": 2,"max": 0.1,"limitsCurrency": "usd"},"ScheduledTransferToken": {"collector": "0.0.1753458","min": 0.01,"amount": 2,"max": 0.1,"limitsCurrency": "usd"},"StakingClaim": {"collector": "0.0.1753459","min": 0,"amount": 2,"max": 0.01,"limitsCurrency": "usd"},"Swap": {"collector": "0.0.1487713","min": 0.1,"amount": 2,"max": 1000,"limitsCurrency": "usd"},"Default": {"collector": "0.0.831364","min": 0.001,"amount": 0,"max": 0.001,"limitsCurrency": "usd"}},"Testnet": {"AccountCreate": {"collector": "0.0.1131","min": 0.44,"amount": 0,"max": 0.44,"limitsCurrency": "usd"},"TradeNFT": {"collector": "0.0.1131","min": 0.5,"amount": 2,"max": 1000,"limitsCurrency": "usd"},"TransferHBAR": {"collector": "0.0.1131","min": 0.02,"amount": 2,"max": 0.2,"limitsCurrency": "usd"},"TransferToken": {"collector": "0.0.1131","min": 0.02,"amount": 2,"max": 0.2,"limitsCurrency": "usd"},"TransferNFT": {"collector": "0.0.1131","min": 0.1,"amount": 0,"max": 0.1,"limitsCurrency": "usd"},"ScheduledTransferHBAR": {"collector": "0.0.1131","min": 0.01,"amount": 2,"max": 0.1,"limitsCurrency": "usd"},"ScheduledTransferToken": {"collector": "0.0.1131","min": 0.01,"amount": 2,"max": 0.1,"limitsCurrency": "usd"},"StakingClaim": {"collector": "0.0.1131","min": 0,"amount": 2,"max": 0.01,"limitsCurrency": "usd"},"Swap": {"collector": "0.0.1131","min": 0.1,"amount": 2,"max": 1000,"limitsCurrency": "usd"},"Default": {"collector": "0.0.1131","min": 0.001,"amount": 0,"max": 0.001,"limitsCurrency": "usd"}}}`
                : `{"Mainnet":{"AccountCreate":{"collector":"0.0.1753455","min":0,"amount":0,"max":0.44,"limitsCurrency":"usd"},"TradeNFT":{"collector":"0.0.1454571","min":0,"amount":0,"max":1000,"limitsCurrency":"usd"},"TransferHBAR":{"collector":"0.0.1753448","min":0,"amount":0,"max":0.2,"limitsCurrency":"usd"},"TransferToken":{"collector":"0.0.1753458","min":0,"amount":0,"max":0.2,"limitsCurrency":"usd"},"TransferNFT":{"collector":"0.0.1753576","min":0,"amount":0,"max":0.1,"limitsCurrency":"usd"},"ScheduledTransferHBAR":{"collector":"0.0.1753448","min":0,"amount":0,"max":0.1,"limitsCurrency":"usd"},"ScheduledTransferToken":{"collector":"0.0.1753458","min":0,"amount":0,"max":0.1,"limitsCurrency":"usd"},"StakingClaim":{"collector":"0.0.1753459","min":1,"amount":1,"max":1,"limitsCurrency":"tinyhbar"},"Swap":{"collector":"0.0.1487713","min":0,"amount":0,"max":1000,"limitsCurrency":"usd"},"Default":{"collector":"0.0.831364","min":0,"amount":0,"max":0.001,"limitsCurrency":"usd"}},"Testnet":{"AccountCreate":{"collector":"0.0.1267","min":0,"amount":0,"max":0.44,"limitsCurrency":"usd"},"TradeNFT":{"collector":"0.0.1267","min":0,"amount":0,"max":1000,"limitsCurrency":"usd"},"TransferHBAR":{"collector":"0.0.1267","min":0,"amount":0,"max":0.2,"limitsCurrency":"usd"},"TransferToken":{"collector":"0.0.1267","min":0,"amount":0,"max":0.2,"limitsCurrency":"usd"},"TransferNFT":{"collector":"0.0.1267","min":0,"amount":0,"max":0.1,"limitsCurrency":"usd"},"ScheduledTransferHBAR":{"collector":"0.0.1267","min":0,"amount":0,"max":0.1,"limitsCurrency":"usd"},"ScheduledTransferToken":{"collector":"0.0.1267","min":0,"amount":0,"max":0.1,"limitsCurrency":"usd"},"StakingClaim":{"collector":"0.0.1267","min":0,"amount":0,"max":0.01,"limitsCurrency":"usd"},"Swap":{"collector":"0.0.1267","min":0,"amount":0,"max":1000,"limitsCurrency":"usd"},"Default":{"collector":"0.0.1267","min":0,"amount":0,"max":0.001,"limitsCurrency":"usd"}}}`;
        case "saucerswapApi":
            return `{"Testnet": "https://test-api.saucerswap.finance/","Mainnet": "https://api.saucerswap.finance/"}`
        default:
            throw new Error(`Unknown key "${key}" in configService`);
    }
};
