import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection } from "../config/connection";
import { getBalance, getSolPrice } from "../services/solana";
import { Types } from "mongoose";
import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";

export const getWelcomeVideoMessage = async (userId: number) => {
    const user = (await User.findOne({ userId })) || new User();
    const videoUrl = 'https://the-cryptofox-learning.com/ressources/background_video/FoxyBoTracker-headerPrez.mp4';
    return {
        videoUrl,
        caption: `
            <b>👋 Welcome to FoxyBoTracker!</b>

            🚀 This bot helps you buy & sell tokens easily.
            🎥 Watch this short video to learn how it works.

            👇 Use the buttons below to get started.
        `
    };
}

export const sendWelcomeVideo = async (bot: TelegramBot, chatId: number, userId: number) => {
    const user = await User.findOne({ userId });
    // const welcomeVideoFileId = 'BAACAgIAAxkBAAJD22iQSAjudTwfGDaTyGJNhBiFZWCKAAJdfwACRNqBSGT-J4cBlusKNgQ';
    const videoUrl = 'https://the-cryptofox-learning.com/ressources/background_video/FoxyBoTracker-headerPrez.mp4';
    const caption = `
        <b>👋 Welcome to FoxyBoTracker!</b>

        🚀 This bot helps you buy & sell tokens easily.
        🎥 Watch this short video to learn how it works.

        👇 Use the buttons below to get started.
    `;
    if (user && !user.hasSeenIntro) {
        await bot.sendVideo(chatId, videoUrl, {
            caption,
            parse_mode: "HTML"
        });
        user.hasSeenIntro = true;
        await user.save();
    }
    // else {
    //     await bot.sendMessage(chatId, "👋 Welcome back! Use the menu to continue.");
    // }
   
};