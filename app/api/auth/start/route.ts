import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isTokenExpired } from "@/lib/tokens";
import { getProvider } from "@/lib/providers";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
        return createErrorResponse("Missing token parameter");
    }

    try {
        // Fetch onboarding token from database
        const { data: onboardingToken, error } = (await supabaseAdmin
            .from("onboarding_tokens")
            .select("*")
            .eq("token", token)
            .single()) as { data: any; error: any };

        if (error || !onboardingToken) {
            return createErrorResponse("Invalid or expired token", 404);
        }

        // Check if token has expired
        if (isTokenExpired(onboardingToken.expires_at)) {
            // Clean up expired token
            await supabaseAdmin
                .from("onboarding_tokens")
                .delete()
                .eq("token", token);

            return createErrorResponse("Token has expired", 401);
        }

        // Get the OAuth provider
        const provider = getProvider(onboardingToken.provider);
        if (!provider) {
            return createErrorResponse(`Invalid provider: ${onboardingToken.provider}`);
        }

        // Generate state parameter (we'll use the token as state for simplicity)
        const state = token;

        // Get authorization URL from provider
        const authUrl = provider.getAuthUrl(state);

        return createSuccessResponse({ authUrl });
    } catch (error) {
        console.error("Error in auth start:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
