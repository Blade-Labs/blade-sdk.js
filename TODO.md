
| Hedera | Ethereum | Method                            | Comment / TODO                        |
|--------|----------|-----------------------------------|---------------------------------------|
| ✅      | ✅        | init                              |                                       |
| ✅      | ✅        | getInfo                           |                                       |
| ✅      | ✅        | setUser                           |                                       |
| ✅      | ✅        | resetUser                         |                                       |
| ✅      | ✅        | getBalance                        |                                       |
| ✅      | ❓        | transferBalance                   | test eth                              |
| ✅      | ❓        | transferTokens                    | test eth                              |
| ✅      | ✅        | getCoinList                       |                                       |
| ✅      | ✅        | getCoinPrice                      |                                       |
| ✅      | ❓        | contractCallFunction              | test eth                              |
| ✅      | ❓        | contractCallQueryFunction         | test eth                              |
| ✅      | ❌        | createScheduleTransaction         |                                       |
| ✅      | ❌        | signScheduleId                    |                                       |
| ✅      | ❓        | createAccount                     | implement for eth                     |
| ❌      | ❌        | getPendingAccount                 | removed in v8                         |
| ✅      | ❌        | deleteAccount                     |                                       |
| ✅      | ❓        | getAccountInfo                    | fix tests for eth                     |
| ✅      | ❌        | getNodeList                       |                                       |
| ✅      | ❌        | stakeToNode                       |                                       |
| ❌      | ❌        | getKeysFromMnemonic               | removed in 0.8                        |
| ✅      | ❓        | searchAccounts                    | test for ETH                          |
| ✅      | ❓        | dropTokens                        | check if we need this for ETH         |
| ❓      | ✅        | sign                              | optionally sign with Ethers on Hedera |
| ✅      | ✅        | verify                            |                                       |
| ❌      | ❌        | ethersSign                        |                                       |
| ✅      | ✅        | splitSignature                    |                                       |
| ❓      | ❓        | getParamsSignature                | implement with signer                 |
| ✅      | ❓        | getTransactions                   | test for ETH                          |
| ❌      | ❌        | getC14url                         | remove in 0.8.                        |
| ✅      | ❓        | exchangeGetQuotes                 | test for eth                          |
| ✅      | ❓        | swapTokens                        | test for eth                          |
| ✅      | ❓        | getTradeUrl                       | test for eth                          |
| ✅      | ❓        | createToken                       |                                       |
| ✅      | ❓        | associateToken                    |                                       |
| ✅      | ❓        | nftMint (delete token after test) |                                       |
| ✅      | ❓        | getTokenInfo                      | implement for ETH                     |

