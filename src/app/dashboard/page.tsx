import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import NotificationPrompt from '@/components/NotificationPrompt';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardLayout userEmail={user.email || ''}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back!</h1>
          <p className="text-slate-400">
            Logged in as <span className="text-primary">{user.email}</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">
              Getting Started
            </h3>
            <p className="text-slate-400 text-sm">
              Welcome to your Boston Builders AI dashboard. Start managing your
              construction business with powerful tools.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">
              Lead Hunter
            </h3>
            <p className="text-slate-400 text-sm">
              Track building permits and find new opportunities in your area.
            </p>
          </div>

          <Link href="/dashboard/leads" className="block bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 hover:border-primary transition-all group">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">CRM</h3>
              <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-slate-400 text-sm mb-3">
              Manage your leads, clients, and projects all in one place.
            </p>
            <div className="flex items-center space-x-2 text-primary text-sm font-medium">
              <Users className="w-4 h-4" />
              <span>View Leads Dashboard</span>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="mt-8 bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Account Details</h2>
          <div className="space-y-3">
            <div>
              <span className="text-slate-400 text-sm">User ID:</span>
              <p className="text-white font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <span className="text-slate-400 text-sm">Email:</span>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <span className="text-slate-400 text-sm">Last Sign In:</span>
              <p className="text-white">
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PWA Notification Prompt */}
      <NotificationPrompt userId={user.id} />
    </DashboardLayout>
  );
}
