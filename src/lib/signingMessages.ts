export const VOTE_LOGIN_MESSAGE_PREFIX = "SOLANA_VOTE_LOGIN";

export function createVoteLoginMessage(nonce: string) {
  return `${VOTE_LOGIN_MESSAGE_PREFIX}:${nonce}`;
}
