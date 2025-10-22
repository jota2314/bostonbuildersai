'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { useLeadsStore, type Lead } from '@/store/useLeadsStore';
import {
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  DollarSign,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Grid3x3,
  List,
  Trash2
} from 'lucide-react';

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-500', icon: AlertCircle },
  meeting_scheduled: { label: 'Meeting Scheduled', color: 'bg-purple-500', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-cyan-500', icon: Mail },
  qualified: { label: 'Qualified', color: 'bg-yellow-500', icon: CheckCircle },
  proposal: { label: 'Proposal', color: 'bg-orange-500', icon: TrendingUp },
  negotiation: { label: 'Negotiation', color: 'bg-indigo-500', icon: Clock },
  won: { label: 'Won', color: 'bg-green-500', icon: CheckCircle },
  lost: { label: 'Lost', color: 'bg-red-500', icon: XCircle },
};

const priorityConfig = {
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  high: { color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function LeadsPage() {
  const router = useRouter();

  // Zustand store
  const {
    loading,
    searchTerm,
    statusFilter,
    setSearchTerm,
    setStatusFilter,
    fetchLeads,
    getFilteredLeads,
    getStats,
    updateLead,
    deleteLead,
  } = useLeadsStore();

  // Local state
  const [userEmail, setUserEmail] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const supabase = createClient();

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get filtered leads and stats from store
  const filteredLeads = getFilteredLeads();
  const stats = getStats();

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLead(leadId, { status: newStatus as Lead['status'] });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${leadName}? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await deleteLead(leadId);
      } catch (error) {
        console.error('Failed to delete lead:', error);
        alert('Failed to delete lead. Please try again.');
      }
    }
  };

  return (
    <DashboardLayout userEmail={userEmail}>
      <div className="w-full">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Lead Dashboard</h1>
              <p className="text-slate-400 text-sm md:text-base">Manage your sales pipeline</p>
            </div>
            <button
              onClick={() => {
                // TODO: Implement add lead modal
                console.log('Add lead clicked');
              }}
              className="flex items-center justify-center space-x-2 px-4 md:px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Add Lead</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Total Leads</p>
                  <p className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <Building2 className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">New Leads</p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-400 mt-1">{stats.new}</p>
                </div>
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Qualified</p>
                  <p className="text-2xl md:text-3xl font-bold text-yellow-400 mt-1">{stats.qualified}</p>
                </div>
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-yellow-400" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Won</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-400 mt-1">{stats.won}</p>
                </div>
                <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-green-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-colors text-sm md:text-base"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 md:flex-none px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary transition-colors text-sm md:text-base"
              >
                <option value="all">All Status</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              {/* View Toggle */}
              <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 md:px-4 py-2 rounded transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-primary text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Card view"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 md:px-4 py-2 rounded transition-colors ${
                    viewMode === 'table'
                      ? 'bg-primary text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Table view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Leads Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-slate-400 mt-4">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No leads found</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {filteredLeads.map((lead) => {
              return (
                <div
                  key={lead.id}
                  onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                  className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700 hover:border-primary/50 transition-all cursor-pointer"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-1 truncate">
                        {lead.company_name}
                      </h3>
                      <p className="text-sm md:text-base text-slate-400">{lead.contact_name}</p>
                    </div>
                    {/* Status Dropdown */}
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`flex-shrink-0 px-2 md:px-3 py-1.5 md:py-1 ${statusConfig[lead.status].color} text-white text-xs md:text-sm font-medium rounded-full border-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-h-[36px] md:min-h-0`}
                    >
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <option key={key} value={key} className="bg-slate-800 text-white">
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Business Type & Priority */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {lead.business_type}
                    </span>
                    <span className={`px-3 py-1 ${priorityConfig[lead.priority].bg} ${priorityConfig[lead.priority].color} rounded-full text-sm font-medium capitalize`}>
                      {lead.priority} Priority
                    </span>
                  </div>

                  {/* Contact Info with Action Buttons */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center space-x-2 text-slate-300 flex-1 min-w-0">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm truncate">{lead.email}</span>
                      </div>
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="md:opacity-0 md:group-hover:opacity-100 transition-opacity px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium min-h-[36px] flex items-center flex-shrink-0"
                      >
                        Email
                      </a>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center space-x-2 text-slate-300 flex-1 min-w-0">
                          <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm truncate">{lead.phone}</span>
                        </div>
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="md:opacity-0 md:group-hover:opacity-100 transition-opacity px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded text-xs font-medium min-h-[36px] flex items-center flex-shrink-0"
                        >
                          Call
                        </a>
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center space-x-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{lead.location}</span>
                      </div>
                    )}
                    {lead.annual_revenue && (
                      <div className="flex items-center space-x-2 text-slate-300">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          {formatCurrency(lead.annual_revenue)} annual revenue
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {lead.notes && (
                    <div className="bg-slate-900 rounded p-3 mb-4">
                      <p className="text-slate-400 text-xs mb-1 font-semibold">Notes:</p>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                        {lead.notes}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div className="flex items-center space-x-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.source && (
                        <span className="text-slate-400 text-xs hidden sm:inline">
                          Source: {lead.source}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLead(lead.id, lead.company_name);
                        }}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            {/* Mobile scroll hint */}
            <div className="lg:hidden px-4 py-2 bg-slate-900 border-b border-slate-700 text-xs text-slate-400 text-center">
              ← Swipe to see more →
            </div>
            <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              {/* Scroll shadow indicators */}
              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-slate-800 to-transparent pointer-events-none z-10 lg:hidden"></div>
              <table className="w-full lg:min-w-full min-w-[900px]">
                <style jsx>{`
                  .scrollbar-thin::-webkit-scrollbar {
                    height: 8px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-track {
                    background: #1e293b;
                  }
                  .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #475569;
                    border-radius: 4px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                  }
                `}</style>
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Company
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Contact
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Business Type
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Priority
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Revenue
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      className="hover:bg-slate-750 transition-colors cursor-pointer"
                    >
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="text-sm font-medium text-white whitespace-nowrap">{lead.company_name}</div>
                        <div className="text-xs text-slate-400">{lead.location || 'N/A'}</div>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="text-sm text-white whitespace-nowrap">{lead.contact_name}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">{lead.email}</div>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium whitespace-nowrap">
                          {lead.business_type}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-2 py-1.5 ${statusConfig[lead.status].color} text-white text-xs font-medium rounded border-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-h-[36px]`}
                        >
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <option key={key} value={key} className="bg-slate-800 text-white">
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <span className={`px-2 py-1 ${priorityConfig[lead.priority].bg} ${priorityConfig[lead.priority].color} rounded text-xs font-medium capitalize whitespace-nowrap`}>
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="text-sm text-slate-300 whitespace-nowrap">{formatCurrency(lead.annual_revenue)}</div>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Send email"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLead(lead.id, lead.company_name);
                            }}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Delete lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
