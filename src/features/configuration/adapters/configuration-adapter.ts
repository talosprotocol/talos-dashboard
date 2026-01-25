


export interface ValidationResult {
  valid: boolean;
  errors?: unknown[];
}

export interface NormalizeResult {
  config: any;
  digest: string;
}

export interface Draft {
  draft_id: string;
  config_digest: string;
  config: any;
  note?: string;
  created_at: string;
  principal: string;
}

export interface HistoryItem {
  id: string;
  draft_id: string;
  config_digest: string;
  config_json: string;
  created_at: string;
  principal: string;
}

export interface ContractsVersion {
    contracts_version: string;
    config_version_supported: string[];
}

export class ConfigurationAdapter {
  private baseUrl = '/api/config';

  async getHealth(): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/health`);
    return res.json();
  }

  async getContractsVersion(): Promise<ContractsVersion> {
      const res = await fetch(`${this.baseUrl}/contracts-version`);
      if (!res.ok) throw new Error("Failed to fetch contracts version");
      return res.json();
  }

  async getSchema(): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/schema`);
    return res.json();
  }

  async validate(config: unknown): Promise<ValidationResult> {
    const res = await fetch(`${this.baseUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res.status === 400) {
        const body = await res.json();
        return { valid: false, errors: body.detail || body };
    }
    return { valid: res.ok };
  }

  async normalize(config: unknown): Promise<NormalizeResult> {
    const res = await fetch(`${this.baseUrl}/normalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error('Normalization failed');
    return res.json();
  }

  async createDraft(config: unknown, note: string, principal: string): Promise<Draft> {
    // Generate a robust idempotency key
    const idemKey = crypto.randomUUID();
    
    const res = await fetch(`${this.baseUrl}/drafts`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idemKey,
          'X-Talos-Principal-Id': principal
      },
      body: JSON.stringify({ config, note })
    });
    
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create draft');
    }
    return res.json();
  }

  async publishDraft(draftId: string, principal: string): Promise<unknown> {
    const idemKey = crypto.randomUUID();
    const res = await fetch(`${this.baseUrl}/publish`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idemKey,
            'X-Talos-Principal-Id': principal
        },
        body: JSON.stringify({ draft_id: draftId })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to publish draft');
    }
    return res.json();
  }

  async getHistory(limit: number = 10, cursor?: string): Promise<{ items: HistoryItem[], next_cursor: string }> {
      let url = `${this.baseUrl}/history?limit=${limit}`;
      if (cursor) url += `&cursor=${cursor}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
  }
  async getBootstrap(): Promise<any> {
      const res = await fetch(`${this.baseUrl}/ui-bootstrap`);
      if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || body.error || `Bootstrap failed: ${res.status}`);
      }
      return res.json();
  }
}
