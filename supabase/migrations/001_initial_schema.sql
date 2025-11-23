-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatgpt_user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    label TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    scopes TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_account_per_user UNIQUE (chatgpt_user_id, provider, label)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_chatgpt_user_id ON accounts(chatgpt_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider);
CREATE INDEX IF NOT EXISTS idx_accounts_enabled ON accounts(enabled);

-- Create onboarding_tokens table
CREATE TABLE IF NOT EXISTS onboarding_tokens (
    token TEXT PRIMARY KEY,
    chatgpt_user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    label TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_expires_at ON onboarding_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_chatgpt_user_id ON onboarding_tokens(chatgpt_user_id);

-- Create management_tokens table
CREATE TABLE IF NOT EXISTS management_tokens (
    token TEXT PRIMARY KEY,
    chatgpt_user_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_management_tokens_expires_at ON management_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_management_tokens_chatgpt_user_id ON management_tokens(chatgpt_user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM onboarding_tokens WHERE expires_at < NOW();
    DELETE FROM management_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) - though we'll use service role key for most operations
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies (permissive for service role, restrictive for anon)
CREATE POLICY "Service role has full access to accounts"
    ON accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to onboarding_tokens"
    ON onboarding_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to management_tokens"
    ON management_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
