import { NextRequest } from "next/server";
import { validateGPTAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { generateSecureToken, createManagementTokenExpiry } from "@/lib/tokens";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    // Validate GPT authentication
    const authResult = await validateGPTAuth(request);
    if (!authResult.success) {
        return createErrorResponse(authResult.error!, 401);
    }

    const { chatgptUserId } = authResult;

    try {
        // Generate management token
        const token = generateSecureToken();
        const expiresAt = createManagementTokenExpiry();

        // Store management token in database
        const { error } = await (supabaseAdmin
            .from("management_tokens")
            .insert as any)({
                token,
                chatgpt_user_id: chatgptUserId!,
                expires_at: expiresAt.toISOString(),
            });

        if (error) {
            console.error("Failed to create management token:", error);
            return createErrorResponse("Failed to create management link", 500);
        }

        // Build management URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const managementUrl = `${appUrl}/integrations?token=${token}`;

        return createSuccessResponse({ managementUrl });
    } catch (error) {
        console.error("Error in create-management-link:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
