import {ActiveUser} from "../../models/Common";
import {Container} from "inversify";
import {KnownChains} from "../../models/Chain";
import {ethers} from "ethers";

export default abstract class AbstractServiceEthereum {
    protected declare container: Container;
    protected chain: KnownChains;

    protected constructor(chain: KnownChains) {
        this.chain = chain;
    }

    get signer(): ethers.Signer {
        if (!this.container) {
            throw new Error(`Container not set in ${this.constructor.name} class`);
        }
        const user = this.container.get<ActiveUser>("user");
        if (!user || !user.signer) {
            throw new Error("No Signer found. Call setUser() first");
        }
        return user.signer as ethers.Signer;
    }
}