# Deployment Guide

## 🚀 Deploy to Vercel (Recommended)

### Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase project set up

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: GPT Integration Hub"
git branch -M main
git remote add origin https://github.com/yourusername/gpt-ea.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 3: Add Environment Variables

In Vercel project settings, add all environment variables:

```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
GPT_API_KEY=your-secure-api-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
LINEAR_CLIENT_ID=your-linear-client-id
LINEAR_CLIENT_SECRET=your-linear-client-secret
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
```

### Step 4: Deploy

Click "Deploy" - Vercel will build and deploy your app.

### Step 5: Update OAuth Redirect URIs

For each OAuth provider, update redirect URIs to production:

**Gmail (Google Console)**

- Add: `https://your-app.vercel.app/auth/callback/gmail`

**Slack**

- Add: `https://your-app.vercel.app/auth/callback/slack`

**Linear**

- Add: `https://your-app.vercel.app/auth/callback/linear`

**Zoho**

- Add: `https://your-app.vercel.app/auth/callback/zoho`

### Step 6: Test Production

Test all endpoints:

```bash
# Create auth link
curl -X POST https://your-app.vercel.app/api/gpt/create-auth-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-gpt-api-key" \
  -H "x-gpt-user-id: test-user" \
  -d '{"provider": "gmail", "label": "test"}'

# Create management link
curl -X POST https://your-app.vercel.app/api/gpt/create-management-link \
  -H "x-api-key: your-gpt-api-key" \
  -H "x-gpt-user-id: test-user"
```

## 🔧 Alternative: Deploy to Other Platforms

### Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add environment variables: `railway variables set KEY=value`
5. Deploy: `railway up`

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables in dashboard

### DigitalOcean App Platform

1. Create new app from GitHub
2. Select repository
3. Configure build settings
4. Add environment variables
5. Deploy

## 🗄️ Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region
4. Set database password (save it!)
5. Wait for project to be created

### Run Migration

1. Go to SQL Editor in Supabase dashboard
2. Click "New Query"
3. Copy contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Verify tables were created in Table Editor

### Get Credentials

1. Go to Project Settings > API
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 🔐 Security Checklist

Before going to production:

- [ ] Generate strong `GPT_API_KEY` (use `openssl rand -base64 32`)
- [ ] Never commit `.env.local` to git
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS only (automatic on Vercel)
- [ ] Set up proper CORS if needed
- [ ] Review Supabase RLS policies
- [ ] Test all OAuth flows in production
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure rate limiting if needed

## 📊 Monitoring

### Vercel Analytics

Enable in Vercel dashboard:

1. Go to your project
2. Click "Analytics" tab
3. Enable Web Analytics

### Supabase Monitoring

Monitor in Supabase dashboard:

1. Database usage
2. API requests
3. Storage usage
4. Auth activity

### Error Tracking

Recommended: Set up Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

## 🔄 Continuous Deployment

Vercel automatically deploys on:

- Push to `main` branch → Production
- Push to other branches → Preview deployments

To disable auto-deploy:

1. Go to Project Settings
2. Git > Deploy Hooks
3. Configure as needed

## 🧪 Testing Production

### Health Check

```bash
curl https://your-app.vercel.app
```

Should return the homepage.

### API Test

```bash
curl -X POST https://your-app.vercel.app/api/gpt/create-auth-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -H "x-gpt-user-id: test" \
  -d '{"provider": "gmail", "label": "test"}'
```

Should return `{"authUrl": "..."}`

### OAuth Test

1. Create an auth link via API
2. Visit the returned URL
3. Complete OAuth flow
4. Verify account created in Supabase

## 🐛 Troubleshooting

### Build Fails

- Check all environment variables are set
- Verify no TypeScript errors locally
- Check build logs in Vercel

### OAuth Redirect Errors

- Verify redirect URIs match exactly
- Check `NEXT_PUBLIC_APP_URL` is correct
- Ensure HTTPS is used in production

### Database Connection Issues

- Verify Supabase credentials
- Check Supabase project is active
- Review RLS policies

### API Key Errors

- Ensure `GPT_API_KEY` is set in Vercel
- Check header name is `x-api-key`
- Verify constant-time comparison

## 📈 Scaling Considerations

### Database

- Monitor Supabase usage
- Upgrade plan if needed
- Add indexes for performance
- Consider connection pooling

### API

- Implement rate limiting
- Add caching where appropriate
- Monitor response times
- Scale Vercel plan if needed

### Storage

- Clean up expired tokens regularly
- Archive old accounts if needed
- Monitor database size

## 🎯 Post-Deployment

1. **Test Everything**

   - All OAuth flows
   - All API endpoints
   - Management page
   - Token expiration

2. **Configure Custom GPT**

   - Update Action URLs to production
   - Test from ChatGPT
   - Verify all actions work

3. **Monitor**

   - Set up alerts
   - Check logs regularly
   - Monitor error rates

4. **Document**
   - Share API documentation
   - Create user guides
   - Document any custom configurations

---

**Deployment Status**: Ready for production! 🚀
