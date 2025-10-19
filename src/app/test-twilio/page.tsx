'use client';

import { useState } from 'react';

export default function TestTwilioPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Hello! This is a test call from Boston Builders AI.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; callSid?: string } | null>(null);

  const makeTestCall = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          message,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to make call' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Twilio Test Page</h1>

        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone Number (E.164 format)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+15551234567"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-slate-400 mt-2">
                Format: +1 followed by 10 digits (e.g., +15551234567)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <button
              onClick={makeTestCall}
              disabled={loading || !phoneNumber}
              className="w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Making Call...' : 'Make Test Call'}
            </button>

            {result && (
              <div
                className={`p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-500/10 border-green-500 text-green-400'
                    : 'bg-red-500/10 border-red-500 text-red-400'
                }`}
              >
                <p className="font-semibold mb-2">
                  {result.success ? '✅ Success!' : '❌ Error'}
                </p>
                {result.callSid && (
                  <p className="text-sm">Call SID: {result.callSid}</p>
                )}
                {result.error && <p className="text-sm">{result.error}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">How to Use:</h2>
          <ol className="space-y-2 text-slate-300">
            <li>1. Enter a valid phone number in E.164 format (+15551234567)</li>
            <li>2. Optionally customize the message</li>
            <li>3. Click "Make Test Call"</li>
            <li>4. Wait for the call to come through!</li>
          </ol>

          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-400 text-sm">
              <strong>Note:</strong> Make sure your Twilio number is verified for production use.
              Test numbers may only call verified numbers during trial period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
