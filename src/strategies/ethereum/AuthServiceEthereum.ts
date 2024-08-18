import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {ChainMap, KnownChainIds} from "../../models/Chain";
import {IAuthService} from "../../strategies/AuthServiceContext";
import {AccountProvider, ActiveUser, MagicWithHedera} from "../../models/Common";
import {Network} from "../../models/Networks";
import {PrivateKey} from "@hashgraph/sdk";
import * as ethers from "ethers";

export default class AuthServiceEthereum implements IAuthService {
    private readonly chainId: KnownChainIds;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        chainId: KnownChainIds,
        apiService: ApiService,
        configService: ConfigService
    ) {
        this.chainId = chainId;
        this.apiService = apiService;
        this.configService = configService;
    }

    async setUserPrivateKey(accountAddress: string, privateKey: string): Promise<ActiveUser> {
        const network = ChainMap[this.chainId].isTestnet ? Network.Testnet : Network.Mainnet;
        const key = PrivateKey.fromStringECDSA(privateKey);
        privateKey = `0x${key.toStringRaw()}`;
        const publicKey = `0x${key.publicKey.toStringRaw()}`;

        accountAddress = ethers.computeAddress(publicKey);
        const alchemyRpc = await this.configService.getConfig(`alchemy${network}RPC`);
        const alchemyApiKey = await this.configService.getConfig(`alchemy${network}APIKey`);
        if (!alchemyRpc || !alchemyApiKey) {
            throw new Error("Alchemy config not found");
        }
        const provider = new ethers.JsonRpcProvider(alchemyRpc + alchemyApiKey);
        const signer = new ethers.Wallet(privateKey, provider);


        return {
            provider: AccountProvider.PrivateKey,
            accountAddress,
            privateKey,
            publicKey,
            signer,
        };
    }

    async setUserMagic(magic: MagicWithHedera): Promise<ActiveUser> {
        const provider = new ethers.BrowserProvider(magic.rpcProvider);
        const signer = await provider.getSigner();

        return {
            provider: AccountProvider.Magic,
            accountAddress: "",
            privateKey: "",
            // TODO check how to get public key from magic
            publicKey: "",
            signer,
        };
    }
}
