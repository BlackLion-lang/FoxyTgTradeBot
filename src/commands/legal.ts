import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";
import { getCloseButton } from "../utils/markup";

const LEGAL_TEXT_EN = `📜 Terms of Use - Trading BOT

➡️ Service Overview
This trading bot allows users to buy, sell, and track the wallets of novice and/or experienced traders, and to automatically replicate their strategies.
By using this service, you agree to all the terms described below.

➡️ Acceptance of Terms
Registration and use of the service imply full and complete acceptance of these terms.
If you do not agree with these terms, you must not use the service.

➡️ Use of the Service
The service is reserved for individuals who are of legal age and have legal capacity.
You agree to provide accurate and up-to-date information.
You are responsible for the security of your access and credentials.
The bot executes operations automatically or manually by copying transactions from the traders you follow.

➡️ Risks and Responsibilities
Trading involves significant financial risks, which may result in the total loss of invested capital.
You are solely responsible for your decisions and for your use of the service.

➡️ Bot Operation
The bot replicates transactions from selected wallets.
Past performance does not guarantee future results.
The service may be suspended or interrupted at any time for technical, maintenance, or security reasons.

➡️ Limitation of Liability
The service is provided "as is," without any guarantee of performance or results.
No liability shall be held for any financial losses or indirect damages resulting from its use.

➡️ Personal Data
Collected data is processed in accordance with privacy regulations.
You have the right to access, modify, and delete your data.

➡️ Intellectual Property
All content and technologies related to the service are protected.
Any unauthorized reproduction or use is strictly prohibited.`;

const LEGAL_TEXT_FR = `📜 Conditions d'utilisation - BOT de Trading

➡️ Presentation du service
Ce robot de trading permet d'acheter, vendre et suivre les Wallets de traders novices et/ou experimentes et de reproduire automatiquement leurs strategies.
En utilisant ce service, vous acceptez l'ensemble des conditions decrites ci-dessous.

➡️ Acceptation des conditions
L'inscription et l'utilisation du service impliquent une acceptation pleine et entiere des presentes conditions.
Si vous n'acceptez pas ces termes, vous ne devez pas utiliser le service.

➡️ Utilisation du service
Le service est reserve aux personnes majeures disposant de la capacite juridique.
Vous vous engagez a fournir des informations exactes et a jour.
Vous etes responsable de la securite de vos acces et identifiants.
Le robot execute automatiquement ou manuellement les operations en copiant les transactions des traders suivis.

➡️ Risques et responsabilites
Le trading comporte des risques financiers importants, pouvant entrainer une perte totale du capital investi.
Vous etes seul responsable de vos decisions et de l'utilisation du service.

➡️ Fonctionnement du robot
Le robot reproduit les transactions des portefeuilles selectionnes.
Les performances passees ne garantissent en aucun cas les resultats futurs.
Le service peut etre suspendu ou interrompu a tout moment pour des raisons techniques, de maintenance ou de securite.

➡️ Limitation de responsabilite
Le service est fourni "tel quel", sans garantie de performance ni de resultat.
Aucune responsabilite ne pourra etre engagee en cas de pertes financieres ou de dommages indirects lies a son utilisation.

➡️ Donnees personnelles
Les donnees collectees sont traitees conformement aux regles de confidentialite.
Vous disposez d'un droit d'acces, de modification et de suppression de vos donnees.

➡️ Propriete intellectuelle
Tous les contenus et technologies lies au service sont proteges.
Toute reproduction ou utilisation non autorisee est strictement interdite.`;

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
