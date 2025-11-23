# Quick Setup Summary

## ✅ What's Fixed

1. **Security Issue Fixed** ✅

   - Changed `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `SUPABASE_ANON_KEY`
   - Anon key no longer exposed to frontend

2. **OpenAPI Schema Fixed** ✅
   - All `$ref` parameters inlined (ChatGPT doesn't support $ref)
   - Removed localhost server (ChatGPT can't connect to it)
   - Updated to production URL: `https://gpt-ea-indol.vercel.app`
   - Created clean `openapi.yaml` file

## 📁 Key Files

- **`openapi.yaml`** - Clean OpenAPI schema for ChatGPT Actions
- **`CUSTOM_GPT_SETUP.md`** - Complete setup guide with instructions
- **`.env.local`** - Your environment variables (line 2 has GPT_API_KEY)

## 🚀 Next Steps to Configure Custom GPT

### 1. Get Your API Key

From `.env.local` line 2:

```
GPT_API_KEY=heyimarandomkey1293210
```

### 2. Copy OpenAPI Schema

Open `openapi.yaml` and copy the entire contents.

### 3. Configure in ChatGPT

Go to: https://chat.openai.com/gpts/editor

**Configure:**

- Name: Dryft2.0
- Description: Jish's Executive Assistant
- Instructions: Copy from `CUSTOM_GPT_SETUP.md` (lines 27-100)

**Actions:**

1. Click "Create new action"
2. **Authentication:**
   - Type: API Key
   - Auth Type: Custom
   - Header Name: `x-api-key`
   - API Key: `heyimarandomkey1293210`
3. **Schema:**
   - Paste contents of `openapi.yaml`
4. Save

### 4. Test It

Try these prompts:

```
"What integrations do I have?"
→ Should call listAccounts

"Connect my Gmail"
→ Should call createAuthLink

"Show me my management page"
→ Should call createManagementLink
```

## 🎯 What Your GPT Can Do

### Account Management

- ✅ List all connected integrations
- ✅ Create OAuth links to connect new services
- ✅ Generate management page links
- ✅ Enable/disable integrations
- ✅ Remove integrations

### Gmail Actions

- ✅ Send emails
- ✅ Search emails

### Slack Actions

- ✅ Post messages to channels
- ✅ List available channels

### Linear Actions

- ✅ Create issues
- ✅ Search issues
- ✅ List teams

## 🔧 Troubleshooting

### "Authentication failed"

- Verify API key matches in both GPT config and `.env.local`
- Check header name is exactly `x-api-key`

### "No functions available"

- Make sure you pasted the entire `openapi.yaml` contents
- Check for any YAML syntax errors
- Verify the server URL is correct

### Actions not working

- Test endpoints directly with curl first
- Check Vercel deployment logs
- Verify environment variables are set in Vercel

## 📊 Your Production URL

```
https://gpt-ea-indol.vercel.app
```

All API endpoints are at:

```
https://gpt-ea-indol.vercel.app/api/gpt/*
```

## 🎉 You're Ready!

Your backend is deployed and the OpenAPI schema is ready to paste into ChatGPT. Just follow the 4 steps above and you'll have your Executive Assistant up and running!
