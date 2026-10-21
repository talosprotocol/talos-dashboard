import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PairedAgent {
  id: string;
  hostname: string;
  version?: string;
  paired: boolean;
  lastSeen?: string;
}

export function SetupWizard() {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<PairedAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [loadingAgents, setLoadingAgents] = useState(true);
  
  // Job Args
  const [projectName, setProjectName] = useState("my-talos-project");

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/setup/agents');
      if (res.ok) {
        const data = await res.json();
        const paired = (data.agents || []).filter((a: PairedAgent) => a.paired);
        setAgents(paired);
        if (paired.length > 0 && !selectedAgentId) {
          setSelectedAgentId(paired[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load paired agents:", e);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const runJob = async () => {
    if (!selectedAgentId) {
      setError("No paired helper selected. Please pair a local helper before executing setup recipes.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        recipe_id: "talos-sdk-init",
        agent_id: selectedAgentId,
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
                    <Label>Target Helper Agent (PRD FR-10)</Label>
                    {loadingAgents ? (
                      <p className="text-xs text-muted-foreground">Checking for paired helpers...</p>
                    ) : agents.length === 0 ? (
                      <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                        No paired local helper found. Please generate a pairing token in Step 1 and run <code>talos-setup-helper</code>.
                      </div>
                    ) : (
                      <select
                        className="w-full px-3 py-2 text-sm bg-background border rounded-md"
                        value={selectedAgentId}
                        onChange={e => setSelectedAgentId(e.target.value)}
                      >
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.hostname} ({a.id.slice(0, 8)}...) — v{a.version || "1.0"}
                          </option>
                        ))}
                      </select>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <Button 
                  onClick={runJob} 
                  disabled={loading || loadingAgents || agents.length === 0}
                >
                    {loading ? 'Queueing Job...' : 'Run SDK Init'}
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
