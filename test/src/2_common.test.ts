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
}); // describe
