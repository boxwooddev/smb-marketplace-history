import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { METAPLEX_TOKEN_PROGRAM_ID } from '../metaplex/constants';

import { SolanaProgram, SolanaProgramInstructionType } from '../types';
import { getMetadataAddressForMint } from '../utils';

const MARKETPLACE_ADDRESS = 'G6xptnrkj4bxg9H9ZyPzmAnNsGghSxZ7oBCL1KNKJUza';
const FEE_DESTINATION_ADDRESS = 'bDmnDkeV7xqWsEwKQEgZny6vXbHBoCYrjxA4aCr9fHU';

export async function parseSaleTx(
  conn: Connection,
  txHash: string,
  instrs: any
) {
  const transferForFee = instrs.find((ix) => {
    return (
      ix.program === SolanaProgram.SYSTEM &&
      ix.parsed.type === SolanaProgramInstructionType.TRANSFER &&
      ix.parsed.info.destination === FEE_DESTINATION_ADDRESS
    );
  });

  if (!transferForFee) {
    // panic!
  }

  const allocateTransferInstruction = instrs.find((ix) => {
    return (
      ix.program === SolanaProgram.SYSTEM &&
      ix.parsed.type === SolanaProgramInstructionType.ALLOCATE
    );
  });

  // TODO: this needs a refactor;
  // FUTURE: right now, it is looking where a transfer destination is allocated for space to ignore that amount

  const newAccountForStorageAddress =
    allocateTransferInstruction.parsed.info.account;
  const transferForSale = instrs.find((ix) => {
    return (
      ix.program === SolanaProgram.SYSTEM &&
      ix.parsed.type === SolanaProgramInstructionType.TRANSFER &&
      ix.parsed.info.destination !== newAccountForStorageAddress &&
      ix.parsed.info.destination !== FEE_DESTINATION_ADDRESS
    );
  });

  const saleAmount = (
    transferForSale.parsed.info.lamports / LAMPORTS_PER_SOL
  ).toFixed(8);
  const feeAmount = (
    transferForFee.parsed.info.lamports / LAMPORTS_PER_SOL
  ).toFixed(8);

  const initAccountInstruction = instrs.find((ix) => {
    return (
      ix.program === SolanaProgram.SPL_TOKEN &&
      ix.programId.toString() === METAPLEX_TOKEN_PROGRAM_ID &&
      ix.parsed.type === SolanaProgramInstructionType.INITIALIZE_ACCOUNT
    );
  });

  const nftMintAddr = initAccountInstruction.parsed.info.mint;
  const nftPDA = await getMetadataAddressForMint({
    mintTokenPublicKey: new PublicKey(nftMintAddr),
  });

  const mintinfo = await conn.getAccountInfo(nftPDA);

  console.log(`Public Key: ${nftPDA.toString()}`);
  console.log(`Mint Info: ${JSON.stringify(mintinfo, null, 2)}`);
}
