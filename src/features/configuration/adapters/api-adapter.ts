import { JsonObject, Merchant } from "../domain/entities";

export interface ApiPort {
  getMerchants(): Promise<Merchant[]>;
  updatePolicy(merchantId: string, version: string, payload: JsonObject): Promise<void>;
}

export class ApiAdapter implements ApiPort {
  private baseUrl: string = '/api';

  async getMerchants(): Promise<Merchant[]> {
    // Mock for now, would call /api/merchants
    return [
      { id: '1', domain: 'merchant.example.com', isEnabled: true, capabilities: ['dev.ucp.shopping'] }
    ];
  }

  async updatePolicy(merchantId: string, version: string, payload: JsonObject): Promise<void> {
    const resp = await fetch(`${self.location.origin}${this.baseUrl}/policies`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer talos-dev-token'
      },
      body: JSON.stringify({ merchantId, policyVersion: version, payload })
    });

    if (!resp.ok) {
        const err = await resp.json().catch(() => null) as { error?: string } | null;
        throw new Error(err?.error || 'Failed to update policy');
    }
  }
}
