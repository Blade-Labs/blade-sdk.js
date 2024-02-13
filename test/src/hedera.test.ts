import {checkResult} from "./helpers";
import ApiService from "../../src/services/ApiService";
import CryptoFlowService from "../../src/services/CryptoFlowService";
import ConfigService from "../../src/services/ConfigService";
import FeeService from "../../src/services/FeeService";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {TextDecoder, TextEncoder} from 'util';
import crypto from "crypto";
import {AccountProvider} from "../../src/models/Common";
import AccountServiceContext from "../../src/strategies/AccountServiceContext";
import TokenServiceContext from "../../src/strategies/TokenServiceContext";
import SignServiceContext from "../../src/strategies/SignServiceContext";
import ContractServiceContext from "../../src/strategies/ContractServiceContext";
import TradeServiceContext from "../../src/strategies/TradeServiceContext";
import {KnownChainIds} from "../../src/models/Chain";
import SignService from "../../src/services/SignService";
const {BladeSDK} = require("../../src/webView");

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle,
    },
});

Object.assign(global, { TextDecoder, TextEncoder, fetch });

dotenv.config();

describe('testing methods related to hedera network', () => {

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
    const accountId = process.env.ACCOUNT_ID || "";
    const privateKey = process.env.PRIVATE_KEY || ""; // ECDSA
    const privateKey2 = process.env.PRIVATE_KEY2 || ""; // ECDSA
    const accountId2 = process.env.ACCOUNT_ID2 || "";
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


    test('bladeSdk-hedera.getBalance', async () => {
        let result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);
        result = await bladeSdk.getBalance("", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("balance");
        expect(result.data).toHaveProperty("rawBalance");
        expect(result.data).toHaveProperty("decimals");
        expect(result.data).toHaveProperty("tokens");
        expect(Array.isArray(result.data.tokens)).toEqual(true);
        expect(result.data.tokens.length > 0).toEqual(true);
        expect(result.data.tokens[0]).toHaveProperty("balance");
        expect(result.data.tokens[0]).toHaveProperty("decimals");
        expect(result.data.tokens[0]).toHaveProperty("name");
        expect(result.data.tokens[0]).toHaveProperty("symbol");
        expect(result.data.tokens[0]).toHaveProperty("address");
        expect(result.data.tokens[0]).toHaveProperty("rawBalance");


        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);
        result = await bladeSdk.getBalance(accountId2, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("balance");
        expect(result.data).toHaveProperty("tokens");
        expect(Array.isArray(result.data.tokens)).toEqual(true);

        // invalid accountId
        try {
            result = await bladeSdk.getBalance("0.0.0", completionKey);
        } catch (result) {
            checkResult(result, false);
        }
    }, 20_000);


}); // describe

