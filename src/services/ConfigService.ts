import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import ApiService from "./ApiService";
import {BladeConfig, DAppConfig} from "../models/Common";

type ConfigKey = keyof (BladeConfig | DAppConfig);
type ConfigValueByKey<TKey extends ConfigKey> = (BladeConfig | DAppConfig)[TKey];

@injectable()
export default class ConfigService {
    private config: BladeConfig = {
        fpApiKey: undefined,
        exchangeServiceSignerPubKey: undefined,
        swapContract: undefined,
        swapWrapHbar: undefined,
        saucerswapApi: undefined,
        magicLinkPublicKey: undefined,

        // TODO add alchemy keys in backend config
        alchemyTestnetRPC: 'https://eth-sepolia.g.alchemy.com/v2/',
        alchemyTestnetAPIKey: undefined,
        // TODO set correct apikey
        alchemyMainnetRPC: 'https://eth-mainnet.g.alchemy.com/v2/',
        alchemyMainnetAPIKey: undefined,
        fingerprintSubdomain: 'https://identity.bladewallet.io'
    };
    private dAppConfig?: DAppConfig;

    constructor(@inject('apiService') private readonly apiService: ApiService) {}

    async getConfig<TKey extends ConfigKey>(key: TKey): Promise<ConfigValueByKey<TKey>> {
        if (Object.keys(this.config).includes(key.toString())) {
            // check if key exists in config or we need dAppConfig
            if (!this.config.fpApiKey) {
                // check if config is empty
                this.config = {
                    ...this.config,
                    ...(await this.apiService.getBladeConfig())
                }

            }
            return this.config[key];
        }

        if (!this.dAppConfig?.fees) { // check if dAppConfig is empty
            this.dAppConfig = await this.apiService.getDappConfig();
        }
        if (this.dAppConfig[key] !== undefined) {
            return this.dAppConfig[key];
        }
        throw new Error(`Unknown key "${key}" in configService`);
    };
}