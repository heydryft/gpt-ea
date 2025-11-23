import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateSecureToken } from "@/lib/tokens";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.GPT_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { grant_type, code, client_id, client_secret, redirect_uri } = body;

        // Validate grant type
        if (grant_type !== "authorization_code") {
            return NextResponse.json(
                { error: "unsupported_grant_type" },
                { status: 400 }
            );
        }

        // Validate required parameters
        if (!code || !client_id || !redirect_uri) {
            return NextResponse.json(
                { error: "invalid_request", error_description: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Look up authorization code
        const { data: authCode, error: codeError } = (await supabaseAdmin
            .from("oauth_codes")
            .select("*")
            .eq("code", code)
            .eq("client_id", client_id)
            .eq("redirect_uri", redirect_uri)
            .single()) as { data: any; error: any };

        if (codeError || !authCode) {
            return NextResponse.json(
                { error: "invalid_grant", error_description: "Invalid authorization code" },
                { status: 400 }
            );
        }

        // Check if code has expired
        if (new Date(authCode.expires_at) < new Date()) {
            // Clean up expired code
            await supabaseAdmin.from("oauth_codes").delete().eq("code", code);

            return NextResponse.json(
                { error: "invalid_grant", error_description: "Authorization code expired" },
                { status: 400 }
            );
        }

        // Generate access token (JWT)
        const accessToken = await new SignJWT({
            sub: authCode.permanent_user_id,
            scope: authCode.scope,
            type: "access_token",
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("30d") // 30 days
            .sign(JWT_SECRET);

        // Generate refresh token
        const refreshToken = generateSecureToken();
        const refreshExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

        // Store refresh token
        await supabaseAdmin.from("oauth_tokens").insert({
            refresh_token: refreshToken,
            permanent_user_id: authCode.permanent_user_id,
            client_id: client_id,
            scope: authCode.scope,
            expires_at: refreshExpiresAt.toISOString(),
        });

        // Delete used authorization code
        await supabaseAdmin.from("oauth_codes").delete().eq("code", code);

        // Return tokens
        return NextResponse.json({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 2592000, // 30 days in seconds
            refresh_token: refreshToken,
            scope: authCode.scope,
        });
    } catch (error) {
        console.error("OAuth token error:", error);
        return NextResponse.json(
            { error: "server_error", error_description: "Internal server error" },
            { status: 500 }
        );
    }
}
