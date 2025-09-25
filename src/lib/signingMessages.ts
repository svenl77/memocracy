export const VOTE_LOGIN_MESSAGE_PREFIX = "SOLANA_VOTE_LOGIN";
export const LEADERBOARD_MESSAGE_PREFIX = "MEMOCRACY_LEADERBOARD";

export function createVoteLoginMessage(nonce: string) {
  return `${VOTE_LOGIN_MESSAGE_PREFIX}:${nonce}`;
}

export function normalizeLeaderboardUsername(username: string) {
  return username.trim();
}

export function createLeaderboardMessage({
  username,
  score,
  nonce,
}: {
  username: string;
  score: number;
  nonce: string;
}) {
  const normalizedUsername = normalizeLeaderboardUsername(username);
  const encodedUsername = encodeURIComponent(normalizedUsername);
  return `${LEADERBOARD_MESSAGE_PREFIX}:${score}:${nonce}:${encodedUsername}`;
}
