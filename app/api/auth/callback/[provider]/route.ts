import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isTokenExpired } from "@/lib/tokens";
import { getProvider } from "@/lib/providers";
import type { Database } from "@/lib/database.types";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const { provider: providerName } = await params;

    console.log(`OAuth callback for ${providerName}:`, {
        hasCode: !!code,
        hasState: !!state,
        codeLength: code?.length,
        codePrefix: code?.substring(0, 15) + "...",
        codeSuffix: "..." + code?.substring(code.length - 15),
    });

    if (!code || !state) {
        return createErrorResponse("Missing code or state parameter");
    }

    try {
        // Get the OAuth provider FIRST (fast, no I/O)
        const provider = getProvider(providerName);
        if (!provider) {
            return createErrorResponse(`Invalid provider: ${providerName}`);
        }

        // Exchange code for access token IMMEDIATELY before it expires
        // Authorization codes expire in ~60 seconds and can only be used once
        let tokenResponse;
        try {
            tokenResponse = await provider.exchangeCodeForToken(code);
        } catch (error) {
            console.error("Failed to exchange code for token:", error);
            return createErrorResponse(`Failed to exchange authorization code: ${error}`, 500);
        }

        if (!tokenResponse.access_token) {
            console.error("No access token in response:", tokenResponse);
            return createErrorResponse("No access token received from provider", 500);
        }

        console.log(`Successfully exchanged code for ${providerName} token, expires in: ${tokenResponse.expires_in}s`);

        // NOW validate the onboarding token (after we have the OAuth tokens)
        const token = state;
        const { data: onboardingToken, error: tokenError } = await supabaseAdmin
            .from("onboarding_tokens")
            .select("*")
            .eq("token", token)
            .single();

        if (tokenError || !onboardingToken) {
            console.error("Invalid onboarding token after successful OAuth");
            return createErrorResponse("Invalid or expired token", 404);
        }

        const validToken: Database["public"]["Tables"]["onboarding_tokens"]["Row"] = onboardingToken;

        // Verify the provider matches
        if (validToken.provider !== providerName) {
            return createErrorResponse("Provider mismatch", 400);
        }

        // Check if token has expired
        if (isTokenExpired(validToken.expires_at)) {
            await supabaseAdmin
                .from("onboarding_tokens")
                .delete()
                .eq("token", token);
            return createErrorResponse("Token has expired", 401);
        }

        // Calculate token expiration
        let expiresAt: string | null = null;
        if (tokenResponse.expires_in) {
            const expiry = new Date();
            expiry.setSeconds(expiry.getSeconds() + tokenResponse.expires_in);
            expiresAt = expiry.toISOString();
        }

        // Get user info if available
        let metadata: any = {};
        if (provider.getUserInfo && tokenResponse.access_token) {
            try {
                const userInfo = await provider.getUserInfo(tokenResponse.access_token);
                metadata = userInfo;
                console.log(`Got user info for ${providerName}:`, { email: metadata.email || metadata.emailAddress, accountId: metadata.accountId });
            } catch (error) {
                console.error("Failed to get user info:", error);
                // Continue anyway - metadata is optional
            }
        }

        // Check if account already exists
        const { data: existingAccount } = (await supabaseAdmin
            .from("accounts")
            .select("id")
            .eq("chatgpt_user_id", validToken.chatgpt_user_id)
            .eq("provider", providerName)
            .eq("label", validToken.label)
            .single()) as { data: { id: string } | null; error: any };

        if (existingAccount) {
            // Update existing account
            const accountId = existingAccount.id;
            const { error: updateError } = await ((supabaseAdmin
                .from("accounts")
                .update as any)({
                    access_token: tokenResponse.access_token,
                    refresh_token: tokenResponse.refresh_token || null,
                    expires_at: expiresAt,
                    scopes: tokenResponse.scope?.split(" ") || null,
                    metadata,
                    enabled: true,
                }) as any)
                .eq("id", accountId);

            if (updateError) {
                console.error("Failed to update account:", updateError);
                return createErrorResponse("Failed to update account", 500);
            }

            console.log(`Successfully updated existing ${providerName} account:`, accountId);
        } else {
            // Create new account
            const { error: insertError } = await (supabaseAdmin
                .from("accounts")
                .insert as any)({
                    chatgpt_user_id: validToken.chatgpt_user_id,
                    provider: providerName,
                    label: validToken.label,
                    access_token: tokenResponse.access_token,
                    refresh_token: tokenResponse.refresh_token || null,
                    expires_at: expiresAt,
                    scopes: tokenResponse.scope?.split(" ") || null,
                    metadata,
                    enabled: true,
                });

            if (insertError) {
                console.error("Failed to create account:", insertError);
                return createErrorResponse("Failed to create account", 500);
            }
        }

        // Delete the used onboarding token
        await supabaseAdmin
            .from("onboarding_tokens")
            .delete()
            .eq("token", token);

        return createSuccessResponse({
            success: true,
            message: "Account connected successfully",
        });
    } catch (error) {
        console.error("Error in OAuth callback:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
