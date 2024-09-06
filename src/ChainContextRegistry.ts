import {injectable} from "inversify";
import {ChainConfig, ChainMap, KnownChains} from "./models/Chain";
import StringHelpers from "./helpers/StringHelpers";
import * as Strategies from "./strategies";
import * as Contexts from "./contexts";
import AbstractServiceHedera from "./strategies/hedera/AbstractServiceHedera";
import AbstractServiceEthereum from "./strategies/ethereum/AbstractServiceEthereum";

export type IContext = (chain: KnownChains) => AbstractServiceHedera | AbstractServiceEthereum;

export enum ServiceContextTypes {
    AccountServiceContext = "AccountService",
    AuthServiceContext = "AuthService",
    ContractServiceContext = "ContractService",
    FeeServiceContext = "FeeService",
    SignServiceContext = "SignService",
    TokenServiceContext = "TokenService"
}

@injectable()
export class ChainContextRegistry {
    private strategyMap: Record<string, Record<string, IContext>> = {};

    constructor() {
        this.initializeContexts();
    }

    private initializeContexts() {
        Object.entries(ChainMap).forEach(([chain, config]) => {
            const contexts: Record<string, any> = {};
            for (const [name, classObj] of Object.entries(Contexts)) {
                const [strategy, serviceName] = this.getStrategyClassByChain(name, config);
                contexts[serviceName] = new classObj(new strategy(chain));
            }
            this.strategyMap[chain] = contexts;
        });

    }

    private getStrategyClassByChain(name: string, chainConfig: ChainConfig) {
        const serviceName = name.replace(new RegExp(`\\Context$`), "");
        const strategyExport = chainConfig.serviceStrategy;
        const strategyName = `${serviceName}${StringHelpers.capitalizeFirstChar(chainConfig.serviceStrategy)}`;
        // @ts-ignore
        return [Strategies[strategyExport][strategyName], serviceName];
    }

    getContext<T>(chain: KnownChains, serviceName: string): T {
        // TODO create context on request
        const chainContexts = this.strategyMap[chain];
        if (!chainContexts) {
            throw new Error(`No contexts found for chain: ${chain}`);
        }

        const context = chainContexts[serviceName];
        if (!context) {
            throw new Error(`No context found for service: ${serviceName} on chain: ${chain}`);
        }

        return context as T;
    }
}
