import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AgentConnection() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/setup/agents/token', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate token');
      }
      const data = await res.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Connect Local Helper</CardTitle>
        <CardDescription>
          Pair your local setup helper to enable control plane features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {!token ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              1. Ensure the helper is installed: <code className="bg-muted px-1 rounded">pip install talos-setup-helper</code>
            </p>
            <Button onClick={generateToken} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Pairing Token'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pairing Token</Label>
              <div className="flex gap-2">
                <Input value={token} readOnly className="font-mono bg-muted" />
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(token)}>
                  Copy
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-slate-950 p-4 text-slate-50 font-mono text-xs">
                <p>$ talos-helper pair {token} --dashboard {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}</p>
                <p>$ talos-helper start</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
                Token expires in 5 minutes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
