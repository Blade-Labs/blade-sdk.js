import {ContractFunctionParameter} from "./models/Common";
import {Buffer} from "buffer";
import {AccountId} from "@hashgraph/sdk";
import BigNumber from "bignumber.js";

/**
 * ParametersBuilder is a helper class to build contract function parameters
 * @class
 * Used in {@link BladeSDK#contractCallFunction}, {@link BladeSDK#contractCallQueryFunction} and {@link BladeSDK#getParamsSignature}
 *
 * @example
 *  const params = new ParametersBuilder()
 *    .addAddress("0.0.123")
 *    .addUInt8(42)
 *    .addBytes32([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F])
 *    .addString("Hello World")
 *    .addTuple(new ParametersBuilder().addAddress("0.0.456").addUInt8(42))
 *  ;
 *
 */
export class ParametersBuilder {
    // TODO implement all methods
    private params: ContractFunctionParameter[] = [];

    addAddress(value: string | AccountId): ParametersBuilder {
        this.params.push({type: "address", value: [value.toString()]});
        return this;
    }

    addAddressArray(value: string[] | AccountId[]): ParametersBuilder {
        this.params.push({type: "address[]", value: value.map(v => v.toString())});
        return this;
    }

    addBytes32(value: Uint8Array | number[]): ParametersBuilder {
        if (!(value instanceof Uint8Array)) {
            value = Uint8Array.from(value);
        }
        if (value.length !== 32) {
            throw new Error("Bytes32 must be 32 bytes long");
        }
        const encodedValue = Buffer.from(`[${value.toString()}]`).toString("base64");
        this.params.push({type: "bytes32", value: [encodedValue]});
        return this;
    }

    addUInt8(value: number): ParametersBuilder {
        this.params.push({type: "uint8", value: [value.toString()]});
        return this;
    }

    addUInt64(value: BigNumber): ParametersBuilder {
        this.params.push({type: "uint64", value: [value.toString()]});
        return this;
    }

    addUInt64Array(value: BigNumber[]): ParametersBuilder {
        this.params.push({type: "uint64[]", value: value.map(v => v.toString())});
        return this;
    }

    addInt64(value: BigNumber): ParametersBuilder {
        this.params.push({type: "int64", value: [value.toString()]});
        return this;
    }

    addUInt256(value: BigNumber): ParametersBuilder {
        this.params.push({type: "uint256", value: [value.toString()]});
        return this;
    }

    addUInt256Array(value: BigNumber[]): ParametersBuilder {
        this.params.push({type: "uint256[]", value: value.map(v => v.toString())});
        return this;
    }

    addTuple(value: ParametersBuilder): ParametersBuilder {
        this.params.push({type: "tuple", value: [value.encode()]});
        return this;
    }

    addTupleArray(value: ParametersBuilder[]): ParametersBuilder {
        this.params.push({type: "tuple[]", value: value.map(val => val.encode())});
        return this;
    }

    addString(value: string): ParametersBuilder {
        this.params.push({type: "string", value: [value]});
        return this;
    }

    addStringArray(value: string[]): ParametersBuilder {
        this.params.push({type: "string[]", value});
        return this;
    }

    /**
     * Encodes the parameters to a base64 string, compatible with the methods of the BladeSDK
     * Calling this method is optional, as the BladeSDK will automatically encode the parameters if needed
     */
    encode(): string {
        return Buffer.from(JSON.stringify(this.params)).toString("base64");
    }
}
