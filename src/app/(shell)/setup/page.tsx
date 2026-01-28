"use client";

import { AgentConnection } from "./components/AgentConnection";
import { SetupWizard } from "./components/SetupWizard";

export default function SetupPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Local Control Plane</h1>
        <p className="text-muted-foreground">Manage your local Talos infrastructure and SDKs.</p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">1. Connection</h2>
            <AgentConnection />
        </div>
        
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">2. Actions</h2>
            <SetupWizard />
        </div>
      </div>
    </div>
  );
}

