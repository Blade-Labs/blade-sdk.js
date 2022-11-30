import {AccountId} from "@hashgraph/sdk";

export const parseContractFunctionParams = (paramsEncoded) => {
    const types: string[] = [];
    const values: any[] = [];
    const paramsData = JSON.parse(paramsEncoded);

    paramsData.forEach(param => {
        switch (param?.type) {
            case "address": {
                // ["0.0.48619523"]
                const solidityAddress = AccountId.fromString(param.value[0]).toSolidityAddress()

                types.push(param.type);
                values.push(solidityAddress);
            } break;

            case "address[]": {
                // ["0.0.48619523", "0.0.4861934333"]

                const solidityAddresses = param.value.map(address => {
                    return AccountId.fromString(address).toSolidityAddress()
                })

                types.push(param.type);
                values.push(solidityAddresses);
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
                const result = parseContractFunctionParams(param.value[0]);

                types.push(`tuple(${result.types})`);
                values.push(result.values);
            } break;

            case "tuple[]": {
                const result = param.value.map(value => {
                    return parseContractFunctionParams(value)
                });

                types.push(`tuple[](${result[0].types})`);
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
    });

    return {types, values};
}