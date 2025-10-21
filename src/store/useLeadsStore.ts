import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  business_type: string;
  annual_revenue: number | null;
  location: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  notes: string | null;
  source: string | null;
  user_id: string | null;
}

interface LeadsState {
  // State
  leads: Lead[];
  loading: boolean;
  searchTerm: string;
  statusFilter: string;

  // Actions
  setLeads: (leads: Lead[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (filter: string) => void;
  fetchLeads: () => Promise<void>;
  addLead: (lead: Partial<Lead>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;

  // Computed
  getFilteredLeads: () => Lead[];
  getStats: () => {
    total: number;
    new: number;
    qualified: number;
    won: number;
  };
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  // Initial state
  leads: [],
  loading: true,
  searchTerm: '',
  statusFilter: 'all',

  // Setters
  setLeads: (leads) => set({ leads }),
  setLoading: (loading) => set({ loading }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  // Fetch leads from Supabase
  fetchLeads: async () => {
    const supabase = createClient();
    set({ loading: true });

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ leads: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching leads:', error);
      set({ loading: false });
    }
  },

  // Add a new lead
  addLead: async (lead) => {
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('leads')
        .insert([
          {
            ...lead,
            user_id: user.id,
            status: lead.status || 'new',
            priority: lead.priority || 'medium',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add the new lead to the state
      set((state) => ({
        leads: [data, ...state.leads],
      }));
    } catch (error) {
      console.error('Error adding lead:', error);
      throw error;
    }
  },

  // Update an existing lead
  updateLead: async (id, updates) => {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update the lead in the state
      set((state) => ({
        leads: state.leads.map((lead) =>
          lead.id === id ? { ...lead, ...data } : lead
        ),
      }));
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  },

  // Delete a lead
  deleteLead: async (id) => {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove the lead from the state
      set((state) => ({
        leads: state.leads.filter((lead) => lead.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  },

  // Get filtered leads based on search and status
  getFilteredLeads: () => {
    const { leads, searchTerm, statusFilter } = get();

    return leads.filter((lead) => {
      const matchesSearch =
        lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  },

  // Get statistics
  getStats: () => {
    const { leads } = get();

    return {
      total: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      won: leads.filter((l) => l.status === 'won').length,
    };
  },
}));
