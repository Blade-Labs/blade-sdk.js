import { Container } from 'inversify';
import { BladeSDK } from './BladeSDK';
import ApiService from './services/ApiService';
import ConfigService from "./services/ConfigService";
import CryptoFlowService from "./services/CryptoFlowService";
import FeeService from "./services/FeeService";
import TokenServiceContext from "./strategies/TokenServiceContext";
import AccountServiceContext from "./strategies/AccountServiceContext";
import SignServiceContext from "./strategies/SignServiceContext";
import ContractServiceContext from "./strategies/ContractServiceContext";
import TradeServiceContext from "./strategies/TradeServiceContext";

// TODO make symbols

export const getContainer = (isWebView: boolean = false) => {
    const bladeContainer = new Container();
    bladeContainer.bind<boolean>("isWebView").toConstantValue(isWebView);
    bladeContainer.bind('configService').to(ConfigService).inSingletonScope();
    bladeContainer.bind('tokenService').to(TokenServiceContext).inSingletonScope();
    bladeContainer.bind('accountService').to(AccountServiceContext).inSingletonScope();
    bladeContainer.bind('signService').to(SignServiceContext).inSingletonScope();
    bladeContainer.bind('contractService').to(ContractServiceContext).inSingletonScope();
    bladeContainer.bind('tradeService').to(TradeServiceContext).inSingletonScope();
    bladeContainer.bind('cryptoFlowService').to(CryptoFlowService).inSingletonScope();
    bladeContainer.bind('feeService').to(FeeService).inSingletonScope();
    bladeContainer.bind('apiService').to(ApiService).inSingletonScope();
// bladeContainer.bind<ILogger>('apiService').to(ApiService).inSingletonScope();
    bladeContainer.bind(BladeSDK).toSelf();
    return bladeContainer;
};
