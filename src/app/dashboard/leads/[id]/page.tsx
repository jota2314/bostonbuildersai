'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import CommunicationHistory from '@/components/CommunicationHistory';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  User,
  ChevronDown,
  ChevronUp,
  Brain,
  X,
} from 'lucide-react';
import type { Lead } from '@/store/useLeadsStore';

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-500' },
  meeting_scheduled: { label: 'Meeting Scheduled', color: 'bg-purple-500' },
  contacted: { label: 'Contacted', color: 'bg-cyan-500' },
  qualified: { label: 'Qualified', color: 'bg-yellow-500' },
  proposal: { label: 'Proposal', color: 'bg-orange-500' },
  negotiation: { label: 'Negotiation', color: 'bg-indigo-500' },
  won: { label: 'Won', color: 'bg-green-500' },
  lost: { label: 'Lost', color: 'bg-red-500' },
};

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [lead, setLead] = useState<Lead | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Accordion state - all sections start closed
  const [openSections, setOpenSections] = useState({
    notes: false,
  });

  const toggleSection = (section: 'notes') => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Modal state for contact info
  const [showContactModal, setShowContactModal] = useState(false);

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

  // Analyze sentiment from notes
  const analyzeSentiment = (notes: string | null): { sentiment: string; color: string; emoji: string } => {
    if (!notes) return { sentiment: 'Neutral', color: 'text-slate-400', emoji: '😐' };

    const lowerNotes = notes.toLowerCase();

    // Positive indicators
    const positiveWords = ['great', 'excellent', 'good', 'interested', 'excited', 'looking forward', 'perfect', 'awesome', 'thanks', 'love'];
    const negativeWords = ['frustrated', 'struggling', 'problem', 'difficult', 'bad', 'poor', 'issue', 'complaint', 'money', 'expensive', 'not working'];

    const positiveCount = positiveWords.filter(word => lowerNotes.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerNotes.includes(word)).length;

    if (positiveCount > negativeCount + 1) {
      return { sentiment: 'Positive', color: 'text-green-400', emoji: '😊' };
    } else if (negativeCount > positiveCount + 1) {
      return { sentiment: 'Negative', color: 'text-red-400', emoji: '😟' };
    } else {
      return { sentiment: 'Neutral', color: 'text-yellow-400', emoji: '😐' };
    }
  };

  // Generate AI insights from notes
  const generateInsights = (notes: string | null): string[] => {
    if (!notes) return [];

    const insights: string[] = [];
    const lowerNotes = notes.toLowerCase();

    // Check for meeting scheduled
    if (lowerNotes.includes('meeting scheduled') || lowerNotes.includes('call scheduled')) {
      const dateMatch = notes.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        insights.push(`📅 Meeting scheduled for ${new Date(dateMatch[0]).toLocaleDateString()}`);
      }
    }

    // Check for specific interests
    if (lowerNotes.includes('crm') || lowerNotes.includes('lead tracking')) {
      insights.push('💼 Interested in CRM and lead tracking solutions');
    }
    if (lowerNotes.includes('automation') || lowerNotes.includes('ai')) {
      insights.push('🤖 Looking for AI automation solutions');
    }

    // Check for pain points
    if (lowerNotes.includes('frustrated') || lowerNotes.includes('struggling')) {
      insights.push('⚠️ Customer experiencing pain points - follow up priority');
    }

    // Check for positive engagement
    if (lowerNotes.includes('excited') || lowerNotes.includes('interested')) {
      insights.push('✨ High engagement level - strong conversion potential');
    }

    return insights;
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
      <div className="max-w-7xl mx-auto p-3 md:p-6">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/dashboard/leads')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </button>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {lead.company_name}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-base text-slate-400">{lead.contact_name}</p>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-md transition-colors"
                >
                  More Info
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* AI Sentiment Badge */}
              {(() => {
                const { sentiment, color, emoji } = analyzeSentiment(lead.notes);
                const borderColor = sentiment === 'Positive' ? 'border-green-500' : sentiment === 'Negative' ? 'border-red-500' : 'border-yellow-500';
                const bgColor = sentiment === 'Positive' ? 'bg-green-500/20' : sentiment === 'Negative' ? 'bg-red-500/20' : 'bg-yellow-500/20';

                return (
                  <span className={`px-3 py-1.5 ${bgColor} ${borderColor} border-2 text-white text-xs font-medium rounded-full flex items-center gap-1.5`}>
                    <span>{emoji}</span>
                    <span className={color}>{sentiment}</span>
                  </span>
                );
              })()}

              {/* Status Badge */}
              <span
                className={`px-3 py-1.5 ${
                  statusConfig[lead.status].color
                } text-white text-xs font-medium rounded-full`}
              >
                {statusConfig[lead.status].label}
              </span>
            </div>
          </div>
        </div>

        {/* Lead Information - Compact Layout */}
        <div className="space-y-3 mb-6">
          {/* Notes with AI Insights */}
          {lead.notes && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleSection('notes')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-750 transition-colors"
              >
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Notes & AI Insights
                </h2>
                {openSections.notes ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openSections.notes && (
                <div className="px-4 pb-4 space-y-3">
                  {/* AI Insights */}
                  {(() => {
                    const insights = generateInsights(lead.notes);
                    if (insights.length > 0) {
                      return (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                          <p className="text-xs font-semibold text-purple-300 mb-2">AI Insights</p>
                          <div className="space-y-1">
                            {insights.map((insight, idx) => (
                              <p key={idx} className="text-sm text-slate-300">{insight}</p>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Raw Notes */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Full Notes</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Communication History */}
        <CommunicationHistory
          leadId={lead.id}
          leadEmail={lead.email}
          leadPhone={lead.phone}
          leadName={lead.contact_name}
          initialAiEnabled={lead.ai_enabled ?? true}
        />

        {/* Contact Info Modal */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowContactModal(false)}>
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact & Business Information
                </h2>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Info Column */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase">Contact Info</h3>
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

                  {/* Business Info Column */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase">Business Info</h3>
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
                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="text-sm text-slate-300">{formatDate(lead.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Updated</p>
                      <p className="text-sm text-slate-300">{formatDate(lead.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
