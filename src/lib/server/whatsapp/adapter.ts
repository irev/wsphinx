export interface WhatsAppMessage {
  id: string;
  sourceId: string;
  chatId: string | null;
  chatName: string | null;
  fromPhone: string;
  fromName: string | null;
  body: string;
  mediaPath: string | null;
  mediaType: string | null;
  mediaSize: number | null;
  fileName: string | null;
  timestamp: Date;
  rawData: string;
}

export interface GroupInfo {
  chatId: string;
  name: string;
  description: string | null;
  participants: number;
  unreadCount: number;
  lastMessage: string | null;
  timestamp: Date | null;
}

export interface ContactInfo {
  chatId: string;
  name: string | null;
  pushname: string | null;
  phone: string;
  about: string | null;
  isBusiness: boolean;
  unreadCount: number;
  lastMessage: string | null;
  timestamp: Date | null;
}

export type ConnectionStatus =
  | "initializing"
  | "disconnected"
  | "scanning_qr"
  | "connected"
  | "expired"
  | "reconnecting";

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
  restart(): Promise<void>;
  getStatus(): ConnectionState;
  getGroups(): Promise<GroupInfo[]>;
  getContacts(): Promise<ContactInfo[]>;
  getMessages(chatId: string, limit?: number): Promise<WhatsAppMessage[]>;
  getProfilePic(chatId: string): Promise<string | null>;
  onMessage(handler: MessageHandler): void;
  onStatusChange(handler: StatusChangeHandler): void;
  sendMessage(chatId: string, text: string): Promise<void>;
  getSessionInfo(): { exists: boolean; createdAt: string | null; size: number | null };
  clearSession(): Promise<void>;
}
