import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isTokenExpired } from "@/lib/tokens";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
        return createErrorResponse("Missing token parameter");
    }

    try {
        // Fetch management token from database
        const { data: managementToken, error } = (await supabaseAdmin
            .from("management_tokens")
            .select("*")
            .eq("token", token)
            .single()) as { data: any; error: any };

        if (error || !managementToken) {
            return createErrorResponse("Invalid or expired token", 404);
        }

        // Check if token has expired
        if (isTokenExpired(managementToken.expires_at)) {
            // Clean up expired token
            await supabaseAdmin
                .from("management_tokens")
                .delete()
                .eq("token", token);

            return createErrorResponse("Token has expired", 401);
        }

        // Fetch all accounts for this user
        const { data: accounts, error: accountsError } = await supabaseAdmin
            .from("accounts")
            .select("id, provider, label, enabled, metadata, created_at")
            .eq("chatgpt_user_id", managementToken.chatgpt_user_id)
            .order("created_at", { ascending: false });

        if (accountsError) {
            console.error("Failed to fetch accounts:", accountsError);
            return createErrorResponse("Failed to fetch accounts", 500);
        }

        return createSuccessResponse({
            accounts: accounts || [],
            chatgptUserId: managementToken.chatgpt_user_id,
        });
    } catch (error) {
        console.error("Error in integrations GET:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
