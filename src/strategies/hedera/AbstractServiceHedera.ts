import {Signer} from "@hashgraph/sdk";
import {ActiveUser} from "../../models/Common";
import {Container} from "inversify";
import {KnownChains} from "../../models/Chain";

export default abstract class AbstractServiceHedera {
    protected declare container: Container;
    protected chain: KnownChains;

    protected constructor(chain: KnownChains) {
        this.chain = chain;
    }

    get signer(): Signer {
        if (!this.container) {
            throw new Error(`Container not set in ${this.constructor.name} class`);
        }
        const user = this.container.get<ActiveUser>("user");
        if (!user || !user.signer) {
            throw new Error("No Signer found. Call setUser() first");
        }
        return user.signer as Signer;
    }
}