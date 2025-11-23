import { NextRequest } from "next/server";
import { validateGPTAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getProvider } from "@/lib/providers";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Validate GPT authentication
    const authResult = validateGPTAuth(request);
    if (!authResult.success) {
        return createErrorResponse(authResult.error!, 401);
    }

    const { chatgptUserId } = authResult;
    const { id } = await params;

    try {
        // First, fetch the account to verify ownership and get token for revocation
        const { data: account, error: fetchError } = (await supabaseAdmin
            .from("accounts")
            .select("*")
            .eq("id", id)
            .single()) as { data: any; error: any };

        if (fetchError || !account) {
            return createErrorResponse("Account not found", 404);
        }

        // Verify the account belongs to this user
        if (account.chatgpt_user_id !== chatgptUserId) {
            return createErrorResponse("Unauthorized", 403);
        }

        // Try to revoke the token with the provider
        if (account.access_token) {
            try {
                const provider = getProvider(account.provider);
                if (provider?.revokeToken) {
                    await provider.revokeToken(account.access_token);
                }
            } catch (error) {
                // Log but don't fail - we still want to delete the account
                console.error("Failed to revoke token with provider:", error);
            }
        }

        // Delete the account
        const { error: deleteError } = await supabaseAdmin
            .from("accounts")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Failed to delete account:", deleteError);
            return createErrorResponse("Failed to delete account", 500);
        }

        return createSuccessResponse({ success: true });
    } catch (error) {
        console.error("Error in account delete:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
