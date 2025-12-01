import { Translations } from './types';

export const fr: Translations = {
    // Commun
    back: "↩️ Retour",
    refresh: "🔄 Actualiser",
    cancel: "❌ Annuler",
    confirm: "✅ Confirmer",
    close: "❌ Fermer",
    backWallet: "⬅ Retour au portefeuille",
    backMenu: "⬅ Retour au menu",
    backSettings: "⬅ Retour aux paramètres",
    totals: "totaux",

    //commands
    commands: {
        start: "Commencez avec Foxy.",
        menu: "Accédez au menu principal de Foxy.",
        setting: "Afficher les paramètres de Foxy.",
        wallet: "Afficher vos portefeuilles Foxy.",
        position: "Afficher vos positions de token."
    },

    // Admin
    admin: {
        p1: "🌠 Bienvenue, Admin",
        p2: "Vous pouvez gérer la liste blanche en ajoutant ou supprimant des utilisateurs selon vos besoins.",
        addUser: "Ajouter un utilisateur",
        removeUser: "Supprimer un utilisateur",
        tipPercentage: "💰 Pourcentage de pourboire",
        adminWallet: "💼 Portefeuille administrateur",
        adminWalletName: "📝 Nom du portefeuille administrateur",
        solanaPrice: "Prix Solana",
        p3: "Adresse du portefeuille",
        p4: "Solde total",
        whitelistActive: "Liste blanche active",
        whitelistInactive: "Liste blanche inactive",
        walletName: "Aucun",
        referral: "Récompense par 10 parrainage",
        wallet: "💼 Portefeuille",
        referralSettings: "Paramètres de parrainage personnalisés"
    },

    //welcome
    welcome: {
        p1: "Accès restreint – Autorisation requise",
        p2: "Bonjour",
        p3: "Ce bot est un service privé fourni par The CryptoFox Learning.",
        p4: "Votre identifiant Telegram n'est actuellement pas répertorié dans notre liste d'accès autorisé (liste blanche).",
        p5: "L'accès est strictement limité aux utilisateurs qui ont été approuvés manuellement par notre équipe.",
        p6: "Pour y accéder, vous devez d'abord visiter notre site officiel et suivre le processus d'inscription.",
        p7: "Une fois votre demande soumise, un administrateur vous contactera pour approuver ou refuser votre entrée dans la liste blanche.",
        request: "✅ Demande d'accès",
        visit: "🌐 Visitez le site Web",
        admin: "👑 Panneau Admin"
    },

    //Referral
    referral: {
        p1: "🎁 Programme de parrainage 🎁",
        p2: "Invitez vos amis et gagnez des récompenses exclusives avec FoxyBoTracker 🚀",
        p3: "👥 Utilisateurs parrainés",
        p4: "💰 Récompenses",
        p5: "🔗 Votre lien de parrainage",
        p6: "Recevez un portefeuille",
        p7: "Partagez ce lien avec vos amis ! Chaque inscription via votre lien = plus de profits pour vous ✨",
        p8: "Vous recevez",
        p9: "pour chaque lot de",
        p10: "parrainages",
        wallet: "💼 Configurer un portefeuille pour les commissions",
        share: "📥 Partagez votre lien de parrainage",
        message1: "Veuillez saisir votre portefeuille pour les commissions.",
        message2: "Adresse de portefeuille invalide. Réessayez !",
        message3: "Adresse de portefeuille invalide.",
        shareMessage1: "FoxyBoTracker est le meilleur bot de trading !",
        shareMessage2: "Gérez vos cryptomonnaies Solana plus rapidement que jamais grâce aux achats et ventes instantanés, au suivi en temps réel de vos positions et au contrôle total de votre portefeuille directement depuis Telegram.",
        shareMessage3: "Votre lien de parrainage :",
        share1: "📥 Partager"

    },

    // Menu
    menu: {
        p1: "🌠 Bonjour",
        p2: "Menu principal du bot :",
        p3: 'Gérez votre crypto Solana plus rapidement que jamais avec des achats et des ventes instantanés, un suivi en temps réel de vos positions et un contrôle total de votre portefeuille directement depuis Telegram.',
        p4: "Votre portefeuille Solana :",
        p5: "Bénéficiez de transactions sécurisées, de prix en direct et de frais réduits pour optimiser chaque mouvement sur la blockchain Solana.",
        p6: "Une fois le portefeuille créé, vous pouvez initier des transactions directement depuis le bot.",
        buy: "💰 Acheter",
        sell: "🎒 Vendre",
        wallet: "💼 Portefeuille",
        position: "📊 Position",
        settings: "⚙️ Paramètres",
        referral: "🎁 Système de parrainage",
        help: "🙋‍♂️ Aide",
        adminPanel: "👑 Panneau Admin",
        trendingCoin: "🥇 Pièce tendance"
    },

    // Acheter
    buy: {
        p1: "💰 Menu d'achat",
        p2: "🌱 Ce token est très récent. Soyez prudent.",
        p3: "Date de création du token :",
        p4: "💸 Prix :",
        p5: "🏦 Liquidité :",
        p6: "📈 Capitalisation :",
        p7: "Renoncé",
        p8: "Gel",
        p9: "Mint",
        p10: "💊 Progression de la courbe de liaison :",
        p11: "Paramètre de vente automatique",
        p12: "Statut",
        p13: "Niveau de prise de profit :",
        p14: "Niveau de stop loss :",
        p15: "🕒 Dernière mise à jour (UTC) :",
        p16: "💡 Sélectionnez une action ci-dessous.",
        p17: " ",
        p18: "j",
        p19: "Partagez le jeton avec vos amis",
        settings: "⚙️ Paramètres",
        buy: "Acheter",
        default: "Défaut"
    },

    // Vendre
    sell: {
        p1: "🎒 Menu de vente",
        p2: "💸 Prix :",
        p3: "🏦 Liquidité :",
        p4: "📈 Capitalisation :",
        p5: "Renoncé",
        p6: "Gel",
        p7: "Mint",
        p8: "💰 Solde en tokens :",
        p9: "Profit",
        p10: "💹 Prix moyen d'entrée (MC) :",
        p11: "🕒 Dernière mise à jour (UTC) :",
        p12: "💡 Sélectionnez une action ci-dessous.",
        p13: "Statut de vente automatique :",
        p14: "✅ Trade réussi, voici l'image PNL de votre performance.",
        p15: "Partagez le jeton avec vos amis",
        settings: "⚙️ Paramètres",
        sell: "Vendre",
        default: "Défaut"
    },

    // Positions
    positions: {
        p1: "💼 Positions Foxy",
        p2: "📚 Besoin de plus d'aide ?",
        p3: "Cliquez ici !",
        p4: "💰 Solde en tokens :",
        p5: "📉 Profit :",
        p6: "💹 Prix moyen d'entrée (MC) :",
        p7: "🕒 Dernière mise à jour (UTC) :",
        importPosition: "Importer une position"
    },

    // Portefeuilles
    wallets: {
        p1: "💼 Paramètres Foxy Wallet",
        p2: "Votre portefeuille Solana :",
        p3: "❓ Besoin de plus d'aide ?",
        p4: "Cliquez ici !",
        p5: "⬇️ Créez, gérez et importez des portefeuilles ici.",
        p6: "📚 Vos portefeuilles Solana",
        p7: "💁 Astuce : Gardez vos portefeuilles Foxy sécurisés",
        p8: "🔒 Sélectionnez une option ci-dessous",
        p9: "💡 Sélectionnez un paramètre à modifier",
        p10: "Nombre maximum de portefeuilles",
        settings: "⚙️ Paramètres",
        createWallet: "🆕 Créer un portefeuille",
        importWallet: "📥 Importer un portefeuille",
        deleteWallet: "🗑 Supprimer un portefeuille",
        renameWallet: "📝 Renommer un portefeuille",
        exportPrivateKey: "🔐 Exporter la clé privée",
        withdraw: "💸 Retirer",
        switch: "✅ Changer le portefeuille par défaut",
    },

    // Paramètres
    settings: {
        p1: "💼 Paramètres Foxy",
        p2: "❓ Besoin de plus d'aide ?",
        p3: "Cliquez ici !",
        p4: "🔒 Sélectionnez une option ci-dessous ?",
        p5: "💡 Sélectionnez un paramètre à modifier.",
        fee: "⛽ Frais",
        slippage: "💦 Glissement",
        wallet: "💳 Portefeuilles",
        language: "🌏 Langue",
        quickBuy: "⚡ Achat rapide",
        quickSell: "💰 Vente rapide",
        young: "🌱 Token récent",
        autoImage: "Image PNL automatique",
        autoSell: "🕹️ Vente automatique",
        mev: "MEV Protège"
    },

    // Aide
    help: {
        p1: "Aide & Support",
        p2: "📚 Pour les FAQ, guides et tutoriels, visitez notre Documentation.",
        p3: "🐦 Pour les dernières mises à jour et actualités, suivez-nous sur Twitter.",
        p4: "💬 Besoin d'aide ? Contactez notre Responsable Support ci-dessous.",
        p5: "Nous sommes là pour vous 24/7 !",
        documentation: "📚 Guide de démarrage",
        contactSupport: "💬 Contacter le support",
    },

    // Changer de portefeuille par défaut
    switch: {
        p1: "🔁 Changer de portefeuille",
        p2: "Portefeuille actif :",
        p3: "Adresse :",
        p4: "Nom :",
        p5: "Solde du portefeuille :",
        p6: "✅ indique le portefeuille actif",
        p7: "🔓 indique que le portefeuille a été exporté",
        p8: "Pour passer à un autre portefeuille, cliquez sur son adresse ci-dessous"
    },

    // Importer un portefeuille
    importWallet: {
        p1: "✅ Portefeuille importé avec succès !",
        p2: "💳 Nom :",
        p3: "🔗 Adresse :",
        p4: "💡 Pour voir vos autres portefeuilles, rendez-vous dans les paramètres.",
        settings: "⚙️ Paramètres",
    },

    // Renommer un portefeuille
    renameWallet: {
        p1: "✏️ Renommer le portefeuille",
        p2: "💡 Sélectionnez un portefeuille à renommer."
    },

    // Supprimer un portefeuille
    deleteWallet: {
        p1: "🗑️ Supprimer le portefeuille",
        p2: "💡 Sélectionnez un portefeuille à supprimer.",
        p3: "Êtes-vous sûr de vouloir supprimer ce portefeuille",
        p4: "Cette action est irréversible.",
        delete: "🗑️ Supprimer"
    },

    // Retrait
    withdrawWallet: {
        p1: "💸 Retrait",
        p2: "💡 Sélectionnez un portefeuille depuis lequel retirer des fonds.",
    },

    // Zone dangereuse
    dangerZoneMessage: {
        p1: "⚠️ Zone dangereuse !",
        p2: "Soyez prudent, l'exportation de votre clé privée est une opération dangereuse.",
        p3: "Quiconque",
        p4: "avec accès à votre clé privée peut accéder à votre portefeuille et voler vos fonds.",
        p5: "NOUS NE GARANTIRONS PLUS LA SÉCURITÉ DE VOS FONDS.",
        p6: "Êtes-vous sûr de vouloir continuer ?",
        exportPrivateKey: "🔑 Exporter",
    },

    // Exporter la clé privée
    exportPrivateKey: {
        p1: "🔐 Exporter la clé privée",
        p2: "💡 Sélectionnez le portefeuille que vous souhaitez exporter."
    },

    // Clé privée
    privateKey: {
        p1: "🔐 Portefeuille :",
        p2: "Adresse :",
        p3: "🔑 Clé privée :",
        p4: "Voir sur Solscan",
        p5: "NE LA PARTAGEZ AVEC PERSONNE",
        p6: "Gardez La en lieu sûr, car elle donne un accès complet à votre portefeuille et vos fonds",
        p7: "Une fois terminé, appuyez sur le bouton \"SUPPRIMER LE MESSAGE\" ci dessous",
        revealKey: "🔐 Afficher la clé",
        deleteMessage: "🗑️ Supprimer le message"
    },

    // Paramètres des frais
    feeSettings: {
        p1: "⛽️ Paramètres des frais",
        p2: "📚 Besoin de plus d'aide ?",
        p3: "Cliquez ici !",
        p4: "Rapide⚡ : Utilise environ 0.001 SOL par transaction",
        p5: "Rapide⚡⚡ : Utilise environ 0.005 SOL par transaction",
        p6: "💡 Augmenter vos frais d'achat et de vente accélérera la prise en compte de la transaction on-chain.",
        p7: "⚠️ Vous devez entrer une valeur entre 0 et 1 pour chaque mise à jour de frais.",
        p8: "Lent",
        p9: "Normal",
        p10: "Rapide",
        p11: "🤖 Paramètres de frais recommandés",
        p12: "📚 Besoin d'aide?",
        p13: "Cliquez ici!",
        p14: "🌎 Frais recommandés actuels :",
        p15: "💡 Laisser Foxy calculer automatiquement le pourboire MEV recommandé.",
        p16: "⚡ Vitesse des frais :",
        buyFee: "⛽Frais d'achat :",
        sellFee: "⛽Frais de vente :",
        buyTip: "💸 Astuce achat :",
        sellTip: "💸 Astuce vente :"
    },

    // Paramètres de glissement
    slippageSettings: {
        p1: "💦 Paramètres de glissement",
        p2: "📚 Besoin de plus d'aide ?",
        p3: "Cliquez ici !",
        p4: "💡 Un pourcentage de glissement plus élevé augmente la réussite de la transaction. Par exemple, 50% accroît les chances que l'ordre soit exécuté.",
        buy: "💦 Achat :",
        sell: "💦 Vente :"
    },

    // Langue
    language: {
        p1: "Veuillez sélectionner votre langue préférée.",
        english: "Anglais",
        french: "Français"
    },

    // Achat rapide
    quickBuy: {
        p1: "⛽️ Paramètres d'achat rapide",
        p2: "📚 Besoin de plus d'aide ?",
        p3: "Cliquez ici !",
        p4: "🌐 Personnalisez ici vos pourcentages de vente rapide.",
        p5: "⚙️ Pourcentages de vente",
        p6: "💡 Sélectionnez un montant d'achat rapide à modifier.",
        p7: "🔃 Achat rapide",
        p8: "Transaction",
        p9: "Glissement",
        p10: "🟡 Achat en attente",
        p11: "Capitalisation :",
        p12: "🟢 Achat réussi",
        p13: "Voir sur Solscan",
        p14: "Portefeuille",
        p15: "Token",
        viewToken: "🔄 Voir le token",
        positions: "📊 Positions",
        sell: "🎒 Vendre"
    },

    // Vente rapide
    quickSell: {
        p1: "⛽️ Paramètres de vente rapide",
        p2: "📚 Besoin de plus d'aide ?",
        p3: "Cliquez ici !",
        p4: "🌐 Personnalisez ici vos montants d'achat rapide.",
        p5: "⚙️ Montants d'achat",
        p6: "💡 Sélectionnez un pourcentage de vente rapide à modifier.",
        p7: "🔃 Vente rapide",
        p8: "Transaction",
        p9: "Montant :",
        p10: "Montant de vente :",
        p11: "Glissement",
        p12: "🟡 Vente en attente",
        p13: "Solde en tokens :",
        p14: "Montant de vente :",
        p15: "Capitalisation :",
        p16: "🟢 Vente réussie",
        p17: "Voir sur Solscan",
        p18: "Portefeuille",
        viewToken: "🔄 Voir le token",
        positions: "📊 Positions",
        buy: "💰 Acheter"
    },

    // Vente automatique
    autoSell: {
        p1: "⛽️ Paramètres de vente automatique",
        p2: "📚 Besoin de plus d'aide ?",
        p3: "Cliquez ici !",
        p4: "🌐 Lorsque la vente automatique est activée, Foxy vendra automatiquement tout token collé selon vos règles.",
        p5: "Par défaut",
        p6: "📈 Niveau de prise de profit :",
        p7: "📉 Niveau de stop loss :",
        p8: "💡 Configurez vos paramètres de vente automatique ci-dessous.",
        status1: "Activé",
        status2: "Désactivé",
        wallet: "💳 Portefeuille :",
    },

    // Tp & Sl
    TpSl: {
        p1: "💸 Niveaux de prise de profit & stop loss automatiques",
        p2: "📚 Besoin de plus d'aide ?",
        p3: "Cliquez ici !",
        p4: "🌐 Après un trade d'achat réussi, un ordre limite de vente sera automatiquement créé selon vos niveaux de profit ou stop loss.",
        p5: "📈 Niveau de prise de profit : ",
        p6: "📉 Niveau de stop loss : ",
        p7: "💡 Ajoutez un nouveau stop loss ou un nouveau niveau de prise de profit ci-dessous.",
        tp: "📈 Nouveau niveau de prise de profit : ",
        sl: "📉 Nouveau niveau de stop loss : "
    },

    // Retrait
    withdrawal: {
        p1: "💳 Retrait",
        p2: "Transaction",
        p3: "Retrait en attente",
        p4: "Voir sur Solscan",
        p5: "Échec du retrait",
        p6: "Retrait réussi",
        p7: "💸 Confirmer le retrait",
        p8: "De",
        p9: "À",
        p10: "Montant :",
        p11: "💡 Souhaitez-vous confirmer ce retrait ?",
        confirm: "✅ Confirmer",
        view: "Voir la transaction"
    },

    image: {
        buy: "Achat de tokens",
        sell: "Vente de tokens",
        gain: "Gain/Perte",
        date: "Date de vente",
    },

    trending: {
        p1: "🚀 Coins tendance",
        p2: "🔥 Top 10 des jetons tendance",
        p3: "Rang",
        p4: "💠 Nom du jeton",
        p5: "🆔 Adresse du jeton",
        p6: "🪙 Liquidité",
        p7: "💲 Volume sur 24 h",
        p8: "💹 Variation de volume",
        p9: "💰 Prix",
        next: "⏭️ Suivant",
        previous: "⏮️ Précédent"
    },

    // Messages
    messages: {
        accessDenied: "Accès refusé. Vous n'êtes pas sur la liste blanche.",
        addRemoveUser: "Veuillez saisir l'ID Telegram de l'utilisateur.",
        removed1: "✅ Utilisateur avec l'ID Telegram",
        removed2: "a été supprimé.",
        useradd: "✅ Utilisateur ajouté avec succès",
        successLog: "✅ Vous vous êtes connecté avec succès. Bienvenue sur",
        buy: "Répondez avec une adresse de token à acheter.",
        sell: "Répondez avec une adresse de token à vendre.",
        buy_x: "Répondez avec le montant de SOL que vous souhaitez trader.",
        sell_x: "Répondez avec le pourcentage de tokens que vous souhaitez trader. 10 -> 10%, 20 -> 20%",
        withdraw1: "Veuillez entrer le montant que vous souhaitez retirer. (en SOL) - Exemple : 5",
        withdraw2: "Veuillez entrer l'adresse du portefeuille vers laquelle vous souhaitez retirer.",
        createName: "Veuillez entrer le nom de votre nouveau portefeuille.",
        createSuccess1: "✅ Portefeuille",
        createSuccess2: "créé avec succès !",
        renameWallet1: "Veuillez entrer le nom du portefeuille.",
        renameWallet2: "✅ Nom du portefeuille mis à jour avec succès en",
        deleteWallet1: "✅ Portefeuille",
        deleteWallet2: "a été supprimé avec succès.",
        deleteWallet3: "🔄 Actualisation de la liste des portefeuilles...",
        positionImport1: "Entrez l'adresse du token de la position que vous souhaitez importer.",
        positionImport2: "Ce token n'existe pas",
        feeinput: "Veuillez saisir la valeur des frais (0-1).",
        slippageInput: "Veuillez entrer le pourcentage de glissement (0-100).",
        youngInput: "Veuillez entrer le paramètre de token récent (1-24).",
        quickBuy: "Veuillez entrer la nouvelle valeur de montant d'achat.",
        quickSell: "Veuillez entrer la nouvelle valeur de pourcentage de vente. (en %) - Exemple : 100",
        tp: "Veuillez entrer le pourcentage de niveau de prise de profit. 10 -> 10%, 20 -> 20%",
        sl: 'Veuillez entrer le pourcentage de niveau de stop loss. -10 -> -10%, -20 -> -20%',
        pnl: "✅ Génération de l'image PNL en cours...",
        importwallet1: "Le nom du portefeuille ne peut pas contenir de symboles ou de caractères spéciaux.",
        importwallet2: "Un portefeuille avec ce nom existe déjà. Veuillez réessayer.",
        importwallet3: "Veuillez entrer la clé privée du portefeuille.",
        importwallet4: "Un portefeuille avec cette clé privée existe déjà. Veuillez réessayer.",
        importwallet5: "Comment aimeriez-vous nommer votre nouveau portefeuille ?",
        autoSell1: "🚀 Votre position a été clôturée automatiquement.",
        walletLimits: "Veuillez saisir la limite du portefeuille !",
        autoSell2: "Token :",
        autoSell3: "💸 Take Profit atteint :",
        autoSell4: "🔁 Vente automatique à :",
        autoSell5: "🔁 Montant de la vente automatique à :",
        autoSell6: "Le marché a progressé et votre take profit a été atteint, sécurisant vos gains.",
        autoSell7: "🛡️ Votre position a été clôturée automatiquement.",
        autoSell8: "🚫 Le marché a chuté et votre stop loss a été déclenché, limitant vos pertes et protégeant votre capital restant.",
        entertip: "Veuillez saisir le pourcentage de pourboire ! (0-100)",
        referral1: "🎉 Votre ami",
        referral2: "a rejoint via votre lien de parrainage !",
        referral3: "Bienvenue ! Vous avez rejoint avec le code de parrainage de l'utilisateur",
        enterreferral: "Veuillez entrer la récompense par parrainage en SOL !",
        enterreferralSettings: "Veuillez entrer la valeur des paramètres de parrainage ! (supérieure à 0)",
        refreshLimit: "⚠️ Trop de rafraîchissements. Veuillez ralentir.",
        refreshwarning: "⚠️ Attention ⚠️",
        fee: "Les frais de réseau sont automatiquement déduit"
    },

    // Erreurs
    errors: {
        invalidId: "❌ ID Telegram invalide. Veuillez entrer un ID utilisateur Telegram ou un nom d'utilisateur.",
        targetUser: "❌ Cet utilisateur Telegram n'existe pas dans la liste blanche.",
        invalidAddress: "❌ Erreur de validation : l'adresse du token Solana que vous avez saisie est invalide. Veuillez vérifier et réessayer.",
        removederror: "⚠️ Une erreur est survenue lors de la tentative de suppression de l'utilisateur.",
        logError: "❌ Vous n'êtes pas autorisé à utiliser ce bot. Veuillez contacter l'administrateur.",
        invalidAmount: "❌ Erreur de validation : montant invalide. Réessayez !",
        invalidSellAmount: "❌ Erreur de validation : montant de trade invalide. Veuillez entrer une valeur entre 1 et 100.",
        invalidPrivateKey: "❌ Clé privée invalide. Veuillez fournir une clé privée valide.",
        walletNotFound: "❌Il doit y avoir au moins un portefeuille créé.",
        insufficientBalance: "❌ Solde insuffisant.",
        invalidWithdrawal: "Montant de retrait invalide. Veuillez réessayer.",
        invalidwallet: "Adresse de portefeuille invalide. Veuillez réessayer.",
        invalidselection: "❌ Sélection de portefeuille invalide.",
        invalidsecretkey: "❌ Le portefeuille n'a pas de clé privée ou clé publique valide.",
        invalidwWalletName1: "❌ Nom de portefeuille invalide. Veuillez réessayer.",
        invalidwWalletName2: "❌ Un portefeuille avec ce nom existe déjà. Veuillez choisir un nom différent.",
        invalidUser: "❌ Utilisateur non trouvé. Veuillez réessayer plus tard.",
        invalidCopy1: "❌ Impossible de trouver le portefeuille à copier.",
        invalidCopy2: "❌ Aucune clé privée disponible.",
        invalidFee: "❌ Erreur de validation : frais non valides. Réessayez !",
        invalidSlippage: "❌ Erreur de validation : pourcentage de glissement invalide. Réessayez !",
        invalidyoung: "❌ Erreur de validation : date invalide. Vous devez entrer un nombre entre 1 et 24. Réessayez !",
        invalidBuy: "Montant d'achat invalide.",
        invalidSell: "Pourcentage de vente invalide.",
        invalidAutoWallet: "❌ Aucun portefeuille disponible à définir par défaut.",
        invalidTp: "❌ Erreur de validation : valeur non valide. Veuillez saisir une valeur supérieure à 0. Réessayez !",
        invalidSl: "❌ Erreur de validation : valeur non valide. Veuillez saisir une valeur inférieure à 0. Réessayez !",
        alreadyWhitelist: "⚠️ L'utilisateur est déjà sur la liste blanche",
        notToken: "Token introuvable",
        transactionFailed: "❌ Transaction échouée : solde du portefeuille faible ou transaction non confirmée en 60.00 secondes.",
        transactionError: "❌ Erreur : solde de token faible ou token non acheté.",
        invalidtip: "❌ Erreur de validation : Pourcentage de pourboire invalide. Veuillez saisir une valeur comprise entre 0 et 100.",
        walletLimit: "❌ Limite de portefeuilles atteinte. Vous ne pouvez pas créer plus de",
        invalidwallets: "❌ Erreur de validation : limites de portefeuille non valides. Veuillez saisir une valeur comprise entre 1 et 100.",
        invalidsettings: "❌ Erreur de validation : paramètres de parrainage non valides. Veuillez saisir une valeur supérieure à 0.",
    },
};
