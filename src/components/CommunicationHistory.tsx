'use client';

import { useEffect, useState, useRef } from 'react';
import { Mail, MessageSquare, Send, Phone, Bot, BotOff, PhoneCall, Sparkles, Wand2, Lightbulb } from 'lucide-react';
import dynamic from 'next/dynamic';

const CallInterface = dynamic(() => import('./CallInterface'), { ssr: false });

interface Communication {
  id: string;
  type: 'email' | 'sms' | 'phone';
  direction: 'inbound' | 'outbound';
  subject?: string;
  body: string;
  from_address: string;
  to_address: string;
  status: string;
  created_at: string;
  metadata?: {
    transcript?: string;
    recording_sid?: string;
    call_sid?: string;
  };
}

interface CommunicationHistoryProps {
  leadId: string;
  leadEmail: string;
  leadPhone?: string | null;
  leadName: string;
  initialAiEnabled?: boolean;
}

export default function CommunicationHistory({
  leadId,
  leadEmail,
  leadPhone,
  leadName,
  initialAiEnabled = true,
}: CommunicationHistoryProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'email'>(leadPhone ? 'sms' : 'email');
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
  const [togglingAi, setTogglingAi] = useState(false);

  // Message input
  const [messageBody, setMessageBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [showSubject, setShowSubject] = useState(false);

  // AI Writing Assistant
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCommunications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  useEffect(() => {
    scrollToBottom();
  }, [communications]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const handleSendMessage = async () => {
    if (!messageBody.trim()) {
      alert('Please enter a message');
      return;
    }

    if (messageType === 'email') {
      await handleSendEmail();
    } else {
      await handleSendSMS();
    }
  };

  const handleSendEmail = async () => {
    if (!messageBody.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/communications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: leadEmail,
          subject: emailSubject.trim() || 'Message from Boston Builders AI',
          html: messageBody.replace(/\n/g, '<br>'),
          leadId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessageBody('');
        setEmailSubject('');
        setShowSubject(false);
        fetchCommunications();
      } else {
        alert(`Failed to send email: ${result.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${message}`);
    } finally {
      setSending(false);
    }
  };

  const handleSendSMS = async () => {
    if (!messageBody.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!leadPhone) {
      alert('This lead does not have a phone number');
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/communications/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: leadPhone,
          message: messageBody,
          leadId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessageBody('');
        fetchCommunications();
      } else {
        alert(`Failed to send SMS: ${result.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${message}`);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
      }).format(date);
    } else if (diffInHours < 168) { // Less than a week
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
      }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(date);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCall = () => {
    if (!leadPhone) {
      alert('This lead does not have a phone number');
      return;
    }
    setShowCallInterface(true);
  };

  const handleCallEnd = () => {
    setShowCallInterface(false);
    // Refresh communications to show the new call record
    fetchCommunications();
  };

  const handleToggleAi = async () => {
    try {
      setTogglingAi(true);
      const newAiEnabled = !aiEnabled;

      const response = await fetch(`/api/leads/${leadId}/toggle-ai`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_enabled: newAiEnabled }),
      });

      const result = await response.json();

      if (result.success) {
        setAiEnabled(newAiEnabled);
      } else {
        alert(`Failed to toggle AI: ${result.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${message}`);
    } finally {
      setTogglingAi(false);
    }
  };

  const getAiSuggestions = async (action: 'suggest' | 'improve' | 'professional') => {
    try {
      setLoadingAi(true);
      setShowAiAssistant(true);

      const response = await fetch('/api/ai/writing-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          draft: messageBody,
          messageType,
          leadName,
          conversationHistory: communications.slice(-5).map(c => ({
            direction: c.direction,
            body: c.body,
            type: c.type
          }))
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiSuggestions(result.suggestions || [result.text]);
      } else {
        alert(`Failed to get AI suggestions: ${result.error}`);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      alert('Failed to get AI suggestions');
    } finally {
      setLoadingAi(false);
    }
  };

  const useSuggestion = (suggestion: string) => {
    setMessageBody(suggestion);
    setShowAiAssistant(false);
    setAiSuggestions([]);
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-white hidden md:block">Messages</h3>
          <h3 className="text-lg font-bold text-white md:hidden">Chat</h3>

          {/* AI Status Badge */}
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              aiEnabled
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-slate-600/50 text-slate-400 border border-slate-600'
            }`}
          >
            {aiEnabled ? <Bot className="w-3 h-3" /> : <BotOff className="w-3 h-3" />}
            <span className="hidden md:inline">AI {aiEnabled ? 'ON' : 'OFF'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Toggle Button */}
          <button
            onClick={handleToggleAi}
            disabled={togglingAi}
            title={aiEnabled ? 'Turn off AI auto-responses' : 'Turn on AI auto-responses'}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              aiEnabled
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {aiEnabled ? <BotOff className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            <span className="hidden md:inline">
              {togglingAi ? 'Updating...' : aiEnabled ? 'Disable AI' : 'Enable AI'}
            </span>
          </button>

          {/* Call Button */}
          {leadPhone && (
            <button
              onClick={handleCall}
              title="Call"
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden md:inline">Call</span>
            </button>
          )}

          {/* Type Toggle */}
          <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
            {leadPhone && (
              <button
                onClick={() => setMessageType('sms')}
                title="SMS"
                className={`flex items-center gap-1.5 px-2 py-1.5 md:px-3 md:py-1.5 rounded-md transition-colors text-sm ${
                  messageType === 'sms'
                    ? 'bg-green-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden md:inline">SMS</span>
              </button>
            )}
            <button
              onClick={() => setMessageType('email')}
              title="Email"
              className={`flex items-center gap-1.5 px-2 py-1.5 md:px-3 md:py-1.5 rounded-md transition-colors text-sm ${
                messageType === 'email'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span className="hidden md:inline">Email</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">Loading messages...</p>
          </div>
        ) : communications.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">No messages yet. Start a conversation!</p>
          </div>
        ) : (
          <>
            {communications.map((comm) => (
              <div
                key={comm.id}
                className={`flex ${comm.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    comm.direction === 'outbound'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {comm.type === 'email' ? (
                      <Mail className="w-3 h-3 opacity-70" />
                    ) : comm.type === 'phone' ? (
                      <PhoneCall className="w-3 h-3 opacity-70" />
                    ) : (
                      <MessageSquare className="w-3 h-3 opacity-70" />
                    )}
                    <span className="text-xs opacity-70">
                      {comm.type.toUpperCase()}
                    </span>
                  </div>

                  {comm.subject && (
                    <div className="font-semibold text-sm mb-1">{comm.subject}</div>
                  )}

                  <p className="text-sm whitespace-pre-wrap break-words">{comm.body}</p>

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-xs opacity-70">{formatTime(comm.created_at)}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        comm.status === 'sent' || comm.status === 'delivered'
                          ? 'bg-white/20'
                          : comm.status === 'failed'
                          ? 'bg-red-500/30'
                          : 'bg-yellow-500/30'
                      }`}
                    >
                      {comm.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        {/* AI Writing Assistant Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => getAiSuggestions('suggest')}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors text-xs disabled:opacity-50"
            title="Get AI response suggestions"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Suggest</span>
          </button>
          <button
            onClick={() => getAiSuggestions('improve')}
            disabled={loadingAi || !messageBody.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors text-xs disabled:opacity-50"
            title="Improve your draft"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Improve</span>
          </button>
          <button
            onClick={() => getAiSuggestions('professional')}
            disabled={loadingAi || !messageBody.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg transition-colors text-xs disabled:opacity-50"
            title="Make it professional"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Professional</span>
          </button>
          {loadingAi && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400"></div>
              Thinking...
            </span>
          )}
        </div>

        {/* AI Suggestions Panel */}
        {showAiAssistant && aiSuggestions.length > 0 && (
          <div className="bg-slate-700/50 rounded-lg p-3 space-y-2 border border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-purple-300">AI Suggestions:</p>
              <button
                onClick={() => {
                  setShowAiAssistant(false);
                  setAiSuggestions([]);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            {aiSuggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="bg-slate-800 rounded p-3 cursor-pointer hover:bg-slate-750 transition-colors border border-slate-600 hover:border-purple-500"
                onClick={() => useSuggestion(suggestion)}
              >
                <p className="text-sm text-slate-300">{suggestion}</p>
                <p className="text-xs text-purple-400 mt-1">Click to use</p>
              </div>
            ))}
          </div>
        )}

        {/* Email Subject Field (optional) */}
        {messageType === 'email' && (
          <>
            {!showSubject ? (
              <button
                onClick={() => setShowSubject(true)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + Add subject
              </button>
            ) : (
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject (optional)"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </>
        )}

        {/* Message Input */}
        <div className="flex gap-2">
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Type a ${messageType === 'email' ? 'message' : 'text message'}...`}
            rows={2}
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !messageBody.trim()}
            className={`px-4 rounded-2xl transition-colors ${
              messageType === 'email'
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-green-500 hover:bg-green-600'
            } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Character count for SMS */}
        {messageType === 'sms' && messageBody.length > 0 && (
          <p className="text-xs text-slate-400">
            {messageBody.length} character{messageBody.length !== 1 ? 's' : ''}
            {messageBody.length > 160 && (
              <span className="text-yellow-400 ml-2">
                (Will be sent as {Math.ceil(messageBody.length / 160)} messages)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Call Interface Modal */}
      {showCallInterface && leadPhone && (
        <CallInterface
          leadPhone={leadPhone}
          leadName={leadName}
          leadId={leadId}
          onCallEnd={handleCallEnd}
        />
      )}
    </div>
  );
}
