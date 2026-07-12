import crypto from "node:crypto";

export const ADMIN_COOKIE = "pp_admin_session";

function credentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!username || !password || !secret) {
    return null;
  }

  return {
    username,
    password,
    secret,
  };
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

export function validateAdminCredentials(
  username: string,
  password: string
) {
  const expected = credentials();

  if (!expected) {
    return false;
  }

  return (
    safeEqual(username, expected.username) &&
    safeEqual(password, expected.password)
  );
}

export function createAdminToken() {
  const expected = credentials();

  if (!expected) {
    throw new Error(
      "Admin environment variables are not configured."
    );
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${expected.username}:${issuedAt}`;
  const signature = crypto
    .createHmac("sha256", expected.secret)
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyAdminToken(token?: string | null) {
  const expectedCredentials = credentials();

  if (!token || !expectedCredentials) {
    return false;
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return false;
    }

    const [username, issuedAt, signature] = parts;

    if (!safeEqual(username, expectedCredentials.username)) {
      return false;
    }

    const age = Math.floor(Date.now() / 1000) - Number(issuedAt);

    if (!Number.isFinite(age) || age < 0 || age > 60 * 60 * 12) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", expectedCredentials.secret)
      .update(`${username}:${issuedAt}`)
      .digest("hex");

    return safeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
}
