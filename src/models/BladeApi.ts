export enum JobAction {
    INIT = "INIT",
    CHECK = "CHECK",
    CONFIRM = "CONFIRM",
}

export enum JobStatus {
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    PROCESSING = "PROCESSING",
    RETRY = "RETRY",
    FAILED = "FAILED"
}

export enum DropStatus {
    SUCCESS = "SUCCESS",
    FAIL = "FAIL",
}

interface V8Response {
    requestId: string;
    taskId: string;
    status: JobStatus;
    errorCode?: number;
    errorMessage?: string;
}

export interface AccountCreateJob extends V8Response {
    result?: {
        accountId: string;
        originalPublicKey?: string;
        transactionBytes?: string;
    };
}

export interface TokenAssociateJob extends V8Response {
    result?: {
        accountId: string;
        transactionBytes: string;
        tokensStatuses: {
            [key: string]: JobStatus
        }
    };
}

export interface KycGrandJob extends V8Response {
    result?: {
        accountId: string;
        tokensStatuses: {
            [key: string]: JobStatus
        }
    };
}

export interface DropJob extends V8Response {
    result?: {
        accountId: string;
        reCaptchaPage?: string;
        dropStatuses: {
            [key: string]: DropStatus
        }
    };
}

export interface TransferTokensJob extends V8Response {
    result?: {
        senderAccountId: string;
        receiverAccountId: string;
        tokenId: string;
        amount: number;
        decimals: number;
        memo: string;
        transactionBytes: string;
    };
}

export interface ContractCallJob extends V8Response {
    result?: {
        contractId: string;
        functionName: string;
        functionParametersHash: string;
        gas: number;
        memo: string;
        transactionBytes: string;
    };
}

export interface ContractCallQueryJob extends V8Response {
    // TODO actualise
    result?: {
        "contractId": "string",
        "functionName": "string",
        "functionParametersHash": "string",
        "gas": 0,
        "memo": "string",
        "contractFunctionResult": {
            "contractId": {
                "shard": 0,
                "realm": 0,
                "num": 0,
                "checksum": "string",
                "evmAddress": "string"
            },
            "evmAddress": {
                "shard": 0,
                "realm": 0,
                "num": 0,
                "checksum": "string",
                "evmAddress": "string"
            },
            "errorMessage": "string",
            "bloom": {
                "empty": true,
                "validUtf8": true
            },
            "gasUsed": 0,
            "logs": [
                {
                    "contractId": {
                        "shard": 0,
                        "realm": 0,
                        "num": 0,
                        "checksum": "string",
                        "evmAddress": "string"
                    },
                    "bloom": {
                        "empty": true,
                        "validUtf8": true
                    },
                    "topics": [
                        {
                            "empty": true,
                            "validUtf8": true
                        }
                    ],
                    "data": {
                        "empty": true,
                        "validUtf8": true
                    }
                }
            ],
            "gas": 0,
            "hbarAmount": {
                "value": 0
            },
            "contractFunctionParametersBytes": "string",
            "senderAccountId": {
                "shard": 0,
                "realm": 0,
                "num": 0,
                "aliasKey": {
                    "ecdsa": true,
                    "ed25519": true
                },
                "evmAddress": {},
                "checksum": "string"
            },
            "contractNonces": [
                {
                    "contractId": {
                        "shard": 0,
                        "realm": 0,
                        "num": 0,
                        "checksum": "string",
                        "evmAddress": "string"
                    },
                    "nonce": 0
                }
            ],
            "signerNonce": 0
        },
        "bloom": "string",
        "rawResult": "string"
    }
}