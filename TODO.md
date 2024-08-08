
| Hedera | Ethereum | Method                            | Comment / TODO                |
|------|----------|-----------------------------------|-------------------------------|
| ✅    | ✅        | init                              |                               |
| ✅    | ✅        | getInfo                           |                               |
| ✅    | ✅        | setUser                           |                               |
| ✅    | ✅        | resetUser                         |                               |
| ✅    | ✅        | getBalance                        |                               |
| ✅    | ✅        | transferBalance                   |                               |
| ✅    | ✅*       | transferTokens                    | implement use payMaster       |
| ✅    | ✅        | getCoinList                       |                               |
| ✅    | ✅        | getCoinPrice                      |                               |
| ✅    | ✅        | contractCallFunction              | implement use payMaster       |
| ✅    | ✅        | contractCallQueryFunction         | implement use payMaster       |
| ✅    | ❌        | createScheduleTransaction         |                               |
| ✅    | ❌        | signScheduleId                    |                               |
| ✅    | ✅        | createAccount                     |                               |
| ❌    | ❌        | getPendingAccount                 | removed in API v8             |
| ✅    | ❌        | deleteAccount                     |                               |
| ✅    | ❓        | getAccountInfo                    | fix tests for eth             |
| ✅    | ❌        | getNodeList                       |                               |
| ✅    | ❌        | stakeToNode                       |                               |
| ❌    | ❌        | getKeysFromMnemonic               | removed in 1.0                |
| ✅    | ✅        | searchAccounts                    |                               |
| ✅    | ❌        | dropTokens                        | check if we need this for ETH |
| ✅    | ✅        | sign                              |                               |
| ✅    | ✅        | verify                            |                               |
| ❌    | ❌        | ethersSign                        |                               |
| ✅    | ✅        | splitSignature                    |                               |
| ✅    | ✅        | getParamsSignature                |                               |
| ✅    | ✅        | getTransactions                   |                               |
| ❌    | ❌        | getC14url                         | removed in 1.0                |
| ✅    | ✅        | exchangeGetQuotes                 |                               |
| ✅    | ❓        | swapTokens                        | test for eth                  |
| ✅    | ✅        | getTradeUrl                       |                               |
| ✅    | ❓        | createToken                       |                               |
| ✅    | ❌        | associateToken                    |                               |
| ❓    | ❓        | nftMint (delete token after test) | migrate to pinata             |
| ✅    | ❓        | getTokenInfo                      |                               |

