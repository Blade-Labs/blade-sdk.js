import {KnownChains} from "../../models/Chain";
import {FeeManualOptions} from "../../models/Exchange";
import {IFeeService} from "../../contexts/FeeServiceContext";
import AbstractServiceEthereum from "./AbstractServiceEthereum";
import {getContainer} from "../../container";

export default class FeeServiceEthereum extends AbstractServiceEthereum implements IFeeService {
    constructor(chain: KnownChains) {
        super(chain);

        this.container = getContainer();
    }

    async addBladeFee<T extends any>(tx: T, chain: KnownChains, payerAccount: string, manualOptions?: FeeManualOptions | undefined): Promise<T> {
        throw new Error("Method not implemented.");
    }

    async createFeeTransaction<R>(
        chain: KnownChains,
        payerAccount: string,
        manualOptions: FeeManualOptions
    ): Promise<R | null> {
        throw new Error("Method not implemented.");
    }
}
