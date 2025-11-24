import type { ActionHandler } from "./types";

/**
 * Send an email via Zoho Mail
 */
export const sendEmail: ActionHandler = async (context, params) => {
    const { to, subject, body, cc, bcc, fromAddress } = params;

    if (!to || !subject || !body) {
        return {
            success: false,
            error: "Missing required fields: to, subject, body",
        };
    }

    try {
        // Get account ID from metadata
        const accountId = context.metadata?.accountId;
        if (!accountId) {
            return {
                success: false,
                error: "Zoho account ID not found in metadata. Please reconnect your Zoho account.",
            };
        }

        // Determine from address
        const from = fromAddress || context.metadata?.email;
        if (!from) {
            return {
                success: false,
                error: "From address not specified and no default email found",
            };
        }

        // Send via Zoho Mail API
        const response = await fetch(
            `https://mail.zoho.com/api/accounts/${accountId}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Zoho-oauthtoken ${context.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fromAddress: from,
                    toAddress: to,
                    ccAddress: cc,
                    bccAddress: bcc,
                    subject,
                    content: body,
                    mailFormat: "html",
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                error: `Failed to send email: ${error}`,
            };
        }

        const data = await response.json();

        return {
            success: true,
            data: {
                messageId: data.data?.messageId,
                mailId: data.data?.mailId,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Error sending email: ${error}`,
        };
    }
};

/**
 * Search for emails in Zoho Mail (metadata only - lightweight)
 */
export const searchEmails: ActionHandler = async (context, params) => {
    const { query, maxResults = 50 } = params;

    if (!query) {
        return {
            success: false,
            error: "Missing required field: query",
        };
    }

    try {
        // Get account ID from metadata
        const accountId = context.metadata?.accountId;
        if (!accountId) {
            return {
                success: false,
                error: "Zoho account ID not found in metadata. Please reconnect your Zoho account.",
            };
        }

        // Search via Zoho Mail API
        const url = new URL(
            `https://mail.zoho.com/api/accounts/${accountId}/messages/search`
        );
        url.searchParams.set("searchKey", query);
        url.searchParams.set("limit", maxResults.toString());

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Zoho-oauthtoken ${context.accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                error: `Failed to search emails: ${error}`,
            };
        }

        const data = await response.json();
        const messages = data.data || [];

        // Map Zoho message format to our standard format
        const formattedMessages = messages.map((msg: any) => ({
            id: msg.messageId,
            threadId: msg.conversationId,
            subject: msg.subject || "(No subject)",
            from: msg.fromAddress,
            to: msg.toAddress,
            date: new Date(msg.receivedTime).toISOString(),
            snippet: msg.summary || "",
            folderId: msg.folderId, // Store for later retrieval
        }));

        return {
            success: true,
            data: {
                messages: formattedMessages,
                resultSizeEstimate: messages.length,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Error searching emails: ${error}`,
        };
    }
};

/**
 * Get full email content by ID
 */
export const getEmailContent: ActionHandler = async (context, params) => {
    const { messageIds } = params;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return {
            success: false,
            error: "Missing required field: messageIds (array)",
        };
    }

    try {
        // Get account ID from metadata
        const accountId = context.metadata?.accountId;
        if (!accountId) {
            return {
                success: false,
                error: "Zoho account ID not found in metadata. Please reconnect your Zoho account.",
            };
        }

        // Fetch full content for each message ID
        // Note: Zoho requires folderId to fetch content, so we need to get message details first
        const messages = await Promise.all(
            messageIds.map(async (messageInfo: any) => {
                try {
                    // messageInfo can be either a string (messageId) or an object with messageId and folderId
                    const messageId = typeof messageInfo === "string" ? messageInfo : messageInfo.messageId;
                    let folderId = typeof messageInfo === "object" ? messageInfo.folderId : null;

                    // If folderId is not provided, we need to search for the message first
                    if (!folderId) {
                        // Try to get message details from search
                        const searchUrl = new URL(
                            `https://mail.zoho.com/api/accounts/${accountId}/messages/view`
                        );
                        searchUrl.searchParams.set("messageId", messageId);

                        const searchResponse = await fetch(searchUrl.toString(), {
                            headers: {
                                Authorization: `Zoho-oauthtoken ${context.accessToken}`,
                            },
                        });

                        if (searchResponse.ok) {
                            const searchData = await searchResponse.json();
                            folderId = searchData.data?.folderId;
                        }
                    }

                    if (!folderId) {
                        return {
                            id: messageId,
                            error: "Could not determine folder ID for message",
                        };
                    }

                    // Fetch message content
                    const contentResponse = await fetch(
                        `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`,
                        {
                            headers: {
                                Authorization: `Zoho-oauthtoken ${context.accessToken}`,
                            },
                        }
                    );

                    if (!contentResponse.ok) {
                        return {
                            id: messageId,
                            error: "Failed to fetch message content",
                        };
                    }

                    const contentData = await contentResponse.json();
                    const msgData = contentData.data;

                    return {
                        id: messageId,
                        threadId: msgData.conversationId,
                        subject: msgData.subject || "(No subject)",
                        from: msgData.fromAddress,
                        to: msgData.toAddress,
                        date: new Date(msgData.receivedTime).toISOString(),
                        body: msgData.content || msgData.summary || "(No content)",
                    };
                } catch (error) {
                    return {
                        id: typeof messageInfo === "string" ? messageInfo : messageInfo.messageId,
                        error: `Error fetching message: ${error}`,
                    };
                }
            })
        );

        return {
            success: true,
            data: {
                messages,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Error fetching email content: ${error}`,
        };
    }
};

export const zohoActions = {
    "send-email": sendEmail,
    "search-emails": searchEmails,
    "get-email-content": getEmailContent,
};
