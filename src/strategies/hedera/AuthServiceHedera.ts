import {ChainMap, KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {IAuthService} from "../../strategies/AuthServiceContext";
import {AccountProvider, ActiveUser, MagicWithHedera} from "../../models/Common";
import {Network} from "../../models/Networks";
import {Client, PrivateKey} from "@hashgraph/sdk";
import {HederaProvider, HederaSigner} from "../../signers/hedera";
import {MagicSigner} from "../../signers/magic/MagicSigner";

export default class AuthServiceHedera implements IAuthService {
    private readonly chainId: KnownChainIds;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chainId: KnownChainIds, apiService: ApiService, configService: ConfigService) {
        this.chainId = chainId;
        this.apiService = apiService;
        this.configService = configService;
    }

    async setUserPrivateKey(accountAddress: string, privateKey: string): Promise<ActiveUser> {
        const key = PrivateKey.fromStringDer(privateKey!);
        const client = ChainMap[this.chainId].isTestnet ? Client.forTestnet() : Client.forMainnet();


        const publicKey = key.publicKey.toStringDer();
        const provider = new HederaProvider({client});
        const signer = new HederaSigner(accountAddress, key, provider);

        return {
            provider: AccountProvider.PrivateKey,
            accountAddress,
            privateKey,
            publicKey,
            signer,
        };
    }

    async setUserMagic(magic: MagicWithHedera, accountAddress: string): Promise<ActiveUser> {
        const network = ChainMap[this.chainId].isTestnet ? Network.Testnet : Network.Mainnet;

        const {publicKeyDer} = (await magic.hedera.getPublicKey()) as {publicKeyDer: string};
        const publicKey = publicKeyDer;
        const magicSign = (message: Uint8Array) => magic.hedera.sign(message);
        const signer = new MagicSigner(accountAddress, network, publicKeyDer, magicSign);

        return {
            provider: AccountProvider.Magic,
            accountAddress: "",
            privateKey: "",
            publicKey,
            signer,
        };
    }
}
