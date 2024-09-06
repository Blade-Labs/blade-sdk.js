import {Container} from "inversify";

import {
    ActiveUser,
    ScheduleTransactionTransfer,
    ScheduleTransactionType,
    SignMessageData,
    SignVerifyMessageData,
    SplitSignatureData,
    SupportedEncoding,
    TransactionReceiptData
} from "../models/Common";
import {ParametersBuilder} from "../ParametersBuilder";
import SignService from "../services/SignService";
import {getContainer} from "../container";

export interface ISignService {
    sign(encodedMessage: string, encoding: SupportedEncoding, likeEthers: boolean, publicKey: string): Promise<SignMessageData>;
    verify(
        encodedMessage: string,
        encoding: SupportedEncoding,
        signature: string,
        addressOrPublicKey: string
    ): Promise<SignVerifyMessageData>;
    signScheduleId(
        scheduleId: string,
        receiverAccountId: string,
        usePaymaster: boolean,
    ): Promise<TransactionReceiptData>;
    createScheduleTransaction(
        type: ScheduleTransactionType,
        transfers: ScheduleTransactionTransfer[],
        usePaymaster: boolean,
    ): Promise<{scheduleId: string}>;
    getParamsSignature(paramsEncoded: string | ParametersBuilder, publicKey: string): Promise<SplitSignatureData>;
}

export default class SignServiceContext implements ISignService {
    private readonly signService: SignService;
    private readonly container: Container;

    constructor(
        private strategy: ISignService
    ) {
        this.container = getContainer();
        this.signService = this.container.get<SignService>("signService");
    }

    get publicKey(): string {
        if (!this.container) {
            throw new Error(`Container not set in ${this.constructor.name} class`);
        }
        const user = this.container.get<ActiveUser>("user");
        if (!user) {
            throw new Error("No Active user found. Call setUser() first");
        }
        return user.publicKey;
    }

    splitSignature(signature: string): Promise<SplitSignatureData> {
        return this.signService.splitSignature(signature);
    }

    getParamsSignature(paramsEncoded: string | ParametersBuilder): Promise<SplitSignatureData> {
        return this.strategy!.getParamsSignature(paramsEncoded, this.publicKey);
    }

    sign(encodedMessage: string, encoding: SupportedEncoding, likeEthers: boolean): Promise<SignMessageData> {
        return this.strategy!.sign(encodedMessage, encoding, likeEthers, this.publicKey);
    }

    verify(
        encodedMessage: string,
        encoding: SupportedEncoding,
        signature: string,
        addressOrPublicKey: string
    ): Promise<SignVerifyMessageData> {
        return this.strategy!.verify(encodedMessage, encoding, signature, addressOrPublicKey);
    }

    createScheduleTransaction(
        type: ScheduleTransactionType,
        transfers: ScheduleTransactionTransfer[],
        usePaymaster: boolean,
    ): Promise<{scheduleId: string}> {
        return this.strategy.createScheduleTransaction(type, transfers, usePaymaster);
    }

    signScheduleId(
        scheduleId: string,
        receiverAccountId: string,
        usePaymaster: boolean,
    ): Promise<TransactionReceiptData> {
        return this.strategy.signScheduleId(scheduleId, receiverAccountId, usePaymaster);
    }
}
