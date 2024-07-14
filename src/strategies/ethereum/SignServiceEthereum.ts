import {ethers} from "ethers";
import {ISignService} from "../SignServiceContext";
import {
    SignMessageData,
    SignVerifyMessageData,
    SplitSignatureData,
    SupportedEncoding,
    TransactionReceiptData
} from "../../models/Common";
import {KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import StringHelpers from "../../helpers/StringHelpers";
import {ParametersBuilder} from "../../ParametersBuilder";
import {parseContractFunctionParams} from "../../helpers/ContractHelpers";
import {Buffer} from "buffer";

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
        if (encoding === SupportedEncoding.hex && encodedMessage.startsWith("0x")) {
            encodedMessage = encodedMessage.slice(2);
        }
        const message = Buffer.from(encodedMessage, encoding);
        const signedMessage = await this.signer.signMessage(message);

        return {
            signedMessage: StringHelpers.stripHexPrefix(signedMessage)
        };
    }

    async getParamsSignature(paramsEncoded: string | ParametersBuilder): Promise<SplitSignatureData> {
        const {types, values} = await parseContractFunctionParams(paramsEncoded);
        const hash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(types, values));
        const messageHashBytes = ethers.utils.arrayify(hash);

        const signedMessage = await this.signer.signMessage(messageHashBytes);

        const {v, r, s} = ethers.utils.splitSignature(signedMessage);
        return {v, r, s};
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

    signScheduleId(): Promise<TransactionReceiptData> {
        throw new Error("Method not implemented.");
    }
    createScheduleTransaction(): Promise<{scheduleId: string}> {
        throw new Error("Method not implemented.");
    }
}
