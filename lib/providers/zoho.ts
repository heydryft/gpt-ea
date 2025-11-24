import type { OAuthProvider, TokenResponse } from "./types";

const ZOHO_AUTH_URL = "https://accounts.zoho.com/oauth/v2/auth";
const ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";
const ZOHO_REVOKE_URL = "https://accounts.zoho.com/oauth/v2/token/revoke";
const ZOHO_USER_INFO_URL = "https://accounts.zoho.com/oauth/user/info";

const ZOHO_SCOPES = [
    "ZohoMail.messages.ALL",
    "ZohoMail.accounts.READ",
];

export class ZohoProvider implements OAuthProvider {
    name = "zoho";

    private getConfig() {
        const clientId = process.env.ZOHO_CLIENT_ID;
        const clientSecret = process.env.ZOHO_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/zoho`;

        if (!clientId || !clientSecret) {
            throw new Error("Zoho OAuth credentials not configured");
        }

        return { clientId, clientSecret, redirectUri };
    }

    getAuthUrl(state: string): string {
        const { clientId, redirectUri } = this.getConfig();

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: ZOHO_SCOPES.join(","),
            state,
            access_type: "offline",
            prompt: "consent",
        });

        return `${ZOHO_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCodeForToken(code: string): Promise<TokenResponse> {
        const { clientId, clientSecret, redirectUri } = this.getConfig();

        const response = await fetch(ZOHO_TOKEN_URL, {
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

        const response = await fetch(ZOHO_TOKEN_URL, {
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
        const response = await fetch(ZOHO_REVOKE_URL, {
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
        const response = await fetch(ZOHO_USER_INFO_URL, {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get user info: ${error}`);
        }

        const userInfo = await response.json();

        // Try to get Zoho Mail account ID
        try {
            const accountsResponse = await fetch(
                "https://mail.zoho.com/api/accounts",
                {
                    headers: {
                        Authorization: `Zoho-oauthtoken ${accessToken}`,
                    },
                }
            );

            if (accountsResponse.ok) {
                const accountsData = await accountsResponse.json();
                const accounts = accountsData.data || [];

                // Get the primary account or first account
                const primaryAccount = accounts.find((acc: any) => acc.isPrimary) || accounts[0];

                if (primaryAccount) {
                    userInfo.accountId = primaryAccount.accountId;
                    userInfo.email = primaryAccount.emailAddress || userInfo.Email;
                }
            }
        } catch (error) {
            console.error("Failed to get Zoho Mail account ID:", error);
            // Continue without account ID - it's optional
        }

        return userInfo;
    }
}

export const zohoProvider = new ZohoProvider();
