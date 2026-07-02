export interface ClassificationResult {
  is_support_related: boolean;
  message_type: MessageType;
  summary: string;
  category: string;
  priority: string;
  confidence: number;
  evidence: string[];
  uncertainty: string[];
}

export type MessageType =
  | "new_issue"
  | "update"
  | "confirmation"
  | "info_request"
  | "escalation"
  | "noise"
  | "general_chat";

export type TicketStatus =
  | "New"
  | "Open"
  | "In Progress"
  | "Waiting User"
  | "Waiting Vendor"
  | "Resolved"
  | "Closed"
  | "Rejected/Invalid";

export type Priority = "Critical" | "High" | "Medium" | "Low";

export interface TicketCreateInput {
  title: string;
  summary: string;
  reporterName: string;
  reporterPhone?: string;
  sourceId?: string;
  categoryId?: string;
  priorityId?: string;
  messageIds: string[];
}

export interface TicketUpdateInput {
  statusId?: string;
  priorityId?: string;
  categoryId?: string;
  picId?: string;
  notes?: string;
  note?: string;
}
