'use client';

import { useEffect, useState } from 'react';
import { Mail, MessageSquare, Send, X } from 'lucide-react';

interface Communication {
  id: string;
  type: 'email' | 'sms';
  direction: 'inbound' | 'outbound';
  subject?: string;
  body: string;
  from_address: string;
  to_address: string;
  status: string;
  created_at: string;
}

interface CommunicationHistoryProps {
  leadId: string;
  leadEmail: string;
  leadPhone?: string | null;
  leadName: string;
}

export default function CommunicationHistory({
  leadId,
  leadEmail,
  leadPhone,
  leadName,
}: CommunicationHistoryProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);

  // Email form
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // SMS form
  const [smsBody, setSmsBody] = useState('');

  useEffect(() => {
    fetchCommunications();
  }, [leadId]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/communications/${leadId}`);
      const result = await response.json();

      if (result.success) {
        setCommunications(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('Please fill in both subject and message');
      return;
    }

    try {
      setSendingEmail(true);
      const response = await fetch('/api/communications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: leadEmail,
          subject: emailSubject,
          html: emailBody.replace(/\n/g, '<br>'),
          leadId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailSubject('');
        setEmailBody('');
        setShowEmailModal(false);
        fetchCommunications();
        alert('Email sent successfully!');
      } else {
        alert(`Failed to send email: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsBody.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!leadPhone) {
      alert('This lead does not have a phone number');
      return;
    }

    try {
      setSendingSMS(true);
      const response = await fetch('/api/communications/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: leadPhone,
          message: smsBody,
          leadId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSmsBody('');
        setShowSMSModal(false);
        fetchCommunications();
        alert('SMS sent successfully!');
      } else {
        alert(`Failed to send SMS: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSendingSMS(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowEmailModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Mail className="w-4 h-4" />
          Send Email
        </button>
        {leadPhone && (
          <button
            onClick={() => setShowSMSModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Send SMS
          </button>
        )}
      </div>

      {/* Communication History */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Communication History</h3>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : communications.length === 0 ? (
          <p className="text-slate-400">No communications yet</p>
        ) : (
          <div className="space-y-4">
            {communications.map((comm) => (
              <div
                key={comm.id}
                className={`p-4 rounded-lg border ${
                  comm.direction === 'outbound'
                    ? 'bg-blue-500/10 border-blue-500/30 ml-8'
                    : 'bg-slate-700 border-slate-600 mr-8'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {comm.type === 'email' ? (
                      <Mail className="w-4 h-4 text-blue-400" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-green-400" />
                    )}
                    <span className="text-sm font-medium text-white">
                      {comm.type === 'email' ? 'Email' : 'SMS'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {comm.direction === 'outbound' ? 'Sent to' : 'Received from'}{' '}
                      {comm.direction === 'outbound' ? comm.to_address : comm.from_address}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(comm.created_at)}
                  </span>
                </div>
                {comm.subject && (
                  <h4 className="text-sm font-semibold text-white mb-1">{comm.subject}</h4>
                )}
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{comm.body}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      comm.status === 'sent' || comm.status === 'delivered'
                        ? 'bg-green-500/20 text-green-400'
                        : comm.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {comm.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Send Email to {leadName}</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">To</label>
                <input
                  type="email"
                  value={leadEmail}
                  disabled
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Enter your message"
                  rows={8}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Send SMS to {leadName}</h3>
              <button
                onClick={() => setShowSMSModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">To</label>
                <input
                  type="tel"
                  value={leadPhone || ''}
                  disabled
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                <textarea
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  placeholder="Enter your message"
                  rows={5}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-slate-400 mt-1">{smsBody.length} characters</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSMSModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSMS}
                  disabled={sendingSMS}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sendingSMS ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
