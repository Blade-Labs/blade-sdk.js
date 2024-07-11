import {PrivateKey} from "@hashgraph/sdk";
import {checkResult, completionKey} from "./helpers";
import ApiService from "../../src/services/ApiService";
import TradeService from "../../src/services/TradeService";
import ConfigService from "../../src/services/ConfigService";
import FeeService from "../../src/services/FeeService";
import {Buffer} from "buffer";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {ethers} from "ethers";
import {TextDecoder, TextEncoder} from "util";
import crypto from "crypto";
import {AccountProvider} from "../../src/models/Common";
import AccountServiceContext from "../../src/strategies/AccountServiceContext";
import TokenServiceContext from "../../src/strategies/TokenServiceContext";
import SignServiceContext from "../../src/strategies/SignServiceContext";
import ContractServiceContext from "../../src/strategies/ContractServiceContext";
import {KnownChainIds} from "../../src/models/Chain";
import SignService from "../../src/services/SignService";
import AuthService from "../../src/services/AuthService";
const {BladeSDK, ParametersBuilder} = require("../../src/webView");

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle
    }
});

Object.assign(global, {TextDecoder, TextEncoder, fetch});

dotenv.config();

describe("test COMMON functionality", () => {
    const apiService = new ApiService();
    const configService = new ConfigService(apiService);
    const authService = new AuthService(apiService, configService);
    const feeService = new FeeService(configService);
    const signService = new SignService();
    const accountServiceContext = new AccountServiceContext(apiService, configService);
    const tokenServiceContext = new TokenServiceContext(apiService, configService, feeService);
    const tradeService = new TradeService(apiService, tokenServiceContext);
    const signServiceContext = new SignServiceContext(apiService, configService, signService);
    const contractServiceContext = new ContractServiceContext(apiService, configService);

    const bladeSdk = new BladeSDK(
        configService,
        apiService,
        authService,
        accountServiceContext,
        tokenServiceContext,
        signServiceContext,
        contractServiceContext,
        tradeService,
        true
    );

    const sdkVersion = `Kotlin@${config.numberVersion}`;

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
            completionKey
        );
        checkResult(result);
    });

    test("bladeSdk-common.getCoinList", async () => {
        let result = await bladeSdk.getCoinList(completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("coins");
        expect(Array.isArray(result.data.coins)).toEqual(true);
        const coin = result.data.coins[0];
        expect(coin).toHaveProperty("id");
        expect(coin).toHaveProperty("symbol");
        expect(coin).toHaveProperty("name");
        expect(coin).toHaveProperty("platforms");
        expect(Array.isArray(coin.platforms)).toEqual(true);

        result = await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            "bad visitor id",
            process.env.SDK_ENV,
            sdkVersion,
            completionKey
        );
        checkResult(result);

        try {
            result = await bladeSdk.getCoinList(completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test("bladeSdk-common.getCoinPrice", async () => {
        let result = await bladeSdk.getCoinPrice("Hbar", "uah", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("priceUsd");
        expect(result.data).toHaveProperty("price");
        expect(result.data).toHaveProperty("coin");
        expect(result.data).toHaveProperty("currency");
        const coin = result.data.coin;
        expect(coin.id).toEqual("hedera-hashgraph");
        expect(coin.symbol).toEqual("hbar");
        expect(result.data.currency).toEqual("uah");
        expect(coin.market_data.current_price.usd).toEqual(result.data.priceUsd);

        result = await bladeSdk.getCoinPrice("0.0.0", "uah", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("hbar");

        result = await bladeSdk.getCoinPrice("0x80008bcd713c38af90a9930288d446bc3bd2e684", "php", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("karate");

        result = await bladeSdk.getCoinPrice(process.env.KARATE_TOKEN_ID, "", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("karate");

        result = await bladeSdk.getCoinPrice("karate-combat", "usd", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("karate");

        try {
            result = await bladeSdk.getCoinPrice("unknown token", "usd", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 10_000);

    // TODO refactor
    test("bladeSdk-common.ethersSign", async () => {
        const message = "hello";
        const messageString = Buffer.from(message).toString("base64");
        const wallet = new ethers.Wallet(PrivateKey.fromString(privateKey).toStringRaw());

        let result = await bladeSdk.ethersSign(messageString, privateKey, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("signedMessage");
        expect(result.data.signedMessage).toEqual(await wallet.signMessage(Buffer.from(message)));

        const signerAddress = ethers.utils.verifyMessage(message, result.data.signedMessage);
        expect(signerAddress).toEqual(ethers.utils.computeAddress(wallet.publicKey));

        try {
            // invalid calls
            result = await bladeSdk.ethersSign(messageString, "invalid privateKey", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        try {
            result = await bladeSdk.ethersSign(123, privateKey, completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test("bladeSdk-common.splitSignature", async () => {
        const message = "hello";
        const wallet = new ethers.Wallet(PrivateKey.fromStringDer(privateKey).toStringRaw());
        const signature = await wallet.signMessage(Buffer.from(message));

        let result = await bladeSdk.splitSignature(signature, completionKey);
        checkResult(result);

        const v: number = result.data.v;
        const r: string = result.data.r;
        const s: string = result.data.s;
        expect(signature).toEqual(ethers.utils.joinSignature({v, r, s}));

        // invalid signature
        try {
            result = await bladeSdk.splitSignature("invalid signature", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test("bladeSdk-common.getParamsSignature", async () => {
        const params = new ParametersBuilder()
            .addAddress(accountId)
            .addUInt64Array([300000, 300000])
            .addUInt64Array([6])
            .addUInt64Array([2]);

        let result = await bladeSdk.getParamsSignature(params, privateKey, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("v");
        expect(result.data).toHaveProperty("r");
        expect(result.data).toHaveProperty("s");

        expect(result.data.v).toEqual(27);
        expect(result.data.r).toEqual("0x0c6e8f0487709cfc1ebbc41e47ce56aee5cf5bc933a4cd6cb2695b098dbe4ee4");
        expect(result.data.s).toEqual("0x22d0b6351670c37eb112ebd80123452237cb5c893767510a9356214189f6fe86");

        try {
            // invalid paramsEncoded
            result = await bladeSdk.getParamsSignature('[{{{{{{{{{{{"]', privateKey, completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test("bladeSdk-common.getC14url", async () => {
        let result;
        result = await bladeSdk.getC14url("hbar", "0.0.123456", "123", completionKey);
        checkResult(result);
        expect(result.data).toHaveProperty("url");

        let url = result.data.url;
        expect(url.includes("clientId")).toEqual(true);
        expect(url.includes("targetAssetId")).toEqual(true);
        expect(url.includes("targetAssetIdLock")).toEqual(true);
        expect(url.includes("sourceAmount")).toEqual(true);
        expect(url.includes("quoteAmountLock")).toEqual(true);
        expect(url.includes("targetAddress")).toEqual(true);
        expect(url.includes("targetAddressLock")).toEqual(true);

        result = await bladeSdk.getC14url("usdc", "0.0.123456", "123", completionKey);
        url = result.data.url;
        expect(url.includes("clientId")).toEqual(true);
        expect(url.includes("targetAssetId")).toEqual(true);
        expect(url.includes("targetAssetIdLock")).toEqual(true);
        expect(url.includes("sourceAmount")).toEqual(true);
        expect(url.includes("quoteAmountLock")).toEqual(true);
        expect(url.includes("targetAddress")).toEqual(true);
        expect(url.includes("targetAddressLock")).toEqual(true);

        result = await bladeSdk.getC14url("unknown-asset", "", "", completionKey);
        url = result.data.url;
        expect(url.includes("clientId")).toEqual(true);
        expect(url.includes("targetAssetId")).toEqual(false);
        expect(url.includes("targetAssetIdLock")).toEqual(false);
        expect(url.includes("sourceAmount")).toEqual(false);
        expect(url.includes("quoteAmountLock")).toEqual(false);
        expect(url.includes("targetAddress")).toEqual(false);
        expect(url.includes("targetAddressLock")).toEqual(false);

        result = await bladeSdk.getC14url("1b487a96-a14a-47d1-a1e0-09c18d409671", "0.0.13421", "10", completionKey);
        checkResult(result);

        await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            process.env.VISITOR_ID,
            "Prod",
            sdkVersion,
            completionKey
        );

        try {
            result = await bladeSdk.getC14url("1b487a96-a14a-47d1-a1e0-09c18d409671", "0.0.13421", "10", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

}); // describe
