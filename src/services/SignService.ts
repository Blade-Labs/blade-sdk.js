import {ethers} from "ethers";
import {injectable} from "inversify";
import "reflect-metadata";
import {SplitSignatureData} from "../models/Common";
import StringHelpers from "../helpers/StringHelpers";

@injectable()
export default class SignService {
    async splitSignature(signature: string): Promise<SplitSignatureData> {
        const {v, r, s} = ethers.Signature.from(StringHelpers.addHexPrefix(signature));
        return {v, r, s};
    }
}
