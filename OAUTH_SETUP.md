# OAuth Authentication Setup Guide

## 🎯 What Changed

Your GPT now uses **OAuth authentication** instead of ephemeral user IDs. This means:

✅ **Persistent user identification** - Users don't need to re-link accounts every 24 hours  
✅ **Secure token-based auth** - JWT access tokens with 30-day expiration  
✅ **Automatic user mapping** - Ephemeral IDs are automatically mapped to permanent IDs  
✅ **Refresh tokens** - 90-day refresh tokens for long-term access

## 📦 Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install the new `jose` library for JWT handling.

### 2. Run Database Migration

Run the new migration in Supabase SQL Editor:

```sql
-- Copy contents of supabase/migrations/002_oauth_tables.sql
-- Paste and run in Supabase SQL Editor
```

This creates:

- `user_mappings` - Maps ephemeral IDs to permanent user IDs
- `oauth_codes` - Stores authorization codes (10 min expiration)
- `oauth_tokens` - Stores refresh tokens (90 day expiration)

### 3. Environment Variables

No new environment variables needed! The system uses your existing `GPT_API_KEY` for JWT signing.

### 4. Deploy to Vercel

```bash
git add .
git commit -m "Add OAuth authentication"
git push
```

Your existing `GPT_API_KEY` environment variable is all you need!

## 🔄 How OAuth Flow Works

### First Time User

1. User interacts with your GPT
2. ChatGPT redirects to `/oauth/authorize`
3. Your backend:
   - Gets `openai-ephemeral-user-id` from headers
   - Creates permanent user ID (e.g., `user_abc123...`)
   - Stores mapping in database
   - Returns authorization code
4. ChatGPT exchanges code for access token at `/oauth/token`
5. ChatGPT stores token and sends it with every request

### Returning User

1. ChatGPT sends stored access token in `Authorization: Bearer ...` header
2. Your backend verifies JWT and extracts permanent user ID
3. All APIs work with permanent ID

### Token Expiration

- **Access Token**: 30 days
- **Refresh Token**: 90 days
- ChatGPT automatically handles refresh

## 🔌 New Endpoints

### `GET /oauth/authorize`

Authorization endpoint for OAuth flow.

**Query Parameters:**

- `client_id` - ChatGPT's client ID
- `redirect_uri` - Where to send authorization code
- `state` - CSRF protection token
- `scope` - Requested scopes

**Returns:** Redirect to `redirect_uri` with authorization code

### `POST /oauth/token`

Token exchange endpoint.

**Body:**

```json
{
  "grant_type": "authorization_code",
  "code": "auth_code_here",
  "client_id": "chatgpt",
  "redirect_uri": "https://..."
}
```

**Returns:**

```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "refresh_token": "refresh_token_here",
  "scope": "actions"
}
```

## 📝 Updated OpenAPI Schema

The `openapi.yaml` has been updated with OAuth configuration:

```yaml
components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://gpt-ea-indol.vercel.app/oauth/authorize
          tokenUrl: https://gpt-ea-indol.vercel.app/oauth/token
          scopes:
            actions: Access to perform actions on your behalf

security:
  - OAuth2: [actions]
```

## 🔧 Configure in ChatGPT

1. Go to your GPT configuration
2. Actions → Authentication
3. Select **OAuth**
4. Fill in:
   - **Client ID**: `chatgpt` (or any identifier)
   - **Client Secret**: Leave empty (not required for this flow)
   - **Authorization URL**: `https://gpt-ea-indol.vercel.app/oauth/authorize`
   - **Token URL**: `https://gpt-ea-indol.vercel.app/oauth/token`
   - **Scope**: `actions`
5. Save

## 🧪 Testing

### Test OAuth Flow

1. Open your GPT in ChatGPT
2. First message will trigger OAuth
3. You'll be redirected (happens automatically)
4. Check Supabase `user_mappings` table - you should see a new entry

### Test API Calls

```bash
# Get an access token first (simulate OAuth)
# Then test with the token:

curl https://gpt-ea-indol.vercel.app/api/gpt/accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔍 Debugging

### Check User Mappings

```sql
SELECT * FROM user_mappings ORDER BY created_at DESC LIMIT 10;
```

### Check OAuth Codes

```sql
SELECT * FROM oauth_codes WHERE expires_at > NOW() ORDER BY created_at DESC;
```

### Check Tokens

```sql
SELECT * FROM oauth_tokens WHERE expires_at > NOW() ORDER BY created_at DESC;
```

### View Logs

Check Vercel logs for OAuth flow:

```
vercel logs --follow
```

## 🎉 Benefits

### For Users

- ✅ **One-time setup** - Authorize once, use forever
- ✅ **No re-authentication** - Tokens last 30-90 days
- ✅ **Seamless experience** - OAuth happens in background

### For You

- ✅ **Persistent user IDs** - Track users across sessions
- ✅ **Standard OAuth** - Industry-standard authentication
- ✅ **Secure tokens** - JWT with signature verification
- ✅ **Automatic mapping** - Ephemeral IDs mapped to permanent IDs

## 🔐 Security Notes

- Access tokens are JWTs signed with `GPT_API_KEY`
- Tokens include user ID in the `sub` claim
- Authorization codes expire in 10 minutes
- Refresh tokens expire in 90 days
- All tokens stored securely in Supabase

## 📊 Migration Path

The system supports both authentication methods:

1. **OAuth (new)** - Checks for `Authorization: Bearer ...` header first
2. **API Key (old)** - Falls back to `x-api-key` + `x-gpt-user-id` headers

This allows gradual migration without breaking existing functionality.

## 🚀 Next Steps

1. Run `npm install`
2. Run database migration
3. Deploy to Vercel
4. Update GPT configuration with OAuth
5. Test the flow!

---

**You now have persistent, secure user authentication!** 🎊
