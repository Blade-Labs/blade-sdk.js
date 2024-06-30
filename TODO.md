
| Hedera | Ethereum | Method                            | Comment / TODO                                                    |
|--------|----------|-----------------------------------|-------------------------------------------------------------------|
| ✅      | ✅        | init                              |                                                                   |
| ✅      | ✅        | getInfo                           |                                                                   |
| ✅      | ✅        | setUser                           |                                                                   |
| ✅      | ✅        | resetUser                         |                                                                   |
| ✅      | ✅        | getBalance                        |                                                                   |
| ✅      | ❓        | transferBalance                   | test eth                                                          |
| ✅      | ❓        | transferTokens                    | test eth                                                          |
| ❓      | ❌        | getCoinList                       | move to v8                                                        |
| ❓      | ❌        | getCoinPrice                      | move to v8                                                        |
| ✅      | ❓        | contractCallFunction              | test eth                                                          |
| ✅      | ❓        | contractCallQueryFunction         | test eth. failing on hedera                                       |
| ❓      | ❓        | createScheduleTransaction         | fix v8 integration                                                |
| ❓      | ❓        | signScheduleId                    | fix v8 integration                                                |
| ✅      | ❓        | createAccount                     | implement for eth                                                 |
| ❌      | ❌        | getPendingAccount                 | removed in v8                                                     |
| ✅      | ❌        | deleteAccount                     |                                                                   |
| ✅      | ❓        | getAccountInfo                    | fix tests for eth                                                 |
| ❓      | ❌        | getNodeList                       | move test from dev                                                |
| ❓      | ❌        | stakeToNode                       | move test from dev                                                |
| ❌      | ❌        | getKeysFromMnemonic               | removed in 0.8                                                    |
| ✅      | ❓        | searchAccounts                    | test for ETH                                                      |
| ✅      | ❓        | dropTokens                        | check if we need this for ETH                                     |
| ✅      | ✅        | sign                              | sign with Ethers on Hedera                                        |
| ✅      | ✅        | verify                            |                                                                   |
| ❌      | ❌        | ethersSign                        |                                                                   |
| ❓      | ❓        | splitSignature                    | implement with signer for HEDERA if possible                      |
| ❓      | ❓        | getParamsSignature                | implement with signer                                             |
| ✅      | ❓        | getTransactions                   | test for ETH                                                      |
| ❌      | ❌        | getC14url                         | remove in 0.8.                                                    |
| ❓      | ❓        | exchangeGetQuotes                 | move test from dev. ask BE-team for endpoint for exchange service |
| ❓      | ❓        | swapTokens                        | move test from dev. ask BE-team for endpoint for exchange service |
| ❓      | ❓        | getTradeUrl                       | move test from dev. ask BE-team for endpoint for exchange service |
| ✅      | ❓        | createToken                       |                                                                   |
| ✅      | ❓        | associateToken                    |                                                                   |
| ✅      | ❓        | nftMint (delete token after test) |                                                                   |
| ❓      | ❓        | getTokenInfo                      | cover with tests                                                  |

