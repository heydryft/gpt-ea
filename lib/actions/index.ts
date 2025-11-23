import { gmailActions } from "./gmail";
import { slackActions } from "./slack";
import { linearActions } from "./linear";
import type { ActionHandler } from "./types";

export * from "./types";

const providerActions: Record<string, Record<string, ActionHandler>> = {
    gmail: gmailActions,
    slack: slackActions,
    linear: linearActions,
    zoho: {}, // Placeholder for Zoho actions
    mercury: {}, // Placeholder for Mercury actions
};

export function getAction(
    provider: string,
    action: string
): ActionHandler | null {
    return providerActions[provider]?.[action] || null;
}

export function isValidAction(provider: string, action: string): boolean {
    return !!providerActions[provider]?.[action];
}
