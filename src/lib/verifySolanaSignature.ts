import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export function verifySolanaSignature({
  walletBase58,
  nonce,
  signatureBase58,
}: {
  walletBase58: string;
  nonce: string;
  signatureBase58: string;
}) {
  const msg = new TextEncoder().encode(`SOLANA_VOTE_LOGIN:${nonce}`);
  const sig = Buffer.from(signatureBase58, "base64");
  const pub = new PublicKey(walletBase58).toBytes();
  return nacl.sign.detached.verify(msg, sig, pub);
}
