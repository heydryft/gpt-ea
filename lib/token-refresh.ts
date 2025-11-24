import { supabaseAdmin } from "./supabase";
import { getProvider } from "./providers";

/**
 * Check if a token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpiringSoon(expiresAt: string | null): boolean {
    if (!expiresAt) {
        return false;
    }

    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return expiryTime - now < fiveMinutes;
}

/**
 * Refresh an access token if it's expired or about to expire
 * Returns the updated account with fresh tokens
 */
export async function refreshTokenIfNeeded(account: any): Promise<{
    success: boolean;
    account?: any;
    error?: string;
}> {
    // Check if token needs refresh
    if (!isTokenExpiringSoon(account.expires_at)) {
        return { success: true, account };
    }

    // Check if we have a refresh token
    if (!account.refresh_token) {
        return {
            success: false,
            error: "Token expired and no refresh token available. Please reconnect your account.",
        };
    }

    try {
        // Get the provider
        const provider = getProvider(account.provider);
        if (!provider) {
            return {
                success: false,
                error: `Invalid provider: ${account.provider}`,
            };
        }

        // Refresh the token
        const tokenResponse = await provider.refreshAccessToken(account.refresh_token);

        // Calculate new expiration
        let expiresAt: string | null = null;
        if (tokenResponse.expires_in) {
            const expiry = new Date();
            expiry.setSeconds(expiry.getSeconds() + tokenResponse.expires_in);
            expiresAt = expiry.toISOString();
        }

        // Update the account in the database
        const { data: updatedAccount, error: updateError } = await ((supabaseAdmin
            .from("accounts")
            .update as any)({
                access_token: tokenResponse.access_token,
                refresh_token: tokenResponse.refresh_token || account.refresh_token,
                expires_at: expiresAt,
            }) as any)
            .eq("id", account.id)
            .select()
            .single();

        if (updateError) {
            console.error("Failed to update account with new tokens:", updateError);
            return {
                success: false,
                error: "Failed to update account with new tokens",
            };
        }

        return { success: true, account: updatedAccount };
    } catch (error) {
        console.error("Error refreshing token:", error);
        return {
            success: false,
            error: `Failed to refresh token: ${error}`,
        };
    }
}
