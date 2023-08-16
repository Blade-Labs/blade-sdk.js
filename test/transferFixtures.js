/**
 RUN: node test/transferFixtures.js
 */

require("dotenv").config();
const {PrivateKey, Client, TransferTransaction} = require("@hashgraph/sdk");

(async () => {
    /**
     Token1 - 0.0.416487 STT_1m

     Account0                   Account1                   Account2                   Account3
     10 Hbar -> Account1
     12 Hbar -> Account2
     15 HBAR -> Account1 + Account2 + Account3

     10 Token1 -> Account1
     14 Token1 -> Account1 + Account2
     15 Token1 -> Account1 + Account2 + Account3

     14 Token                                              24 Token                                  ->   Acc0 (8),  Acc1 (15), Acc2 (7),   Acc3 (8)
                                                                                                                            ||
                                                                                                                            V
                                                                                                         Acc0 (-6), Acc1 (15), Acc2 (-17), Acc3 (8)

     ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                                                           30 Hbar -> Account0
                                                           40 Hbar -> Account1
                                                           50 HBAR -> Account0 + Account1 + Account3

                                                           25 Token1 -> Account0
                                                           36 Token1 -> Account0 + Account1
                                                           45 Token1 -> Account0 + Account1 + Account3
     */
    const tokens = [
        "0.0.416487", // STT_1m
        "0.0.416406" // GTT
    ];

    const accounts = [{
        id: "0.0.346533",
        key: "3030020100300706052b8104000a04220420ebccecef769bb5597d0009123a0fd96d2cdbe041c2a2da937aaf8bdc8731799b"
    }, {
        id: "0.0.436560",
        key: "3030020100300706052b8104000a04220420ba9ae0a421111c07f6ccc6ea56ce01f06acd15c2ee50761befb23324d7a2438e"
    }, {
        id: "0.0.346532",
        key: "302e020100300506032b6570042204201c1fc6ab4f5937bf9261cd3d1f1609cb5f30838d018207b476ff50d97ef8e2a5"
    }, {
        id: "0.0.346530",
        key: "302e020100300506032b657004220420ddffbba40f32e1459bc349175f9b607f2186a0b328daf617cc98487a94c55f9d"
    }];

    let client = Client.forTestnet();
    client.setOperator(accounts[0].id, accounts[0].key);

    console.log(await (await (await (new TransferTransaction()
            .addHbarTransfer(accounts[0].id, -10)
            .addHbarTransfer(accounts[1].id, 10)
            .setTransactionMemo(`10 Hbar. ${accounts[0].id} -> ${accounts[1].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addHbarTransfer(accounts[0].id, -12)
            .addHbarTransfer(accounts[2].id, 12)
            .setTransactionMemo(`12 Hbar. ${accounts[0].id} -> ${accounts[2].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addHbarTransfer(accounts[0].id, -15)
            .addHbarTransfer(accounts[1].id, 5)
            .addHbarTransfer(accounts[2].id, 5)
            .addHbarTransfer(accounts[3].id, 5)
            .setTransactionMemo(`3*5 Hbar. ${accounts[0].id} -> ${accounts[1].id} + ${accounts[2].id} + ${accounts[3].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addTokenTransfer(tokens[0], accounts[0].id, -10)
            .addTokenTransfer(tokens[0], accounts[1].id, 10)
            .setTransactionMemo(`10 token. ${accounts[0].id} -> ${accounts[1].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addTokenTransfer(tokens[0], accounts[0].id, -14)
            .addTokenTransfer(tokens[0], accounts[1].id, 7)
            .addTokenTransfer(tokens[0], accounts[2].id, 7)
            .setTransactionMemo(`2*7 token. ${accounts[0].id} -> ${accounts[1].id} + ${accounts[2].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addTokenTransfer(tokens[0], accounts[0].id, -15)
            .addTokenTransfer(tokens[0], accounts[1].id, 5)
            .addTokenTransfer(tokens[0], accounts[2].id, 5)
            .addTokenTransfer(tokens[0], accounts[3].id, 5)
            .setTransactionMemo(`3*5 token. ${accounts[0].id} -> ${accounts[1].id} + ${accounts[2].id} + ${accounts[3].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await ((await (await new TransferTransaction()
            .addTokenTransfer(tokens[0], accounts[0].id, -14)
            .addTokenTransfer(tokens[0], accounts[2].id, -24)
            .addTokenTransfer(tokens[0], accounts[0].id, 8)
            .addTokenTransfer(tokens[0], accounts[1].id, 15)
            .addTokenTransfer(tokens[0], accounts[2].id, 7)
            .addTokenTransfer(tokens[0], accounts[3].id, 8)
            .addTokenTransfer(tokens[1], accounts[1].id, 30)
            .setTransactionMemo(`multi-send`)
            .freezeWith(client)
            .sign(PrivateKey.fromString(accounts[0].key)))
            .sign(PrivateKey.fromString(accounts[2].key)))

            .execute(client)
    )).getReceipt(client)).status.toString());

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    client = Client.forTestnet();
    client.setOperator(accounts[2].id, accounts[2].key);


    console.log(await (await (await (new TransferTransaction()
            .addHbarTransfer(accounts[2].id, -30)
            .addHbarTransfer(accounts[0].id, 30)
            .setTransactionMemo(`30 Hbar. ${accounts[2].id} -> ${accounts[0].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addHbarTransfer(accounts[2].id, -12)
            .addHbarTransfer(accounts[1].id, 12)
            .setTransactionMemo(`12 Hbar. ${accounts[2].id} -> ${accounts[1].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addHbarTransfer(accounts[2].id, -15)
            .addHbarTransfer(accounts[0].id, 5)
            .addHbarTransfer(accounts[1].id, 5)
            .addHbarTransfer(accounts[3].id, 5)
            .setTransactionMemo(`3*5 Hbar. ${accounts[2].id} -> ${accounts[0].id} + ${accounts[1].id} + ${accounts[3].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addTokenTransfer(tokens[0], accounts[2].id, -25)
            .addTokenTransfer(tokens[0], accounts[0].id, 25)
            .setTransactionMemo(`25 Token. ${accounts[2].id} -> ${accounts[0].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addTokenTransfer(tokens[0], accounts[2].id, -36)
            .addTokenTransfer(tokens[0], accounts[0].id, 18)
            .addTokenTransfer(tokens[0], accounts[1].id, 18)
            .setTransactionMemo(`2*18 Token. ${accounts[2].id} -> ${accounts[0].id} + ${accounts[1].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    console.log(await (await (await (new TransferTransaction()
            .addTokenTransfer(tokens[0], accounts[2].id, -45)
            .addTokenTransfer(tokens[0], accounts[0].id, 15)
            .addTokenTransfer(tokens[0], accounts[1].id, 15)
            .addTokenTransfer(tokens[0], accounts[3].id, 15)
            .setTransactionMemo(`3*15 Token. ${accounts[2].id} -> ${accounts[0].id} + ${accounts[1].id} + ${accounts[3].id}`)
            .execute(client)
    )).getReceipt(client)).status.toString());

    process.exit();
})();
