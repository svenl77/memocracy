import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE = "sv_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export function setSession(wallet: string) {
  const t = jwt.sign({ wallet }, process.env.JWT_SECRET!, { expiresIn: MAX_AGE });
  cookies().set(COOKIE, t, { httpOnly: true, sameSite: "lax", path: "/" });
}

export function getSessionWallet(): string | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET!) as { wallet: string };
    return d.wallet;
  } catch {
    return null;
  }
}
