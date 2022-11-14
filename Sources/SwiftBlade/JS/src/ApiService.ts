import {Buffer} from "buffer";
import {PublicKey} from "@hashgraph/sdk";
import {Network, NetworkMirrorNodes} from "./models/Networks";

const ApiUrl = "https://rest.prod.bladewallet.io/openapi/v7";

const fetchWithRetry = async (url, options, maxAttempts = 3) => {
    return new Promise((resolve, reject) => {
        let attemptCounter = 0;

        const interval = 5000;
        const makeRequest = (url, options) => {
            attemptCounter += 1;
            fetch(url, options)
                .then(async (res) => {
                    if (!res.ok) {
                        // Request timeout check
                        if ((res.status === 408 || res.status === 429) && attemptCounter < maxAttempts) {
                            setTimeout(() => {
                                makeRequest(url, options);
                            }, interval * attemptCounter);
                        } else {
                            reject(await res.json());
                        }
                    } else {
                        resolve(res);
                    }
                });
        };
        makeRequest(url, options);
    });
};

const statusCheck = async (res) => {
    if (!res.ok) {
        throw await res.json();
    }
    return res;
};

export const createAccount = async (network: Network, params: any) => {
    const url = `${ApiUrl}/accounts`;
    const options = {
        method: "POST",
        headers: new Headers({
            "X-SDK-TOKEN": params.apiKey,
            "X-FINGERPRINT": params.fingerprint,
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({
            publicKey: params.publicKey
        })
    };

    return fetchWithRetry(url, options)
        .then(statusCheck)
        .then(x => x.json())
};

export const requestTokenInfo = async (network: Network, tokenId: string) => {
    return fetchWithRetry(`${NetworkMirrorNodes[network]}/api/v1/tokens/${tokenId}`, {})
        .then(statusCheck)
        .then(x => x.json());
};

export const signContractCallTx = async (network: Network, params: any) => {
    const url = `${ApiUrl}/smart/contract/sign`;
    const options = {
        method: "POST",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TOKEN": params.apiKey,
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            functionParametersHash: Buffer.from(params.paramBytes).toString('base64'),
            contractId: params.contractId,
            functionName: params.functionName
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const getAccountsFromPublicKey = async (network: Network, publicKey: PublicKey): Promise<string[]> => {
    const formatted = publicKey.toStringRaw();

    return fetchWithRetry(`${NetworkMirrorNodes[network]}/api/v1/accounts?account.publickey=${formatted}`, {})
        .then(statusCheck)
        .then(x => x.json())
        .then(x => x.accounts.map(acc => acc.account))
        .catch(error => {
            return [];
        });
}
