# ChatGPT Custom GPT Integration Backend - Implementation Task

## HIGH-LEVEL GOAL

Build a Next.js application that acts as an integration backend for a ChatGPT Custom GPT.

### Key Properties

- NO traditional sign-up/sign-in
- Users identified only by `chatgpt_user_id` from Custom GPT
- Handles OAuth flows to external services (Gmail, Slack, Linear, Zoho, Mercury)
- Stores access tokens per ChatGPT user and per provider
- Exposes JSON APIs for Custom GPT Actions
- Provides single "Integrations" web page for managing connections

## STACK & PROJECT SETUP

### Technology Stack

- [x] Next.js (App Router, TypeScript)
- [x] Tailwind CSS
- [x] shadcn/ui for React components
- [x] Supabase
- [x] Environment variables for secrets

### Deliverables

- [x] Complete Next.js project structure
- [x] All critical route handlers
- [x] Helper libraries for integrations
- [x] Clear README with setup instructions

## DATA MODEL & DATABASE

### 1. Account Table

Represents a single connected integration account for a ChatGPT user.

Fields:

- `id` (UUID, primary key)
- `chatgpt_user_id` (string, not null)
- `provider` (string, not null) - Examples: "gmail", "slack", "linear", "zoho", "mercury"
- `label` (string, not null) - Human-readable label (e.g., "gmail-work", "gmail-personal")
- `enabled` (boolean, default: true)
- `access_token` (string, nullable)
- `refresh_token` (string, nullable)
- `expires_at` (timestamp, nullable)
- `scopes` (text[], optional)
- `metadata` (jsonb, optional) - Provider-specific data
- `created_at` (timestamp, default now)
- `updated_at` (timestamp, default now)

Constraints:

- UNIQUE (chatgpt_user_id, provider, label)

### 2. OnboardingToken Table

Bootstrap OAuth flow for specific user and provider.

Fields:

- `token` (string, primary key, securely random)
- `chatgpt_user_id` (string, not null)
- `provider` (string, not null)
- `label` (string, not null)
- `expires_at` (timestamp, not null)
- `created_at` (timestamp, default now)

### 3. ManagementToken Table

Allow user to open Integrations management page.

Fields:

- `token` (string, primary key, securely random)
- `chatgpt_user_id` (string, not null)
- `expires_at` (timestamp, not null)
- `created_at` (timestamp, default now)

## IDENTITY MODEL

### No Traditional Authentication

- No email/password login
- No OAuth for the app itself
- Users known only via `chatgpt_user_id`

### Two Identity Mechanisms

#### 1. API Endpoints (Called by Custom GPT)

Headers:

- `x-api-key`: Static shared secret from env
- `x-gpt-user-id`: ChatGPT user ID string

#### 2. Browser Pages (OAuth flows, Management)

Query parameter:

- `token`: Either OnboardingToken or ManagementToken
- Server validates token and extracts chatgpt_user_id

## ROUTES & ENDPOINTS

### A) API: Create Auth Link

**Route:** `POST /api/gpt/create-auth-link`

**Headers:**

- `x-api-key`: Must match `GPT_API_KEY`
- `x-gpt-user-id`: Required

**Body:**

```json
{
  "provider": "gmail",
  "label": "gmail-work"
}
```

**Response:**

```json
{
  "authUrl": "https://yourapp.com/auth/start?token=ONBOARDING_TOKEN"
}
```

**Logic:**

1. Validate API key and user ID
2. Generate OnboardingToken (expires in 10 minutes)
3. Store in database
4. Return auth URL

### B) API: Create Management Link

**Route:** `POST /api/gpt/create-management-link`

**Headers:**

- `x-api-key`: Must match `GPT_API_KEY`
- `x-gpt-user-id`: Required

**Response:**

```json
{
  "managementUrl": "https://yourapp.com/integrations?token=MANAGEMENT_TOKEN"
}
```

**Logic:**

1. Validate API key and user ID
2. Generate ManagementToken (expires in 1 hour)
3. Store in database
4. Return management URL

### C) API: List Accounts

**Route:** `GET /api/gpt/accounts`

**Headers:**

- `x-api-key`: Must match `GPT_API_KEY`
- `x-gpt-user-id`: Required

**Response:**

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

### D) API: Toggle Account

**Route:** `POST /api/gpt/accounts/:id/toggle`

**Headers:**

- `x-api-key`: Must match `GPT_API_KEY`
- `x-gpt-user-id`: Required

**Response:**

```json
{
  "id": "uuid",
  "enabled": false
}
```

### E) API: Delete Account

**Route:** `DELETE /api/gpt/accounts/:id`

**Headers:**

- `x-api-key`: Must match `GPT_API_KEY`
- `x-gpt-user-id`: Required

**Response:**

```json
{
  "success": true
}
```

### F) API: Provider-Specific Actions

**Route:** `POST /api/gpt/actions/:provider/:action`

**Headers:**

- `x-api-key`: Must match `GPT_API_KEY`
- `x-gpt-user-id`: Required

**Body:**

```json
{
  "accountId": "uuid",
  "params": {
    /* action-specific */
  }
}
```

**Examples:**

- `POST /api/gpt/actions/gmail/send-email`
- `POST /api/gpt/actions/slack/post-message`
- `POST /api/gpt/actions/linear/create-issue`

### G) OAuth: Start Flow

**Route:** `GET /auth/start?token=ONBOARDING_TOKEN`

**Logic:**

1. Validate OnboardingToken
2. Extract chatgpt_user_id, provider, label
3. Redirect to provider OAuth URL with state parameter

### H) OAuth: Callback

**Route:** `GET /auth/callback/:provider?code=...&state=...`

**Logic:**

1. Validate state parameter
2. Exchange code for access/refresh tokens
3. Store tokens in Account table
4. Show success page with "Return to ChatGPT" message

### I) Page: Integrations Management

**Route:** `GET /integrations?token=MANAGEMENT_TOKEN`

**Features:**

- List all accounts for user
- Enable/disable toggle
- Remove account button
- Add new integration button (generates new onboarding link)

## OAUTH PROVIDER CONFIGURATIONS

### Provider Structure

Each provider needs:

- Client ID and Secret (from env)
- OAuth URLs (authorize, token, revoke)
- Scopes
- Token refresh logic
- API helper functions

### Supported Providers

1. **Gmail** (Google OAuth)
2. **Slack**
3. **Linear**
4. **Zoho**
5. **Mercury** (if available)

## IMPLEMENTATION CHECKLIST

### Phase 1: Project Setup

- [x] Initialize Next.js project with TypeScript
- [x] Install dependencies (Tailwind, shadcn/ui, Supabase client)
- [x] Configure Tailwind CSS
- [x] Set up shadcn/ui
- [x] Create environment variables template
- [x] Set up Supabase client

### Phase 2: Database Setup

- [x] Create Supabase migration for Account table
- [x] Create Supabase migration for OnboardingToken table
- [x] Create Supabase migration for ManagementToken table
- [x] Add indexes for performance
- [x] Test database schema

### Phase 3: Core Utilities

- [x] Create token generation utility
- [x] Create API key validation middleware
- [x] Create token validation utilities
- [x] Create Supabase database helpers
- [x] Create error handling utilities

### Phase 4: GPT API Endpoints

- [x] POST /api/gpt/create-auth-link
- [x] POST /api/gpt/create-management-link
- [x] GET /api/gpt/accounts
- [x] POST /api/gpt/accounts/:id/toggle
- [x] DELETE /api/gpt/accounts/:id

### Phase 5: OAuth Implementation

- [x] Create OAuth provider configurations
- [x] Implement Gmail OAuth flow
- [x] Implement Slack OAuth flow
- [x] Implement Linear OAuth flow
- [x] Implement Zoho OAuth flow
- [x] GET /auth/start route
- [x] GET /auth/callback/:provider route
- [x] Create OAuth success page

### Phase 6: Integrations Management Page

- [x] Create integrations page layout
- [x] Implement account list component
- [x] Implement enable/disable toggle
- [x] Implement remove account functionality
- [x] Implement add integration flow
- [x] Add loading states and error handling

### Phase 7: Provider Actions

- [x] Create provider action framework
- [x] Implement Gmail actions (send email, etc.)
- [x] Implement Slack actions (post message, etc.)
- [x] Implement Linear actions (create issue, etc.)
- [x] Implement Zoho actions
- [x] POST /api/gpt/actions/:provider/:action route

### Phase 8: Token Refresh & Maintenance

- [x] Implement automatic token refresh logic
- [x] Create background job for token cleanup
- [x] Add token expiration handling

### Phase 9: Documentation & Testing

- [x] Write comprehensive README
- [x] Document environment variables
- [x] Document API endpoints
- [x] Add example Custom GPT configuration
- [x] Manual testing of all flows
- [x] Security review

### Phase 10: Production Readiness

- [x] Add rate limiting
- [x] Add request logging
- [x] Add error monitoring setup
- [x] Security headers configuration
- [x] CORS configuration
- [x] Deploy to Vercel/production

## ENVIRONMENT VARIABLES

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GPT API Key
GPT_API_KEY=your-secret-api-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gmail (Google OAuth)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Slack
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Linear
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=

# Zoho
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=

# Mercury (if available)
MERCURY_CLIENT_ID=
MERCURY_CLIENT_SECRET=
```

## SECURITY CONSIDERATIONS

1. **Token Security**

   - Use cryptographically secure random tokens
   - Short expiration times (10 min for onboarding, 1 hour for management)
   - One-time use for sensitive operations

2. **API Key Validation**

   - Constant-time comparison for API keys
   - Rate limiting on API endpoints

3. **OAuth Security**

   - Validate state parameter
   - Use PKCE where supported
   - Secure token storage

4. **Data Protection**
   - Consider encrypting access/refresh tokens at rest
   - Use HTTPS only
   - Proper CORS configuration

## SUCCESS CRITERIA

- [ ] Custom GPT can request auth links
- [ ] Custom GPT can request management links
- [ ] Users can complete OAuth flows
- [ ] Users can manage integrations via web UI
- [ ] Custom GPT can call provider actions
- [ ] Tokens refresh automatically
- [ ] All security measures in place
- [ ] Complete documentation
- [ ] Production deployment successful
