import WebKit
import os
import Alamofire
import BigInt

public class SwiftBlade: NSObject {
    private let API_BASE_URL = "https://rest.prod.bladewallet.io/openapi/v7"
    
    public static let shared = SwiftBlade()
    
    private let webView = WKWebView()
    private var webViewInitialized = false    
    private var deferCompletions: [String: (_ result: Data?, _ error: Error?) -> Void] = [:]
    private var initCompletion: (() -> Void)?
    private var completionId: Int = 0

    private var apiKey: String? = nil
    private let uuid = UUID().uuidString
    private var network: HederaNetwork = .TESTNET
    private var dAppCode: String?
    
    // MARK: - It's init time 🎬
    /// Initialization of Swift blade
    ///
    /// - Parameters:
    ///   - apiKey: api key given by Blade tea
    ///   - network: .TESTNET or .MAINNET
    ///   - completion: completion closure that will be executed after webview is fully loaded and rendered.
    public func initialize(apiKey: String, dAppCode: String, network: HederaNetwork , completion: @escaping () -> Void = { }) {
        guard !webViewInitialized else {
            print("Error while doing double init of SwiftBlade")
            fatalError()
        }
        // Setting up all required properties
        self.initCompletion = completion
        self.apiKey = apiKey
        self.dAppCode = dAppCode
        self.network = network
        
        // Setting up and loading webview
        self.webView.navigationDelegate = self
        if let url = Bundle.module.url(forResource: "index", withExtension: "html") {
            self.webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        let contentController = self.webView.configuration.userContentController
        contentController.add(self, name: "bladeMessageHandler")
    }
    
    // MARK: - Public methods 📢
    /// Get balances by Hedera id (address)
    ///
    /// - Parameters:
    ///   - id: Hedera id (address), example: 0.0.112233
    ///   - completion: result with BalanceDataResponse type
    public func getBalance(_ id: String, completion: @escaping (_ result: BalanceDataResponse?, _ error: Error?) -> Void) {
        let completionKey = getCompletionKey("getBalance");
        deferCompletion(forKey: completionKey) { (data, error) in
            if (error != nil) {
                print(error!)
                completion(nil, error)
            }
            do {
                let response = try JSONDecoder().decode(BalanceResponse.self, from: data!)
                completion(response.data, nil)
            } catch {
                print(error)
                completion(nil, error)
            }
        }
        executeJS("JSWrapper.SDK.getBalance('\(id)', '\(completionKey)')")
    }
    
    /// Method to execure Hbar transfers from current account to receiver
    ///
    /// - Parameters:
    ///   - accountId: sender
    ///   - accountPrivateKey: sender's private key to sign transfer transaction
    ///   - receiverId: receiver
    ///   - amount: amount
    ///   - completion: result with TransferDataResponse type
    public func transferHbars(accountId: String, accountPrivateKey: String, receiverId: String, amount: Int, completion: @escaping (_ result: TransferDataResponse?, _ error: Error?) -> Void) {
        let completionKey = getCompletionKey("transferHbars");
        deferCompletion(forKey: completionKey) { (data, error) in
            if (error != nil) {
                print(error!)
                completion(nil, error)
            }
            do {
                let response = try JSONDecoder().decode(TransferResponse.self, from: data!)
                completion(response.data, nil)
            } catch {
                print(error)
                completion(nil, error)
            }
        }
        
        let script = "JSWrapper.SDK.transferHbars('\(accountId)', '\(accountPrivateKey)', '\(receiverId)', '\(amount)', '\(completionKey)')"
        executeJS(script)
    }
    
    /// Method to execure token transfers from current account to receiver
    ///
    /// - Parameters:
    ///   - tokenId: token
    ///   - accountId: sender
    ///   - accountPrivateKey: sender's private key to sign transfer transaction
    ///   - receiverId: receiver
    ///   - amount: amount
    ///   - completion: result with TransferDataResponse type
    public func transferTokens(tokenId: String, accountId: String, accountPrivateKey: String, receiverId: String, amount: Int, completion: @escaping (_ result: TransferDataResponse?, _ error: Error?) -> Void) {
        let completionKey = getCompletionKey("transferTokens");
        deferCompletion(forKey: completionKey) { (data, error) in
            if (error != nil) {
                print(error!)
                completion(nil, error)
            }
            do {
                let response = try JSONDecoder().decode(TransferResponse.self, from: data!)
                completion(response.data, nil)
            } catch {
                print(error)
                completion(nil, error)
            }
        }
        
        let script = "JSWrapper.SDK.transferTokens('\(tokenId)', '\(accountId)', '\(accountPrivateKey)', '\(receiverId)', '\(amount)', '\(completionKey)')"
        executeJS(script)
    }
    
    /// Method to create Hedera account
    ///
    /// - Parameter completion: result with CreatedAccountDataResponse type
    public func createHederaAccount(completion: @escaping (_ result: CreatedAccountDataResponse?, _ error: Error?) -> Void) {
        // Step 1. Generate mnemonice and public / private key
        let completionKey = getCompletionKey("generateKeys");
        deferCompletion(forKey: completionKey) { (data, error) in
            if (error != nil) {
                print(error!)
                completion(nil, error)
            }
            do {
                var result = try JSONDecoder().decode(CreatedAccountResponse.self, from: data!)
                self.createAccountAPICall(account: result.data) { (apiResult, error) in
                    guard apiResult != nil else {
                        completion(nil, error)
                        return
                    }
                    result.data.accountId = apiResult!.id
                    completion(result.data, nil)
                }
            } catch {
                print(error)
                completion(nil, error)
            }
        }
        executeJS("JSWrapper.SDK.generateKeys('\(completionKey)')")
    }
    
    /// Restore public and private key by seed phrase
    ///
    /// - Parameters:
    ///   - menmonic: seed phrase
    ///   - completion: result with PrivateKeyDataResponse type
    public func getKeysFromMnemonic (menmonic: String, completion: @escaping (_ result: PrivateKeyDataResponse?, _ error: Error?) -> Void) {
        let completionKey = getCompletionKey("getKeysFromMnemonic");
        deferCompletion(forKey: completionKey) { (data, error) in
            if (error != nil) {
                print(error!)
                completion(nil, error)
            }
            do {
                let response = try JSONDecoder().decode(PrivateKeyResponse.self, from: data!)
                completion(response.data, nil)
            } catch {
                print(error)
                completion(nil, error)
            }
        }
        executeJS("JSWrapper.SDK.getKeysFromMnemonic('\(menmonic)', '\(completionKey)')")
    }
    
    /// Sign message with private key
    ///
    /// - Parameters:
    ///   - messageString: message in base64 string
    ///   - privateKey: private key string
    ///   - completion: resilt with SignMessageDataResponse type
    public func sign (messageString: String, privateKey: String, completion: @escaping (_ result: SignMessageDataResponse?, _ error: Error?) -> Void) {
        let completionKey = getCompletionKey("sign");
        deferCompletion(forKey: completionKey) { (data, error) in
            if (error != nil) {
                print(error!)
                completion(nil, error)
            }
            do {
                let response = try JSONDecoder().decode(SignMessageResponse.self, from: data!)
                completion(response.data, nil)
            } catch let error as NSError {
                print(error)
                completion(nil, error)
            }
        }
        executeJS("JSWrapper.SDK.sign('\(messageString)', '\(privateKey)', '\(completionKey)')")
    }

    public func createContractFunctionParameters() -> ContractFunctionParameters {
        return ContractFunctionParameters();
    }
    
    /// Method to call smart-contract function from current account
    ///
    /// - Parameters:
    ///   - contractId: contract
    ///   - functionName: function
    ///   - params: function arguments
    ///   - accountId: sender
    ///   - accountPrivateKey: sender's private key to sign transfer transaction
    ///   - gas: amount
    ///   - completion: result with TransactionReceipt type
    public func contractCallFunction(contractId: String, functionName: String, params: ContractFunctionParameters, accountId: String, accountPrivateKey: String, gas: Int, completion: @escaping (_ result: TransactionReceipt?, _ error: Error?) -> Void) {
        let completionKey = getCompletionKey("contractCallFunction");
        let paramsEncoded = params.encode();

        deferCompletion(forKey: completionKey) { (data, error) in
            do {
                let response = try JSONDecoder().decode(TransactionReceiptResponse.self, from: data!)
                completion(response.data, nil)
            } catch {
                print(error)
                completion(nil, error)
            }
        }

        let script = "JSWrapper.SDK.contractCallFunction('\(contractId)', '\(functionName)', '\(paramsEncoded)', '\(accountId)', '\(accountPrivateKey)', '\(gas)', '\(completionKey)')"
    
        executeJS(script)
    }
    
    // MARK: - Private methods 🔒
    private func executeJS (_ script: String) {
        guard webViewInitialized else {
            print("Error while executing JS, webview not loaded")
            fatalError()
        }
        webView.evaluateJavaScript(script)
    }
    
    private func deferCompletion (forKey: String, completion: @escaping (_ result: Data?, _ error: Error?) -> Void) {
        deferCompletions.updateValue(completion, forKey: forKey)
    }
    
    private func setNetwork(_ network: String) throws {
        let completionKey = getCompletionKey("setNetwork");
        deferCompletion(forKey: completionKey) { (data, error) in
            self.initCompletion!()
        }
        executeJS("JSWrapper.SDK.setNetwork('\(network.lowercased())', '\(completionKey)')")
        
    }
    
    private func createAccountAPICall(account: CreatedAccountDataResponse, completion: @escaping (_ result: AccountAPIResponse?, _ error: Error?) -> Void) {
        let params: Parameters = [
            "publicKey": account.publicKey,
            "autoAssociatePresetToken": true
        ]
        let headers: HTTPHeaders = [
            "X-SDK-TOKEN": self.apiKey!,
            "X-NETWORK": self.network.rawValue,
            "X-FINGERPRINT": self.uuid,
            "X-DAPP-CODE": self.dAppCode!
        ]
        
        AF.request(self.API_BASE_URL + "/accounts", method: .post, parameters: params, encoding: JSONEncoding.default, headers: headers).responseDecodable(of: AccountAPIResponse.self) { (response) in
            switch response.result {
            case let .success(data):
                self.doTokenAutoAssociate(account: account, apiData: data, completion: completion)
            case let .failure(error):
                completion(nil, error)
            }
        }
    }
    
    private func doTokenAutoAssociate (account: CreatedAccountDataResponse, apiData: AccountAPIResponse, completion: @escaping (_ result: AccountAPIResponse?, _ error: Error?) -> Void) {
        let transactionBytes = apiData.transactionBytes
        
        let completionKey = getCompletionKey("doTokenAutoAssociate");
        deferCompletion(forKey: completionKey) { (data, error) in
            if (error != nil) {
                print(error!)
                completion(nil, error)
            }
            completion(apiData, nil)
        }
        executeJS("JSWrapper.SDK.doTokenAutoAssociate('\(transactionBytes)', '\(apiData.id)', '\(account.privateKey)', '\(completionKey)')")
    }
    
    private func getCompletionKey(_ tag: String = "") -> String {
        completionId += 1;
        return tag + String(completionId);
    }
}

public class ContractFunctionParameters: NSObject {
    private var params: [ContractFunctionParameter] = []

//    uint32, tuple(bytes r,s,v), tuple(r,s,v)
//    uint256
//    uint64
//    int64
//    address
    
    public func addAddress(value: String) -> ContractFunctionParameters {
        params.append(ContractFunctionParameter(type: "address", value: value));
        return self;
    }
    
    public func addBytes32(value: [UInt8]) -> ContractFunctionParameters {
        do {
            let encodedValue = try JSONEncoder().encode(value).base64EncodedString();
            params.append(ContractFunctionParameter(type: "bytes32", value: encodedValue));
        } catch let error {
            print(error)
        }
  
        return self
    }
    
    public func addUInt64(value: UInt64) -> ContractFunctionParameters {
        params.append(ContractFunctionParameter(type: "uint64", value: String(value)));
        return self
    }
    
    public func addInt64(value: Int64) -> ContractFunctionParameters {
        params.append(ContractFunctionParameter(type: "int64", value: String(value)));
        return self
    }

    public func addUInt256(value: BigUInt) -> ContractFunctionParameters {
            params.append(ContractFunctionParameter(type: "uint256", value: String(value)));

//        do {
//            let encodedValue = try JSONEncoder().encode(value).base64EncodedString();
//            params.append(ContractFunctionParameter(type: "uint256", value: encodedValue));
//        } catch let error {
//            print(error)
//        }
        return self;
    }
    
    public func encode() -> String {
        do {
            let jsonData = try JSONEncoder().encode(params)
            if let res = String(data: jsonData, encoding: .utf8) {
//                print(res);
                return res;
            }
        } catch let error {
            print(error)
        }
        return "";
    }
}

extension SwiftBlade: WKScriptMessageHandler {
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if let jsonString = message.body as? String {
            let data = Data(jsonString.utf8)
            do {
                let response = try JSONDecoder().decode(Response.self, from: data)
                if (response.completionKey == nil) {
                    throw SwiftBladeError.unknownJsError("Received JS response without completionKey")
                }
                let deferedCompletion = deferCompletions[response.completionKey!]!

                // TODO: fix this hacky way of throwing error on data parse
                if (response.error != nil) {
                    deferedCompletion(Data("-".utf8), SwiftBladeError.jsResponseError("\(response.error)"))
                } else {
                    deferedCompletion(data, nil)
                }
            } catch let error {
                print(error)
                fatalError()
            }
        }
    }
}

extension SwiftBlade: WKNavigationDelegate {
    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Web-view initialized
        webViewInitialized = true
        
        // Call setNetwork and initCompletion after that
        try? self.setNetwork(self.network.rawValue)
    }
}

// MARK: - JS wrapper response types
struct Response: Codable {
    var completionKey: String?
    var error: [String: String]?
}

struct CreatedAccountResponse: Codable {
    var completionKey: String
    var data: CreatedAccountDataResponse
}

struct BalanceResponse: Codable {
    var completionKey: String
    var data: BalanceDataResponse
}

struct PrivateKeyResponse: Codable {
    var completionKey: String
    var data: PrivateKeyDataResponse
}

struct TransferResponse: Codable {
    var completionKey: String
    var data: TransferDataResponse
}

struct AccountAPIResponse: Codable {
    var id: String
    var network: String
    var associationPresetTokenStatus: String
    var transactionBytes: String
}

struct SignMessageResponse: Codable {
    var completionKey: String
    var data: SignMessageDataResponse
}

public struct CreatedAccountDataResponse: Codable {
    public var seedPhrase: String
    public var publicKey: String
    public var privateKey: String
    public var accountId: String?
}

public struct BalanceDataResponse: Codable {
    public var hbars: String
    public var tokens: [BalanceDataResponseToken]
}

public struct BalanceDataResponseToken: Codable {
    public var balance: String
    public var decimals: Int
    public var tokenId: String
}

public struct PrivateKeyDataResponse: Codable {
    public var privateKey: String
    public var publicKey: String
}

public struct TransferDataResponse: Codable {
    public var nodeId: String
    public var transactionHash: String
    public var transactionId: String
}

public struct SignMessageDataResponse: Codable {
    public var signedMessage: String
}

public struct ContractFunctionParameter: Encodable {
    public var type: String
    public var value: String
}

struct TransactionReceiptResponse: Codable {
    var completionKey: String
    var data: TransactionReceipt
}

public struct TransactionReceipt: Codable {
    public var status: String
    public var contractId: String?
    public var topicSequenceNumber: String?
    public var totalSupply: String?
    public var serials: [String]?
}


public struct TestResponse: Codable {
    public var completionKey: String
    public var data: String
}

// MARK: - SwiftBlade errors
public enum SwiftBladeError: Error {
    case jsResponseError(String)
    case unknownJsError(String)
    case apiError(String)
}

// MARK: - SwiftBlade enums
public enum HederaNetwork: String {
    case TESTNET
    case MAINNET
}
