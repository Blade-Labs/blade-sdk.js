import {ChainMap, KnownChainIds} from "../models/Chain";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";
import {Alchemy, Network as AlchemyNetwork,} from "alchemy-sdk";

export const getAlchemyInstance = async (chainId: KnownChainIds, configService: ConfigService): Promise<Alchemy> => {
    const alchemyNetwork = ChainMap[chainId].isTestnet
        ? AlchemyNetwork.ETH_SEPOLIA
        : AlchemyNetwork.ETH_MAINNET;
    const apiKey = await configService.getConfig(
        `alchemy${ChainMap[chainId].isTestnet ? Network.Testnet : Network.Mainnet}APIKey`
    );
    return new Alchemy({apiKey, network: alchemyNetwork});
}