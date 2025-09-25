import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE = "sv_session";
const MAX_AGE = 60 * 60 * 24 * 7;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable must be configured");
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};

export function setSession(wallet: string) {
  const t = jwt.sign({ wallet }, JWT_SECRET, { expiresIn: MAX_AGE });
  cookies().set(COOKIE, t, COOKIE_OPTIONS);
}

export function getSessionWallet(): string | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as { wallet: string };
    return d.wallet;
  } catch {
    return null;
  }
}
