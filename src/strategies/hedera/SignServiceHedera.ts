import {
    Signer,
} from "@hashgraph/sdk";

import {ISignService} from "../SignServiceContext";
import {
    SplitSignatureData
} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {KnownChainIds} from "@/models/Chain";

export default class SignServiceHedera implements ISignService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        chainId: KnownChainIds,
        signer: Signer,
        apiService: ApiService,
        configService: ConfigService,
    ) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }


    async placeholder(signature: string): Promise<SplitSignatureData> {
        throw new Error("Method not implemented.");
    }
}
