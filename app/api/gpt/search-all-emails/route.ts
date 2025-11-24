import { NextRequest } from "next/server";
import { validateGPTAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { searchEmails } from "@/lib/actions/gmail";
import { refreshTokenIfNeeded } from "@/lib/token-refresh";

export async function POST(request: NextRequest) {
    // Validate GPT authentication
    const authResult = await validateGPTAuth(request);
    if (!authResult.success) {
        return createErrorResponse(authResult.error!, 401);
    }

    const { chatgptUserId } = authResult;

    try {
        // Parse request body
        const body = await request.json();
        const { query = "newer_than:2d", maxResults = 20 } = body;

        // Fetch all enabled Gmail accounts for this user
        const { data: accounts, error: fetchError } = (await supabaseAdmin
            .from("accounts")
            .select("*")
            .eq("chatgpt_user_id", chatgptUserId!)
            .eq("provider", "gmail")
            .eq("enabled", true)) as { data: any[]; error: any };

        if (fetchError) {
            return createErrorResponse("Failed to fetch accounts", 500);
        }

        if (!accounts || accounts.length === 0) {
            return createSuccessResponse({
                accounts: [],
                totalEmails: 0,
                message: "No Gmail accounts connected",
            });
        }

        // Search emails in all accounts in parallel
        const results = await Promise.all(
            accounts.map(async (account) => {
                try {
                    // Refresh token if needed
                    const refreshResult = await refreshTokenIfNeeded(account);
                    if (!refreshResult.success) {
                        return {
                            accountId: account.id,
                            label: account.label,
                            email: account.email,
                            success: false,
                            messages: [],
                            error: refreshResult.error || "Failed to refresh token",
                        };
                    }

                    const activeAccount = refreshResult.account;

                    const result = await searchEmails(
                        {
                            accountId: activeAccount.id,
                            chatgptUserId: chatgptUserId!,
                            accessToken: activeAccount.access_token,
                            refreshToken: activeAccount.refresh_token,
                            metadata: activeAccount.metadata,
                        },
                        { query, maxResults }
                    );

                    return {
                        accountId: activeAccount.id,
                        label: activeAccount.label,
                        email: activeAccount.email,
                        success: result.success,
                        messages: result.success ? result.data?.messages || [] : [],
                        error: result.success ? null : result.error,
                    };
                } catch (error) {
                    return {
                        accountId: account.id,
                        label: account.label,
                        email: account.email,
                        success: false,
                        messages: [],
                        error: `Error searching account: ${error}`,
                    };
                }
            })
        );

        // Calculate totals
        const totalEmails = results.reduce((sum, r) => sum + r.messages.length, 0);
        const successfulAccounts = results.filter((r) => r.success).length;

        return createSuccessResponse({
            accounts: results,
            totalEmails,
            successfulAccounts,
            totalAccounts: accounts.length,
        });
    } catch (error) {
        console.error("Error in search-all-emails:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
