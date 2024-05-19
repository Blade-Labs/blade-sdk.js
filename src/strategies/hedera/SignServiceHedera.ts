import {AccountId, PublicKey, Signer, SignerSignature} from "@hashgraph/sdk";

import {ISignService} from "../SignServiceContext";
import {SignMessageData, SignVerifyMessageData, SupportedEncoding} from "../../models/Common";
import {KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";

export default class SignServiceHedera implements ISignService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chainId: KnownChainIds, signer: Signer, apiService: ApiService, configService: ConfigService) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async sign(encodedMessage: string, encoding: SupportedEncoding): Promise<SignMessageData> {
        const message = Buffer.from(encodedMessage, encoding);
        let signedMessage = "";

        const signatures: SignerSignature[] = await this.signer.sign([message]);
        signedMessage = Buffer.from(signatures[0].signature).toString("hex");

        return {
            signedMessage
        };
    }

    async verify(
        encodedMessage: string,
        encoding: SupportedEncoding,
        signature: string,
        addressOrPublicKey: string
    ): Promise<SignVerifyMessageData> {
        let publicKey;
        // if address - get public key
        try {
            const accountId = AccountId.fromString(addressOrPublicKey).toString();
            const accountInfo = await this.apiService.getAccountInfo(accountId);
            if (accountInfo.key._type === "ECDSA_SECP256K1") {
                publicKey = PublicKey.fromStringECDSA(accountInfo.key.key);
            } else {
                publicKey = PublicKey.fromStringED25519(accountInfo.key.key);
            }
        } catch (err) {
            publicKey = PublicKey.fromString(addressOrPublicKey);
        }

        const valid = publicKey.verify(Buffer.from(encodedMessage, encoding), Buffer.from(signature, "hex"));
        return {
            valid
        };
    }
}
