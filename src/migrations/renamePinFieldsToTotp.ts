/**
 * One-time migration: rename PIN-era MongoDB fields to TOTP / security names.
 *
 * Run after deploying schema changes (user, tipSettings, securityLog):
 *   npx ts-node src/migrations/renamePinFieldsToTotp.ts
 *
 * Requires MONGO_URL in the environment (same as the bot).
 */
import * as dotenv from "dotenv";

dotenv.config();

import { mongoConnection } from "../config/connection";
import { User } from "../models/user";
import { TippingSettings } from "../models/tipSettings";
import { SecurityLog } from "../models/securityLog";

async function main(): Promise<void> {
    await mongoConnection.asPromise();
    const db = mongoConnection.db;
    if (!db) {
        throw new Error("No database handle");
    }

    const usersColl = User.collection.name;
    const tipsColl = TippingSettings.collection.name;
    const logsColl = SecurityLog.collection.name;

    const userRename = await db.collection(usersColl).updateMany(
        {},
        {
            $rename: {
                pendingPinAction: "pendingSecurityAction",
                withdrawPinFailures: "withdrawTotpFailures",
                withdrawPinLockedUntil: "withdrawTotpLockedUntil",
            },
        },
    );
    console.log("users top-level $rename matched:", userRename.matchedCount, "modified:", userRename.modifiedCount);

    let nested = 0;
    const cursor = db.collection(usersColl).find({ "pendingWithdraw.pinVerified": { $exists: true } });
    for await (const doc of cursor) {
        const pw = doc.pendingWithdraw as Record<string, unknown> | undefined;
        if (pw && Object.prototype.hasOwnProperty.call(pw, "pinVerified")) {
            await db.collection(usersColl).updateOne(
                { _id: doc._id },
                {
                    $set: { "pendingWithdraw.totpVerified": pw.pinVerified },
                    $unset: { "pendingWithdraw.pinVerified": "" },
                },
            );
            nested += 1;
        }
    }
    console.log("users pendingWithdraw.pinVerified -> totpVerified:", nested);

    const tipRename = await db.collection(tipsColl).updateMany(
        {},
        {
            $rename: {
                withdrawPinLockoutAttempts: "withdrawTotpLockoutAttempts",
                withdrawPinLockoutMinutes: "withdrawTotpLockoutMinutes",
            },
        },
    );
    console.log("tippingsettings $rename matched:", tipRename.matchedCount, "modified:", tipRename.modifiedCount);

    const logUpd = await db
        .collection(logsColl)
        .updateMany({ type: "withdraw_pin_fail" }, { $set: { type: "withdraw_totp_fail" } });
    console.log("securitylogs withdraw_pin_fail -> withdraw_totp_fail:", logUpd.modifiedCount);

    await mongoConnection.close();
    console.log("Migration finished.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
