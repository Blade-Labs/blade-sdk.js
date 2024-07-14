import {ethers} from "ethers";
import {injectable, inject} from "inversify";
import "reflect-metadata";

import {SignMessageData, SignVerifyMessageData, SplitSignatureData} from "../models/Common";
import {ParametersBuilder} from "../ParametersBuilder";
import {parseContractFunctionParams} from "../helpers/ContractHelpers";
import {PrivateKey} from "@hashgraph/sdk";

@injectable()
export default class SignService {
    async splitSignature(signature: string): Promise<SplitSignatureData> {
        const {v, r, s} = ethers.utils.splitSignature(signature);
        return {v, r, s};
    }
}
