import { NextRequest } from "next/server";
import { validateGPTAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getAction } from "@/lib/actions";
import { refreshTokenIfNeeded } from "@/lib/token-refresh";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string; action: string }> }
) {
    // Validate GPT authentication
    const authResult = await validateGPTAuth(request);
    if (!authResult.success) {
        return createErrorResponse(authResult.error!, 401);
    }

    const { chatgptUserId } = authResult;
    const { provider, action } = await params;

    try {
        // Parse request body
        const body = await request.json();
        const { accountId, params: actionParams } = body;

        // Validate required fields
        if (!accountId) {
            return createErrorResponse("Missing required field: accountId");
        }

        // Fetch the account
        const { data: account, error: fetchError } = (await supabaseAdmin
            .from("accounts")
            .select("*")
            .eq("id", accountId)
            .eq("chatgpt_user_id", chatgptUserId!)
            .single()) as { data: any; error: any };

        if (fetchError || !account) {
            return createErrorResponse("Account not found", 404);
        }

        // Verify the account is enabled
        if (!account.enabled) {
            return createErrorResponse("Account is disabled", 403);
        }

        // Verify the provider matches
        if (account.provider !== provider) {
            return createErrorResponse("Provider mismatch", 400);
        }

        // Check if access token exists
        if (!account.access_token) {
            return createErrorResponse("Account has no access token", 400);
        }

        // Refresh token if needed
        const refreshResult = await refreshTokenIfNeeded(account);
        if (!refreshResult.success) {
            return createErrorResponse(refreshResult.error || "Failed to refresh token", 401);
        }

        // Use the refreshed account (or original if no refresh was needed)
        const activeAccount = refreshResult.account;

        // Get the action handler
        const actionHandler = getAction(provider, action);
        if (!actionHandler) {
            return createErrorResponse(
                `Invalid action: ${action} for provider: ${provider}`,
                404
            );
        }

        // Execute the action
        const result = await actionHandler(
            {
                accountId: activeAccount.id,
                chatgptUserId: chatgptUserId!,
                accessToken: activeAccount.access_token,
                refreshToken: activeAccount.refresh_token,
                metadata: activeAccount.metadata,
            },
            actionParams || {}
        );

        if (!result.success) {
            return createErrorResponse(result.error || "Action failed", 400);
        }

        return createSuccessResponse(result.data);
    } catch (error) {
        console.error("Error in action execution:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
