import { getServerSupabase } from './supabase-server';
import type { LeadData, CalendarEvent, Todo, ChatMessage, PhoneCall, Communication, ApiResponse } from './types';

const supabase = getServerSupabase();

// Lead operations
export async function createLead(leadData: LeadData): Promise<ApiResponse<{ id: string }>> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in createLead:', error);
    return { success: false, error: 'Failed to create lead' };
  }
}

// Calendar event operations
export async function createCalendarEvent(eventData: CalendarEvent): Promise<ApiResponse<{ id: string }>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([eventData])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in createCalendarEvent:', error);
    return { success: false, error: 'Failed to create event' };
  }
}

export async function getEventsByUserAndDate(userId: string, date: string): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_date', date);

    if (error) {
      console.error('Error fetching events:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in getEventsByUserAndDate:', error);
    return { success: false, error: 'Failed to fetch events' };
  }
}

// Todo operations
export async function createTodo(todoData: Todo): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .insert([todoData])
      .select()
      .single();

    if (error) {
      console.error('Error creating todo:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in createTodo:', error);
    return { success: false, error: 'Failed to create todo' };
  }
}

// User operations
export async function getUserById(userId: string): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      console.error('Error fetching user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in getUserById:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}

// Chat conversation operations
export async function createOrGetConversation(sessionId: string): Promise<ApiResponse<{ id: string }>> {
  try {
    // Try to get existing conversation
    const { data: existing, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (existing && !fetchError) {
      return { success: true, data: existing };
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert([{ session_id: sessionId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in createOrGetConversation:', error);
    return { success: false, error: 'Failed to create conversation' };
  }
}

export async function updateConversationLead(conversationId: string, leadId: string): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .update({ lead_id: leadId })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation lead:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in updateConversationLead:', error);
    return { success: false, error: 'Failed to update conversation' };
  }
}

// Chat message operations
export async function saveChatMessage(message: ChatMessage): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([message])
      .select()
      .single();

    if (error) {
      console.error('Error saving chat message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in saveChatMessage:', error);
    return { success: false, error: 'Failed to save message' };
  }
}

export async function getConversationMessages(conversationId: string): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in getConversationMessages:', error);
    return { success: false, error: 'Failed to fetch messages' };
  }
}

// Phone call operations
export async function createPhoneCall(phoneCallData: PhoneCall): Promise<ApiResponse<{ id: string }>> {
  try {
    const { data, error } = await supabase
      .from('phone_calls')
      .insert([phoneCallData])
      .select()
      .single();

    if (error) {
      console.error('Error creating phone call:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in createPhoneCall:', error);
    return { success: false, error: 'Failed to create phone call' };
  }
}

export async function updatePhoneCall(callSid: string, updates: Partial<PhoneCall>): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase
      .from('phone_calls')
      .update(updates)
      .eq('call_sid', callSid)
      .select()
      .single();

    if (error) {
      console.error('Error updating phone call:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in updatePhoneCall:', error);
    return { success: false, error: 'Failed to update phone call' };
  }
}

// Communication operations
export async function saveCommunication(communicationData: Communication): Promise<ApiResponse<{ id: string }>> {
  try {
    const { data, error } = await supabase
      .from('communications')
      .insert([communicationData])
      .select()
      .single();

    if (error) {
      console.error('Error saving communication:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in saveCommunication:', error);
    return { success: false, error: 'Failed to save communication' };
  }
}
