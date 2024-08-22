import {ChainMap, KnownChains} from "../models/Chain";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";
import {Alchemy, Network as AlchemyNetwork,} from "alchemy-sdk";

export const getAlchemyInstance = async (chain: KnownChains, configService: ConfigService): Promise<Alchemy> => {
    const alchemyNetwork = ChainMap[chain].isTestnet
        ? AlchemyNetwork.ETH_SEPOLIA
        : AlchemyNetwork.ETH_MAINNET;
    const apiKey = await configService.getConfig(
        `alchemy${ChainMap[chain].isTestnet ? Network.Testnet : Network.Mainnet}APIKey`
    );
    return new Alchemy({apiKey, network: alchemyNetwork});
}