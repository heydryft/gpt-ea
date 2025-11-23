-- User mappings table: Maps ephemeral IDs to permanent user IDs
CREATE TABLE IF NOT EXISTS user_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ephemeral_user_id TEXT NOT NULL,
    permanent_user_id TEXT NOT NULL UNIQUE,
    conversation_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_user_mappings_ephemeral ON user_mappings(ephemeral_user_id);
CREATE INDEX idx_user_mappings_permanent ON user_mappings(permanent_user_id);

-- OAuth authorization codes table
CREATE TABLE IF NOT EXISTS oauth_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    permanent_user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    scope TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX idx_oauth_codes_code ON oauth_codes(code);
CREATE INDEX idx_oauth_codes_expires ON oauth_codes(expires_at);

-- OAuth tokens table (for refresh tokens)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refresh_token TEXT NOT NULL UNIQUE,
    permanent_user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    scope TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX idx_oauth_tokens_refresh ON oauth_tokens(refresh_token);
CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(permanent_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_mappings
CREATE TRIGGER update_user_mappings_updated_at
    BEFORE UPDATE ON user_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role can do everything)
CREATE POLICY "Service role can manage user_mappings"
    ON user_mappings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage oauth_codes"
    ON oauth_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage oauth_tokens"
    ON oauth_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Update accounts table to use permanent_user_id
-- Add a new column but keep the old one for backward compatibility
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS permanent_user_id TEXT;

-- Create index on permanent_user_id
CREATE INDEX IF NOT EXISTS idx_accounts_permanent_user ON accounts(permanent_user_id);

-- Comment explaining the migration path
COMMENT ON COLUMN accounts.permanent_user_id IS 'New permanent user ID from OAuth. Will eventually replace chatgpt_user_id.';
