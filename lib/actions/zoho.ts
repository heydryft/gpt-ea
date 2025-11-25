import type { ActionHandler } from "./types";

// Use the same data center as OAuth
const ZOHO_DOMAIN = process.env.ZOHO_DOMAIN || "zoho.in";
const ZOHO_MAIL_API_BASE = `https://mail.${ZOHO_DOMAIN}/api`;

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
            `${ZOHO_MAIL_API_BASE}/accounts/${accountId}/messages`,
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
    const { query, maxResults = 50, fromDate, toDate } = params;

    // Build searchKey with date range if provided
    let searchKey = query || "";

    // Add date range to searchKey if provided
    // CRITICAL: fromDate and toDate must be concatenated WITHOUT :: between them
    // Format: fromDate:DD-MMM-YYYYtoDate:DD-MMM-YYYY (no separator!)
    // Example: fromDate:12-Sep-2017toDate:30-Jun-2018
    if (fromDate || toDate) {
        let dateRange = "";

        if (fromDate) {
            const fromDateStr = new Date(fromDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '-');
            dateRange = `fromDate:${fromDateStr}`;
        }

        if (toDate) {
            const toDateStr = new Date(toDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '-');
            // Concatenate directly without :: separator
            dateRange += `toDate:${toDateStr}`;
        }

        // Add date range to searchKey with :: separator only if there's already a query
        if (searchKey) {
            searchKey += `::${dateRange}`;
        } else {
            searchKey = dateRange;
        }
    }

    // If still no searchKey, use a broad search
    if (!searchKey) {
        searchKey = "entire:";
    }

    console.log("Zoho search with searchKey:", searchKey);

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
            `${ZOHO_MAIL_API_BASE}/accounts/${accountId}/messages/search`
        );
        url.searchParams.set("searchKey", searchKey);
        url.searchParams.set("limit", maxResults.toString());

        // CRITICAL: Only set receivedTime if NO date range is specified in searchKey
        // When fromDate/toDate are in searchKey, receivedTime may conflict with them
        // receivedTime specifies the time BEFORE which emails were received (upper bound)
        // Default is (now - 2 minutes), so we need to override it
        let receivedTime: number | undefined;
        if (!fromDate && !toDate) {
            // No date range in searchKey, so set receivedTime to future to get all emails
            receivedTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours in the future
            url.searchParams.set("receivedTime", receivedTime.toString());
        }

        console.log("Zoho search params:", {
            searchKey,
            limit: maxResults,
            receivedTime: receivedTime || "not set (using searchKey date range)",
            accountId
        });
        console.log("Zoho search URL:", url.toString());

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Zoho-oauthtoken ${context.accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Zoho search failed:", {
                status: response.status,
                error
            });
            return {
                success: false,
                error: `Failed to search emails: ${error}`,
            };
        }

        const data = await response.json();
        let messages = data.data || [];

        console.log("Zoho search results:", {
            count: messages.length,
            searchKey,
            accountId,
            hasData: !!data.data,
            responseStatus: data.status
        });

        // DEBUG: If date search returns 0, try a simple search to see if ANY emails exist
        if (messages.length === 0 && (fromDate || toDate)) {
            console.log("Date search returned 0, testing if ANY emails exist with simple search...");
            const testUrl = new URL(
                `${ZOHO_MAIL_API_BASE}/accounts/${accountId}/messages/search`
            );
            testUrl.searchParams.set("searchKey", "entire:");
            testUrl.searchParams.set("limit", "5");
            testUrl.searchParams.set("receivedTime", (Date.now() + 24 * 60 * 60 * 1000).toString());

            const testResponse = await fetch(testUrl.toString(), {
                headers: {
                    Authorization: `Zoho-oauthtoken ${context.accessToken}`,
                },
            });

            if (testResponse.ok) {
                const testData = await testResponse.json();
                const testMessages = testData.data || [];
                console.log("Simple 'entire:' search test results:", {
                    count: testMessages.length,
                    message: testMessages.length > 0
                        ? "Emails exist but date filter may be wrong"
                        : "No emails found in account at all"
                });

                if (testMessages.length > 0) {
                    console.log("Sample email dates:", testMessages.slice(0, 3).map((m: any) => ({
                        subject: m.subject,
                        receivedTime: m.receivedTime,
                        date: new Date(m.receivedTime).toISOString()
                    })));
                }
            }
        }

        // FALLBACK: If search returns no results, try listing from inbox folder
        // This is more reliable than search for getting recent emails
        if (messages.length === 0 && !query) {
            console.log("Search returned 0 results, trying inbox folder list as fallback...");

            try {
                // First, get folders to find inbox folderId
                const foldersResponse = await fetch(
                    `${ZOHO_MAIL_API_BASE}/accounts/${accountId}/folders`,
                    {
                        headers: {
                            Authorization: `Zoho-oauthtoken ${context.accessToken}`,
                        },
                    }
                );

                if (foldersResponse.ok) {
                    const foldersData = await foldersResponse.json();
                    const folders = foldersData.data || [];
                    const inboxFolder = folders.find((f: any) => f.folderType === "Inbox");

                    if (inboxFolder) {
                        console.log("Found inbox folder:", inboxFolder.folderId);

                        // List emails from inbox
                        const listUrl = new URL(
                            `${ZOHO_MAIL_API_BASE}/accounts/${accountId}/messages/view`
                        );
                        listUrl.searchParams.set("folderId", inboxFolder.folderId);
                        listUrl.searchParams.set("limit", maxResults.toString());
                        listUrl.searchParams.set("sortBy", "date");
                        listUrl.searchParams.set("sortorder", "false"); // descending

                        const listResponse = await fetch(listUrl.toString(), {
                            headers: {
                                Authorization: `Zoho-oauthtoken ${context.accessToken}`,
                            },
                        });

                        if (listResponse.ok) {
                            const listData = await listResponse.json();
                            messages = listData.data || [];

                            console.log("Inbox list results:", {
                                count: messages.length,
                                folderId: inboxFolder.folderId
                            });

                            // Filter by date range if provided
                            if (fromDate || toDate) {
                                const fromTime = fromDate ? new Date(fromDate).getTime() : 0;
                                const toTime = toDate ? new Date(toDate).getTime() : Date.now();

                                messages = messages.filter((msg: any) => {
                                    const msgTime = msg.receivedTime;
                                    return msgTime >= fromTime && msgTime <= toTime;
                                });

                                console.log("After date filtering:", messages.length);
                            }
                        }
                    }
                }
            } catch (fallbackError) {
                console.error("Fallback inbox list failed:", fallbackError);
                // Continue with empty results from search
            }
        }

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
                            `${ZOHO_MAIL_API_BASE}/accounts/${accountId}/messages/view`
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
                        `${ZOHO_MAIL_API_BASE}/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`,
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
