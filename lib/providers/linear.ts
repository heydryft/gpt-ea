import type { OAuthProvider, TokenResponse } from "./types";

const LINEAR_AUTH_URL = "https://linear.app/oauth/authorize";
const LINEAR_TOKEN_URL = "https://api.linear.app/oauth/token";
const LINEAR_REVOKE_URL = "https://api.linear.app/oauth/revoke";
const LINEAR_API_URL = "https://api.linear.app/graphql";

const LINEAR_SCOPES = ["read", "write"];

export class LinearProvider implements OAuthProvider {
    name = "linear";

    private getConfig() {
        const clientId = process.env.LINEAR_CLIENT_ID;
        const clientSecret = process.env.LINEAR_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/linear`;

        if (!clientId || !clientSecret) {
            throw new Error("Linear OAuth credentials not configured");
        }

        return { clientId, clientSecret, redirectUri };
    }

    getAuthUrl(state: string): string {
        const { clientId, redirectUri } = this.getConfig();

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: LINEAR_SCOPES.join(","),
            state,
        });

        return `${LINEAR_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCodeForToken(code: string): Promise<TokenResponse> {
        const { clientId, clientSecret, redirectUri } = this.getConfig();

        const response = await fetch(LINEAR_TOKEN_URL, {
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
        // Linear tokens are long-lived and don't have a refresh mechanism
        // This is a placeholder to satisfy the interface
        throw new Error("Linear tokens do not require refresh");
    }

    async revokeToken(token: string): Promise<void> {
        const { clientId, clientSecret } = this.getConfig();

        const response = await fetch(LINEAR_REVOKE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                token,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to revoke token: ${error}`);
        }
    }

    async getUserInfo(accessToken: string): Promise<any> {
        const query = `
      query {
        viewer {
          id
          name
          email
        }
      }
    `;

        const response = await fetch(LINEAR_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get user info: ${error}`);
        }

        const data = await response.json();
        return data.data?.viewer;
    }
}

export const linearProvider = new LinearProvider();
