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

    static stripHexPrefix(value: string): string {
        return StringHelpers.isHexPrefixed(value) ? value.slice(2) : value;
    }

    static isHexPrefixed(str: string): boolean {
        if (typeof str !== 'string') {
            throw new Error(`[isHexPrefixed] input must be type "string", received type ${typeof str}`)
        }

        return str.slice(0, 2) === "0x";
    }
}

