import {AccountId} from "@hashgraph/sdk";
import {GET} from "../ApiService";
import {Network} from "../models/Networks";
import {hethers} from "@hashgraph/hethers";


export const parseContractFunctionParams = async (paramsEncoded, network: Network) => {
    const types: string[] = [];
    const values: any[] = [];
    const paramsData = JSON.parse(paramsEncoded);

    for (let i = 0; i < paramsData.length; i++) {
        const param = paramsData[i];

        switch (param?.type) {
            case "address": {
                // ["0.0.48619523"]
                types.push(param.type);
                values.push(await valueToSolidity(param.value[0], network));
            } break;

            case "address[]": {
                // ["0.0.48619523", "0.0.4861934333"]
                const result = [];
                for (let i = 0; i < param.value.length; i++) {
                    result.push(await valueToSolidity(param.value[i], network));
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
                const result = await parseContractFunctionParams(param.value[0], network);

                types.push(`(${result.types})`);
                values.push(result.values);
            } break;

            case "tuple[]": {
                const result = [];
                for (let i = 0; i < param.value.length; i++) {
                    result.push(await parseContractFunctionParams(param.value[i], network));
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
                    name: "SwiftBlade JS",
                    reason: `Type "${param?.type}" not implemented on JS`
                }
            } break;
        }
    }

    return {types, values};
}

const valueToSolidity = async (value: string, network: Network) => {
    // if input.length >=32 - replace "0x" to "" and return
    // if address - get account info and get evm-address (only for ECDSA keys)
    // if no evm - address - check of key_type == ECDSA_SECP256K1 - and compute EVM address else convert input to solidity

    let result = "";
    if (value.length >= 32) {
        result = value;
    } else {
        const accountInfo = await GET(network, `api/v1/accounts/${value}`);
        if (accountInfo.evm_address) {
            result = accountInfo.evm_address;
        } else {
            if (accountInfo.key._type === "ECDSA_SECP256K1") {
                result = hethers.utils.computeAddress(`0x${accountInfo.key.key}`);
            } else {
                result = `0x${AccountId.fromString(value).toSolidityAddress()}`;
            }
        }
    }
    return result;
};
