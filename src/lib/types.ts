// Shared types for API routes

export interface LeadData {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  business_type: string;
  annual_revenue?: number | null;
  location?: string | null;
  notes?: string | null;
  source?: string;
  status?: string;
  priority?: string;
  user_id?: string | null;
  consent_to_contact?: boolean;
  consent_date?: string | null;
  consent_ip_address?: string | null;
}

export interface CalendarEvent {
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  user_id: string;
}

export interface Todo {
  title: string;
  description?: string | null;
  due_date?: string | null;
  user_id: string;
  completed: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Chat types
export interface ChatConversation {
  id?: string;
  session_id: string;
  lead_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id?: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_calls?: unknown;
  tool_results?: unknown;
  metadata?: Record<string, unknown>;
}

// Phone call types
export interface PhoneCall {
  lead_id?: string | null;
  call_sid: string;
  phone_number: string;
  status: 'initiated' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
  duration_seconds?: number | null;
  transcript?: string | null;
  meeting_scheduled?: boolean;
  meeting_date?: string | null;
  meeting_time?: string | null;
  error_message?: string | null;
  user_id?: string | null;
}

// Communication types
export interface Communication {
  lead_id: string;
  type: 'email' | 'sms' | 'phone';
  direction: 'inbound' | 'outbound';
  subject?: string | null;
  body: string;
  from_address: string;
  to_address: string;
  status?: 'sent' | 'delivered' | 'failed' | 'read' | 'bounced' | 'completed';
  provider_id?: string | null;
  metadata?: Record<string, unknown>;
  error_message?: string | null;
}
