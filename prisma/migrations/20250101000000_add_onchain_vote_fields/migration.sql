-- AlterTable
ALTER TABLE "CoinVote" ADD COLUMN "transactionSignature" TEXT;
ALTER TABLE "CoinVote" ADD COLUMN "onChainSynced" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CoinVote" ADD COLUMN "syncedAt" DATETIME;

-- CreateIndex
CREATE INDEX "CoinVote_transactionSignature_idx" ON "CoinVote"("transactionSignature");
CREATE INDEX "CoinVote_onChainSynced_idx" ON "CoinVote"("onChainSynced");
