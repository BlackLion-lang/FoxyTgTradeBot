import { positions } from "./positions";
import { settings } from "./settings";
import { start } from "./start";
import { wallets } from "./wallets";
import { menus } from "./menus";
import { help } from "./help";
import { privateKeyWallet } from "./private";
import { sniperCommand } from "./sniper";
import { chain } from "./chain";

export const CommandHandler = {
    start,
    wallets,
    menus,
    privateKeyWallet,
    positions,
    settings,
    help,
    sniperCommand,
    chain
};
