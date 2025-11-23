import type { ActionHandler } from "./types";

/**
 * Post a message to a Slack channel
 */
export const postMessage: ActionHandler = async (context, params) => {
    const { channel, text, blocks } = params;

    if (!channel || !text) {
        return {
            success: false,
            error: "Missing required fields: channel, text",
        };
    }

    try {
        const response = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${context.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                channel,
                text,
                blocks,
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            return {
                success: false,
                error: `Slack API error: ${data.error}`,
            };
        }

        return {
            success: true,
            data: {
                channel: data.channel,
                ts: data.ts,
                message: data.message,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Error posting message: ${error}`,
        };
    }
};

/**
 * List Slack channels
 */
export const listChannels: ActionHandler = async (context, params) => {
    const { limit = 100, types = "public_channel,private_channel" } = params;

    try {
        const url = new URL("https://slack.com/api/conversations.list");
        url.searchParams.set("limit", limit.toString());
        url.searchParams.set("types", types);

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${context.accessToken}`,
            },
        });

        const data = await response.json();

        if (!data.ok) {
            return {
                success: false,
                error: `Slack API error: ${data.error}`,
            };
        }

        return {
            success: true,
            data: {
                channels: data.channels,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Error listing channels: ${error}`,
        };
    }
};

export const slackActions = {
    "post-message": postMessage,
    "list-channels": listChannels,
};
