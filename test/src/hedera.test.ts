import {associateToken, checkResult, createToken, sleep} from "./helpers";
import ApiService from "../../src/services/ApiService";
import CryptoFlowService from "../../src/services/CryptoFlowService";
import ConfigService from "../../src/services/ConfigService";
import FeeService from "../../src/services/FeeService";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {TextDecoder, TextEncoder} from 'util';
import crypto from "crypto";
import {AccountProvider, BalanceData, BridgeResponse, TokenBalanceData} from "../../src/models/Common";
import {Network} from "../../src/models/Networks";
import AccountServiceContext from "../../src/strategies/AccountServiceContext";
import TokenServiceContext from "../../src/strategies/TokenServiceContext";
import SignServiceContext from "../../src/strategies/SignServiceContext";
import ContractServiceContext from "../../src/strategies/ContractServiceContext";
import TradeServiceContext from "../../src/strategies/TradeServiceContext";
import {KnownChainIds} from "../../src/models/Chain";
import SignService from "../../src/services/SignService";
import { ethers } from "ethers";
import {AccountId, Mnemonic, PrivateKey } from "@hashgraph/sdk";
import {isEqual} from "lodash";

const {BladeSDK} = require("../../src/webView");

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle,
    },
});

Object.assign(global, { TextDecoder, TextEncoder, fetch });

dotenv.config();

describe('testing methods related to HEDERA network', () => {

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
        let result;

        try {
            result = await bladeSdk.getBalance("", completionKey);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
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

    test('bladeSdk-hedera.transferBalance', async () => {
        let result = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(result);
        const hbars = result.data.balance;

        try {
            result = await bladeSdk.transferBalance(accountId2, "1.5", "custom memo text", completionKey);
        } catch (result) {
            checkResult(result, false);
        }
        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.transferBalance(accountId2, "1.5", "custom memo text", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("transactionHash");
        expect(result.data).toHaveProperty("transactionId");

        // wait for balance update
        await sleep(20_000);

        result = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(result);
        expect(hbars).not.toEqual(result.data.balance);

        try {
            // parseFloat exception
            result = await bladeSdk.transferBalance(accountId, "jhghjhgjghj", "custom memo text", completionKey);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test('bladeSdk-hedera.transferTokens', async () => {
        const tokenName = "JEST Token Test";
        let result = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(result);

        let tokenId: string|null = null;
        // for (let i = 0; i < result.data.tokens.length; i++) {
        for (const token of result.data.tokens as TokenBalanceData[]) {
            const tokenInfo = await apiService.requestTokenInfo(token.address);
            if (tokenInfo.name === tokenName) {
                tokenId = tokenInfo.token_id;
                break;
            }
        }

        if (!tokenId) {
            // Create token
            tokenId = await createToken(accountId, privateKey, tokenName);
        } else {
            // token exists
        }

        await associateToken(tokenId, accountId2, privateKey2);

        let account1Balance: BridgeResponse<BalanceData> = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(account1Balance);
        const account1TokenBalance = (account1Balance.data.tokens.find(token => token.address === tokenId))?.balance || 0;
        let account2Balance: BridgeResponse<BalanceData> = await bladeSdk.getBalance(accountId2, completionKey);
        checkResult(account2Balance);
        const account2TokenBalance = (account2Balance.data.tokens.find(token => token.address === tokenId))?.balance || 0;

        const amount = 1;

        // invalid tokenId
        try {
            result = await bladeSdk.transferTokens("invalid token id", accountId2, amount.toString(), "transfer memo",false, completionKey);
        } catch (result) {
            checkResult(result, false);
        }

        // no user
        try {
            result = await bladeSdk.transferTokens(tokenId.toString(), accountId2, amount.toString(), "transfer memo", false, completionKey);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.transferTokens(tokenId.toString(), accountId2, amount.toString(), "transfer memo", true, completionKey);
        checkResult(result);
        expect(result.data).toHaveProperty("transactionHash");
        expect(result.data).toHaveProperty("transactionId");

        await sleep(20_000);

        account1Balance = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(account1Balance);
        const account1TokenBalanceNew = parseFloat((account1Balance.data.tokens.find(token => token.address === tokenId))?.balance) || 0;
        account2Balance = await bladeSdk.getBalance(accountId2, completionKey);
        checkResult(account2Balance);
        const account2TokenBalanceNew = parseFloat((account2Balance.data.tokens.find(token => token.address === tokenId))?.balance) || 0;

        expect(account1TokenBalance).toEqual((account1TokenBalanceNew + amount).toString());
        expect(account2TokenBalance).toEqual((account2TokenBalanceNew - amount).toString());

        result = await bladeSdk.transferTokens(tokenId.toString(), accountId2, amount.toString(), "transfer memo", true, completionKey);
        checkResult(result);
    }, 120_000);

    test('bladeSdk-hedera.createAccount', async () => {
        let result;

        result = await bladeSdk.createAccount("device-id", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("seedPhrase");
        expect(result.data).toHaveProperty("publicKey");
        expect(result.data).toHaveProperty("privateKey");
        expect(result.data).toHaveProperty("accountId");
        expect(result.data).toHaveProperty("evmAddress");

        await sleep(25_000);

        const publicKey = PrivateKey.fromString(result.data.privateKey).publicKey.toStringRaw();
        const evmAddress = ethers.utils.computeAddress(`0x${publicKey}`);

        expect(result.data.evmAddress).toEqual(evmAddress.toLowerCase());

        result = await bladeSdk.init("wrong api key", chainId, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
        checkResult(result);

        // fail on wrong api key
        try {
            result = await bladeSdk.createAccount("device-id", completionKey);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test('bladeSdk-hedera.getAccountInfo', async () => {
        let result;
        const account = await bladeSdk.createAccount("device-id", completionKey);
        checkResult(account);
        const newAccountId = account.data.accountId;

        await sleep(15_000);

        let accountInfo = await bladeSdk.getAccountInfo(newAccountId, completionKey);
        checkResult(accountInfo);

        expect(accountInfo.data.evmAddress).toEqual(`0x${AccountId.fromString(newAccountId).toSolidityAddress()}`);
        expect(accountInfo.data.calculatedEvmAddress).toEqual(account.data.evmAddress);

        try {
            accountInfo = await bladeSdk.getAccountInfo("////", completionKey);
        } catch (accountInfo) {
            checkResult(accountInfo, false);
        }
        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);
        accountInfo = await bladeSdk.getAccountInfo("", completionKey);
        checkResult(accountInfo);

        try {
            accountInfo = await bladeSdk.getAccountInfo("0.0.9999999999999999999999999", completionKey);
        } catch (accountInfo) {
            checkResult(accountInfo, false);
        }
    }, 60_000);

    test('bladeSdk-hedera.deleteAccount', async () => {
        let result;

        result = await bladeSdk.createAccount("device-id", completionKey);
        checkResult(result);
        const newAccountId = result.data.accountId;
        const newPrivateKey = result.data.privateKey;

        try {
            result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, completionKey);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, completionKey);
        checkResult(result);

        await sleep(15_000);
        result = await apiService.GET(Network.Testnet, `api/v1/accounts/${newAccountId}`);
        expect(result.deleted).toEqual(true);

        // invalid request (already deleted)
        try {
            result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, completionKey);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test('bladeSdk-hedera.getKeysFromMnemonic', async () => {
        let result;
        result = await bladeSdk.createAccount("device-id", completionKey);
        checkResult(result);

        const accountSample = {
            accountId: result.data.accountId,
            privateKey: result.data.privateKey,
            publicKey: result.data.publicKey,
            seedPhrase: result.data.seedPhrase,
            evmAddress: result.data.evmAddress
        }

        result = await bladeSdk.getKeysFromMnemonic(accountSample.seedPhrase, false, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("privateKey");
        expect(result.data).toHaveProperty("publicKey");
        expect(result.data).toHaveProperty("accounts");
        expect(result.data).toHaveProperty("evmAddress");
        expect(Array.isArray(result.data.accounts)).toEqual(true);
        expect(result.data.accounts.length).toEqual(0);

        expect(result.data.privateKey).toEqual(accountSample.privateKey);
        expect(result.data.publicKey).toEqual(accountSample.publicKey);
        expect(result.data.evmAddress).toEqual(accountSample.evmAddress);

        await sleep(7000);

        result = await bladeSdk.getKeysFromMnemonic(accountSample.seedPhrase, true, completionKey);
        checkResult(result);

        expect(result.data.accounts.length).toEqual(1);
        expect(result.data.accounts[0]).toEqual(accountSample.accountId);

        try {
            result = await bladeSdk.getKeysFromMnemonic("invalid seed phrase", true, completionKey);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.getKeysFromMnemonic((await Mnemonic.generate12()).toString(), true, completionKey);
        checkResult(result);
        expect(result.data.accounts.length).toEqual(0);
    }, 60_000);

    test('bladeSdk-hedera.getTransactions', async () => {
        let result

        // make transaction
        try {
            result = await bladeSdk.transferBalance(accountId2, "1.5", "some tx memo", completionKey);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.transferBalance(accountId2, "1.5", "some tx memo", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("transactionHash");
        expect(result.data).toHaveProperty("transactionId");

        // get expected transaction
        result = await bladeSdk.getTransactions(accountId, "", "", "5", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("nextPage");
        expect(result.data).toHaveProperty("transactions");
        expect(Array.isArray(result.data.transactions)).toEqual(true);

        const txIdEqual = (txId1: string, txId2: string) => {
            return isEqual(
                txId1.split(".").map(num => parseInt(num, 10)),
                txId2.split(".").map(num => parseInt(num, 10))
            );
        };

        const nextPage = result.data.nextPage;

        // next page
        result = await bladeSdk.getTransactions(accountId, "", nextPage, "5", completionKey);
        checkResult(result);

        // filter by transactionType
        result = await bladeSdk.getTransactions(accountId, "CRYPTOTRANSFER", "", "5", completionKey);
        checkResult(result);

        // filter by transactionType and add custom plainData in response
        result = await bladeSdk.getTransactions(accountId, "CRYPTOTRANSFERTOKEN", "", "5", completionKey);
        checkResult(result);

        if (result.data.transactions.length) {
            expect(result.data.transactions[0]).toHaveProperty("plainData");
            expect(result.data.transactions[0].plainData).toHaveProperty("type");
            expect(result.data.transactions[0].plainData).toHaveProperty("token_id");
            expect(result.data.transactions[0].plainData).toHaveProperty("senders");
            expect(result.data.transactions[0].plainData).toHaveProperty("receivers");
            expect(result.data.transactions[0].plainData).toHaveProperty("amount");
        }

        // invalid accountId
        try {
            result = await bladeSdk.getTransactions('0.dgsgsdgdsgdsgdsg', "", "", "5", completionKey);
        } catch (result) {
            checkResult(result, false);
        }

        // invalid tx
        result = await apiService.getTransaction(Network.Testnet, "wrong tx id", accountId);
        expect(Array.isArray(result));
        expect(result.length).toEqual(0)
    }, 30_000);
}); // describe

