export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    revokeUrl?: string;
    scopes: string[];
    redirectUri: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
}

export interface OAuthProvider {
    name: string;
    getAuthUrl: (state: string) => string;
    exchangeCodeForToken: (code: string) => Promise<TokenResponse>;
    refreshAccessToken: (refreshToken: string) => Promise<TokenResponse>;
    revokeToken?: (token: string) => Promise<void>;
    getUserInfo?: (accessToken: string) => Promise<any>;
}

export type ProviderName = "gmail" | "slack" | "linear" | "zoho" | "mercury";
