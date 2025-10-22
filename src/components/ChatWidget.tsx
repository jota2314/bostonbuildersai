'use client';

import { MessageCircle, X, Send, Mic } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { isToolUIPart, getToolName, DefaultChatTransport } from 'ai';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(true);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadData, setLeadData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    // SDK 5: No maxSteps needed - server handles multi-step automatically
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show notification popup after delay (if not previously dismissed)
  useEffect(() => {
    const notificationDismissed = localStorage.getItem('chatNotificationDismissed');

    if (!notificationDismissed && !isOpen) {
      const timer = setTimeout(() => {
        setShowNotification(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDismissNotification = () => {
    setShowNotification(false);
    localStorage.setItem('chatNotificationDismissed', 'true');
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowNotification(false);
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsRecording(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === 'submitted' || status === 'streaming') return;

    sendMessage({ text: input });
    setInput('');
  };


  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!leadData.name || !leadData.email || !leadData.phone) {
      alert('Please fill in all required fields (Name, Email, Phone)');
      return;
    }

    setIsSubmittingLead(true);

    try {
      // Save lead to database with correct field names
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: leadData.name,
          company_name: leadData.company || 'Individual',
          email: leadData.email,
          phone: leadData.phone,
          business_type: 'Construction/Contractor', // Default for chat leads
          source: 'chat_widget',
          consent_to_contact: true, // User submitted form = implicit consent
          consent_date: new Date().toISOString(),
          consent_ip_address: 'chat_widget', // Could get real IP if needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to save lead');
      }

      // Hide form and show chat
      setShowLeadForm(false);

      // Send a simple message to start the scheduling conversation
      sendMessage({
        text: `Hi, I'd like to schedule a meeting with Jorge. My info: ${leadData.name}, ${leadData.email}, ${leadData.phone}, ${leadData.company || 'N/A'}`
      });

    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Oops, something went wrong. Please try again.');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Render message content including tool UI parts (SDK 5)
  const renderMessageContent = (message: typeof messages[0]) => {
    if (!message.parts || message.parts.length === 0) return null;

    return (
      <div className="space-y-2">
        {message.parts.map((part, idx: number) => {
          if (part.type === 'text') {
            // Check if this text contains date options
            if (part.text && part.text.includes('DATEOPTIONS:')) {
              try {
                const parts = part.text.split('DATEOPTIONS:');
                const beforeText = parts[0];
                const afterParts = parts[1].split(']');
                const jsonStr = afterParts[0] + ']';
                const afterText = afterParts.slice(1).join(']');

                const dateOptions = JSON.parse(jsonStr) as Array<{ date: string; label: string }>;

                return (
                  <div key={idx} className="space-y-2">
                    {beforeText && <div>{beforeText.trim()}</div>}
                    <div className="grid grid-cols-2 gap-2">
                      {dateOptions.map((option) => (
                        <button
                          key={option.date}
                          onClick={() => {
                            if (status === 'submitted' || status === 'streaming') return;
                            sendMessage({ text: option.date });
                          }}
                          disabled={status === 'submitted' || status === 'streaming'}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {afterText && <div>{afterText.trim()}</div>}
                  </div>
                );
              } catch {
                // If JSON parsing fails (incomplete stream), hide the text
                if (status === 'streaming' && part.text.includes('DATEOPTIONS:')) {
                  // Extract just the text before DATEOPTIONS while streaming
                  const cleanText = part.text.split('DATEOPTIONS:')[0];
                  return <div key={idx}>{cleanText.trim()}</div>;
                }
                return <div key={idx}>{part.text}</div>;
              }
            }

            // Check if this text contains time slots
            if (part.text && part.text.includes('TIMESLOTS:')) {
              try {
                // Split the message into parts: before TIMESLOTS, the JSON, and after
                const parts = part.text.split('TIMESLOTS:');
                const beforeText = parts[0];
                const afterParts = parts[1].split(']');
                const jsonStr = afterParts[0] + ']';
                const afterText = afterParts.slice(1).join(']');

                const timeSlots = JSON.parse(jsonStr) as Array<{ time: string; end: string; label: string }>;

                return (
                  <div key={idx} className="space-y-2">
                    {beforeText && <div>{beforeText.trim()}</div>}
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => {
                            if (status === 'submitted' || status === 'streaming') return;
                            sendMessage({ text: `${slot.label}` });
                          }}
                          disabled={status === 'submitted' || status === 'streaming'}
                          className="bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                    {afterText && <div>{afterText.trim()}</div>}
                  </div>
                );
              } catch {
                // If JSON parsing fails (incomplete stream), hide the text
                if (status === 'streaming' && part.text.includes('TIMESLOTS:')) {
                  // Extract just the text before TIMESLOTS while streaming
                  const cleanText = part.text.split('TIMESLOTS:')[0];
                  return <div key={idx}>{cleanText.trim()}</div>;
                }
                return <div key={idx}>{part.text}</div>;
              }
            }

            return <div key={idx}>{part.text}</div>;
          }

          if (isToolUIPart(part)) {
            const name = getToolName(part);
            const isDone = part.state === 'output-available';
            return (
              <details key={`tool-${idx}`} className="bg-slate-800/50 rounded p-2">
                <summary className="cursor-pointer">
                  <span className="font-semibold">{name}</span>
                  <span className="ml-2 text-xs opacity-70">{isDone ? 'done' : 'calling...'}</span>
                </summary>
                {isDone ? (
                  <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                    {typeof part.output === 'string'
                      ? part.output
                      : JSON.stringify(part.output, null, 2)}
                  </pre>
                ) : null}
              </details>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <>
      {!isOpen && (
        <>
          {/* Notification bubble */}
          {showNotification && (
            <div className="fixed bottom-24 right-6 bg-white text-gray-800 rounded-lg shadow-2xl p-4 max-w-xs z-50 animate-slideInRight border-2 border-primary">
              <button
                onClick={handleDismissNotification}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="font-semibold text-primary mb-1">👋 Have questions?</p>
              <p className="text-sm text-gray-600 mb-3">Let&apos;s chat! I can help you schedule a meeting with Jorge.</p>
              <button
                onClick={handleOpenChat}
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Start Chat
              </button>
            </div>
          )}

          {/* Chat button with pulse */}
          <button
            onClick={handleOpenChat}
            className={`fixed bottom-6 right-6 bg-primary hover:bg-primary-dark text-white rounded-full p-4 shadow-lg transition-all z-50 ${
              showNotification ? 'animate-pulse' : ''
            }`}
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-800 rounded-lg shadow-2xl flex flex-col z-50 border border-slate-700">
          <div className="bg-primary p-4 rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">Book a Call with Jorge</h3>
              <p className="text-white/80 text-xs">Usually responds in seconds</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-primary-dark rounded p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Lead capture form - shown first */}
            {showLeadForm && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg p-4 bg-slate-700 text-slate-100">
                    <p className="mb-1">👋 Hey! Let&apos;s get started.</p>
                    <p className="text-sm text-slate-300 mt-2">Please share your contact info so we can help you better:</p>
                  </div>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-3 bg-slate-700/50 p-4 rounded-lg">
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">Name *</label>
                    <input
                      type="text"
                      value={leadData.name}
                      onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                      placeholder="John Doe"
                      required
                      className="w-full bg-slate-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm mb-1">Email *</label>
                    <input
                      type="email"
                      value={leadData.email}
                      onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                      className="w-full bg-slate-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={leadData.phone}
                      onChange={(e) => setLeadData({ ...leadData, phone: e.target.value })}
                      placeholder="(617) 555-0123"
                      required
                      className="w-full bg-slate-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm mb-1">Company Name</label>
                    <input
                      type="text"
                      value={leadData.company}
                      onChange={(e) => setLeadData({ ...leadData, company: e.target.value })}
                      placeholder="Your Company (optional)"
                      className="w-full bg-slate-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingLead ? 'Starting chat...' : 'Start Chat'}
                  </button>
                </form>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  {renderMessageContent(message)}
                </div>
              </div>
            ))}
            {(status === 'submitted' || status === 'streaming') && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="bg-red-900/50 text-red-200 rounded-lg p-3">
                  Oops, I had a glitch. Mind trying that again?
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input - only show after lead form is submitted */}
          {!showLeadForm && (
          <div className="p-4 border-t border-slate-700">
            {isRecording && (
              <div className="mb-2 text-center">
                <span className="text-primary text-sm animate-pulse">🎤 Listening...</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={status === 'submitted' || status === 'streaming'}
                className={`${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-slate-700 hover:bg-slate-600'
                } text-white rounded-lg px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or speak your message..."
                disabled={status === 'submitted' || status === 'streaming' || isRecording}
                className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === 'submitted' || status === 'streaming' || isRecording}
                className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
          )}
        </div>
      )}
    </>
  );
}
