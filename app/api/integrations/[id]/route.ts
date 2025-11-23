import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isTokenExpired } from "@/lib/tokens";
import { getProvider } from "@/lib/providers";

export async function DELETE(
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

        // Fetch the account to verify ownership and get token for revocation
        const { data: account, error: fetchError } = (await supabaseAdmin
            .from("accounts")
            .select("*")
            .eq("id", id)
            .single()) as { data: any; error: any };

        if (fetchError || !account) {
            return createErrorResponse("Account not found", 404);
        }

        // Verify the account belongs to this user
        if (account.chatgpt_user_id !== managementToken.chatgpt_user_id) {
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
        console.error("Error in integrations delete:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
