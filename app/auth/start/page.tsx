"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AuthStartContent() {
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = searchParams.get("token");

        if (!token) {
            setError("Missing authentication token");
            setLoading(false);
            return;
        }

        // Redirect to the OAuth flow
        const startOAuth = async () => {
            try {
                const response = await fetch(`/api/auth/start?token=${token}`);
                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || "Failed to start authentication");
                    setLoading(false);
                    return;
                }

                // Redirect to provider's OAuth page
                if (data.authUrl) {
                    window.location.href = data.authUrl;
                } else {
                    setError("Invalid response from server");
                    setLoading(false);
                }
            } catch (err) {
                setError("Failed to connect to server");
                setLoading(false);
            }
        };

        startOAuth();
    }, [searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="w-full max-w-md p-8 space-y-4 bg-card rounded-lg shadow-lg">
                {loading && (
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                        <p className="mt-4 text-muted-foreground">
                            Redirecting to authentication...
                        </p>
                    </div>
                )}

                {error && (
                    <div className="text-center">
                        <div className="text-destructive text-lg font-semibold mb-2">
                            Authentication Error
                        </div>
                        <p className="text-muted-foreground">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AuthStartPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            </div>
        }>
            <AuthStartContent />
        </Suspense>
    );
}
