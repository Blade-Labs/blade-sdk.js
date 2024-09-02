import { getBladeConfig, getDappConfig } from "./ApiService";
import { BladeConfig, DAppConfig } from "../models/Common";

let config: BladeConfig = {
    fpApiKey: undefined,
    fpSubdomain: undefined,
    exchangeServiceSignerPubKey: undefined,
    swapContract: undefined,
    swapWrapHbar: undefined,
    saucerswapApi: undefined,
    magicLinkPublicKey: undefined,
    ipfsGateway: 'blade.mypinata.cloud'
};
let dAppConfig: DAppConfig;

export const getConfig = async (key: string): Promise<any> => {
    if (Object.keys(config).includes(key)) {
        // check if key exists in config or we need dAppConfig
        if (!config.fpApiKey) {
            config = {
                ...config,
                ...await getBladeConfig()
            };
        }
        return config[key];
    }

    if (!dAppConfig?.fees) {
        // check if dAppConfig is empty
        dAppConfig = await getDappConfig();
    }
    if (dAppConfig[key] !== undefined) {
        return dAppConfig[key];
    }
    throw new Error(`Unknown key "${key}" in configService`);
};
