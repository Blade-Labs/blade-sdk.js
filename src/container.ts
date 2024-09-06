import {Container} from "inversify";
import {BladeSDK} from "./BladeSDK";
import ApiService from "./services/ApiService";
import ConfigService from "./services/ConfigService";
import ExchangeService from "./services/ExchangeService";
import SignService from "./services/SignService";
import {ChainContextRegistry} from "./ChainContextRegistry";

let bladeContainer: Container | null = null;

export const getContainer = (isWebView: boolean = false) => {
    if (bladeContainer) {
        return bladeContainer;
    }

    bladeContainer = new Container();
    bladeContainer.bind<boolean>("isWebView").toConstantValue(isWebView);
    bladeContainer.bind("configService").to(ConfigService).inSingletonScope();
    bladeContainer.bind("apiService").to(ApiService).inSingletonScope();
    bladeContainer.bind("exchangeService").to(ExchangeService).inSingletonScope();
    bladeContainer.bind("signService").to(SignService).inSingletonScope();

    // Bind ChainContextRegistry
    bladeContainer.bind("chainContextRegistry").to(ChainContextRegistry).inSingletonScope();

    // Bind globals
    bladeContainer.bind("signer").toConstantValue(null);
    bladeContainer.bind("user").toConstantValue(null);

    // Bind BladeSDK
    bladeContainer.bind(BladeSDK).toSelf().inSingletonScope();
    
    return bladeContainer;
};
