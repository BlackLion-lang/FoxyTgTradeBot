import { registerFont } from "canvas";
import { TimerOptions } from "timers";

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

//@ts-ignore
export const getImage = async (
    userName: String,
    date: String,
    tokenName: String,
    invested: String,
    selltoken: String,
    gain: String,
    PNL: String,
    outputPath: String
) => {
    function parseNumberFromString(s: any) {
        if (typeof s === 'number') return s;
        if (!s) return 0;
        // remove thousands separators and non-digit characters except . - +
        const cleaned = String(s).replace(/[, ]+/g, '').replace(/[^\d.+-]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
    }

    registerFont("./src/messages/Image/Chewy Bubble.otf", { family: "Chewy Bubble" });
    registerFont("./src/messages/Image/Dorky Circle.otf", { family: "Dorky Circle" });
    registerFont("./src/messages/Image/Gratis Neue.otf", { family: "Gratis Neue" });
    // registerFont("./src/messages/Image/Poppins-Regular.otf", {family: "Poppins-Regular"});
    const image = await loadImage('./src/assets/PNL.jpg');
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(image, 0, 0);

    // Add text
    // const userName = `EniyFox`;
    // const date = 'Purchase Date'
    // const tokenName = 'Token Name'
    // const PNL = 'PNL'
    // const invested = 'Invested'
    // ctx.fillRect(100, 100, 150, 100)

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;

    const textX = 50;
    const textY = 100;
    ctx.font = 'bold 58px Chewy Bubble';
    ctx.fillStyle = 'white'
    // ctx.strokeText(text, textX, textY); // Black outline
    ctx.fillText(userName, 50, 90);   // White fill

    ctx.font = 'bold 58px Chewy Bubble';
    ctx.fillStyle = 'white'
    ctx.fillText(tokenName, textX, 150)

    ctx.font = 'bold 36px Dorky Circle';
    ctx.fillStyle = 'darkgrey'
    ctx.fillText("Achat de jetons : ", textX, 220)

    ctx.font = 'bold 36px Dorky Circle';
    ctx.fillStyle = 'grey'
    ctx.fillText(invested, 345, 220)

    ctx.font = 'bold 36px Dorky Circle';
    ctx.fillStyle = 'darkgrey'
    ctx.fillText("Vente de jetons : ", textX, 270)

    ctx.font = 'bold 36px Dorky Circle';
    ctx.fillStyle = 'grey'
    ctx.fillText(selltoken, 345, 270)

    ctx.font = 'bold 36px Dorky Circle';
    ctx.fillStyle = 'darkgrey'
    ctx.fillText("Gain/Perte :", textX, 320)

    const pnlvalue = parseNumberFromString(PNL);

    if (Number(pnlvalue) > 0) {
        ctx.font = 'bold 36px Dorky Circle';
        ctx.fillStyle = '#64EB34'
        ctx.fillText(gain, 260, 320)
    } else {
        ctx.font = 'bold 36px Dorky Circle';
        ctx.fillStyle = '#BC0117'
        ctx.fillText(gain, 260, 320)
    }

    ctx.font = 'bold 24px Dorky Circle';
    ctx.fillStyle = '#f1f1f9'
    ctx.fillText(date, textX, 420)

    // const match = PNL.match(/-?\d+(\.\d+)?/); // extract number like -2.34 or 5.6
    // const numericPNL = match ? Number(match[0]) : 0;

    ctx.font = 'bold 56px Chewy Bubble';
    ctx.fillStyle = 'white'
    ctx.fillText("PNL :", textX, 550)

    console.log(PNL);

    if (Number(pnlvalue) > 0) {
        ctx.font = 'bold 56px Chewy Bubble';
        ctx.fillStyle = '#64EB34'
        ctx.fillText(PNL, 200, 550)
        // ctx.strokeText(PNL, textX, 550);
    } else {
        ctx.font = 'bold 56px Chewy Bubble';
        ctx.fillStyle = '#BC0117'
        ctx.fillText(PNL, 200, 550)
        // ctx.strokeText(PNL, textX, 550);
    }
    // Black outline


    // Save result
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Image saved to ${outputPath}`);
}

// export const buyImage = async (
//     userName: String,
//     date: String,
//     tokenName: String,
//     invested: String,
//     outputPath: String
// ) => {

//     registerFont("./src/messages/Image/Chewy Bubble.otf", { family: "Chewy Bubble" });
//     registerFont("./src/messages/Image/Dorky Circle.otf", { family: "Dorky Circle" });
//     registerFont("./src/messages/Image/Gratis Neue.otf", { family: "Gratis Neue" });
//     // registerFont("./src/messages/Image/Poppins-Regular.otf", {family: "Poppins-Regular"});
//     const image = await loadImage('./src/assets/PNL.jpg');
//     const canvas = createCanvas(image.width, image.height);
//     const ctx = canvas.getContext('2d');

//     // Draw original image
//     ctx.drawImage(image, 0, 0);

//     // Add text
//     // const userName = `EniyFox`;
//     // const date = 'Purchase Date'
//     // const tokenName = 'Token Name'
//     // const PNL = 'PNL'
//     // const invested = 'Invested'
//     // ctx.fillRect(100, 100, 150, 100)

//     ctx.strokeStyle = 'black';
//     ctx.lineWidth = 2;

//     const textX = 50;
//     const textY = 200;
//     ctx.font = 'bold 58px Chewy Bubble';
//     ctx.fillStyle = 'white'
//     // ctx.strokeText(text, textX, textY); // Black outline
//     ctx.fillText(userName, 50, 150);   // White fill

//     ctx.font = 'bold 58px Chewy Bubble';
//     ctx.fillStyle = 'white'
//     ctx.fillText(tokenName, textX, 250)

//     ctx.font = 'bold 36px Dorky Circle';
//     ctx.fillStyle = 'darkgrey'
//     ctx.fillText("Achat de jetons :", textX, 385)

//     ctx.font = 'bold 36px Dorky Circle';
//     ctx.fillStyle = 'grey'
//     ctx.fillText(invested, 340, 385)

//     ctx.font = 'bold 32px Dorky Circle';
//     ctx.fillStyle = '#f1f1f9'
//     ctx.fillText(date, textX, 520)

//     // const match = PNL.match(/-?\d+(\.\d+)?/); // extract number like -2.34 or 5.6
//     // const numericPNL = match ? Number(match[0]) : 0;

//     // Save result
//     const buffer = canvas.toBuffer('image/png');
//     fs.writeFileSync(outputPath, buffer);
//     console.log(`Image saved to ${outputPath}`);
// }