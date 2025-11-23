import type { OAuthProvider, ProviderName } from "./types";
import { gmailProvider } from "./gmail";
import { slackProvider } from "./slack";
import { linearProvider } from "./linear";
import { zohoProvider } from "./zoho";

export * from "./types";

const providers: Record<ProviderName, OAuthProvider> = {
    gmail: gmailProvider,
    slack: slackProvider,
    linear: linearProvider,
    zoho: zohoProvider,
    mercury: gmailProvider, // Placeholder - Mercury doesn't have public OAuth
};

export function getProvider(name: string): OAuthProvider | null {
    return providers[name as ProviderName] || null;
}

export function isValidProvider(name: string): name is ProviderName {
    return name in providers;
}

export { gmailProvider, slackProvider, linearProvider, zohoProvider };
