import { NextRequest } from "next/server";
import { validateGPTAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Validate GPT authentication
    const authResult = await validateGPTAuth(request);
    if (!authResult.success) {
        return createErrorResponse(authResult.error!, 401);
    }

    const { chatgptUserId } = authResult;
    const { id } = await params;

    try {
        // First, fetch the current account to verify ownership and get current state
        const { data: account, error: fetchError } = (await supabaseAdmin
            .from("accounts")
            .select("id, enabled, chatgpt_user_id")
            .eq("id", id)
            .single()) as { data: any; error: any };

        if (fetchError || !account) {
            return createErrorResponse("Account not found", 404);
        }

        // Verify the account belongs to this user
        if (account.chatgpt_user_id !== chatgptUserId) {
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
        console.error("Error in account toggle:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
