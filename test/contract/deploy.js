/**
 RUN: npm run test_deploy_contract
 */

require("dotenv").config();
const {FileCreateTransaction, AccountId, PrivateKey, Client, ContractCreateTransaction, ContractFunctionParameters} = require("@hashgraph/sdk");
const fs = require("fs");

const contractBytecode = fs.readFileSync("./test/contract/test_contract_TestContract_sol_HelloHedera.bin", "utf8");

(async () => {
    const accountIdTest = AccountId.fromString(process.env.ACCOUNT_ID);
    const accountKeyTest = PrivateKey.fromStringECDSA( process.env.PRIVATE_KEY);

    // If we weren't able to grab it, we should throw a new error
    if (accountIdTest == null || accountKeyTest == null) {
        throw new Error("Environment variables ACCOUNT_ID and PRIVATE_KEY must be present");
    }

    console.log(`Deploying contract for ${accountIdTest} account`);

    const client = Client.forTestnet();
    client.setOperator(accountIdTest, accountKeyTest);

    // Store Smart contract bytecode

    // Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = new FileCreateTransaction()
        // Set the bytecode of the contract
        .setContents(contractBytecode);

    // Submit the file to the Hedera test network signing with the transaction fee payer key specified with the client
    const submitTx = await fileCreateTx.execute(client);

    // Get the receipt of the file create transaction
    const fileReceipt = await submitTx.getReceipt(client);

    // Get the file ID from the receipt
    const bytecodeFileId = fileReceipt.fileId;

    // Log the file ID
    // console.log(`*** The smart contract byte code file ID is ${bytecodeFileId} ***`)

    // Instantiate the contract instance
    const contractTx = await new ContractCreateTransaction()
        // Set the file ID of the Hedera file storing the bytecode
        .setBytecodeFileId(bytecodeFileId)
        // Set the gas to instantiate the contract
        .setGas(1000000)
        // Provide the constructor parameters for the contract
        .setConstructorParameters(new ContractFunctionParameters().addString("Just created!"));

    // Submit the transaction to the Hedera test network
    const contractResponse = await contractTx.execute(client);

    // Get the receipt of the file create transaction
    const contractReceipt = await contractResponse.getReceipt(client);

    // Get the smart contract ID
    const newContractId = contractReceipt.contractId;

    // Log the smart contract ID
    console.log("************************************************************");
    console.log("************************************************************");
    console.log(`*** The smart contract ID is ${newContractId}`);
    console.log("*** Set this contractId as environment variable in *.env ***");
    console.log("************************************************************");
    console.log("************************************************************");

    process.exit();
})();
