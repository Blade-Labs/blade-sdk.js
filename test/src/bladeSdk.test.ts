import {AccountId} from "@hashgraph/sdk";
import {checkResult} from "./helpers";
import ApiService from "../../src/services/ApiService";
import CryptoFlowService from "../../src/services/CryptoFlowService";
import ConfigService from "../../src/services/ConfigService";
import FeeService from "../../src/services/FeeService";
import {Network} from "../../src/models/Networks";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {TextDecoder, TextEncoder} from 'util';
import crypto from "crypto";
import {flatArray} from "../../src/helpers/ArrayHelpers";
import {parseContractFunctionParams} from "../../src/helpers/ContractHelpers";
import {decrypt, encrypt} from "../../src/helpers/SecurityHelper";
import {
    AccountProvider,
    SdkEnvironment
} from "../../src/models/Common";
import AccountServiceContext from "../../src/strategies/AccountServiceContext";
import TokenServiceContext from "../../src/strategies/TokenServiceContext";
import SignServiceContext from "../../src/strategies/SignServiceContext";
import ContractServiceContext from "../../src/strategies/ContractServiceContext";
import TradeServiceContext from "../../src/strategies/TradeServiceContext";
import {KnownChainIds} from "../../src/models/Chain";
import SignService from "../../src/services/SignService";
const {BladeSDK, ParametersBuilder} = require("../../src/webView");

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle,
    },
});

Object.assign(global, { TextDecoder, TextEncoder, fetch });

dotenv.config();

describe('testing sdk core functionality', () => {

    const apiService = new ApiService();
    const configService = new ConfigService(apiService);
    const feeService = new FeeService(configService);
    const signService = new SignService();
    const cryptoFlowService = new CryptoFlowService(configService, feeService);
    const accountServiceContext = new AccountServiceContext(apiService, configService);
    const tokenServiceContext = new TokenServiceContext(apiService, configService);
    const signServiceContext = new SignServiceContext(apiService, configService, signService);
    const contractServiceContext = new ContractServiceContext(apiService, configService);
    const tradeServiceContext = new TradeServiceContext(apiService, configService, cryptoFlowService);

    const bladeSdk = new BladeSDK(
        configService,
        apiService,
        accountServiceContext,
        tokenServiceContext,
        signServiceContext,
        contractServiceContext,
        tradeServiceContext,
        cryptoFlowService,
        true
    );

    const sdkVersion = `Kotlin@${config.numberVersion}`;
    const completionKey = "completionKey1";
    const privateKey = process.env.PRIVATE_KEY || ""; // ECDSA
    const accountId = process.env.ACCOUNT_ID || "";
    const chainId = KnownChainIds.HEDERA_TESTNET; // KnownChainIds.ETHEREUM_SEPOLIA

    beforeEach(async () => {
        const result = await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            process.env.VISITOR_ID,
            process.env.SDK_ENV,
            sdkVersion,
            completionKey);
        checkResult(result);
    });

    test('bladeSdk.defined', () => {
        expect(window["bladeSdk"]).toBeDefined()
    });

    test('bladeSdk.init', async () => {
        let result = await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            "", // empty visitor id,
            process.env.SDK_ENV,
            sdkVersion,
            completionKey);
        checkResult(result);
        expect(result.data).toHaveProperty("apiKey");
        expect(result.data).toHaveProperty("dAppCode");
        expect(result.data).toHaveProperty("network");
        expect(result.data).toHaveProperty("visitorId");
        expect(result.data).toHaveProperty("sdkEnvironment");
        expect(result.data).toHaveProperty("sdkVersion");
        expect(result.data).toHaveProperty("nonce");

        result = await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            process.env.VISITOR_ID,
            SdkEnvironment.Prod,
            sdkVersion,
            completionKey);
        checkResult(result);

        result = await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            "",
            "test",
            sdkVersion,
            completionKey);
        checkResult(result);
    });

    test('bladeSdk.getInfo', async () => {
        const result = await bladeSdk.getInfo(completionKey);
        checkResult(result);
        expect(result.data).toHaveProperty("apiKey");
        expect(result.data).toHaveProperty("dAppCode");
        expect(result.data).toHaveProperty("network");
        expect(result.data).toHaveProperty("chainId");
        expect(result.data).toHaveProperty("visitorId");
        expect(result.data).toHaveProperty("sdkEnvironment");
        expect(result.data).toHaveProperty("sdkVersion");
        expect(result.data).toHaveProperty("nonce");
        expect(result.data).toHaveProperty("user");
        expect(result.data.user).toHaveProperty("accountId");
        expect(result.data.user).toHaveProperty("accountProvider");
        expect(result.data.user).toHaveProperty("userPrivateKey");
        expect(result.data.user).toHaveProperty("userPublicKey");
    });

    test('bladeSdk.ParametersBuilder.defined', async () => {
        expect(new ParametersBuilder() != null).toEqual(true);
    });

    test('bladeSdk.ParametersBuilder.complicatedCheck', async () => {
        let result;
        const paramsEncodedExample = 'W3sidHlwZSI6InN0cmluZyIsInZhbHVlIjpbIkhlbGxvLCBCYWNrZW5kIl19LHsidHlwZSI6ImJ5dGVzMzIiLCJ2YWx1ZSI6WyJXekFzTVN3eUxETXNOQ3cxTERZc055dzRMRGtzTVRBc01URXNNVElzTVRNc01UUXNNVFVzTVRZc01UY3NNVGdzTVRrc01qQXNNakVzTWpJc01qTXNNalFzTWpVc01qWXNNamNzTWpnc01qa3NNekFzTXpGZCJdfSx7InR5cGUiOiJhZGRyZXNzW10iLCJ2YWx1ZSI6WyIwLjAuNDg3Mzg1MzkiLCIwLjAuNDg3Mzg1MzgiLCIwLjAuNDg3Mzg1MzciXX0seyJ0eXBlIjoiYWRkcmVzcyIsInZhbHVlIjpbIjAuMC40ODg1MDQ2NiJdfSx7InR5cGUiOiJhZGRyZXNzIiwidmFsdWUiOlsiMC4wLjQ5OTMyNiJdfSx7InR5cGUiOiJhZGRyZXNzIiwidmFsdWUiOlsiMC4wLjQ4ODAxNjg4Il19LHsidHlwZSI6ImludDY0IiwidmFsdWUiOlsiMSJdfSx7InR5cGUiOiJ1aW50OCIsInZhbHVlIjpbIjEyMyJdfSx7InR5cGUiOiJ1aW50NjRbXSIsInZhbHVlIjpbIjEiLCIyIiwiMyJdfSx7InR5cGUiOiJ1aW50MjU2W10iLCJ2YWx1ZSI6WyIxIiwiMiIsIjMiXX0seyJ0eXBlIjoidHVwbGUiLCJ2YWx1ZSI6WyJXM3NpZEhsd1pTSTZJbWx1ZERZMElpd2lkbUZzZFdVaU9sc2lOU0pkZlN4N0luUjVjR1VpT2lKcGJuUTJOQ0lzSW5aaGJIVmxJanBiSWpFd0lsMTlYUT09Il19LHsidHlwZSI6InR1cGxlIiwidmFsdWUiOlsiVzNzaWRIbHdaU0k2SW1sdWREWTBJaXdpZG1Gc2RXVWlPbHNpTlRBaVhYMHNleUowZVhCbElqb2lkSFZ3YkdWYlhTSXNJblpoYkhWbElqcGJJbGN6YzJsa1NHeDNXbE5KTmtsdGJIVmtSRmt3U1dsM2FXUnRSbk5rVjFWcFQyeHphVTFVV1dsWVdEQnpaWGxLTUdWWVFteEphbTlwWVZjMU1FNXFVV2xNUTBveVdWZDRNVnBUU1RaWGVVbDZUV2xLWkdaV01EMGlMQ0pYTTNOcFpFaHNkMXBUU1RaSmJXeDFaRVJaTUVscGQybGtiVVp6WkZkVmFVOXNjMmxPVTBwa1psTjROMGx1VWpWalIxVnBUMmxLY0dKdVVUSk9RMGx6U1c1YWFHSklWbXhKYW5CaVNXcEZkMGxzTVRsWVVUMDlJbDE5WFE9PSJdfSx7InR5cGUiOiJ0dXBsZVtdIiwidmFsdWUiOlsiVzNzaWRIbHdaU0k2SW1sdWREWTBJaXdpZG1Gc2RXVWlPbHNpTVRZaVhYMHNleUowZVhCbElqb2lhVzUwTmpRaUxDSjJZV3gxWlNJNld5SXpNaUpkZlYwPSIsIlczc2lkSGx3WlNJNkltbHVkRFkwSWl3aWRtRnNkV1VpT2xzaU5TSmRmU3g3SW5SNWNHVWlPaUpwYm5RMk5DSXNJblpoYkhWbElqcGJJakV3SWwxOVhRPT0iXX0seyJ0eXBlIjoidHVwbGVbXSIsInZhbHVlIjpbIlczc2lkSGx3WlNJNkltbHVkRFkwSWl3aWRtRnNkV1VpT2xzaU5UQWlYWDBzZXlKMGVYQmxJam9pZEhWd2JHVmJYU0lzSW5aaGJIVmxJanBiSWxjemMybGtTR3gzV2xOSk5rbHRiSFZrUkZrd1NXbDNhV1J0Um5Oa1YxVnBUMnh6YVUxVVdXbFlXREJ6WlhsS01HVllRbXhKYW05cFlWYzFNRTVxVVdsTVEwb3lXVmQ0TVZwVFNUWlhlVWw2VFdsS1pHWldNRDBpTENKWE0zTnBaRWhzZDFwVFNUWkpiV3gxWkVSWk1FbHBkMmxrYlVaelpGZFZhVTlzYzJsT1UwcGtabE40TjBsdVVqVmpSMVZwVDJsS2NHSnVVVEpPUTBselNXNWFhR0pJVm14SmFuQmlTV3BGZDBsc01UbFlVVDA5SWwxOVhRPT0iLCJXM3NpZEhsd1pTSTZJbWx1ZERZMElpd2lkbUZzZFdVaU9sc2lOVEFpWFgwc2V5SjBlWEJsSWpvaWRIVndiR1ZiWFNJc0luWmhiSFZsSWpwYklsY3pjMmxrU0d4M1dsTkpOa2x0YkhWa1JGa3dTV2wzYVdSdFJuTmtWMVZwVDJ4emFVMVVXV2xZV0RCelpYbEtNR1ZZUW14SmFtOXBZVmMxTUU1cVVXbE1RMG95V1ZkNE1WcFRTVFpYZVVsNlRXbEtaR1pXTUQwaUxDSlhNM05wWkVoc2QxcFRTVFpKYld4MVpFUlpNRWxwZDJsa2JVWnpaRmRWYVU5c2MybE9VMHBrWmxONE4wbHVValZqUjFWcFQybEtjR0p1VVRKT1EwbHpTVzVhYUdKSVZteEphbkJpU1dwRmQwbHNNVGxZVVQwOUlsMTlYUT09Il19LHsidHlwZSI6ImFkZHJlc3MiLCJ2YWx1ZSI6WyIwLjAuMTIzNDUiXX0seyJ0eXBlIjoidWludDY0IiwidmFsdWUiOlsiNTY3ODQ2NDU2NDUiXX0seyJ0eXBlIjoidWludDI1NiIsInZhbHVlIjpbIjEyMzQ1Il19XQ==';
        const tuple0 = new ParametersBuilder().addInt64(16).addInt64(32);
        const tuple1 = new ParametersBuilder().addInt64(5).addInt64(10);
        const tuple2 = new ParametersBuilder().addInt64(50).addTupleArray([tuple0, tuple1]);
        const contractId = process.env.CONTRACT_ID || "";

        const params = new ParametersBuilder()
            .addString("Hello, Backend")
            .addBytes32([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F])
            .addAddressArray(["0.0.48738539", AccountId.fromString("0.0.48738538"), "0.0.48738537"])
            .addAddress("0.0.48850466")
            .addAddress("0.0.499326")
            .addAddress("0.0.48801688")
            .addInt64(1)
            .addUInt8(123)
            .addUInt64Array([1, 2, 3])
            .addUInt256Array([1, 2, 3])
            .addTuple(tuple1)
            .addTuple(tuple2)
            .addTupleArray([tuple0, tuple1])
            .addTupleArray([tuple2, tuple2])
            .addAddress("0.0.12345")
            .addUInt64(56784645645)
            .addUInt256(12345)
        ;

        const paramsEncoded = params.encode();
        expect(paramsEncoded).toEqual(paramsEncodedExample);

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        try {
            result = await bladeSdk.contractCallFunction(contractId, "set_message", paramsEncoded, 100000, false, completionKey);
        } catch (result: any) {
            checkResult(result, false);
            expect(result.error.reason.includes("CONTRACT_REVERT_EXECUTED")).toEqual(true);
        }


        const message = `Sum test ${Math.random()}`;
        const num1 = 7;
        const num2 = 9;

        const params1 = new ParametersBuilder()
            .addString(message)
            .addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));


        result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params1.encode(), 1000000, false, completionKey);
        checkResult(result);

        // try to pass ParametersBuilder object instead of encoded string
        result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params1, 1000000, false, completionKey);
        checkResult(result);

        try {
            new ParametersBuilder()
                .addStringArray(["Hello", "World"])
                .addBytes32([0x00, 0x01, 0x02])
            ;
        } catch (e: any) {
            expect(e.message.includes("Bytes32 must be 32 bytes long")).toEqual(true);
        }

        try {
            const tpl1 = new ParametersBuilder().addStringArray(["Hello", "World"]);
            const tpl2 = new ParametersBuilder().addAddressArray(["0.0.1"])
            await parseContractFunctionParams(new ParametersBuilder().addTupleArray([tpl1, tpl2]))
        } catch (e) {
            expect(JSON.stringify(e).includes("Tuple structure in array must be the same")).toEqual(true);
        }

        try {
            await parseContractFunctionParams("W3sidHlwZSI6InN0cmluZ1tdIiwidmFsdWUiOlsiSGVsbG8iLCJXb3JsZCJdfSx7InR5cGUiOiJzdHJpbmciLCJ2YWx1ZSI6WyI1NSJdfSx7InR5cGUiOiJHYXJ5RHUiLCJ2YWx1ZSI6WzQyXX1d");
        } catch (e) {
            expect(JSON.stringify(e).includes("Type \\\"GaryDu\\\" not implemented on JS")).toEqual(true);
        }

    }, 120_000);

    test("bladeSdk.utils", async () => {
        const arr = flatArray([1, 2, 3, [4, 5, 6, [7, 8, 9, [10], [11]], [12]]]);
        expect(Array.isArray(arr)).toEqual(true);

        const originalString = "hello";
        const encrypted = await encrypt(originalString, process.env.API_KEY || "");
        expect(await decrypt(encrypted, process.env.API_KEY || "")).toEqual(originalString);

        expect((await apiService.GET(Network.Testnet, `/api/v1/accounts/${accountId}`)).account).toEqual(accountId)
    });

}); // describe