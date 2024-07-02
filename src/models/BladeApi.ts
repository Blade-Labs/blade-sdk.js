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
    result?: {
        contractId: string;
        functionName: string;
        functionParametersHash: string;
        gas: number;
        memo: string;
        contractFunctionResult: {
            contractId: string;
            bloom: {
                validUtf8: boolean;
                empty: boolean;
            };
            gasUsed: number;
            gas: number;
            hbarAmount: {
                value: number;
            };
            signerNonce: number;
        },
        bloom: string;
        rawResult: string;
    }
}

export interface ScheduleRequestJob extends V8Response {
    result?: {
        scheduleId: string;
    };
}

export interface SignScheduleRequestJob extends V8Response {
    result?: {
        scheduleSignTransactionBytes: string
    };
}

