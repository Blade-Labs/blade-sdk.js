import {inject, injectable} from "inversify";
import "reflect-metadata";
import {decrypt, encrypt} from "../helpers/SecurityHelper";
import {AccountProvider, ActiveUser, MagicWithHedera, SdkEnvironment} from "../models/Common";
import * as FingerprintJS from "@fingerprintjs/fingerprintjs-pro";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {ChainMap, ChainServiceStrategy, KnownChainIds} from "../models/Chain";
import {Signer} from "@hashgraph/sdk";
import * as ethers from "ethers";
import {MagicUserMetadata} from "@magic-sdk/types";
import {Magic, MagicSDKAdditionalConfiguration} from "magic-sdk";
import {HederaExtension} from "@magic-ext/hedera";
import StringHelpers from "../helpers/StringHelpers";
import {Network} from "../models/Networks";
import AuthServiceHedera from "./hedera/AuthServiceHedera";
import AuthServiceEthereum from "./ethereum/AuthServiceEthereum";

export interface IAuthService {
    setUserPrivateKey(accountAddress: string, privateKey: string): Promise<ActiveUser>;
    setUserMagic(magic: MagicWithHedera, accountAddress: string): Promise<ActiveUser>;
}

@injectable()
export default class AuthServiceContext {
    private strategy: IAuthService | null = null;

    private visitorId: string = "";
    private apiKey: string = "";
    private sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod;

    private chainId: KnownChainIds = KnownChainIds.HEDERA_TESTNET;
    private accountProvider: AccountProvider | null = null;
    private signer: Signer | ethers.Signer | null = null;
    private magic: MagicWithHedera | null = null;
    private userAccountAddress: string = "";
    private userPublicKey: string = "";
    private userPrivateKey: string = "";

    constructor(
        @inject("apiService") private readonly apiService: ApiService,
        @inject("configService") private readonly configService: ConfigService
    ) {}

    init(chainId: KnownChainIds) {
        this.chainId = chainId;

        switch (ChainMap[this.chainId].serviceStrategy as ChainServiceStrategy) {
            case ChainServiceStrategy.Hedera:
                this.strategy = new AuthServiceHedera(
                    chainId,
                    this.apiService,
                    this.configService
                );
                break;
            case ChainServiceStrategy.Ethereum:
                this.strategy = new AuthServiceEthereum(
                    chainId,
                    this.apiService,
                    this.configService
                );
                break;
            default:
                throw new Error(`Unsupported chain id: ${this.chainId}`);
        }
    }

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
        privateKeyDer?: string
    ): Promise<ActiveUser> {
        this.chainId = chainId;
        this.accountProvider = accountProvider;

        if (!this.strategy) {
            this.init(chainId);
        }

        try {
            switch (accountProvider) {
                case AccountProvider.PrivateKey: {
                    const {signer, accountAddress, publicKey, privateKey} = await this.strategy!.setUserPrivateKey(accountIdOrEmail, privateKeyDer!);

                    this.userAccountAddress = accountAddress;
                    this.userPrivateKey = privateKey;
                    this.userPublicKey = publicKey;
                    this.signer = signer;
                }  break;
                case AccountProvider.Magic: {
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

                    this.userAccountAddress = userInfo?.publicAddress || "";

                    const {signer, publicKey} = await this.strategy!.setUserMagic(this.magic!, this.userAccountAddress);
                    this.signer = signer;
                    this.userPublicKey = publicKey;
                } break;
                default:
                    break;
            }

            return {
                accountAddress: this.userAccountAddress,
                privateKey: this.userPrivateKey,
                publicKey: this.userPublicKey,
                provider: this.accountProvider,
                signer: this.signer!
            }
        } catch (error: any) {
            this.userAccountAddress = "";
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
        this.userAccountAddress = "";
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
