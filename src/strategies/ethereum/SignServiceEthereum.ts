import {ethers} from "ethers";
import {ISignService} from "../SignServiceContext";
import {SignMessageData, SignVerifyMessageData, SupportedEncoding} from "../../models/Common";
import {KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import StringHelpers from "../../helpers/StringHelpers";

export default class SignServiceEthereum implements ISignService {
    private readonly chainId: KnownChainIds;
    private readonly signer: ethers.Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chainId: KnownChainIds, signer: ethers.Signer, apiService: ApiService, configService: ConfigService) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async sign(encodedMessage: string, encoding: SupportedEncoding): Promise<SignMessageData> {
        const message = Buffer.from(encodedMessage, encoding);
        const signedMessage = await this.signer.signMessage(message);

        return {
            signedMessage: StringHelpers.stripHexPrefix(signedMessage)
        };
    }

    async verify(
        encodedMessage: string,
        encoding: SupportedEncoding,
        signature: string,
        addressOrPublicKey: string
    ): Promise<SignVerifyMessageData> {
        let valid;

        // if public key - get address
        if (ethers.utils.isAddress(addressOrPublicKey)) {
            // 0x + 20bytes hex address
            addressOrPublicKey = ethers.utils.getAddress(addressOrPublicKey);
        } else {
            addressOrPublicKey = ethers.utils.computeAddress(addressOrPublicKey);
        }

        try {
            const address = await ethers.utils.verifyMessage(
                Buffer.from(encodedMessage, encoding),
                Buffer.from(StringHelpers.stripHexPrefix(signature), "hex")
            );
            valid = address === addressOrPublicKey;
        } catch (err) {
            valid = false;
        }

        return {
            valid
        };
    }
}
