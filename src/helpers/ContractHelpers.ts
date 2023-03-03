import {AccountId, ContractFunctionResult} from "@hashgraph/sdk";
import {hethers} from "@hashgraph/hethers";
import {Buffer} from "buffer";

export const getContractFunctionBytecode = async (functionName: string, paramsEncoded: string): Promise<Buffer> => {
    const {types, values} = await parseContractFunctionParams(paramsEncoded);

    // get func identifier
    const functionSignature = `${functionName}(${types.join(",")})`;
    const functionIdentifier = new hethers.utils.Interface([
        hethers.utils.FunctionFragment.from(functionSignature)
    ]).getSighash(functionName);

    const abiCoder = new hethers.utils.AbiCoder();
    const encodedBytes = abiCoder.encode(types, values);

    return Buffer.concat([
        hethers.utils.arrayify(functionIdentifier),
        hethers.utils.arrayify(encodedBytes)
    ]);
}

export const parseContractFunctionParams = async (paramsEncoded: string) => {
    const types: string[] = [];
    const values: any[] = [];
    const paramsData = JSON.parse(paramsEncoded);

    for (let i = 0; i < paramsData.length; i++) {
        const param = paramsData[i];

        switch (param?.type) {
            case "address": {
                // ["0.0.48619523"]
                types.push(param.type);
                values.push(await valueToSolidity(param.value[0]));
            } break;

            case "address[]": {
                // ["0.0.48619523", "0.0.4861934333"]
                const result = [];
                for (let i = 0; i < param.value.length; i++) {
                    result.push(await valueToSolidity(param.value[i]));
                }

                types.push(param.type);
                values.push(result);
            } break;

            case "bytes32": {
                // "WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjUsMjYsMjcsMjgsMjksMzAsMzFd"
                // base64 decode -> json parse -> data
                types.push(param.type);
                values.push(Uint8Array.from(JSON.parse(atob(param.value[0]))));
            } break;
            case "uint8":
            case "int64":
            case "uint64":
            case "uint256": {
                types.push(param.type);
                values.push(param.value[0]);
            } break;
            case "uint64[]":
            case "uint256[]": {
                types.push(param.type);
                values.push(param.value);
            } break;

            case "tuple": {
                const result = await parseContractFunctionParams(param.value[0]);

                types.push(`(${result.types})`);
                values.push(result.values);
            } break;

            case "tuple[]": {
                const result = [];
                for (let i = 0; i < param.value.length; i++) {
                    result.push(await parseContractFunctionParams(param.value[i]));
                }

                types.push(`(${result[0].types})[]`);
                values.push(result.map(({values}) => values));
            } break;
            case "string": {
                types.push(param.type);
                values.push(param.value[0]);
            } break;
            case "string[]": {
                types.push(param.type);
                values.push(param.value);
            } break;
            default: {
                throw {
                    name: "BladeSDK.JS",
                    reason: `Type "${param?.type}" not implemented on JS`
                }
            }
        }
    }

    return {types, values};
}

const valueToSolidity = async (value: string) => {
    // if input.length >=32 - return as EVM address
    // else convert input to solidity

    if (value.length >= 32) {
        return value;
    } else {
        return `0x${AccountId.fromString(value).toSolidityAddress()}`;
    }
};

export const parseContractQueryResponse = async (contractFunctionResult: ContractFunctionResult, resultTypes: string[]) => {
    const result = [];
    const availableTypes = ["bytes32","address","string","bool","int32","uint32","int40","uint40","int48","uint48","int56","uint56","int64","uint64","int72","uint72","int80","uint80","int88","uint88","int96","uint96","int104","uint104","int112","uint112","int120","uint120","int128","uint128","int136","uint136","int144","uint144","int152","uint152","int160","uint160","int168","uint168","int176","uint176","int184","uint184","int192","uint192","int200","uint200","int208","uint208","int216","uint216","int224","uint224","int232","uint232","int240","uint240","int248","uint248","int256","uint256"];

    resultTypes.forEach((type, index) => {
        type = type.toLowerCase();

        if (!availableTypes.includes(type)) {
            throw {
                name: "BladeSDK.JS",
                reason: `Type '${type}' unsupported. Available types: ${availableTypes.join(", ")}`
            }
        }

        const method = `get${type.slice(0, 1).toUpperCase()}${type.slice(1)}`;
        let value = contractFunctionResult[method](index).toString();

        if (type === "bytes32") {
            value = Buffer.from(value).toString("hex")
        }
        result.push({type, value});
    });

    return result;
}
