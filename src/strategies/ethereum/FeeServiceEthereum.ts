import {KnownChains} from "../../models/Chain";
import {FeeManualOptions} from "../../models/Exchange";
import ApiService from "../../services/ApiService";
import {IFeeService} from "../FeeServiceContext";
import ConfigService from "../../services/ConfigService";

export default class FeeServiceEthereum implements IFeeService {
    private readonly chain: KnownChains;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chain: KnownChains, apiService: ApiService, configService: ConfigService) {
        this.chain = chain;
        this.apiService = apiService;
        this.configService = configService;
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
