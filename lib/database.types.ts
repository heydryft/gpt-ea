export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            accounts: {
                Row: {
                    id: string;
                    chatgpt_user_id: string;
                    provider: string;
                    label: string;
                    enabled: boolean;
                    access_token: string | null;
                    refresh_token: string | null;
                    expires_at: string | null;
                    scopes: string[] | null;
                    metadata: Json | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    chatgpt_user_id: string;
                    provider: string;
                    label: string;
                    enabled?: boolean;
                    access_token?: string | null;
                    refresh_token?: string | null;
                    expires_at?: string | null;
                    scopes?: string[] | null;
                    metadata?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    chatgpt_user_id?: string;
                    provider?: string;
                    label?: string;
                    enabled?: boolean;
                    access_token?: string | null;
                    refresh_token?: string | null;
                    expires_at?: string | null;
                    scopes?: string[] | null;
                    metadata?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            onboarding_tokens: {
                Row: {
                    token: string;
                    chatgpt_user_id: string;
                    provider: string;
                    label: string;
                    expires_at: string;
                    created_at: string;
                };
                Insert: {
                    token: string;
                    chatgpt_user_id: string;
                    provider: string;
                    label: string;
                    expires_at: string;
                    created_at?: string;
                };
                Update: {
                    token?: string;
                    chatgpt_user_id?: string;
                    provider?: string;
                    label?: string;
                    expires_at?: string;
                    created_at?: string;
                };
            };
            management_tokens: {
                Row: {
                    token: string;
                    chatgpt_user_id: string;
                    expires_at: string;
                    created_at: string;
                };
                Insert: {
                    token: string;
                    chatgpt_user_id: string;
                    expires_at: string;
                    created_at?: string;
                };
                Update: {
                    token?: string;
                    chatgpt_user_id?: string;
                    expires_at?: string;
                    created_at?: string;
                };
            };
        };
    };
}
