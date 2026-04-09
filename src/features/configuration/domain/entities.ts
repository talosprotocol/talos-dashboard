export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

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
  payload: JsonObject;
  createdAt: number;
}

export interface AuditEvent {
  id: string;
  userId: string;
  action: "POLICY_CREATE" | "POLICY_UPDATE" | "CONFIG_CHANGE";
  entityId: string;
  details: JsonObject;
  timestamp: number;
}
