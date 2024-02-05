import { Container } from 'inversify';
import { BladeSDK } from './BladeSDK';
import ApiService from './services/ApiService';
import ConfigService from "./services/ConfigService";
import CryptoFlowService from "./services/CryptoFlowService";
import FeeService from "./services/FeeService";
import TokenService from "./strategies/TokenService";

// TODO make symbols

export const getContainer = (isWebView: boolean = false) => {
    const bladeContainer = new Container();
    bladeContainer.bind<boolean>("isWebView").toConstantValue(isWebView);
    bladeContainer.bind('configService').to(ConfigService).inSingletonScope();
    bladeContainer.bind('tokenService').to(TokenService).inSingletonScope();
    bladeContainer.bind('cryptoFlowService').to(CryptoFlowService).inSingletonScope();
    bladeContainer.bind('feeService').to(FeeService).inSingletonScope();
    bladeContainer.bind('apiService').to(ApiService).inSingletonScope();
// bladeContainer.bind<ILogger>('apiService').to(ApiService).inSingletonScope();
    bladeContainer.bind(BladeSDK).toSelf();
    return bladeContainer;
};
