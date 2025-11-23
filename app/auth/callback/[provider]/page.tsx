"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";

function OAuthCallbackContent() {
    const searchParams = useSearchParams();
    const params = useParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const provider = params.provider as string;

        if (error) {
            setStatus("error");
            setMessage(`Authentication failed: ${error}`);
            return;
        }

        if (!code || !state) {
            setStatus("error");
            setMessage("Missing required parameters");
            return;
        }

        // Complete the OAuth flow
        const completeOAuth = async () => {
            try {
                const response = await fetch(
                    `/api/auth/callback/${provider}?code=${code}&state=${state}`
                );
                const data = await response.json();

                if (!response.ok) {
                    setStatus("error");
                    setMessage(data.error || "Failed to complete authentication");
                    return;
                }

                setStatus("success");
                setMessage("Successfully connected! You can now return to ChatGPT.");
            } catch (err) {
                setStatus("error");
                setMessage("Failed to connect to server");
            }
        };

        completeOAuth();
    }, [searchParams, params]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
                {status === "loading" && (
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                        <p className="mt-4 text-muted-foreground">
                            Completing authentication...
                        </p>
                    </div>
                )}

                {status === "success" && (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <svg
                                className="h-16 w-16 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Success!</h2>
                            <p className="mt-2 text-muted-foreground">{message}</p>
                        </div>
                        <div className="pt-4">
                            <p className="text-sm text-muted-foreground">
                                You can close this window and return to ChatGPT.
                            </p>
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <svg
                                className="h-16 w-16 text-destructive"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">
                                Authentication Failed
                            </h2>
                            <p className="mt-2 text-muted-foreground">{message}</p>
                        </div>
                        <div className="pt-4">
                            <p className="text-sm text-muted-foreground">
                                Please try again or contact support if the problem persists.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function OAuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            </div>
        }>
            <OAuthCallbackContent />
        </Suspense>
    );
}
