import TelegramBot from 'node-telegram-bot-api';
import { Contract, ethers, Wallet } from "ethers";
import { ethereum_provider } from "../../config/ethereum";
import { User } from '../../models/user';
import { walletScanTxUrl } from '../../utils/ethereum';
import { decryptSecretKey } from '../../config/security';

const newMarkup = {
    inline_keyboard: [
        [
            { text: '✖ Dismiss', callback_data: 'dismiss' }
        ]
    ]
};

const sendPendingMessage = async (bot: TelegramBot, chatId: number, wallet: any, to_wallet: string, amount: string, txHash: string, currentBlock: any) => {
    await bot.sendMessage(chatId, `<strong>🟡 Transfer pending(🔗ETH)</strong>
From: <code>${wallet.publicKey}</code>
To: <code>${to_wallet}</code>
Values: ${amount} | ${(Number(currentBlock?.gasLimit) / 10 ** 9).toFixed(2)} ⛽
Block: ${currentBlock?.number} | ${(Number(currentBlock?.gasUsed) / 10 ** 9).toFixed(2)}
<a href="${walletScanTxUrl(txHash)}">EtherScan</a>`, {
        parse_mode: 'HTML',
        reply_markup: newMarkup
    });
};

const sendConfirmedMessage = async (bot: TelegramBot, chatId: number, amount: string, txHash: string, receipt: any, currentBlock: any) => {
    await bot.sendMessage(chatId, `<strong>✅ Transfer confirmed(🔗ETH)</strong>
Block: ${(await receipt)?.blockNumber} | ${(Number(currentBlock?.gasLimit) / 10 ** 9).toFixed(2)}
[1] 🟩 <a href="${walletScanTxUrl(txHash)}">Hash</a> | ${amount}Ξ`, {
        parse_mode: 'HTML',
        reply_markup: newMarkup
    });
};

export const transferETH = async (bot: TelegramBot, chatId: number, userId: number, eth_amount: number, from_wallet_index: number, to_address: string) => {
    try {
        const user = await User.findOne({ userId })
        if(!user) throw "No User Found"
        // Use ethereumWallets instead of wallets
        const wallet = user.ethereumWallets[from_wallet_index];
        if (!wallet) throw "Ethereum wallet not found"
        // Decrypt the private key before using it
        const decryptedPrivateKey = decryptSecretKey(wallet.secretKey);
        const senderWallet = new Wallet(decryptedPrivateKey, ethereum_provider);
        const to_wallet = to_address;

        const tx = await senderWallet.sendTransaction({
            to: to_wallet,
            value: ethers.parseEther(`${eth_amount}`)
        });

        const currentBlock = await ethereum_provider.getBlock('latest');
        await sendPendingMessage(bot, chatId, wallet, to_wallet, `${eth_amount}`, tx.hash, currentBlock);

        const receipt = await tx.wait();
        await sendConfirmedMessage(bot, chatId, `${eth_amount}`, tx.hash, receipt, currentBlock);
    } catch (error) {
        console.error('Transfer ETH error:', error);
    }    
};

export const transferToken = async (bot: TelegramBot, chatId: number, userId: number, token_amount: number, from_wallet_index: number, token_address: string, to_address: string) => {
    try {
        const user = await User.findOne({ userId })
        if(!user) throw "No User Found"
        // Use ethereumWallets for token transfers too
        const wallet = user.ethereumWallets[from_wallet_index];
        if (!wallet) throw "Ethereum wallet not found"
        // Decrypt the private key before using it
        const decryptedPrivateKey = decryptSecretKey(wallet.secretKey);
        const senderWallet = new Wallet(decryptedPrivateKey, ethereum_provider);

        const ERC20_ABI = [
            "function transfer(address to, uint256 amount) public returns (bool)",
            "function decimals() view returns (uint8)",
        ];

        const tokenContract = new Contract(token_address, ERC20_ABI, senderWallet);
        const decimals = await tokenContract.decimals();
        const tokenAmount = ethers.parseUnits(`${token_amount}`, decimals);
        const to_wallet = to_address;

        const tx = await tokenContract.transfer(to_wallet, tokenAmount);

        const currentBlock = await ethereum_provider.getBlock('latest');
        await sendPendingMessage(bot, chatId, wallet, to_wallet, `${token_amount}`, tx.hash, currentBlock);

        const receipt = await tx.wait();
        await sendConfirmedMessage(bot, chatId, `${token_amount}`, tx.hash, receipt, currentBlock);
                
    } catch (error) {
        console.error('Transfer token error:', error);
    }
};

