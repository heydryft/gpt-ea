import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateSecureToken } from "@/lib/tokens";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get("client_id");
    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");
    const scope = searchParams.get("scope");

    // Validate required OAuth parameters
    if (!clientId || !redirectUri || !state) {
        return NextResponse.json(
            { error: "invalid_request", error_description: "Missing required parameters" },
            { status: 400 }
        );
    }

    // Get the ephemeral user ID from ChatGPT's headers
    const ephemeralUserId = request.headers.get("openai-ephemeral-user-id");
    const conversationId = request.headers.get("openai-conversation-id");

    if (!ephemeralUserId) {
        return NextResponse.json(
            { error: "invalid_request", error_description: "Missing user context" },
            { status: 400 }
        );
    }

    try {
        // Check if we already have a permanent user ID for this ephemeral ID
        const { data: existingMapping } = await supabaseAdmin
            .from("user_mappings")
            .select("permanent_user_id")
            .eq("ephemeral_user_id", ephemeralUserId)
            .single();

        let permanentUserId: string;

        if (existingMapping) {
            // User has been here before - use existing permanent ID
            permanentUserId = existingMapping.permanent_user_id;
        } else {
            // New user - create a permanent ID
            permanentUserId = `user_${generateSecureToken()}`;

            // Store the mapping
            await supabaseAdmin.from("user_mappings").insert({
                ephemeral_user_id: ephemeralUserId,
                permanent_user_id: permanentUserId,
                conversation_id: conversationId,
            });
        }

        // Generate authorization code
        const authCode = generateSecureToken();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store authorization code
        await supabaseAdmin.from("oauth_codes").insert({
            code: authCode,
            permanent_user_id: permanentUserId,
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scope || "",
            expires_at: expiresAt.toISOString(),
        });

        // Redirect back to ChatGPT with authorization code
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set("code", authCode);
        redirectUrl.searchParams.set("state", state);

        return NextResponse.redirect(redirectUrl.toString());
    } catch (error) {
        console.error("OAuth authorize error:", error);
        return NextResponse.json(
            { error: "server_error", error_description: "Internal server error" },
            { status: 500 }
        );
    }
}
