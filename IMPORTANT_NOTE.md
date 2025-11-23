# ⚠️ IMPORTANT: Backend Update Required

## Issue

ChatGPT Actions **cannot send custom headers** like `x-gpt-user-id`.

The current backend expects this header, but ChatGPT only provides:

- The API key (via `x-api-key`)
- Standard OpenAI headers

## Solution Options

### Option 1: Use ChatGPT's User Context (Recommended)

ChatGPT automatically includes user information in requests. Update the backend to extract the user ID from ChatGPT's context headers:

```typescript
// In lib/auth.ts
export function validateGPTAuth(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  // ChatGPT sends user info in these headers:
  const openaiConversationId = request.headers.get("openai-conversation-id");
  const openaiEphemeralUserId = request.headers.get("openai-ephemeral-user-id");

  // Use one of these as the chatgpt_user_id
  const chatgptUserId = openaiEphemeralUserId || openaiConversationId;

  if (!apiKey || !constantTimeCompare(apiKey, GPT_API_KEY)) {
    return { success: false, error: "Invalid API key" };
  }

  if (!chatgptUserId) {
    return { success: false, error: "Missing user context" };
  }

  return { success: true, chatgptUserId };
}
```

### Option 2: Include User ID in Request Body

Modify all endpoints to accept `chatgptUserId` in the request body:

```yaml
# In openapi.yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - chatgptUserId # Add this
          - provider
          - label
```

But this is less secure and requires ChatGPT to manage the user ID.

## Recommended Action

**Use Option 1** - Update `lib/auth.ts` to extract user ID from ChatGPT's headers.

ChatGPT automatically includes:

- `openai-conversation-id` - Unique per conversation
- `openai-ephemeral-user-id` - Unique per user session

Use `openai-ephemeral-user-id` as your `chatgpt_user_id`.

## Files to Update

1. **`lib/auth.ts`** - Update `validateGPTAuth()` function
2. Test with ChatGPT to verify headers are received

## Current Status

✅ OpenAPI schema is fixed and ready
❌ Backend needs update to work with ChatGPT's headers
