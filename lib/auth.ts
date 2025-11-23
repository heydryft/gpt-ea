import { NextRequest } from "next/server";
import { constantTimeCompare } from "./tokens";

export interface GPTAuthResult {
    success: boolean;
    chatgptUserId?: string;
    error?: string;
}

/**
 * Validate GPT API request headers
 * Checks for x-api-key and x-gpt-user-id headers
 */
export function validateGPTAuth(request: NextRequest): GPTAuthResult {
    const apiKey = request.headers.get("x-api-key");
    const chatgptUserId = request.headers.get("x-gpt-user-id");

    // Check if API key is present
    if (!apiKey) {
        return {
            success: false,
            error: "Missing x-api-key header",
        };
    }

    // Check if user ID is present
    if (!chatgptUserId) {
        return {
            success: false,
            error: "Missing x-gpt-user-id header",
        };
    }

    // Validate API key using constant-time comparison
    const expectedApiKey = process.env.GPT_API_KEY;
    if (!expectedApiKey) {
        return {
            success: false,
            error: "Server configuration error: GPT_API_KEY not set",
        };
    }

    if (!constantTimeCompare(apiKey, expectedApiKey)) {
        return {
            success: false,
            error: "Invalid API key",
        };
    }

    return {
        success: true,
        chatgptUserId,
    };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
    message: string,
    status: number = 400
): Response {
    return Response.json(
        {
            error: message,
        },
        { status }
    );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): Response {
    return Response.json(data, { status });
}
