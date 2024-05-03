import {checkResult, completionKey, sleep} from "./helpers";
import ApiService from "../../src/services/ApiService";
import CryptoFlowService from "../../src/services/CryptoFlowService";
import ConfigService from "../../src/services/ConfigService";
import FeeService from "../../src/services/FeeService";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {TextDecoder, TextEncoder} from "util";
import crypto from "crypto";
import {AccountProvider} from "../../src/models/Common";
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
        subtle: crypto.webcrypto.subtle
    }
});

Object.assign(global, {TextDecoder, TextEncoder, fetch});

dotenv.config();

describe("testing methods related to ETHEREUM network", () => {
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
    const ethereumAddress = process.env.ETHEREUM_ADDRESS || "";
    const ethereumPrivateKey = process.env.ETHEREUM_PRIVATE_KEY || "";
    const ethereumAddress2 = process.env.ETHEREUM_ADDRESS2 || "";
    const ethereumMnemonic = process.env.ETHEREUM_MNEMONIC || "";

    const chainId = KnownChainIds.ETHEREUM_SEPOLIA;

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

    test("bladeSdk-ethereum.getBalance", async () => {
        let result;

        try {
            result = await bladeSdk.getBalance("", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, "", ethereumPrivateKey, completionKey);
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

        result = await bladeSdk.getBalance(ethereumAddress2, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("balance");
        expect(result.data).toHaveProperty("tokens");
        expect(Array.isArray(result.data.tokens)).toEqual(true);

        // invalid accountId
        try {
            result = await bladeSdk.getBalance("0.0.0", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 20_000);

    // test('bladeSdk-ethereum.transferBalance', async () => {
    //     let result = await bladeSdk.getBalance(accountId, completionKey);
    //     checkResult(result);
    //     const hbars = result.data.balance;
    //
    //     try {
    //         result = await bladeSdk.transferBalance(accountId2, "1.5", "custom memo text", completionKey);
    //         expect("Code should not reach here").toEqual(result);
    //     } catch (result) {
    //         checkResult(result, false);
    //     }
    //     result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
    //     checkResult(result);
    //
    //     result = await bladeSdk.transferBalance(accountId2, "1.5", "custom memo text", completionKey);
    //     checkResult(result);
    //
    //     expect(result.data).toHaveProperty("transactionHash");
    //     expect(result.data).toHaveProperty("transactionId");
    //
    //     // wait for balance update
    //     await sleep(20_000);
    //
    //     result = await bladeSdk.getBalance(accountId, completionKey);
    //     checkResult(result);
    //     expect(hbars).not.toEqual(result.data.balance);
    //
    //     try {
    //         // parseFloat exception
    //         result = await bladeSdk.transferBalance(accountId, "jhghjhgjghj", "custom memo text", completionKey);
    //         expect("Code should not reach here").toEqual(result);
    //     } catch (result) {
    //         checkResult(result, false);
    //     }
    // }, 60_000);
    //
    // test('bladeSdk-ethereum.transferTokens', async () => {
    //     const tokenName = "JEST Token Test";
    //     let result = await bladeSdk.getBalance(accountId, completionKey);
    //     checkResult(result);
    //
    //     let tokenId: string|null = null;
    //     // for (let i = 0; i < result.data.tokens.length; i++) {
    //     for (const token of result.data.tokens as TokenBalanceData[]) {
    //         const tokenInfo = await apiService.requestTokenInfo(token.address);
    //         if (tokenInfo.name === tokenName) {
    //             tokenId = tokenInfo.token_id;
    //             break;
    //         }
    //     }
    //
    //     if (!tokenId) {
    //         // Create token
    //         tokenId = await createToken(accountId, privateKey, tokenName);
    //     } else {
    //         // token exists
    //     }
    //
    //     await associateToken(tokenId, accountId2, privateKey2);
    //
    //     let account1Balance: BridgeResponse<BalanceData> = await bladeSdk.getBalance(accountId, completionKey);
    //     checkResult(account1Balance);
    //     const account1TokenBalance = (account1Balance.data.tokens.find(token => token.address === tokenId))?.balance || 0;
    //     let account2Balance: BridgeResponse<BalanceData> = await bladeSdk.getBalance(accountId2, completionKey);
    //     checkResult(account2Balance);
    //     const account2TokenBalance = (account2Balance.data.tokens.find(token => token.address === tokenId))?.balance || 0;
    //
    //     const amount = 1;
    //
    //     // invalid tokenId
    //     try {
    //         result = await bladeSdk.transferTokens("invalid token id", accountId2, amount.toString(), "transfer memo",false, completionKey);
    //         expect("Code should not reach here").toEqual(result);
    //     } catch (result) {
    //         checkResult(result, false);
    //     }
    //
    //     // no user
    //     try {
    //         result = await bladeSdk.transferTokens(tokenId.toString(), accountId2, amount.toString(), "transfer memo", false, completionKey);
    //         expect("Code should not reach here").toEqual(result);
    //     } catch (result) {
    //         checkResult(result, false);
    //     }
    //
    //     result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
    //     checkResult(result);
    //
    //     result = await bladeSdk.transferTokens(tokenId.toString(), accountId2, amount.toString(), "transfer memo", true, completionKey);
    //     checkResult(result);
    //     expect(result.data).toHaveProperty("transactionHash");
    //     expect(result.data).toHaveProperty("transactionId");
    //
    //     await sleep(20_000);
    //
    //     account1Balance = await bladeSdk.getBalance(accountId, completionKey);
    //     checkResult(account1Balance);
    //     const account1TokenBalanceNew = parseFloat((account1Balance.data.tokens.find(token => token.address === tokenId))?.balance) || 0;
    //     account2Balance = await bladeSdk.getBalance(accountId2, completionKey);
    //     checkResult(account2Balance);
    //     const account2TokenBalanceNew = parseFloat((account2Balance.data.tokens.find(token => token.address === tokenId))?.balance) || 0;
    //
    //     expect(account1TokenBalance).toEqual((account1TokenBalanceNew + amount).toString());
    //     expect(account2TokenBalance).toEqual((account2TokenBalanceNew - amount).toString());
    //
    //     result = await bladeSdk.transferTokens(tokenId.toString(), accountId2, amount.toString(), "transfer memo", true, completionKey);
    //     checkResult(result);
    // }, 120_000);
    //

    // test('bladeSdk-ethereum.getAccountInfo', async () => {
    //     let result;
    //     const account = await bladeSdk.createAccount("device-id", completionKey);
    //     checkResult(account);
    //     const newAccountId = account.data.accountId;
    //
    //     await sleep(15_000);
    //
    //     let accountInfo = await bladeSdk.getAccountInfo(newAccountId, completionKey);
    //     checkResult(accountInfo);
    //
    //     expect(accountInfo.data.evmAddress).toEqual(`0x${AccountId.fromString(newAccountId).toSolidityAddress()}`);
    //     expect(accountInfo.data.calculatedEvmAddress).toEqual(account.data.evmAddress);
    //
    //     try {
    //         accountInfo = await bladeSdk.getAccountInfo("////", completionKey);
    //         expect("Code should not reach here").toEqual(accountInfo);
    //     } catch (accountInfo) {
    //         checkResult(accountInfo, false);
    //     }
    //     result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
    //     checkResult(result);
    //     accountInfo = await bladeSdk.getAccountInfo("", completionKey);
    //     checkResult(accountInfo);
    //
    //     try {
    //         accountInfo = await bladeSdk.getAccountInfo("0.0.9999999999999999999999999", completionKey);
    //         expect("Code should not reach here").toEqual(accountInfo);
    //     } catch (accountInfo) {
    //         checkResult(accountInfo, false);
    //     }
    // }, 60_000);

    test("bladeSdk-ethereum.getKeysFromMnemonic", async () => {
        let result;

        result = await bladeSdk.getKeysFromMnemonic(ethereumMnemonic, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("accounts");
        expect(Array.isArray(result.data.accounts)).toEqual(true);
        expect(result.data.accounts.length).toEqual(10);
        expect(result.data.accounts[0]).toHaveProperty("privateKey");
        expect(result.data.accounts[0]).toHaveProperty("publicKey");
        expect(result.data.accounts[0]).toHaveProperty("address");
        expect(result.data.accounts[0]).toHaveProperty("evmAddress");
        expect(result.data.accounts[0]).toHaveProperty("path");
        expect(result.data.accounts[0]).toHaveProperty("keyType");
        expect(result.data.accounts[0].path).toEqual("m/44'/60'/0'/0/0");
        expect(result.data.accounts[0].keyType).toEqual("ECDSA_SECP256K1");
        expect(result.data.accounts[0].address).toEqual(result.data.accounts[0].evmAddress);
        expect(result.data.accounts[0].address).toEqual(ethereumAddress2);
    }, 60_000);

    // test('bladeSdk-ethereum.getTransactions', async () => {
    //     let result
    //
    //     // make transaction
    //     try {
    //         result = await bladeSdk.transferBalance(accountId2, "1.5", "some tx memo", completionKey);
    //         expect("Code should not reach here").toEqual(result);
    //     } catch (result) {
    //         checkResult(result, false);
    //     }
    //
    //     result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
    //     checkResult(result);
    //
    //     result = await bladeSdk.transferBalance(accountId2, "1.5", "some tx memo", completionKey);
    //     checkResult(result);
    //
    //     expect(result.data).toHaveProperty("transactionHash");
    //     expect(result.data).toHaveProperty("transactionId");
    //
    //     // get expected transaction
    //     result = await bladeSdk.getTransactions(accountId, "", "", "5", completionKey);
    //     checkResult(result);
    //
    //     expect(result.data).toHaveProperty("nextPage");
    //     expect(result.data).toHaveProperty("transactions");
    //     expect(Array.isArray(result.data.transactions)).toEqual(true);
    //
    //     const txIdEqual = (txId1: string, txId2: string) => {
    //         return isEqual(
    //             txId1.split(".").map(num => parseInt(num, 10)),
    //             txId2.split(".").map(num => parseInt(num, 10))
    //         );
    //     };
    //
    //     const nextPage = result.data.nextPage;
    //
    //     // next page
    //     result = await bladeSdk.getTransactions(accountId, "", nextPage, "5", completionKey);
    //     checkResult(result);
    //
    //     // filter by transactionType
    //     result = await bladeSdk.getTransactions(accountId, "CRYPTOTRANSFER", "", "5", completionKey);
    //     checkResult(result);
    //
    //     // filter by transactionType and add custom plainData in response
    //     result = await bladeSdk.getTransactions(accountId, "CRYPTOTRANSFERTOKEN", "", "5", completionKey);
    //     checkResult(result);
    //
    //     if (result.data.transactions.length) {
    //         expect(result.data.transactions[0]).toHaveProperty("plainData");
    //         expect(result.data.transactions[0].plainData).toHaveProperty("type");
    //         expect(result.data.transactions[0].plainData).toHaveProperty("token_id");
    //         expect(result.data.transactions[0].plainData).toHaveProperty("senders");
    //         expect(result.data.transactions[0].plainData).toHaveProperty("receivers");
    //         expect(result.data.transactions[0].plainData).toHaveProperty("amount");
    //     }
    //
    //     // invalid accountId
    //     try {
    //         result = await bladeSdk.getTransactions('0.dgsgsdgdsgdsgdsg', "", "", "5", completionKey);
    //         expect("Code should not reach here").toEqual(result);
    //     } catch (result) {
    //         checkResult(result, false);
    //     }
    //
    //     // invalid tx
    //     result = await apiService.getTransaction(Network.Testnet, "wrong tx id", accountId);
    //     expect(Array.isArray(result));
    //     expect(result.length).toEqual(0)
    // }, 30_000);
    //
    // test('bladeSdk-ethereum.createToken + nftMint + associateToken + transferTokens', async () => {
    //     const treasuryAccountId = accountId;
    //     const treasuryPrivateKey = privateKey;
    //
    //
    //     const supplyKey = privateKey;
    //     const adminKey = privateKey;
    //     const kycKey = privateKey1;
    //     const freezeKey = privateKey2;
    //     const wipeKey = privateKey3;
    //     const pauseKey = privateKey4;
    //     const feeScheduleKey = privateKey1;
    //
    //     // CREATE TOKEN
    //
    //     let result = await bladeSdk.getBalance(treasuryAccountId, completionKey);
    //     checkResult(result);
    //
    //     const tokenCount = result.data.tokens.length;
    //
    //     const tokenName = `SDK NFT test ${tokenCount}`;
    //     const tokenSymbol = `N++ ${tokenCount}`;
    //
    //     const keys: KeyRecord[] = [
    //         {type: KeyType.admin, privateKey: adminKey},
    //         // {type: KeyType.kyc, privateKey: kycKey},
    //         {type: KeyType.freeze, privateKey: freezeKey},
    //         {type: KeyType.wipe, privateKey: wipeKey},
    //         {type: KeyType.pause, privateKey: pauseKey},
    //         {type: KeyType.feeSchedule, privateKey: feeScheduleKey},
    //     ];
    //
    //     try {
    //         result = await bladeSdk.createToken(
    //             tokenName,
    //             tokenSymbol,
    //             true, // isNft
    //             keys,
    //             0, // decimals
    //             0, // initialSupply
    //             250, // maxSupply
    //             completionKey
    //         );
    //         expect("Code should not reach here").toEqual(result);
    //     } catch (result) {
    //         checkResult(result, false);
    //     }
    //
    //     result = await bladeSdk.setUser(AccountProvider.PrivateKey, treasuryAccountId, treasuryPrivateKey, completionKey);
    //     checkResult(result);
    //
    //     result = await bladeSdk.createToken(
    //         tokenName,
    //         tokenSymbol,
    //         true, // isNft
    //         keys,
    //         0, // decimals
    //         0, // initialSupply
    //         250, // maxSupply
    //         completionKey
    //     );
    //     checkResult(result);
    //
    //     expect(result.data).toHaveProperty("tokenId");
    //     const tokenId = result.data.tokenId;
    //
    //     await sleep(20_000);
    //     const tokenInfo: TokenInfo = await apiService.requestTokenInfo(tokenId);
    //
    //     expect(tokenInfo.admin_key.key).toEqual(PrivateKey.fromString(adminKey).publicKey.toStringRaw());
    //     expect(tokenInfo.fee_schedule_key.key).toEqual(PrivateKey.fromString(feeScheduleKey).publicKey.toStringRaw());
    //     expect(tokenInfo.freeze_key.key).toEqual(PrivateKey.fromString(freezeKey).publicKey.toStringRaw());
    //     // expect(tokenInfo.kyc_key.key).toEqual(PrivateKey.fromString(kycKey).publicKey.toStringRaw());
    //     expect(tokenInfo.pause_key.key).toEqual(PrivateKey.fromString(pauseKey).publicKey.toStringRaw());
    //     expect(tokenInfo.supply_key.key).toEqual(PrivateKey.fromString(supplyKey).publicKey.toStringRaw());
    //     expect(tokenInfo.wipe_key.key).toEqual(PrivateKey.fromString(wipeKey).publicKey.toStringRaw());
    //     expect(tokenInfo.decimals).toEqual("0");
    //     expect(tokenInfo.initial_supply).toEqual("0");
    //     expect(tokenInfo.max_supply).toEqual("250");
    //     expect(tokenInfo.name).toEqual(tokenName);
    //     expect(tokenInfo.symbol).toEqual(tokenSymbol);
    //     expect(tokenInfo.treasury_account_id).toEqual(treasuryAccountId);
    //     expect(tokenInfo.type).toEqual('NON_FUNGIBLE_UNIQUE');
    //
    //     // associate token with receiver account
    //     result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId2, privateKey2, completionKey);
    //     checkResult(result);
    //
    //     result = await bladeSdk.associateToken(
    //         tokenId,
    //         completionKey
    //     );
    //     checkResult(result);
    //
    //     await sleep(5_000);
    //
    //     result = await bladeSdk.setUser(AccountProvider.PrivateKey, treasuryAccountId, treasuryPrivateKey, completionKey);
    //     checkResult(result);
    //
    //     // MINT NFT
    //     result = await bladeSdk.nftMint(
    //         tokenId,
    //         "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAARUlEQVR42u3PMREAAAgEIO1fzU5vBlcPGtCVTD3QIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIXCyqyi6fIALs1AAAAAElFTkSuQmCC", // TODO upload file base64
    //         {
    //             author: "GaryDu",
    //         },
    //         {
    //             provider: NFTStorageProvider.nftStorage,
    //             apiKey: process.env.NFT_STORAGE_TOKEN,
    //         },
    //         completionKey
    //     );
    //     checkResult(result);
    //
    //     const serialNumber = result.data.serials[0];
    //
    //     // TRANSFER NFT
    //     await sleep(20_000);
    //
    //     result = await bladeSdk.transferTokens(tokenId, accountId2, serialNumber, "transfer NFT memo", false, completionKey);
    //     checkResult(result);
    // }, 180_000);

    test("bladeSdk-ethereum.contractCallFunction + contractCallQueryFunction", async () => {
        let result;
        const contractAddress = process.env.ETHEREUM_CONTRACT_ADDRESS || "";
        expect(contractAddress).not.toEqual("");

        let message = `Hello test ${Math.random()}`;
        let params = new ParametersBuilder().addString(message);

        try {
            result = await bladeSdk.contractCallFunction(
                contractAddress,
                "setMood",
                params,
                1000000,
                false,
                completionKey
            );
            expect("Code should not reach here1").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, "", ethereumPrivateKey, completionKey);
        checkResult(result);

        // direct call
        result = await bladeSdk.contractCallFunction(contractAddress, "setMood", params, 1000000, false, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("status");
        expect(result.data.status).toEqual("success");
        expect(result.data).toHaveProperty("contractAddress");
        expect(result.data).toHaveProperty("transactionHash");

        try {
            // wrong function signature (params with string record)
            result = await bladeSdk.contractCallQueryFunction(
                contractAddress,
                "getMood",
                params,
                1000000,
                false,
                ["string"],
                completionKey
            );
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        await sleep(10_000);
        params = new ParametersBuilder();
        result = await bladeSdk.contractCallQueryFunction(
            contractAddress,
            "getMood",
            params,
            1000000,
            false,
            ["string"],
            completionKey
        );
        checkResult(result);

        expect(Array.isArray(result.data.values)).toEqual(true);
        expect(result.data.values.length).toEqual(1);

        expect(result.data.values[0]).toHaveProperty("type");
        expect(result.data.values[0]).toHaveProperty("value");
        expect(result.data.values[0].type).toEqual("string");
        expect(result.data.values[0].value).toEqual(message);

        //     // pay fee on backend
        //     message = `Hello test ${Math.random()}`;
        //     params = new ParametersBuilder().addString(message);
        //     result = await bladeSdk.contractCallFunction(contractId, "set_message", params, 1000000, true, completionKey);
        //     checkResult(result);
        //
        //     contractCallQuery = new ContractCallQuery()
        //         .setContractId(contractId)
        //         .setGas(100000)
        //         .setFunction("get_message")
        //         .setQueryPayment(new Hbar(1));
        //
        //     await sleep(10_000);
        //
        //     contractCallQueryResult = await contractCallQuery.execute(client);
        //     expect(contractCallQueryResult.getString(0)).toEqual(message);
        //
        //
        //     message = `Sum test ${Math.random()}`;
        //     const num1 = 37;
        //     const num2 = 5;
        //     params = new ParametersBuilder().addString(message).addTuple(new ParametersBuilder().addUInt64(BigNumber(num1)).addUInt64(BigNumber(num2)));
        //     result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params.encode(), 1000000, false, completionKey);
        //     checkResult(result);
        //
        //     await sleep(10_000);
        //
        //     contractCallQuery = new ContractCallQuery()
        //         .setContractId(contractId)
        //         .setGas(100000)
        //         .setFunction("get_sum")
        //         .setQueryPayment(new Hbar(1));
        //
        //     contractCallQueryResult = await contractCallQuery.execute(client);
        //     expect(contractCallQueryResult.getString(0)).toEqual(message);
        //     expect(contractCallQueryResult.getUint64(1).toNumber()).toEqual(num1 + num2);
        //
        //
        //     try {
        //         // fail on wrong function params (CONTRACT_REVERT_EXECUTED)
        //         params = new ParametersBuilder().addString(message).addAddress("0x65f17cac69fb3df1328a5c239761d32e8b346da0").addAddressArray([accountId, accountId2]).addTuple(new ParametersBuilder().addUInt64(BigNumber(num1)).addUInt64(BigNumber(num2)));
        //         result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params.encode(), 1000000, false, completionKey);
        //         expect("Code should not reach here2").toEqual(result);
        //     } catch (result) {
        //         checkResult(result, false);
        //         expect(result.error.reason.includes("CONTRACT_REVERT_EXECUTED")).toEqual(true);
        //     }
        //
        //     try {
        //         // fail on invalid json
        //         const paramsEncoded = '[{"type":"string",""""""""]'
        //         result = await bladeSdk.contractCallFunction(contractId, "set_numbers", paramsEncoded, 1000000, false, completionKey);
        //         expect("Code should not reach here3").toEqual(result);
        //     } catch (result) {
        //         checkResult(result, false);
        //         expect(result.error.reason.includes("Unexpected token")).toEqual(true);
        //     }
        //
        //     try {
        //         // fail on low gas
        //         params = new ParametersBuilder().addString(message).addTuple(new ParametersBuilder().addUInt64(BigNumber(num1)).addUInt64(BigNumber(num2)));
        //         result = await bladeSdk.contractCallFunction(contractId, "set_message", params, 1, false, completionKey);
        //         expect("Code should not reach here4").toEqual(result);
        //     } catch (result) {
        //         checkResult(result, false);
        //         expect(result.error.reason.includes("INSUFFICIENT_GAS")).toEqual(true);
        //     }
    }, 120_000);

    test("bladeSdk-ethereum.sign + signVerify", async () => {
        let result;
        const message = "hello";
        const messageString = Buffer.from(message).toString("base64");

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, "", ethereumPrivateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.sign(message, "utf8", completionKey);
        checkResult(result);
        expect(result.data).toHaveProperty("signedMessage");

        const signedMessage = result.data.signedMessage;

        result = await bladeSdk.sign(Buffer.from(message).toString("base64"), "base64", completionKey);
        checkResult(result);
        expect(result.data.signedMessage).toEqual(signedMessage);

        result = await bladeSdk.sign(Buffer.from(message).toString("hex"), "hex", completionKey);
        checkResult(result);
        expect(result.data.signedMessage).toEqual(signedMessage);

        let validationResult = await bladeSdk.verify(message, "utf8", result.data.signedMessage, "", completionKey);
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(true);

        validationResult = await bladeSdk.verify(
            message,
            "utf8",
            result.data.signedMessage,
            process.env.ETHEREUM_ADDRESS,
            completionKey
        );
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(true);

        validationResult = await bladeSdk.verify(
            message + "wrong data",
            "utf8",
            result.data.signedMessage,
            "",
            completionKey
        );
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(false);

        // wrong address
        validationResult = await bladeSdk.verify(
            message,
            "utf8",
            result.data.signedMessage,
            process.env.ETHEREUM_ADDRESS2,
            completionKey
        );
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(false);
    });
}); // describe
