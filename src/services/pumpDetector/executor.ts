import { logger } from "../../utils/logger";

const TAG = "PumpDetector";

export async function onNewToken(mint: string): Promise<void> {
    logger.info(TAG, "New token mint:", mint);
}
