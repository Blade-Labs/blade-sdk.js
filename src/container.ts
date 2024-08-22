import {Container} from "inversify";
import {BladeSDK} from "./BladeSDK";
import ApiService from "./services/ApiService";
import ConfigService from "./services/ConfigService";
import ExchangeService from "./services/ExchangeService";
import TokenServiceContext from "./strategies/TokenServiceContext";
import AccountServiceContext from "./strategies/AccountServiceContext";
import SignServiceContext from "./strategies/SignServiceContext";
import ContractServiceContext from "./strategies/ContractServiceContext";
import AuthServiceContext from "./strategies/AuthServiceContext";
import FeeServiceContext from "./strategies/FeeServiceContext";
import SignService from "./services/SignService";


// TODO make symbols

export const getContainer = (isWebView: boolean = false) => {
    const bladeContainer = new Container();
    bladeContainer.bind<boolean>("isWebView").toConstantValue(isWebView);
    bladeContainer.bind("configService").to(ConfigService).inSingletonScope();
    bladeContainer.bind("tokenServiceContext").to(TokenServiceContext).inSingletonScope();
    bladeContainer.bind("accountServiceContext").to(AccountServiceContext).inSingletonScope();
    bladeContainer.bind("signServiceContext").to(SignServiceContext).inSingletonScope();
    bladeContainer.bind("contractServiceContext").to(ContractServiceContext).inSingletonScope();
    bladeContainer.bind("exchangeService").to(ExchangeService).inSingletonScope();
    bladeContainer.bind("signService").to(SignService).inSingletonScope();
    bladeContainer.bind("authServiceContext").to(AuthServiceContext).inSingletonScope();
    bladeContainer.bind("feeServiceContext").to(FeeServiceContext).inSingletonScope();
    bladeContainer.bind("apiService").to(ApiService).inSingletonScope();
    bladeContainer.bind(BladeSDK).toSelf();
    return bladeContainer;
};
