import {Network} from "../models/Networks";
import {KnownChains} from "../models/Chain";
import {EthNetworkConfiguration} from "magic-sdk";

export default class StringHelpers {
    static capitalizeFirstChar(str: string): string {
        return str[0].toUpperCase() + str.slice(1).toLowerCase();
    }

    static stringToChain(chain: string): KnownChains {
        if (!Object.values(KnownChains).includes(chain as KnownChains)) {
            throw new Error(`Invalid chain id: ${chain}`);
        }
        return chain as KnownChains;
    }

    static getChainId(chain: KnownChains): number {
        const [/* namespace */, chainId] = chain.split(":");
        return parseInt(chainId, 10);
    }

    static networkToEthereum(network: Network): EthNetworkConfiguration {
        return network === Network.Mainnet ? "mainnet" : "sepolia";
    }

    static stripHexPrefix(value: string): string {
        return StringHelpers.isHexPrefixed(value) ? value.slice(2) : value;
    }

    static addHexPrefix(value: string): string {
        return StringHelpers.isHexPrefixed(value) ? value : `0x${value}`;
    }

    static isHexPrefixed(str: string): boolean {
        if (typeof str !== "string") {
            throw new Error(`[isHexPrefixed] input must be type "string", received type ${typeof str}`);
        }

        return str.slice(0, 2) === "0x";
    }

    static pathArrayToString(path: number[]): string {
        return `m/${path.join("'/")}`;
    }
}
