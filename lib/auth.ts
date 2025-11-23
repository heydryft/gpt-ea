import { NextRequest, NextResponse } from "next/server";
import { constantTimeCompare } from "./tokens";
import { jwtVerify } from "jose";

const GPT_API_KEY = process.env.GPT_API_KEY!;
const JWT_SECRET = new TextEncoder().encode(process.env.GPT_API_KEY!);

export interface GPTAuthResult {
    success: boolean;
    chatgptUserId?: string;
    error?: string;
}

/**
 * Validate GPT API request headers
 * Checks for x-api-key and x-gpt-user-id headers
 */
export async function validateGPTAuth(request: NextRequest): Promise<GPTAuthResult> {
    // Check for OAuth Bearer token first
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        try {
            // Verify JWT token
            const { payload } = await jwtVerify(token, JWT_SECRET);

            if (payload.sub && payload.type === "access_token") {
                return { success: true, chatgptUserId: payload.sub as string };
            }
        } catch (error) {
            console.error("JWT verification failed:", error);
            return { success: false, error: "Invalid access token" };
        }
    }

    // Fallback to API key authentication (for backward compatibility)
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
