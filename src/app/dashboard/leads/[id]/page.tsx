'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import CommunicationHistory from '@/components/CommunicationHistory';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Lead } from '@/store/useLeadsStore';

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-500' },
  contacted: { label: 'Contacted', color: 'bg-purple-500' },
  qualified: { label: 'Qualified', color: 'bg-yellow-500' },
  proposal: { label: 'Proposal', color: 'bg-orange-500' },
  negotiation: { label: 'Negotiation', color: 'bg-indigo-500' },
  won: { label: 'Won', color: 'bg-green-500' },
  lost: { label: 'Lost', color: 'bg-red-500' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-slate-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  high: { label: 'High', color: 'text-red-400' },
};

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [lead, setLead] = useState<Lead | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Accordion state - all sections start closed
  const [openSections, setOpenSections] = useState({
    contact: false,
    business: false,
    timeline: false,
  });

  const toggleSection = (section: 'contact' | 'business' | 'timeline') => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    fetchUser();
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);
    }
  };

  const fetchLead = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setLead(data);
    } catch (error) {
      console.error('Failed to fetch lead:', error);
      router.push('/dashboard/leads');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <DashboardLayout userEmail={userEmail}>
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout userEmail={userEmail}>
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-400">Lead not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userEmail={userEmail}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/leads')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {lead.company_name}
              </h1>
              <p className="text-xl text-slate-400">{lead.contact_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-2 ${
                  statusConfig[lead.status].color
                } text-white text-sm font-medium rounded-full`}
              >
                {statusConfig[lead.status].label}
              </span>
              <span
                className={`px-3 py-1 ${
                  priorityConfig[lead.priority].color
                } text-sm font-medium`}
              >
                {priorityConfig[lead.priority].label} Priority
              </span>
            </div>
          </div>
        </div>

        {/* Lead Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Contact Information */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleSection('contact')}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-750 transition-colors"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </h2>
              {openSections.contact ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            {openSections.contact && (
              <div className="px-6 pb-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm text-blue-400 hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-sm text-green-400 hover:underline"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
                {lead.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="text-sm text-slate-300">{lead.location}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Business Information */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleSection('business')}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-750 transition-colors"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Business Information
              </h2>
              {openSections.business ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            {openSections.business && (
              <div className="px-6 pb-6 space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Business Type</p>
                  <p className="text-sm text-slate-300">{lead.business_type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Annual Revenue</p>
                    <p className="text-sm text-slate-300">
                      {formatCurrency(lead.annual_revenue)}
                    </p>
                  </div>
                </div>
                {lead.source && (
                  <div>
                    <p className="text-xs text-slate-500">Source</p>
                    <p className="text-sm text-slate-300">{lead.source}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleSection('timeline')}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-750 transition-colors"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </h2>
              {openSections.timeline ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            {openSections.timeline && (
              <div className="px-6 pb-6 space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="text-sm text-slate-300">{formatDate(lead.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last Updated</p>
                  <p className="text-sm text-slate-300">{formatDate(lead.updated_at)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {lead.notes && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-8">
            <h2 className="text-lg font-bold text-white mb-3">Notes</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {/* Communication History */}
        <CommunicationHistory
          leadId={lead.id}
          leadEmail={lead.email}
          leadPhone={lead.phone}
          leadName={lead.contact_name}
        />
      </div>
    </DashboardLayout>
  );
}
