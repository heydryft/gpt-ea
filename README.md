# GPT Integration Hub

A production-ready Next.js application that acts as an integration backend for ChatGPT Custom GPTs. This service handles OAuth flows, stores access tokens, and provides a unified API for ChatGPT to interact with external services like Gmail, Slack, Linear, and Zoho.

## Features

- 🔐 **No Traditional Auth**: Users identified only by `chatgpt_user_id` from Custom GPT
- 🔗 **OAuth Integration**: Seamless OAuth flows for multiple providers
- 🎯 **Token Management**: Secure storage and automatic refresh of access tokens
- 🌐 **Web Interface**: User-friendly integrations management page
- 🚀 **Production Ready**: Built with TypeScript, Next.js 15, and Supabase
- 🎨 **Modern UI**: Beautiful interface using Tailwind CSS and shadcn/ui

## Supported Integrations

- **Gmail** - Send emails, search messages
- **Slack** - Post messages, list channels
- **Linear** - Create issues, search tasks, list teams
- **Zoho CRM** - (Framework ready)
- **Mercury** - (Framework ready)

## Architecture

### Identity Model

No traditional user authentication. Users are identified via:

1. **API Endpoints** (called by Custom GPT):

   - `x-api-key` header: Shared secret
   - `x-gpt-user-id` header: ChatGPT user ID

2. **Browser Pages** (OAuth flows, management):
   - `token` query parameter: OnboardingToken or ManagementToken
   - Server validates token and extracts user ID

### Database Schema

#### Tables

1. **accounts** - Connected integration accounts

   - `id` (UUID, primary key)
   - `chatgpt_user_id` (string)
   - `provider` (string)
   - `label` (string)
   - `enabled` (boolean)
   - `access_token` (string)
   - `refresh_token` (string)
   - `expires_at` (timestamp)
   - `scopes` (text[])
   - `metadata` (jsonb)
   - Unique constraint: `(chatgpt_user_id, provider, label)`

2. **onboarding_tokens** - OAuth flow bootstrap tokens

   - `token` (string, primary key)
   - `chatgpt_user_id` (string)
   - `provider` (string)
   - `label` (string)
   - `expires_at` (timestamp) - 10 minutes

3. **management_tokens** - Integrations page access tokens
   - `token` (string, primary key)
   - `chatgpt_user_id` (string)
   - `expires_at` (timestamp) - 1 hour

## Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- OAuth credentials for providers you want to support

### 1. Clone and Install

```bash
git clone <your-repo>
cd gpt-ea
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GPT API Key - Generate a secure random string
GPT_API_KEY=your-secret-api-key-change-this

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gmail (Google OAuth)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Slack
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret

# Linear
LINEAR_CLIENT_ID=your-linear-client-id
LINEAR_CLIENT_SECRET=your-linear-client-secret

# Zoho
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
```

### 3. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`

Alternatively, if using Supabase CLI:

```bash
supabase db push
```

### 4. Configure OAuth Providers

For each provider you want to use, set up OAuth credentials:

#### Gmail (Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/callback/gmail` (and production URL)
6. Copy Client ID and Secret to `.env.local`

#### Slack

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app
3. Add OAuth scopes: `chat:write`, `channels:read`, `users:read`, `users:read.email`
4. Add redirect URL: `http://localhost:3000/auth/callback/slack`
5. Copy Client ID and Secret to `.env.local`

#### Linear

1. Go to [Linear Settings](https://linear.app/settings/api)
2. Create a new OAuth application
3. Add redirect URL: `http://localhost:3000/auth/callback/linear`
4. Copy Client ID and Secret to `.env.local`

#### Zoho

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Create a new client
3. Add redirect URL: `http://localhost:3000/auth/callback/zoho`
4. Copy Client ID and Secret to `.env.local`

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app running.

## API Endpoints

### GPT API Endpoints (Require `x-api-key` and `x-gpt-user-id` headers)

#### Create Auth Link

```http
POST /api/gpt/create-auth-link
Content-Type: application/json
x-api-key: your-api-key
x-gpt-user-id: user-123

{
  "provider": "gmail",
  "label": "gmail-work"
}
```

Response:

```json
{
  "authUrl": "https://yourapp.com/auth/start?token=..."
}
```

#### Create Management Link

```http
POST /api/gpt/create-management-link
x-api-key: your-api-key
x-gpt-user-id: user-123
```

Response:

```json
{
  "managementUrl": "https://yourapp.com/integrations?token=..."
}
```

#### List Accounts

```http
GET /api/gpt/accounts
x-api-key: your-api-key
x-gpt-user-id: user-123
```

Response:

```json
{
  "accounts": [
    {
      "id": "uuid",
      "provider": "gmail",
      "label": "gmail-work",
      "enabled": true,
      "metadata": { "email": "user@work.com" }
    }
  ]
}
```

#### Toggle Account

```http
POST /api/gpt/accounts/{id}/toggle
x-api-key: your-api-key
x-gpt-user-id: user-123
```

#### Delete Account

```http
DELETE /api/gpt/accounts/{id}
x-api-key: your-api-key
x-gpt-user-id: user-123
```

#### Execute Provider Action

```http
POST /api/gpt/actions/{provider}/{action}
Content-Type: application/json
x-api-key: your-api-key
x-gpt-user-id: user-123

{
  "accountId": "uuid",
  "params": {
    // action-specific parameters
  }
}
```

### Available Actions

#### Gmail Actions

**Send Email**

```http
POST /api/gpt/actions/gmail/send-email

{
  "accountId": "uuid",
  "params": {
    "to": "recipient@example.com",
    "subject": "Hello",
    "body": "Email content",
    "cc": "optional@example.com",
    "bcc": "optional@example.com"
  }
}
```

**Search Emails**

```http
POST /api/gpt/actions/gmail/search-emails

{
  "accountId": "uuid",
  "params": {
    "query": "from:someone@example.com",
    "maxResults": 10
  }
}
```

#### Slack Actions

**Post Message**

```http
POST /api/gpt/actions/slack/post-message

{
  "accountId": "uuid",
  "params": {
    "channel": "#general",
    "text": "Hello from ChatGPT!"
  }
}
```

**List Channels**

```http
POST /api/gpt/actions/slack/list-channels

{
  "accountId": "uuid",
  "params": {
    "limit": 100
  }
}
```

#### Linear Actions

**Create Issue**

```http
POST /api/gpt/actions/linear/create-issue

{
  "accountId": "uuid",
  "params": {
    "title": "Bug: Login not working",
    "description": "Users cannot log in",
    "teamId": "team-uuid",
    "priority": 1
  }
}
```

**Search Issues**

```http
POST /api/gpt/actions/linear/search-issues

{
  "accountId": "uuid",
  "params": {
    "query": "bug",
    "limit": 10
  }
}
```

**List Teams**

```http
POST /api/gpt/actions/linear/list-teams

{
  "accountId": "uuid",
  "params": {}
}
```

## Custom GPT Configuration

### Example Actions Schema

```yaml
openapi: 3.0.0
info:
  title: GPT Integration Hub
  version: 1.0.0
servers:
  - url: https://your-app.vercel.app

paths:
  /api/gpt/create-auth-link:
    post:
      operationId: createAuthLink
      summary: Create an OAuth link for user to connect an integration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                provider:
                  type: string
                  enum: [gmail, slack, linear, zoho]
                label:
                  type: string
      responses:
        "200":
          description: Auth URL created

  /api/gpt/create-management-link:
    post:
      operationId: createManagementLink
      summary: Create a link for user to manage their integrations
      responses:
        "200":
          description: Management URL created

  /api/gpt/accounts:
    get:
      operationId: listAccounts
      summary: List all connected accounts
      responses:
        "200":
          description: List of accounts

  /api/gpt/actions/gmail/send-email:
    post:
      operationId: sendEmail
      summary: Send an email via Gmail
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                accountId:
                  type: string
                params:
                  type: object
                  properties:
                    to:
                      type: string
                    subject:
                      type: string
                    body:
                      type: string
```

### Authentication Configuration

In your Custom GPT settings:

1. **Authentication Type**: API Key
2. **API Key**: Your `GPT_API_KEY` value
3. **Auth Type**: Custom
4. **Custom Header Name**: `x-api-key`

You'll also need to configure the GPT to send the `x-gpt-user-id` header with each request.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Update OAuth redirect URIs to use production URL
5. Deploy!

```bash
# Or use Vercel CLI
vercel --prod
```

### Update Environment Variables

After deployment, update:

- `NEXT_PUBLIC_APP_URL` to your production URL
- OAuth redirect URIs in each provider's console

## Security Considerations

- ✅ Constant-time API key comparison prevents timing attacks
- ✅ Short-lived tokens (10 min for onboarding, 1 hour for management)
- ✅ Row-level security enabled on all Supabase tables
- ✅ Service role key used for server-side operations only
- ✅ Access tokens stored securely in database
- ✅ HTTPS required for production
- ✅ Token revocation on account deletion

### Recommended Enhancements

- Add token encryption at rest
- Implement rate limiting
- Add request logging and monitoring
- Set up error tracking (e.g., Sentry)
- Add CORS configuration for production

## Development

### Project Structure

```
gpt-ea/
├── app/
│   ├── api/
│   │   ├── auth/          # OAuth flow endpoints
│   │   ├── gpt/           # GPT API endpoints
│   │   └── integrations/  # Management page APIs
│   ├── auth/              # OAuth pages
│   ├── integrations/      # Management page
│   └── layout.tsx
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── actions/           # Provider action handlers
│   ├── providers/         # OAuth provider configs
│   ├── auth.ts           # Authentication utilities
│   ├── supabase.ts       # Supabase client
│   └── tokens.ts         # Token generation
├── supabase/
│   └── migrations/        # Database migrations
└── README.md
```

### Adding a New Provider

1. Create provider config in `lib/providers/{provider}.ts`
2. Add to `lib/providers/index.ts`
3. Create action handlers in `lib/actions/{provider}.ts`
4. Add to `lib/actions/index.ts`
5. Update environment variables
6. Test OAuth flow

### Adding a New Action

1. Create action handler in appropriate `lib/actions/{provider}.ts`
2. Add to provider's action export
3. Document in README
4. Test with GPT API

## Troubleshooting

### OAuth Redirect Mismatch

Ensure redirect URIs in provider consoles exactly match:

```
http://localhost:3000/auth/callback/{provider}
https://your-app.vercel.app/auth/callback/{provider}
```

### Token Expired

Tokens are short-lived by design. Generate a new link from ChatGPT.

### Database Connection Issues

Verify Supabase credentials in `.env.local` and ensure RLS policies are set correctly.

### Action Failures

Check:

1. Account is enabled
2. Access token is valid
3. Required scopes are granted
4. Provider API is accessible

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
