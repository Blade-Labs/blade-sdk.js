import {Buffer} from "buffer";

const ApiUrls = {
    "mainnet": "https://rest.prod.bladewallet.io/openapi/v7",
    "testnet": "https://rest.ci.bladewallet.io/openapi/v7"
};

const NetworkMirrorNodes = {
    "mainnet": "https://mainnet-public.mirrornode.hedera.com",
    "testnet": "https://testnet.mirrornode.hedera.com"
};

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

export const createAccount = async (network: string, params: any) => {
    const url = `${ApiUrls[network.toLowerCase()]}/accounts`;
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

export const requestTokenInfo = async (network: string, tokenId: string) => {
    return fetchWithRetry(`${NetworkMirrorNodes[network.toLowerCase()]}/api/v1/tokens/${tokenId}`, {})
        .then(statusCheck)
        .then(x => x.json());
};

export const signContractCallTx = async (network: string, params: any) => {
    const url = `${ApiUrls[network.toLowerCase()]}/smart/contract/sign`;
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
            functionName: params.functionIdentifier
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};


