import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isTokenExpired } from "@/lib/tokens";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const { id } = await params;

    if (!token) {
        return createErrorResponse("Missing token parameter");
    }

    try {
        // Fetch management token from database
        const { data: managementToken, error: tokenError } = (await supabaseAdmin
            .from("management_tokens")
            .select("*")
            .eq("token", token)
            .single()) as { data: any; error: any };

        if (tokenError || !managementToken) {
            return createErrorResponse("Invalid or expired token", 404);
        }

        // Check if token has expired
        if (isTokenExpired(managementToken.expires_at)) {
            await supabaseAdmin
                .from("management_tokens")
                .delete()
                .eq("token", token);

            return createErrorResponse("Token has expired", 401);
        }

        // Fetch the account to verify ownership and get current state
        const { data: account, error: fetchError } = (await supabaseAdmin
            .from("accounts")
            .select("id, enabled, chatgpt_user_id")
            .eq("id", id)
            .single()) as { data: any; error: any };

        if (fetchError || !account) {
            return createErrorResponse("Account not found", 404);
        }

        // Verify the account belongs to this user
        if (account.chatgpt_user_id !== managementToken.chatgpt_user_id) {
            return createErrorResponse("Unauthorized", 403);
        }

        // Toggle the enabled state
        const newEnabledState = !account.enabled;

        const { error: updateError } = await ((supabaseAdmin
            .from("accounts")
            .update as any)({ enabled: newEnabledState }) as any)
            .eq("id", id);

        if (updateError) {
            console.error("Failed to toggle account:", updateError);
            return createErrorResponse("Failed to toggle account", 500);
        }

        return createSuccessResponse({
            id,
            enabled: newEnabledState,
        });
    } catch (error) {
        console.error("Error in integrations toggle:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
