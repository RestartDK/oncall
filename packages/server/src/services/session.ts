/**
 * Session service for managing httpOnly cookies
 * Uses signed cookies to store session data securely
 */

import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE_NAME = "linear_session";
const STATE_COOKIE_NAME = "linear_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const STATE_MAX_AGE = 60 * 10; // 10 minutes

function getSessionSecret(): string {
	const secret = process.env.SESSION_SECRET;
	if (!secret) {
		throw new Error("SESSION_SECRET environment variable is required");
	}
	return secret;
}

/**
 * Signs a value using HMAC-SHA256
 */
function sign(value: string): string {
	const secret = getSessionSecret();
	const hmac = createHmac("sha256", secret);
	hmac.update(value);
	return hmac.digest("hex");
}

/**
 * Creates a signed cookie value
 */
function createSignedValue(value: string): string {
	const signature = sign(value);
	return `${value}.${signature}`;
}

/**
 * Verifies and extracts the value from a signed cookie
 */
function verifySignedValue(signedValue: string): string | null {
	const parts = signedValue.split(".");
	if (parts.length !== 2) {
		return null;
	}

	const [value, signature] = parts;
	if (!value || !signature) {
		return null;
	}

	const expectedSignature = sign(value);

	// Use timing-safe comparison to prevent timing attacks
	if (signature.length !== expectedSignature.length) {
		return null;
	}

	try {
		if (timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expectedSignature, "utf8"))) {
			return value;
		}
	} catch {
		return null;
	}

	return null;
}

/**
 * Gets the Linear access token from the session cookie
 */
export function getLinearAccessToken(c: Context): string | null {
	const signedValue = getCookie(c, SESSION_COOKIE_NAME);
	if (!signedValue) {
		return null;
	}

	const token = verifySignedValue(signedValue);
	return token;
}

/**
 * Sets the Linear access token in a signed httpOnly cookie
 */
export function setLinearAccessToken(c: Context, token: string): void {
	const signedValue = createSignedValue(token);
	const isProduction = process.env.NODE_ENV === "production";

	setCookie(c, SESSION_COOKIE_NAME, signedValue, {
		httpOnly: true,
		secure: isProduction,
		sameSite: "Lax",
		maxAge: SESSION_MAX_AGE,
		path: "/",
	});
}

/**
 * Clears the Linear access token session cookie
 */
export function clearLinearAccessToken(c: Context): void {
	deleteCookie(c, SESSION_COOKIE_NAME, {
		path: "/",
	});
}

/**
 * Sets a temporary OAuth state cookie for CSRF protection
 */
export function setOAuthState(c: Context, state: string): void {
	const signedValue = createSignedValue(state);
	const isProduction = process.env.NODE_ENV === "production";

	setCookie(c, STATE_COOKIE_NAME, signedValue, {
		httpOnly: true,
		secure: isProduction,
		sameSite: "Lax",
		maxAge: STATE_MAX_AGE,
		path: "/",
	});
}

/**
 * Gets and validates the OAuth state cookie
 */
export function getAndValidateOAuthState(c: Context, providedState: string): boolean {
	const signedValue = getCookie(c, STATE_COOKIE_NAME);
	if (!signedValue) {
		return false;
	}

	const state = verifySignedValue(signedValue);
	if (!state || state !== providedState) {
		return false;
	}

	// Clear the state cookie after validation
	deleteCookie(c, STATE_COOKIE_NAME, { path: "/" });

	return true;
}
