import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SetupWizard() {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Job Args
  const [projectName, setProjectName] = useState("my-talos-project");

  const runJob = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Get real agent ID (currently just selecting any paired agent or needing user to select)
      // For Phase 2 POC, we'll assume the API finds the agent or we hardcode a placeholder
      // In reality, we need to fetch connected agents first.
      
      const payload = {
        recipe_id: "talos-sdk-init",
        agent_id: "PLACEHOLDER_AGENT_ID", // This needs to be real
        args: {
            project_name: projectName,
            language: "typescript"
        }
      };

      const res = await fetch('/api/setup/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Job failed to start');
      }
      
      const data = await res.json();
      setJobId(data.job_id);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Run Setup Recipe</CardTitle>
        <CardDescription>Initialize a new Talos SDK project on your machine.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         {error && (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        
        {jobId ? (
            <div className="rounded-md bg-green-50 p-4 border border-green-200">
                <p className="text-green-800 font-medium">Job Queued: {jobId}</p>
                <p className="text-sm text-green-700">Watch the helper logs for progress.</p>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <Button onClick={runJob} disabled={loading}>
                    {loading ? 'Queue Job' : 'Run SDK Init'}
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
