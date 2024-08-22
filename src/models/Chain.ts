import {HEDERA_PATH} from "@hashgraph/sdk";
import StringHelpers from "../helpers/StringHelpers";

export enum ChainServiceStrategy {
    Hedera = "hedera",
    Ethereum = "ethereum"
}

export enum CryptoKeyType {
    ECDSA_SECP256K1 = "ECDSA_SECP256K1",
    ED25519 = "ED25519"
}

export enum KnownChains { // namespace : chainId
    ETHEREUM_MAINNET = "eip155:1",
    ETHEREUM_SEPOLIA = "eip155:11155111",
    HEDERA_MAINNET = "hedera:295",
    HEDERA_TESTNET = "hedera:296"
}

export type ChainConfig = {
    name: string;
    isTestnet: boolean;
    currency: string;
    coinName: string;
    decimals: string;
    defaultPath: string;
    defaultCryptoKeyType: CryptoKeyType;
    options?: {
        allowMultipleAccounts?: boolean;
    };
    serviceStrategy: ChainServiceStrategy;
    supportsHardware: boolean;
    explorerUrl: string;
};

export const ChainMap: Record<KnownChains, ChainConfig> = {
    [KnownChains.HEDERA_MAINNET]: {
        name: "Hedera Mainnet",
        isTestnet: false,
        currency: "HBAR",
        coinName: "Hedera HBAR",
        decimals: "8",
        defaultPath: StringHelpers.pathArrayToString(HEDERA_PATH)!,
        defaultCryptoKeyType: CryptoKeyType.ED25519,
        serviceStrategy: ChainServiceStrategy.Hedera,
        supportsHardware: true,
        options: {
            allowMultipleAccounts: true
        },
        explorerUrl: "https://hashscan.io/mainnet/transaction/"
    },
    [KnownChains.HEDERA_TESTNET]: {
        name: "Hedera Testnet",
        isTestnet: true,
        currency: "HBAR",
        coinName: "Hedera HBAR",
        decimals: "8",
        defaultPath: StringHelpers.pathArrayToString(HEDERA_PATH)!,
        defaultCryptoKeyType: CryptoKeyType.ED25519,
        serviceStrategy: ChainServiceStrategy.Hedera,
        supportsHardware: true,
        options: {
            allowMultipleAccounts: true
        },
        explorerUrl: "https://hashscan.io/testnet/transaction/"
    },
    [KnownChains.ETHEREUM_MAINNET]: {
        name: "Ethereum Mainnet",
        isTestnet: false,
        currency: "ETH",
        coinName: "Ethereum ETH",
        decimals: "18",
        defaultPath: "m/44'/60'/0'/0/0",
        defaultCryptoKeyType: CryptoKeyType.ECDSA_SECP256K1,
        serviceStrategy: ChainServiceStrategy.Ethereum,
        supportsHardware: true,
        explorerUrl: "https://etherscan.io/tx/"
    },
    [KnownChains.ETHEREUM_SEPOLIA]: {
        name: "Ethereum Sepolia",
        isTestnet: true,
        currency: "ETH",
        coinName: "Ethereum ETH",
        decimals: "18",
        defaultPath: "m/44'/60'/0'/0/0",
        defaultCryptoKeyType: CryptoKeyType.ECDSA_SECP256K1,
        serviceStrategy: ChainServiceStrategy.Ethereum,
        supportsHardware: true,
        explorerUrl: "https://sepolia.etherscan.io/tx/"
    }
};
