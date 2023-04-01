import {ContractFunctionParameter} from "./models/Common";
import {Buffer} from "buffer";
import {AccountId} from "@hashgraph/sdk";
import BigNumber from "bignumber.js";

export class ParametersBuilder {
    private params: ContractFunctionParameter[] = [];

    addAddress(value: string | AccountId): ParametersBuilder {
        this.params.push({type: "address", value: [value.toString()]});
        return this
    }

    addAddressArray(value: string[]|AccountId[]): ParametersBuilder {
        this.params.push({type: "address[]", value: value.map(v => v.toString())});
        return this
    }

    addBytes32(value: Uint8Array|number[]): ParametersBuilder {
        if (!(value instanceof Uint8Array)) {
            value = Uint8Array.from(value);
        }
        if (value.length !== 32) {
            throw new Error("Bytes32 must be 32 bytes long");
        }
        const encodedValue = Buffer.from(`[${value.toString()}]`).toString('base64');
        this.params.push({type: "bytes32", value: [encodedValue]});
        return this;
    }

    addUInt8(value: number): ParametersBuilder {
        this.params.push({type: "uint8", value: [value.toString()]});
        return this
    }


    addUInt64(value: BigNumber): ParametersBuilder {
        this.params.push({type: "uint64", value: [value.toString()]});
        return this
    }

    addUInt64Array(value: BigNumber[]): ParametersBuilder {
        this.params.push({type: "uint64[]", value: value.map(v => v.toString())});
        return this
    }

    addInt64(value: BigNumber): ParametersBuilder {
        this.params.push({type: "int64", value: [value.toString()]});
        return this
    }

    addUInt256(value: BigNumber): ParametersBuilder {
        this.params.push({type: "uint256", value: [value.toString()]});
        return this
    }

    addUInt256Array(value: BigNumber[]): ParametersBuilder {
        this.params.push({type: "uint256[]", value: value.map(v => v.toString())});
        return this
    }

    addTuple(value: ParametersBuilder): ParametersBuilder {
        this.params.push({type: "tuple", value: [value.encode()]});
        return this
    }

    addTupleArray(value: ParametersBuilder[]): ParametersBuilder {
        this.params.push({type: "tuple[]", value: value.map(val => val.encode())});
        return this
    }

    addString(value: string): ParametersBuilder {
        this.params.push({type: "string", value: [value]});
        return this
    }

    addStringArray(value: string[]): ParametersBuilder {
        this.params.push({type: "string[]", value: value});
        return this
    }

    encode(): string {
        return Buffer.from(JSON.stringify(this.params)).toString("base64");
    }
}
