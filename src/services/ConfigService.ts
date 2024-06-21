import {injectable, inject} from "inversify";
import "reflect-metadata";
import ApiService from "./ApiService";
import {BladeConfig, DAppConfig} from "../models/Common";

type Config = BladeConfig & DAppConfig;
type ConfigKey = keyof Config;
type ConfigValueByKey<TKey extends ConfigKey> = Config[TKey];

@injectable()
export default class ConfigService {
    private config: Partial<BladeConfig> = {
        fpSubdomain: 'https://identity.bladewallet.io',

        // TODO add alchemy keys in backend config
        alchemyTestnetRPC: "https://eth-sepolia.g.alchemy.com/v2/",
        alchemyTestnetAPIKey: undefined,
        // TODO set correct apikey
        alchemyMainnetRPC: "https://eth-mainnet.g.alchemy.com/v2/",
        alchemyMainnetAPIKey: undefined,
        fpSubdomain: "https://identity.bladewallet.io"
    };
    private dAppConfig: Partial<DAppConfig> = {};

    constructor(@inject("apiService") private readonly apiService: ApiService) {}

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

        if (!this.dAppConfig.dappCode) {
            // check if dAppConfig is empty
            this.dAppConfig = await this.apiService.getDappConfig();
        }
        if (this.dAppConfig[key] !== undefined) {
            return this.dAppConfig[key] as Config[TKey];
        }
        throw new Error(`Unknown key "${key}" in configService`);
    }
}
