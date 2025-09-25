import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export function verifySolanaSignature({
  walletBase58,
  signatureBase58,
  message,
}: {
  walletBase58: string;
  signatureBase58: string;
  message: string;
}) {
  const msg = new TextEncoder().encode(message);
  const sig = Buffer.from(signatureBase58, "base64");
  const pub = new PublicKey(walletBase58).toBytes();
  return nacl.sign.detached.verify(msg, sig, pub);
}
