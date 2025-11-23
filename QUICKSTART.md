# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration:
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and execute in Supabase SQL Editor

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update `.env.local` with your actual values:

```env
# Required for basic functionality
NEXT_PUBLIC_APP_URL=http://localhost:3000
GPT_API_KEY=generate-a-secure-random-string-here

# Supabase (from your Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Set Up OAuth Providers (Optional - only for providers you want to use)

#### Gmail (Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `http://localhost:3000/auth/callback/gmail`
4. Add to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

#### Slack

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app with OAuth
3. Add redirect URI: `http://localhost:3000/auth/callback/slack`
4. Add scopes: `chat:write`, `channels:read`, `users:read`, `users:read.email`
5. Add to `.env.local`:
   ```env
   SLACK_CLIENT_ID=your-client-id
   SLACK_CLIENT_SECRET=your-client-secret
   ```

#### Linear

1. Go to [Linear Settings](https://linear.app/settings/api)
2. Create OAuth application
3. Add redirect URI: `http://localhost:3000/auth/callback/linear`
4. Add to `.env.local`:
   ```env
   LINEAR_CLIENT_ID=your-client-id
   LINEAR_CLIENT_SECRET=your-client-secret
   ```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the app running!

## 🧪 Test the API

### Create an Auth Link

```bash
curl -X POST http://localhost:3000/api/gpt/create-auth-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-gpt-api-key" \
  -H "x-gpt-user-id: test-user-123" \
  -d '{
    "provider": "gmail",
    "label": "gmail-work"
  }'
```

Response:

```json
{
  "authUrl": "http://localhost:3000/auth/start?token=..."
}
```

### Create a Management Link

```bash
curl -X POST http://localhost:3000/api/gpt/create-management-link \
  -H "x-api-key: your-gpt-api-key" \
  -H "x-gpt-user-id: test-user-123"
```

Response:

```json
{
  "managementUrl": "http://localhost:3000/integrations?token=..."
}
```

### List Accounts

```bash
curl http://localhost:3000/api/gpt/accounts \
  -H "x-api-key: your-gpt-api-key" \
  -H "x-gpt-user-id: test-user-123"
```

## 📝 Next Steps

1. **Configure Custom GPT**: Use the API endpoints in your Custom GPT Actions
2. **Test OAuth Flow**: Click the auth URL to connect an integration
3. **Test Management Page**: Visit the management URL to see your integrations
4. **Deploy to Production**: See README.md for deployment instructions

## 🐛 Troubleshooting

### Build Errors

- Make sure all environment variables are set in `.env.local`
- Run `npm install` to ensure all dependencies are installed

### OAuth Redirect Errors

- Verify redirect URIs match exactly in provider console
- Check that `NEXT_PUBLIC_APP_URL` is correct

### Database Errors

- Ensure Supabase migration has been run
- Verify Supabase credentials in `.env.local`
- Check RLS policies are enabled

## 📚 Learn More

- See [README.md](./README.md) for complete documentation
- See [TASK.md](./TASK.md) for implementation details
- Check the [API documentation](./README.md#api-endpoints) for all available endpoints
