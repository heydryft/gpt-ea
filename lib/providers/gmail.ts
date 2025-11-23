import type { OAuthProvider, TokenResponse } from "./types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
];

export class GmailProvider implements OAuthProvider {
    name = "gmail";

    private getConfig() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/gmail`;

        if (!clientId || !clientSecret) {
            throw new Error("Gmail OAuth credentials not configured");
        }

        return { clientId, clientSecret, redirectUri };
    }

    getAuthUrl(state: string): string {
        const { clientId, redirectUri } = this.getConfig();

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: GMAIL_SCOPES.join(" "),
            state,
            access_type: "offline",
            prompt: "consent",
        });

        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCodeForToken(code: string): Promise<TokenResponse> {
        const { clientId, clientSecret, redirectUri } = this.getConfig();

        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to exchange code for token: ${error}`);
        }

        return response.json();
    }

    async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
        const { clientId, clientSecret } = this.getConfig();

        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to refresh token: ${error}`);
        }

        return response.json();
    }

    async revokeToken(token: string): Promise<void> {
        const response = await fetch(GOOGLE_REVOKE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ token }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to revoke token: ${error}`);
        }
    }

    async getUserInfo(accessToken: string): Promise<any> {
        const response = await fetch(GOOGLE_USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get user info: ${error}`);
        }

        return response.json();
    }
}

export const gmailProvider = new GmailProvider();
