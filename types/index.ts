export interface HostelDailyCount {
  id: string;
  record_date: string; // YYYY-MM-DD
  students: number;
  staff: number;
  others: number;
  total: number;
  submitted_by: string;
  message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendingCountUpdate {
  phone_number: string;
  record_date: string;
  students: number;
  staff: number;
  others: number;
  total: number;
  message_id: string | null;
  created_at?: string;
  expires_at?: string;
}

export interface ParsedCount {
  students: number;
  staff: number;
  others: number;
  total: number;
}

export type CommandType = 'today' | 'yesterday' | 'month' | 'help' | 'update';

export interface ParseResult {
  type: 'count' | 'command' | 'invalid' | 'ignored';
  data?: ParsedCount;
  command?: CommandType;
  rawText: string;
  error?: string;
}

export interface MonthlySummary {
  year: number;
  month: number;
  monthName: string;
  daysRecorded: number;
  totalStudents: number;
  totalStaff: number;
  totalOthers: number;
  combinedTotal: number;
}

export interface MetaWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
}

export interface MetaWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile: {
      name: string;
    };
    wa_id: string;
  }>;
  messages?: MetaWebhookMessage[];
  statuses?: Array<{
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
  }>;
}

export interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: MetaWebhookValue;
      field: string;
    }>;
  }>;
}
