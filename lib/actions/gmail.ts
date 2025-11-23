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
 * Search for emails in Gmail
 */
export const searchEmails: ActionHandler = async (context, params) => {
    const { query, maxResults = 10 } = params;

    if (!query) {
        return {
            success: false,
            error: "Missing required field: query",
        };
    }

    try {
        // First, get the list of message IDs
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

        // Fetch full details for each message
        const messages = await Promise.all(
            messageIds.map(async (msg: any) => {
                const msgResponse = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
                    {
                        headers: {
                            Authorization: `Bearer ${context.accessToken}`,
                        },
                    }
                );

                if (!msgResponse.ok) {
                    return null;
                }

                const fullMessage = await msgResponse.json();

                // Extract useful fields
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

                return {
                    id: fullMessage.id,
                    threadId: fullMessage.threadId,
                    subject: getHeader("Subject"),
                    from: getHeader("From"),
                    to: getHeader("To"),
                    date: getHeader("Date"),
                    snippet: fullMessage.snippet,
                    body: body || fullMessage.snippet,
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

export const gmailActions = {
    "send-email": sendEmail,
    "search-emails": searchEmails,
};
