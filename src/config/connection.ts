import { Connection } from "@solana/web3.js";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

export const connection = new Connection(
    process.env.RPC_ENDPOINT || "",
    "confirmed"
);

export const mongoConnection = mongoose.createConnection(
    process.env.MONGO_URL || "",
);
