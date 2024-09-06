import {ChainMap, KnownChains} from "../../models/Chain";
import {IAuthService} from "../../contexts/AuthServiceContext";
import {AccountProvider, ActiveUser, MagicWithHedera} from "../../models/Common";
import {Network} from "../../models/Networks";
import {Client, PrivateKey} from "@hashgraph/sdk";
import {HederaProvider, HederaSigner} from "../../signers/hedera";
import {MagicSigner} from "../../signers/magic/MagicSigner";
import AbstractServiceHedera from "./AbstractServiceHedera";
import {getContainer} from "../../container";

export default class AuthServiceHedera extends AbstractServiceHedera implements IAuthService {
    constructor(chain: KnownChains) {
        super(chain);

        this.container = getContainer();
    }

    async setUserPrivateKey(accountAddress: string, privateKey: string): Promise<ActiveUser> {
        const key = PrivateKey.fromStringDer(privateKey!);
        const client = ChainMap[this.chain].isTestnet ? Client.forTestnet() : Client.forMainnet();


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
        const network = ChainMap[this.chain].isTestnet ? Network.Testnet : Network.Mainnet;

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
