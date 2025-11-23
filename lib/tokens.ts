import { randomBytes } from "crypto";

/**
 * Generate a cryptographically secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns A URL-safe base64 encoded token
 */
export function generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString("base64url");
}

/**
 * Create an onboarding token that expires in 10 minutes
 */
export function createOnboardingTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    return expiry;
}

/**
 * Create a management token that expires in 1 hour
 */
export function createManagementTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    return expiry;
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiresAt: string | Date): boolean {
    const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
    return expiry < new Date();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}
