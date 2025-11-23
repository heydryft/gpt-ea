import { NextRequest } from "next/server";
import { validateGPTAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { generateSecureToken, createOnboardingTokenExpiry } from "@/lib/tokens";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidProvider } from "@/lib/providers";

export async function POST(request: NextRequest) {
    // Validate GPT authentication
    const authResult = validateGPTAuth(request);
    if (!authResult.success) {
        return createErrorResponse(authResult.error!, 401);
    }

    const { chatgptUserId } = authResult;

    try {
        // Parse request body
        const body = await request.json();
        const { provider, label } = body;

        // Validate required fields
        if (!provider || !label) {
            return createErrorResponse("Missing required fields: provider, label");
        }

        // Validate provider
        if (!isValidProvider(provider)) {
            return createErrorResponse(`Invalid provider: ${provider}`);
        }

        // Generate onboarding token
        const token = generateSecureToken();
        const expiresAt = createOnboardingTokenExpiry();

        // Store onboarding token in database
        const { error } = await (supabaseAdmin
            .from("onboarding_tokens")
            .insert as any)({
                token,
                chatgpt_user_id: chatgptUserId!,
                provider,
                label,
                expires_at: expiresAt.toISOString(),
            });

        if (error) {
            console.error("Failed to create onboarding token:", error);
            return createErrorResponse("Failed to create auth link", 500);
        }

        // Build auth URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const authUrl = `${appUrl}/auth/start?token=${token}`;

        return createSuccessResponse({ authUrl });
    } catch (error) {
        console.error("Error in create-auth-link:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
