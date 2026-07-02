export interface WhatsAppMessage {
  id: string;
  sourceId: string;
  fromPhone: string;
  fromName: string | null;
  body: string;
  timestamp: Date;
  rawData: string;
}

export type ConnectionStatus =
  | "disconnected"
  | "scanning_qr"
  | "connected"
  | "expired";

export interface ConnectionState {
  status: ConnectionStatus;
  qrCode?: string;
}

export type MessageHandler = (msg: WhatsAppMessage) => void | Promise<void>;
export type StatusChangeHandler = (state: ConnectionState) => void;

export interface WhatsAppReader {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): ConnectionState;
  onMessage(handler: MessageHandler): void;
  onStatusChange(handler: StatusChangeHandler): void;
}
