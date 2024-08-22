import {injectable, inject} from "inversify";
import "reflect-metadata";
import ApiService from "./ApiService";
import {BladeConfig, DAppConfig} from "../models/Common";

type Config = BladeConfig & DAppConfig;
type ConfigKey = keyof Config;
type ConfigValueByKey<TKey extends ConfigKey> = Config[TKey];

@injectable()
export default class ConfigService {
    private config: BladeConfig = {
        fpApiKey: "",
        fpSubdomain: 'https://identity.bladewallet.io',

        exchangeServiceSignerPubKey: "",
        swapContract: "", // '{ "Testnet": "0.0.123", "Mainnet": "0.0.123" }'
        swapWrapHbar: "", // '{ "Testnet": ["0.0.1337"], "Mainnet": ["0.0.1337"] }'
        saucerswapApi: "", // '{"Testnet":"https://test-api.saucerswap.finance/","Mainnet":"https://api.saucerswap.finance/"}',
        magicLinkPublicKey: "",
        refreshTaskPeriodSeconds: 1,

        // TODO add alchemy keys in backend config
        alchemyTestnetRPC: 'https://eth-sepolia.g.alchemy.com/v2/',
        alchemyTestnetAPIKey: '',
        alchemyMainnetRPC: 'https://eth-mainnet.g.alchemy.com/v2/',
        alchemyMainnetAPIKey: '',
        ipfsGateway: 'https://blade.mypinata.cloud/ipfs/'
    };
    // TODO add fees in dapp backend config
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
