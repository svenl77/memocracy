import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE = "sv_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export function setSession(wallet: string) {
  const t = jwt.sign({ wallet }, env.JWT_SECRET, { expiresIn: MAX_AGE });
  cookies().set(COOKIE, t, { httpOnly: true, sameSite: "lax", path: "/", secure: env.NODE_ENV === "production" });
}

export function getSessionWallet(): string | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const d = jwt.verify(token, env.JWT_SECRET) as { wallet: string };
    return d.wallet;
  } catch {
    return null;
  }
}
