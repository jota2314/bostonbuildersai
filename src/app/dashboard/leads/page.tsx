'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { useLeadsStore } from '@/store/useLeadsStore';
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
  AlertCircle
} from 'lucide-react';

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-500', icon: AlertCircle },
  contacted: { label: 'Contacted', color: 'bg-purple-500', icon: Mail },
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
  } = useLeadsStore();

  // Local state
  const [userEmail, setUserEmail] = useState<string>('');
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

  return (
    <DashboardLayout userEmail={userEmail}>
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Lead Dashboard</h1>
              <p className="text-slate-400">Manage your sales pipeline</p>
            </div>
            <button
              onClick={() => {
                // TODO: Implement add lead modal
                console.log('Add lead clicked');
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Lead</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Leads</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <Building2 className="w-10 h-10 text-primary" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">New Leads</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{stats.new}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-blue-400" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Qualified</p>
                  <p className="text-3xl font-bold text-yellow-400 mt-1">{stats.qualified}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-yellow-400" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Won</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{stats.won}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
            >
              <option value="all">All Status</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredLeads.map((lead) => {
              const StatusIcon = statusConfig[lead.status].icon;
              return (
                <div
                  key={lead.id}
                  className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-primary/50 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {lead.company_name}
                      </h3>
                      <p className="text-slate-400">{lead.contact_name}</p>
                    </div>
                    <div className={`flex items-center space-x-2 px-3 py-1 ${statusConfig[lead.status].color} rounded-full`}>
                      <StatusIcon className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">
                        {statusConfig[lead.status].label}
                      </span>
                    </div>
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

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{lead.email}</span>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center space-x-2 text-slate-300">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{lead.phone}</span>
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
                      <p className="text-slate-300 text-sm line-clamp-2">{lead.notes}</p>
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
                    {lead.source && (
                      <span className="text-slate-400 text-sm">
                        Source: {lead.source}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
