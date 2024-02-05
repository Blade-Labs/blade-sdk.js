import {Network} from "../models/Networks";
import {ChainType} from "../models/Common";
import { EthNetworkConfiguration } from "magic-sdk";

export default class StringHelpers {
    static stringToNetwork(str: string): Network {
        const network = str[0].toUpperCase() + str.slice(1).toLowerCase() as Network;
        if (!Network[network]) {
            throw new Error(`Invalid network: ${str}`);
        }
        return network;
    }

    static stringToChainType(str: string): ChainType {
        const chainType = str[0].toUpperCase() + str.slice(1).toLowerCase() as ChainType
        if (!ChainType[chainType]) {
            throw new Error(`Invalid chain type: ${str}`);
        }
        return chainType;
    }

    static networkToEthereum(network: Network): EthNetworkConfiguration {
        return network === Network.Mainnet ? "mainnet" : "sepolia";
    }
}

