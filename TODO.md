
| Hedera | Ethereum | Method                            | Comment / TODO                        |
|------|----------|-----------------------------------|---------------------------------------|
| ✅    | ✅        | init                              |                                       |
| ✅    | ✅        | getInfo                           |                                       |
| ✅    | ✅        | setUser                           |                                       |
| ✅    | ✅        | resetUser                         |                                       |
| ✅    | ✅        | getBalance                        |                                       |
| ✅    | ✅        | transferBalance                   |                                       |
| ✅    | ✅*       | transferTokens                    | implement use payMaster               |
| ✅    | ✅        | getCoinList                       |                                       |
| ✅    | ✅        | getCoinPrice                      |                                       |
| ✅    | ✅        | contractCallFunction              | implement use payMaster               |
| ✅    | ✅        | contractCallQueryFunction         | implement use payMaster               |
| ✅    | ❌        | createScheduleTransaction         |                                       |
| ✅    | ❌        | signScheduleId                    |                                       |
| ✅    | ❓        | createAccount                     | implement for eth                     |
| ❌    | ❌        | getPendingAccount                 | removed in v8                         |
| ✅    | ❌        | deleteAccount                     |                                       |
| ✅    | ❓        | getAccountInfo                    | fix tests for eth                     |
| ✅    | ❌        | getNodeList                       |                                       |
| ✅    | ❌        | stakeToNode                       |                                       |
| ❌    | ❌        | getKeysFromMnemonic               | removed in 0.8                        |
| ✅    | ✅        | searchAccounts                    |                                       |
| ✅    | ❓        | dropTokens                        | check if we need this for ETH         |
| ❓    | ✅        | sign                              | optionally sign with Ethers on Hedera |
| ✅    | ✅        | verify                            |                                       |
| ❌    | ❌        | ethersSign                        |                                       |
| ✅    | ✅        | splitSignature                    |                                       |
| ❓    | ❓        | getParamsSignature                | implement with signer                 |
| ✅    | ✅        | getTransactions                   |                                       |
| ❌    | ❌        | getC14url                         | removed in 0.8.                       |
| ✅    | ❓        | exchangeGetQuotes                 | test for eth                          |
| ✅    | ❓        | swapTokens                        | test for eth                          |
| ✅    | ❓        | getTradeUrl                       | test for eth                          |
| ✅    | ❓        | createToken                       |                                       |
| ✅    | ❓        | associateToken                    |                                       |
| ✅    | ❓        | nftMint (delete token after test) |                                       |
| ✅    | ❓        | getTokenInfo                      | implement for ETH                     |

