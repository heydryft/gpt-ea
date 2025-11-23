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

    try {
        // Create a new permanent user ID for this OAuth session
        // ChatGPT will store the token and use it for all future requests
        const permanentUserId = `user_${generateSecureToken()}`;

        // Generate authorization code
        const authCode = generateSecureToken();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store authorization code
        await (supabaseAdmin.from("oauth_codes").insert as any)({
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
