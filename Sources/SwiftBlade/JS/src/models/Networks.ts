export enum Network {
    Mainnet = "Mainnet",
    Testnet = "Testnet"
}

export const NetworkMirrorNodes = {
    [Network.Mainnet]: "https://mainnet-public.mirrornode.hedera.com",
    [Network.Testnet]: "https://testnet.mirrornode.hedera.com"
};
