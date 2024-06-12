require("dotenv").config();
const {
    FileCreateTransaction,
    FileAppendTransaction,
    AccountId,
    PrivateKey,
    Client,
    ContractCreateTransaction,
    ContractFunctionParameters,
} = require("@hashgraph/sdk");
const fs = require("fs");

const contractBytecode = fs.readFileSync("./test/contract/test_contract_TestContract_sol_HelloHedera.bin");

(async () => {
    const accountIdTest = AccountId.fromString(process.env.ACCOUNT_ID);
    const accountKeyTest = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);

    if (!accountIdTest || !accountKeyTest) {
        throw new Error("Environment variables ACCOUNT_ID and PRIVATE_KEY must be present");
    }

    console.log(`Deploying contract for ${accountIdTest} account`);

    const client = Client.forTestnet();
    client.setOperator(accountIdTest, accountKeyTest);

    console.log('client', client);

    try {
        // Create a file on Hedera and store the bytecode in chunks
        const fileCreateTx = new FileCreateTransaction()
            .setKeys([accountKeyTest.publicKey])
            .setContents(contractBytecode.slice(0, 4096)) // First chunk
            .setMaxTransactionFee(2000000); // Adjust this value as needed

        console.log('fileCreateTx', fileCreateTx);

        const submitTx = await fileCreateTx.execute(client);
        const fileReceipt = await submitTx.getReceipt(client);
        const bytecodeFileId = fileReceipt.fileId;

        console.log(`The smart contract byte code file ID is ${bytecodeFileId}`);

        // Append the rest of the bytecode if it's larger than 4096 bytes
        if (contractBytecode.length > 4096) {
            let startIndex = 4096;
            while (startIndex < contractBytecode.length) {
                const endIndex = Math.min(startIndex + 4096, contractBytecode.length);
                const fileAppendTx = new FileAppendTransaction()
                    .setFileId(bytecodeFileId)
                    .setContents(contractBytecode.slice(startIndex, endIndex))
                    .setMaxTransactionFee(2_000_000); // Adjust this value as needed

                await fileAppendTx.execute(client);
                startIndex = endIndex;
            }
        }

        const contractTx = new ContractCreateTransaction()
            .setBytecodeFileId(bytecodeFileId)
            .setGas(5000000) // Increase if needed
            .setConstructorParameters(new ContractFunctionParameters().addString("Just created!"))
            .setMaxTransactionFee(2000000); // Adjust this value as needed

        const contractResponse = await contractTx.execute(client);
        const contractReceipt = await contractResponse.getReceipt(client);
        const newContractId = contractReceipt.contractId;

        console.log("************************************************************");
        console.log("************************************************************");
        console.log(`*** The smart contract ID is ${newContractId}`);
        console.log("*** Set this contractId as environment variable in *.env ***");
        console.log("************************************************************");
        console.log("************************************************************");

        process.exit();
    } catch (error) {
        console.error("Error deploying contract:", error);
        process.exit(1);
    }
})();
