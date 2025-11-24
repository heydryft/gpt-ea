export interface ActionContext {
    accountId: string;
    chatgptUserId: string;
    accessToken: string;
    refreshToken?: string | null;
    metadata?: any;
}

export interface ActionResult {
    success: boolean;
    data?: any;
    error?: string;
}

export type ActionHandler = (
    context: ActionContext,
    params: any
) => Promise<ActionResult>;
