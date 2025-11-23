import { NextRequest } from "next/server";
import { validateGPTAuth, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
    // Validate GPT authentication
    const authResult = await validateGPTAuth(request);
    if (!authResult.success) {
        return createErrorResponse(authResult.error!, 401);
    }

    const { chatgptUserId } = authResult;

    try {
        // Fetch all accounts for this user
        const { data: accounts, error } = await supabaseAdmin
            .from("accounts")
            .select("id, provider, label, enabled, metadata, created_at")
            .eq("chatgpt_user_id", chatgptUserId!)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to fetch accounts:", error);
            return createErrorResponse("Failed to fetch accounts", 500);
        }

        return createSuccessResponse({ accounts: accounts || [] });
    } catch (error) {
        console.error("Error in accounts GET:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
