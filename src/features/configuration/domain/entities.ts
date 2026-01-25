export interface Merchant {
  id: string;
  domain: string;
  isEnabled: boolean;
  capabilities: string[];
}

export interface Policy {
  id: string;
  version: string;
  merchantId: string;
  payload: Record<string, any>;
  createdAt: number;
}

export interface AuditEvent {
  id: string;
  userId: string;
  action: "POLICY_CREATE" | "POLICY_UPDATE" | "CONFIG_CHANGE";
  entityId: string;
  details: Record<string, any>;
  timestamp: number;
}
