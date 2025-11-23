"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface Account {
    id: string;
    provider: string;
    label: string;
    enabled: boolean;
    metadata: any;
    created_at: string;
}

function IntegrationsContent() {
    const searchParams = useSearchParams();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chatgptUserId, setChatgptUserId] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get("token");

        if (!token) {
            setError("Missing authentication token");
            setLoading(false);
            return;
        }

        // Validate token and fetch accounts
        const fetchAccounts = async () => {
            try {
                const response = await fetch(`/api/integrations?token=${token}`);
                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || "Failed to load integrations");
                    setLoading(false);
                    return;
                }

                setAccounts(data.accounts || []);
                setChatgptUserId(data.chatgptUserId);
                setLoading(false);
            } catch (err) {
                setError("Failed to connect to server");
                setLoading(false);
            }
        };

        fetchAccounts();
    }, [searchParams]);

    const handleToggle = async (accountId: string, currentState: boolean) => {
        const token = searchParams.get("token");
        if (!token) return;

        try {
            const response = await fetch(`/api/integrations/${accountId}/toggle?token=${token}`, {
                method: "POST",
            });

            if (response.ok) {
                // Update local state
                setAccounts((prev) =>
                    prev.map((acc) =>
                        acc.id === accountId ? { ...acc, enabled: !currentState } : acc
                    )
                );
            }
        } catch (err) {
            console.error("Failed to toggle account:", err);
        }
    };

    const handleDelete = async (accountId: string) => {
        const token = searchParams.get("token");
        if (!token) return;

        if (!confirm("Are you sure you want to remove this integration?")) {
            return;
        }

        try {
            const response = await fetch(`/api/integrations/${accountId}?token=${token}`, {
                method: "DELETE",
            });

            if (response.ok) {
                // Remove from local state
                setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
            }
        } catch (err) {
            console.error("Failed to delete account:", err);
        }
    };

    const getProviderIcon = (provider: string) => {
        const icons: Record<string, string> = {
            gmail: "📧",
            slack: "💬",
            linear: "📋",
            zoho: "📊",
            mercury: "🏦",
        };
        return icons[provider] || "🔗";
    };

    const getProviderName = (provider: string) => {
        const names: Record<string, string> = {
            gmail: "Gmail",
            slack: "Slack",
            linear: "Linear",
            zoho: "Zoho CRM",
            mercury: "Mercury",
        };
        return names[provider] || provider;
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Integrations</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your connected services and integrations
                    </p>
                </div>

                <div className="grid gap-4">
                    {accounts.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-center text-muted-foreground">
                                    No integrations connected yet. Use ChatGPT to connect your first integration.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        accounts.map((account) => (
                            <Card key={account.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{getProviderIcon(account.provider)}</span>
                                            <div>
                                                <CardTitle className="text-xl">
                                                    {getProviderName(account.provider)}
                                                </CardTitle>
                                                <CardDescription>{account.label}</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">
                                                    {account.enabled ? "Enabled" : "Disabled"}
                                                </span>
                                                <Switch
                                                    checked={account.enabled}
                                                    onCheckedChange={() => handleToggle(account.id, account.enabled)}
                                                />
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(account.id)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                {account.metadata && Object.keys(account.metadata).length > 0 && (
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground">
                                            {account.metadata.email && (
                                                <div>Email: {account.metadata.email}</div>
                                            )}
                                            {account.metadata.name && (
                                                <div>Name: {account.metadata.name}</div>
                                            )}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))
                    )}
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    <p>Return to ChatGPT to add more integrations or use your connected services.</p>
                </div>
            </div>
        </div>
    );
}

export default function IntegrationsPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            </div>
        }>
            <IntegrationsContent />
        </Suspense>
    );
}
