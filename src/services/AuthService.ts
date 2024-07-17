import {inject, injectable} from "inversify";
import "reflect-metadata";
import {decrypt, encrypt} from "../helpers/SecurityHelper";
import {AccountProvider, ActiveUser, MagicWithHedera, SdkEnvironment} from "../models/Common";
import * as FingerprintJS from "@fingerprintjs/fingerprintjs-pro";
import ApiService from "./ApiService";
import ConfigService from "./ConfigService";
import {ChainMap, ChainServiceStrategy, KnownChainIds} from "../models/Chain";
import {Client, PrivateKey, Signer} from "@hashgraph/sdk";
import {HederaProvider, HederaSigner} from "../signers/hedera";
import * as ethers from "ethers";
import {MagicUserMetadata} from "@magic-sdk/types";
import {MagicSigner} from "../signers/magic/MagicSigner";
import {Magic, MagicSDKAdditionalConfiguration} from "magic-sdk";
import {HederaExtension} from "@magic-ext/hedera";
import StringHelpers from "../helpers/StringHelpers";
import {Network} from "../models/Networks";

@injectable()
export default class AuthService {
    private visitorId: string = "";
    private apiKey: string = "";
    private sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod;

    private chainId: KnownChainIds = KnownChainIds.HEDERA_TESTNET;
    private accountProvider: AccountProvider | null = null;
    private signer: Signer | ethers.Signer | null = null;
    private magic: MagicWithHedera | null = null;
    private userAccountId: string = "";
    private userPublicKey: string = "";
    private userPrivateKey: string = "";

    constructor(
        @inject("apiService") private readonly apiService: ApiService,
        @inject("configService") private readonly configService: ConfigService
    ) {}

    async getVisitorId(visitorId: string, apiKey: string, sdkEnvironment: SdkEnvironment): Promise<string> {
        this.visitorId = visitorId;
        this.apiKey = apiKey;
        this.sdkEnvironment = sdkEnvironment;

        if (!this.visitorId) {
            try {
                const [decryptedVisitorId, timestamp, env] = (
                    await decrypt(localStorage.getItem("BladeSDK.visitorId") || "", this.apiKey)
                ).split("@");
                if (
                    this.sdkEnvironment === (env as SdkEnvironment) &&
                    Date.now() - parseInt(timestamp, 10) < 3600_000 * 24 * 30
                ) {
                    // if visitorId was saved less than 30 days ago and in the same environment
                    this.visitorId = decryptedVisitorId;
                }
            } catch (e) {
                // console.log("failed to decrypt visitor id", e);
            }
        }
        if (!this.visitorId) {
            try {
                const fpConfig = {
                    apiKey: "key", // the valid key is passed on the backend side, and ".get()" does not require the key as well
                    scriptUrlPattern: `${this.apiService.getApiUrl(true)}/fpjs/<version>/<loaderVersion>`,
                    endpoint: [await this.configService.getConfig(`fpSubdomain`), FingerprintJS.defaultEndpoint]
                };
                const fpPromise = await FingerprintJS.load(fpConfig);
                this.visitorId = (await fpPromise.get()).visitorId;
                localStorage.setItem(
                    "BladeSDK.visitorId",
                    await encrypt(`${this.visitorId}@${Date.now()}@${this.sdkEnvironment}`, this.apiKey)
                );
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.log("failed to get visitor id", error);
            }
        }

        this.apiService.setVisitorId(this.visitorId);
        return visitorId;
    }

    async setUser(
        chainId: KnownChainIds,
        accountProvider: AccountProvider,
        accountIdOrEmail: string,
        privateKey?: string
    ): Promise<ActiveUser> {
        this.chainId = chainId;
        this.accountProvider = accountProvider;
        const network = ChainMap[this.chainId].isTestnet ? Network.Testnet : Network.Mainnet;

        try {
            switch (accountProvider) {
                case AccountProvider.PrivateKey:
                    if (ChainMap[this.chainId].serviceStrategy === ChainServiceStrategy.Hedera) {
                        const key = PrivateKey.fromStringDer(privateKey!);
                        const client = ChainMap[this.chainId].isTestnet ? Client.forTestnet() : Client.forMainnet();
                        this.userAccountId = accountIdOrEmail;
                        this.userPrivateKey = privateKey!;
                        this.userPublicKey = key.publicKey.toStringDer();
                        const provider = new HederaProvider({client});
                        this.signer = new HederaSigner(this.userAccountId, key, provider);
                    } else if (ChainMap[this.chainId].serviceStrategy === ChainServiceStrategy.Ethereum) {
                        const key = PrivateKey.fromStringECDSA(privateKey!);
                        this.userPrivateKey = `0x${key.toStringRaw()}`;
                        this.userPublicKey = `0x${key.publicKey.toStringRaw()}`;

                        this.userAccountId = ethers.computeAddress(this.userPublicKey);
                        const alchemyRpc = await this.configService.getConfig(`alchemy${network}RPC`);
                        const alchemyApiKey = await this.configService.getConfig(`alchemy${network}APIKey`);
                        if (!alchemyRpc || !alchemyApiKey) {
                            throw new Error("Alchemy config not found");
                        }
                        const provider = new ethers.JsonRpcProvider(alchemyRpc + alchemyApiKey);
                        this.signer = new ethers.Wallet(this.userPrivateKey, provider);
                    } else {
                        throw new Error("Unsupported chain");
                    }
                    break;
                case AccountProvider.Magic:
                    let userInfo: MagicUserMetadata | undefined;
                    if (!this.magic) {
                        await this.initMagic(this.chainId);
                    }

                    if (await this.magic?.user.isLoggedIn()) {
                        userInfo = await this.magic!.user.getInfo();
                        if (userInfo.email !== accountIdOrEmail) {
                            await this.magic!.user.logout();
                            await this.magic!.auth.loginWithMagicLink({email: accountIdOrEmail, showUI: false});
                            userInfo = await this.magic!.user.getInfo();
                        }
                    } else {
                        await this.magic?.auth.loginWithMagicLink({email: accountIdOrEmail, showUI: false});
                        userInfo = await this.magic?.user.getInfo();
                    }

                    if (!(await this.magic?.user.isLoggedIn())) {
                        throw new Error("Not logged in Magic. Please call magicLogin() first");
                    }

                    this.userAccountId = userInfo?.publicAddress || "";
                    if (ChainMap[this.chainId].serviceStrategy === ChainServiceStrategy.Hedera) {
                        const {publicKeyDer} = (await this.magic!.hedera.getPublicKey()) as {publicKeyDer: string};
                        this.userPublicKey = publicKeyDer;
                        const magicSign = (message: Uint8Array) => this.magic!.hedera.sign(message);
                        this.signer = new MagicSigner(this.userAccountId, network, publicKeyDer, magicSign);
                    } else if (ChainMap[this.chainId].serviceStrategy === ChainServiceStrategy.Ethereum) {
                        const provider = new ethers.BrowserProvider(this.magic!.rpcProvider);
                        this.signer = await provider.getSigner();
                        // TODO check how to get public key from magic
                        this.userPublicKey = "";
                    }
                    break;
                default:
                    break;
            }

            return {
                accountId: this.userAccountId,
                privateKey: this.userPrivateKey,
                publicKey: this.userPublicKey,
                provider: this.accountProvider,
                signer: this.signer!
            }
        } catch (error: any) {
            this.userAccountId = "";
            this.userPrivateKey = "";
            this.userPublicKey = "";
            this.signer = null;
            this.magic = null;
            throw error;
        }
    }

    async resetUser(): Promise<null> {
        this.userPublicKey = "";
        this.userPrivateKey = "";
        this.userAccountId = "";
        this.signer = null;
        if (this.accountProvider === AccountProvider.Magic) {
            if (!this.magic) {
                await this.initMagic(this.chainId);
            }
            await this.magic!.user.logout();
        }
        this.accountProvider = null;

        return null;
    }

    private async initMagic(chainId: KnownChainIds) {
        const network = ChainMap[this.chainId].isTestnet ? Network.Testnet : Network.Mainnet;
        const options: MagicSDKAdditionalConfiguration = {};
        if (ChainMap[chainId].serviceStrategy === ChainServiceStrategy.Hedera) {
            options.extensions = [
                new HederaExtension({
                    network: network.toLowerCase()
                })
            ];
        } else if (ChainMap[chainId].serviceStrategy === ChainServiceStrategy.Ethereum) {
            options.network = StringHelpers.networkToEthereum(network);
        }
        this.magic = new Magic(await this.configService.getConfig(`magicLinkPublicKey`), options) as unknown as MagicWithHedera;
    }
}
