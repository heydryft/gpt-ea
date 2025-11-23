# Custom GPT Setup Guide

This guide will walk you through setting up your Custom GPT to use the integration backend.

## 📋 Custom GPT Configuration

### Name

```
Dryft2.0
```

(or whatever you prefer)

### Description

```
Jish's Executive Assistant with integrated access to Gmail, Slack, Linear, and more.
```

### Instructions

```markdown
You are an Executive Assistant with access to external integrations including Gmail, Slack, Linear, and Zoho.

### Core Operational Rules:

1. **Dynamic Tool Discovery:**

   - You have access to a dynamic list of integrations
   - Always check available accounts before attempting actions
   - If a user asks you to perform an action but no account is connected, guide them to connect one

2. **Account Management:**

   - Users can connect multiple accounts per provider (e.g., "gmail-work", "gmail-personal")
   - Always ask which account to use if multiple are available
   - Respect enabled/disabled status - don't use disabled accounts

3. **Integration Setup Flow:**

   - When a user wants to connect a new integration:
     1. Call `createAuthLink` with the provider and a descriptive label
     2. Present the auth URL to the user as a clickable link
     3. Explain they need to click it and authorize access
     4. After authorization, they can return to chat and use the integration

4. **Management:**

   - Users can request a management link to view/manage all integrations
   - Use `createManagementLink` to generate this
   - The management page allows enabling/disabling/removing integrations

5. **Action Execution:**
   - Always verify account exists and is enabled before actions
   - Provide clear feedback on action results
   - Handle errors gracefully and suggest solutions

### Available Integrations:

**Gmail:**

- Send emails
- Search emails
- Read email content

**Slack:**

- Post messages to channels
- List available channels
- Send direct messages

**Linear:**

- Create issues
- Search issues
- List teams and projects

**Zoho:**

- (Actions to be implemented based on needs)

### Conversation Flow Examples:

**User:** "Send an email to john@example.com"
**You:**

1. Check if Gmail account exists: `listAccounts`
2. If no account: "I don't see a connected Gmail account. Would you like to connect one?"
3. If account exists: Use `sendEmail` action with appropriate parameters
4. Confirm success or report any errors

**User:** "Connect my Gmail"
**You:**

1. Ask for a label: "What would you like to call this Gmail account? (e.g., 'work', 'personal')"
2. Call `createAuthLink` with provider="gmail" and the label
3. Present the auth URL: "Please click this link to authorize Gmail access: [URL]"
4. "Once you've authorized, come back here and I'll be ready to help with Gmail!"

### Best Practices:

- Always be proactive about checking account status
- Provide clear, actionable error messages
- Suggest the management page when users want to see all integrations
- Be helpful in guiding users through the OAuth flow
- Remember account labels and use them consistently
```

---

## 🔌 Actions Configuration

### Authentication

**Type:** API Key  
**Auth Type:** Custom  
**Custom Header Name:** `x-api-key`  
**API Key:** `[Your GPT_API_KEY from .env.local]`

**Additional Headers:**
You'll need to add `x-gpt-user-id` dynamically. This is handled in the OpenAPI spec below.

---

## 📄 OpenAPI Schema

**IMPORTANT:** Use the corrected schema from `openapi.yaml` in the project root.

The schema has been fixed to work with ChatGPT Actions:

- ✅ All `$ref` parameters are inlined
- ✅ Only production URL (no localhost)
- ✅ Correct server: `https://gpt-ea-indol.vercel.app`

**To use:**

1. Open `openapi.yaml` in the project root
2. Copy the entire contents
3. Paste into the ChatGPT Actions schema editor

Or copy from below:

```yaml
openapi: 3.1.0
info:
  title: Integration Hub API
  description: API for managing external integrations (Gmail, Slack, Linear, Zoho)
  version: 1.0.0
servers:
  - url: https://gpt-ea-indol.vercel.app
    description: Production server

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: x-api-key

security:
  - ApiKeyAuth: []

paths:
  /api/gpt/create-auth-link:
    post:
      operationId: createAuthLink
      summary: Create an OAuth authorization link for a provider
      description: Generates a link for the user to authorize access to an external service
      parameters:
        - name: x-gpt-user-id
          in: header
          required: true
          schema:
            type: string
          description: ChatGPT user identifier
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - provider
                - label
              properties:
                provider:
                  type: string
                  enum: [gmail, slack, linear, zoho]
                  description: The service to connect
                label:
                  type: string
                  description: A descriptive label for this connection (e.g., "work", "personal")
      responses:
        "200":
          description: Auth link created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  authUrl:
                    type: string
                    description: URL for user to authorize the integration

  /api/gpt/create-management-link:
    post:
      operationId: createManagementLink
      summary: Create a link to the integrations management page
      description: Generates a secure link where users can view and manage all their integrations
      parameters:
        - name: x-gpt-user-id
          in: header
          required: true
          schema:
            type: string
          description: ChatGPT user identifier
      responses:
        "200":
          description: Management link created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  managementUrl:
                    type: string
                    description: URL to the integrations management page

  /api/gpt/accounts:
    get:
      operationId: listAccounts
      summary: List all connected integration accounts
      description: Returns all integrations connected by this user
      parameters:
        - $ref: "#/components/parameters/GptUserId"
      responses:
        "200":
          description: List of accounts
          content:
            application/json:
              schema:
                type: object
                properties:
                  accounts:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        provider:
                          type: string
                        label:
                          type: string
                        enabled:
                          type: boolean
                        metadata:
                          type: object

  /api/gpt/accounts/{id}/toggle:
    post:
      operationId: toggleAccount
      summary: Enable or disable an integration account
      description: Toggles the enabled status of an account
      parameters:
        - $ref: "#/components/parameters/GptUserId"
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Account toggled successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  enabled:
                    type: boolean

  /api/gpt/accounts/{id}:
    delete:
      operationId: deleteAccount
      summary: Remove an integration account
      description: Permanently removes an integration and revokes access
      parameters:
        - $ref: "#/components/parameters/GptUserId"
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Account deleted successfully

  /api/gpt/actions/gmail/send-email:
    post:
      operationId: gmailSendEmail
      summary: Send an email via Gmail
      parameters:
        - $ref: "#/components/parameters/GptUserId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - accountId
                - params
              properties:
                accountId:
                  type: string
                  description: The Gmail account ID to use
                params:
                  type: object
                  required:
                    - to
                    - subject
                    - body
                  properties:
                    to:
                      type: string
                      description: Recipient email address
                    subject:
                      type: string
                      description: Email subject
                    body:
                      type: string
                      description: Email body (plain text or HTML)
                    cc:
                      type: string
                      description: CC recipients (optional)
                    bcc:
                      type: string
                      description: BCC recipients (optional)
      responses:
        "200":
          description: Email sent successfully

  /api/gpt/actions/gmail/search-emails:
    post:
      operationId: gmailSearchEmails
      summary: Search for emails in Gmail
      parameters:
        - $ref: "#/components/parameters/GptUserId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - accountId
                - params
              properties:
                accountId:
                  type: string
                params:
                  type: object
                  required:
                    - query
                  properties:
                    query:
                      type: string
                      description: Gmail search query (e.g., "from:john@example.com")
                    maxResults:
                      type: integer
                      default: 10
                      description: Maximum number of results to return
      responses:
        "200":
          description: Search results

  /api/gpt/actions/slack/post-message:
    post:
      operationId: slackPostMessage
      summary: Post a message to a Slack channel
      parameters:
        - $ref: "#/components/parameters/GptUserId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - accountId
                - params
              properties:
                accountId:
                  type: string
                params:
                  type: object
                  required:
                    - channel
                    - text
                  properties:
                    channel:
                      type: string
                      description: Channel ID or name (e.g., "#general" or "C1234567890")
                    text:
                      type: string
                      description: Message text
      responses:
        "200":
          description: Message posted successfully

  /api/gpt/actions/slack/list-channels:
    post:
      operationId: slackListChannels
      summary: List available Slack channels
      parameters:
        - $ref: "#/components/parameters/GptUserId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - accountId
              properties:
                accountId:
                  type: string
                params:
                  type: object
                  properties:
                    types:
                      type: string
                      default: "public_channel,private_channel"
                      description: Types of channels to list
      responses:
        "200":
          description: List of channels

  /api/gpt/actions/linear/create-issue:
    post:
      operationId: linearCreateIssue
      summary: Create a new issue in Linear
      parameters:
        - $ref: "#/components/parameters/GptUserId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - accountId
                - params
              properties:
                accountId:
                  type: string
                params:
                  type: object
                  required:
                    - teamId
                    - title
                  properties:
                    teamId:
                      type: string
                      description: Linear team ID
                    title:
                      type: string
                      description: Issue title
                    description:
                      type: string
                      description: Issue description (optional)
                    priority:
                      type: integer
                      description: Priority (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)
      responses:
        "200":
          description: Issue created successfully

  /api/gpt/actions/linear/search-issues:
    post:
      operationId: linearSearchIssues
      summary: Search for issues in Linear
      parameters:
        - $ref: "#/components/parameters/GptUserId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - accountId
                - params
              properties:
                accountId:
                  type: string
                params:
                  type: object
                  required:
                    - query
                  properties:
                    query:
                      type: string
                      description: Search query
                    limit:
                      type: integer
                      default: 10
                      description: Maximum number of results
      responses:
        "200":
          description: Search results

  /api/gpt/actions/linear/list-teams:
    post:
      operationId: linearListTeams
      summary: List all Linear teams
      parameters:
        - $ref: "#/components/parameters/GptUserId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - accountId
              properties:
                accountId:
                  type: string
                params:
                  type: object
      responses:
        "200":
          description: List of teams
```

---

## 🚀 Setup Steps

### 1. Go to ChatGPT GPT Builder

Visit: https://chat.openai.com/gpts/editor

### 2. Configure Basic Info

- **Name:** Dryft2.0 (or your preferred name)
- **Description:** Jish's Executive Assistant
- **Instructions:** Copy the instructions from above

### 3. Configure Actions

1. Click on "Create new action"
2. **Authentication:**

   - Select "API Key"
   - Auth Type: "Custom"
   - Custom Header Name: `x-api-key`
   - API Key: Your `GPT_API_KEY` from `.env.local`

3. **Schema:**

   - Copy the entire OpenAPI YAML from above
   - Paste into the schema editor
   - Update the server URL to your production URL

4. **Privacy Policy URL (optional):**
   - Add your privacy policy URL if you have one

### 4. Test the GPT

Try these test prompts:

```
"What integrations do I have connected?"
→ Should call listAccounts

"Connect my Gmail account"
→ Should call createAuthLink and provide a link

"Show me my integrations management page"
→ Should call createManagementLink

"Send an email to test@example.com saying hello"
→ Should check accounts first, then send email if Gmail is connected
```

---

## 🔧 Troubleshooting

### "Authentication failed"

- Verify `GPT_API_KEY` matches in both Custom GPT and `.env.local`
- Check that the header name is exactly `x-api-key`

### "x-gpt-user-id is required"

- This should be automatically added by ChatGPT
- If not, check the OpenAPI schema has the parameter defined

### Actions not working

- Verify your production URL is correct in the OpenAPI schema
- Check that your app is deployed and accessible
- Test the API endpoints directly with curl first

### OAuth redirect errors

- Ensure redirect URIs in provider consoles match your production URL
- Format: `https://your-app.vercel.app/auth/callback/{provider}`

---

## 📱 User Experience Flow

### First Time Setup

1. User: "Connect my Gmail"
2. GPT: Calls `createAuthLink`
3. GPT: "Click here to authorize Gmail: [link]"
4. User: Clicks link, authorizes
5. User: Returns to chat
6. User: "Send an email..."
7. GPT: Works! ✅

### Managing Integrations

1. User: "Show me my integrations"
2. GPT: Calls `createManagementLink`
3. GPT: "Here's your management page: [link]"
4. User: Clicks, sees all integrations
5. User: Can enable/disable/remove integrations

### Using Integrations

1. User: "Send an email to john@example.com"
2. GPT: Calls `listAccounts` to check for Gmail
3. GPT: Calls `gmailSendEmail` with the account
4. GPT: "Email sent successfully! ✓"

---

## 🎨 Customization

### Add More Actions

To add new provider actions:

1. Implement the action in `lib/actions/{provider}.ts`
2. Add the route in `app/api/gpt/actions/[provider]/[action]/route.ts`
3. Add the endpoint to the OpenAPI schema above
4. Update the GPT instructions to mention the new capability

### Modify Instructions

Tailor the instructions to your specific use case:

- Add domain-specific knowledge
- Customize the tone and personality
- Add specific workflows or shortcuts
- Include company-specific information

---

## 📊 Monitoring

Watch for:

- Failed OAuth flows (check Supabase logs)
- API errors (check Vercel logs)
- Token expirations (implement refresh logic)
- Rate limits (add rate limiting if needed)

---

**You're all set!** 🎉 Your Custom GPT is now ready to manage integrations and help with tasks across Gmail, Slack, Linear, and more!
