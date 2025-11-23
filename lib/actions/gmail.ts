import type { ActionHandler } from "./types";

/**
 * Send an email via Gmail
 */
export const sendEmail: ActionHandler = async (context, params) => {
    const { to, subject, body, cc, bcc } = params;

    if (!to || !subject || !body) {
        return {
            success: false,
            error: "Missing required fields: to, subject, body",
        };
    }

    try {
        // Create email in RFC 2822 format
        const email = [
            `To: ${to}`,
            cc ? `Cc: ${cc}` : "",
            bcc ? `Bcc: ${bcc}` : "",
            `Subject: ${subject}`,
            "",
            body,
        ]
            .filter(Boolean)
            .join("\r\n");

        // Encode email in base64url format
        const encodedEmail = Buffer.from(email)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        // Send via Gmail API
        const response = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${context.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    raw: encodedEmail,
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
                messageId: data.id,
                threadId: data.threadId,
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
 * Search for emails in Gmail (metadata only - lightweight)
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
        // Get the list of message IDs
        const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
        url.searchParams.set("q", query);
        url.searchParams.set("maxResults", maxResults.toString());

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${context.accessToken}`,
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
        const messageIds = data.messages || [];

        // Fetch metadata only (no body) for each message
        const messages = await Promise.all(
            messageIds.map(async (msg: any) => {
                const msgResponse = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
                    {
                        headers: {
                            Authorization: `Bearer ${context.accessToken}`,
                        },
                    }
                );

                if (!msgResponse.ok) {
                    return null;
                }

                const message = await msgResponse.json();

                // Extract headers
                const headers = message.payload?.headers || [];
                const getHeader = (name: string) =>
                    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

                return {
                    id: message.id,
                    threadId: message.threadId,
                    subject: getHeader("Subject") || "(No subject)",
                    from: getHeader("From"),
                    to: getHeader("To"),
                    date: getHeader("Date"),
                    snippet: message.snippet,
                };
            })
        );

        return {
            success: true,
            data: {
                messages: messages.filter(Boolean),
                resultSizeEstimate: data.resultSizeEstimate,
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
        // Fetch full content for each message ID
        const messages = await Promise.all(
            messageIds.map(async (id: string) => {
                const msgResponse = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
                    {
                        headers: {
                            Authorization: `Bearer ${context.accessToken}`,
                        },
                    }
                );

                if (!msgResponse.ok) {
                    return {
                        id,
                        error: "Failed to fetch message",
                    };
                }

                const fullMessage = await msgResponse.json();

                // Extract headers
                const headers = fullMessage.payload?.headers || [];
                const getHeader = (name: string) =>
                    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

                // Get email body
                let body = "";
                const parts = fullMessage.payload?.parts || [fullMessage.payload];
                for (const part of parts) {
                    if (part.mimeType === "text/plain" && part.body?.data) {
                        body = Buffer.from(part.body.data, "base64").toString("utf-8");
                        break;
                    }
                }

                // If no plain text, try HTML
                if (!body) {
                    for (const part of parts) {
                        if (part.mimeType === "text/html" && part.body?.data) {
                            body = Buffer.from(part.body.data, "base64").toString("utf-8");
                            break;
                        }
                    }
                }

                return {
                    id: fullMessage.id,
                    threadId: fullMessage.threadId,
                    subject: getHeader("Subject") || "(No subject)",
                    from: getHeader("From"),
                    to: getHeader("To"),
                    date: getHeader("Date"),
                    body: body || fullMessage.snippet || "(No content)",
                };
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

export const gmailActions = {
    "send-email": sendEmail,
    "search-emails": searchEmails,
    "get-email-content": getEmailContent,
};
