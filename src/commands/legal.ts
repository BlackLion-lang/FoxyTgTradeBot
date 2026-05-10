import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";
import { getCloseButton } from "../utils/markup";

const LEGAL_TEXT_EN = `📜 Terms of Use - Trading BOT

➡️ Service Overview:
This Trading robot allows users to buy, sell, and monitor the Wallets of novice and/or experienced Traders, and to automatically replicate their strategies.
By using this service, you agree to all the terms described below.

➡️ Acceptance of Terms:
Registration for and use of the service imply full and complete acceptance of these terms.
If you do not accept these terms, you must not use the service.

➡️ Use of the Service:
The service is reserved for adults with legal capacity.
You agree to provide accurate and up-to-date information.
You are responsible for the security of your access credentials and login details.
The robot executes transactions automatically or manually by copying the trades of the followed Traders.

➡️ Risks, Responsibilities, and Limitation of Warranty:
Trading involves significant financial risks, which may result in the partial or total loss of the invested capital.
The service is provided “as is”, without any guarantee of performance, results, or profitability.
You are solely responsible for your decisions, your transactions, and your use of the service.
No liability may be incurred in the event of financial losses, direct or indirect damages, or consequences related to the use of the service.

➡️ How FoxyBoTracker (BOT) Works:
The robot replicates the Transactions of the selected Wallets.
Past performance does not guarantee future results under any circumstances.
The service may be suspended or interrupted at any time for technical, maintenance, or security reasons.

➡️ Personal Data:
The collected data is processed in accordance with privacy rules.
You have the right to access, modify, and delete your data.

➡️ Intellectual Property:
All content and technologies related to the service are protected.
Any unauthorized reproduction or use is strictly prohibited.`;

const LEGAL_TEXT_FR = `📜 Conditions d'utilisation - BOT de Trading

➡️ Présentation du service :
Ce robot de Trading permet d'acheter, vendre et suivre les Wallets de Traders novices et/ou expérimentés, et de reproduire automatiquement leurs stratégies.
En utilisant ce service, vous acceptez l'ensemble des conditions décrites ci-dessous.

➡️ Acceptation des conditions :
L'inscription et l'utilisation du service impliquent une acceptation pleine et entière des présentes conditions.
Si vous n'acceptez pas ces termes, vous ne devez pas utiliser le service.

➡️ Utilisation du service :
Le service est réservé aux personnes majeures disposant de la capacité juridique.
Vous vous engagez à fournir des informations exactes et à jour.
Vous êtes responsable de la sécurité de vos accès et identifiants.
Le robot exécute automatiquement ou manuellement les opérations en copiant les transactions des Traders suivis.

➡️ Risques, responsabilités et limitation de garantie :
Le Trading comporte des risques financiers importants, pouvant entraîner une perte partielle ou totale du capital investi.
Le service est fourni « tel quel », sans garantie de performance, de résultat ou de rentabilité.
Vous êtes seul responsable de vos décisions, de vos opérations et de l’utilisation du service.
Aucune responsabilité ne pourra être engagée en cas de pertes financières, de dommages directs ou indirects, ou de conséquences liées à l’utilisation du service.

➡️ Fonctionnement de FoxyBoTracker (BOT) :
Le robot reproduit les Transactions des Wallets sélectionnés.
Les performances passées ne garantissent en aucun cas les résultats futurs.
Le service peut être suspendu ou interrompu à tout moment pour des raisons techniques, de maintenance ou de sécurité.

➡️ Données personnelles :
Les données collectées sont traitées conformément aux règles de confidentialité.
Vous disposez d'un droit d'accès, de modification et de suppression de vos données.

➡️ Propriété intellectuelle :
Tous les contenus et technologies liés au service sont protégés.
Toute reproduction ou utilisation non autorisée est strictement interdite.`;

export const legal = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    _match: RegExpExecArray | null,
) => {
    const userId = msg.from?.id || 0;
    const user = await User.findOne({ userId }).lean();
    const legalText = user?.language === "fr" ? LEGAL_TEXT_FR : LEGAL_TEXT_EN;

    await bot.sendMessage(msg.chat.id, legalText, {
        reply_markup: {
            inline_keyboard: [[await getCloseButton(userId)]],
        },
    });
};
