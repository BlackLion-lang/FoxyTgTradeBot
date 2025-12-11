import { AddressLookupTableProgram, ComputeBudgetProgram, Connection, Keypair, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

export const sendV0Transaction = async (payer: Keypair, instructions: TransactionInstruction[], connection: Connection) => {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(
		new TransactionMessage({
			payerKey: payer.publicKey,
			recentBlockhash: blockhash,
			instructions
		}).compileToV0Message()
  );
  tx.sign([payer]);
  const txid = await connection.sendTransaction(tx, { skipPreflight: true });
  await connection.confirmTransaction(
		{
			blockhash: blockhash,
			lastValidBlockHeight: lastValidBlockHeight,
			signature: txid,
		},
		"confirmed",
  );

  return txid;
}

export const waitForNewBlock = async (targetHeight: number, connection: Connection) => {
  console.log(`Waiting for ${targetHeight} new blocks`);
  return new Promise(async (resolve) => {
		const { lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

		const intervalId = setInterval(async () => {
			const { lastValidBlockHeight: newValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
			if (newValidBlockHeight > lastValidBlockHeight + targetHeight) {
				clearInterval(intervalId);
				resolve(void 0);
			}
		}, 1000);
  });
}

export const createLookupTable = async (payer: Keypair, instructions: TransactionInstruction[], connection: Connection) => {
	const accountSet = new Set();
	instructions.forEach(ix => {
		accountSet.add(ix.programId.toBase58());
		ix.keys.forEach(k => {
			accountSet.add(k.pubkey.toBase58());
		});
	});
	const accountKeys = Array.from(accountSet).map((a: unknown) => new PublicKey(a as string));

	const slot = await connection.getSlot();
	const [lookupTableInst, lookupTableAddress] =
		AddressLookupTableProgram.createLookupTable({
			authority: payer.publicKey,
			payer: payer.publicKey,
			recentSlot: slot,
		});
	
	const priorityFeeTx = [
		ComputeBudgetProgram.setComputeUnitLimit({
			units: 50_000
		}),
		ComputeBudgetProgram.setComputeUnitPrice({
			microLamports: 2_000_000
		}),
	]
	const createSig = await sendV0Transaction(payer, [...priorityFeeTx, lookupTableInst], connection);
	console.log(`✅ Created lookup table: https://solscan.io/tx/${createSig}`);

	const chunkSize = 20;
	for (let i = 0; i < accountKeys.length; i += chunkSize) {
		const chunk = accountKeys.slice(i, i + chunkSize);

		const extendIx = AddressLookupTableProgram.extendLookupTable({
			lookupTable: lookupTableAddress,
			authority: payer.publicKey,
			payer: payer.publicKey,
			addresses: chunk,
		});
		const sig = await sendV0Transaction(payer, [...priorityFeeTx, extendIx], connection);
	}

	// Wait for the lookup table to be ready
	console.log("Waiting for lookup table to be ready...");
	let lookupTableAccount = null;
	const maxRetries = 30;
	let retries = 0;

	while (!lookupTableAccount && retries < maxRetries) {
		const table = (await connection.getAddressLookupTable(lookupTableAddress)).value;
		if (table && table.state.addresses.length === accountKeys.length) {
			lookupTableAccount = table;
		} else {
			retries++;
			await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
		}
	}

	if (!lookupTableAccount) {
		console.log("Couldn't find the lookup table after multiple retries.");
		return;
	} else {
		console.log('✅ Account Lookup Table created successfully');
	}

	return lookupTableAccount;
}

export const getLookupTable = async (lookupTableAddress: PublicKey, connection: Connection) => {
	const lookupTableAccount = await connection.getAddressLookupTable(lookupTableAddress);
	return lookupTableAccount.value;
}
