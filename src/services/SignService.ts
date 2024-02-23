import { ethers } from 'ethers';
import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {
    SignMessageData, SignVerifyMessageData,
    SplitSignatureData
} from "../models/Common";
import {ParametersBuilder} from "../ParametersBuilder";
import {parseContractFunctionParams} from "../helpers/ContractHelpers";
import { PrivateKey } from '@hashgraph/sdk';

@injectable()
export default class SignService {

    async splitSignature(signature: string): Promise<SplitSignatureData> {
        const {v, r, s} = ethers.utils.splitSignature(signature);
        return {v, r, s};
    }

    async getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string): Promise<SplitSignatureData> {
        const {types, values} = await parseContractFunctionParams(paramsEncoded);
        const hash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(types, values)
        );
        const messageHashBytes = ethers.utils.arrayify(hash);

        const key = PrivateKey.fromString(privateKey);
        const wallet = new ethers.Wallet(key.toStringRaw());
        const signed = await wallet.signMessage(messageHashBytes);

        const {v, r, s} = ethers.utils.splitSignature(signed);
        return {v, r, s};
    }

    // TODO rename to signMessage
    async ethersSign(messageString: string, privateKey: string): Promise<SignMessageData> {
        const key = PrivateKey.fromString(privateKey);
        const wallet = new ethers.Wallet(key.toStringRaw());
        const signedMessage = await wallet.signMessage(Buffer.from(messageString, "base64"));
        return {
            signedMessage
        }
    }

    // TODO rename to verifyMessage
    ethersVerify(messageString: string): Promise<SignVerifyMessageData> {
        throw new Error("Method not implemented.");
    }
}
