import type { OAuthProvider, TokenResponse } from "./types";

const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const SLACK_REVOKE_URL = "https://slack.com/api/auth.revoke";
const SLACK_USER_INFO_URL = "https://slack.com/api/users.identity";

const SLACK_SCOPES = [
    "chat:write",
    "channels:read",
    "users:read",
    "users:read.email",
];

export class SlackProvider implements OAuthProvider {
    name = "slack";

    private getConfig() {
        const clientId = process.env.SLACK_CLIENT_ID;
        const clientSecret = process.env.SLACK_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/slack`;

        if (!clientId || !clientSecret) {
            throw new Error("Slack OAuth credentials not configured");
        }

        return { clientId, clientSecret, redirectUri };
    }

    getAuthUrl(state: string): string {
        const { clientId, redirectUri } = this.getConfig();

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: SLACK_SCOPES.join(","),
            state,
            user_scope: "",
        });

        return `${SLACK_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCodeForToken(code: string): Promise<TokenResponse> {
        const { clientId, clientSecret, redirectUri } = this.getConfig();

        const response = await fetch(SLACK_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to exchange code for token: ${error}`);
        }

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Slack API error: ${data.error}`);
        }

        return {
            access_token: data.access_token,
            token_type: data.token_type,
            scope: data.scope,
        };
    }

    async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
        // Slack tokens don't expire, so refresh is not needed
        // This is a placeholder to satisfy the interface
        throw new Error("Slack tokens do not require refresh");
    }

    async revokeToken(token: string): Promise<void> {
        const response = await fetch(SLACK_REVOKE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to revoke token: ${error}`);
        }

        const data = await response.json();
        if (!data.ok) {
            throw new Error(`Slack API error: ${data.error}`);
        }
    }

    async getUserInfo(accessToken: string): Promise<any> {
        const response = await fetch(SLACK_USER_INFO_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get user info: ${error}`);
        }

        const data = await response.json();
        if (!data.ok) {
            throw new Error(`Slack API error: ${data.error}`);
        }

        return data.user;
    }
}

export const slackProvider = new SlackProvider();
