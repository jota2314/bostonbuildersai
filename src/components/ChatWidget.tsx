'use client';

import { MessageCircle, X, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { isToolUIPart, getToolName } from 'ai';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    api: '/api/chat',
    // SDK 5: No maxSteps needed - server handles multi-step automatically
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === 'submitted' || status === 'streaming') return;

    sendMessage({ text: input });
    setInput('');
  };

  // Render message content including tool UI parts (SDK 5)
  const renderMessageContent = (message: typeof messages[0]) => {
    if (typeof message.content === 'string') {
      return <>{message.content}</>;
    }

    if (!message.parts || message.parts.length === 0) return null;

    return (
      <div className="space-y-2">
        {message.parts.map((part: any, idx: number) => {
          if (part.type === 'text') {
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
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-primary hover:bg-primary-dark text-white rounded-full p-4 shadow-lg transition-all z-50"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
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
            {/* Initial welcome message */}
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-slate-700 text-slate-100">
                  Hey! I help contractors book calls with Jorge. What&apos;s your name?
                </div>
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

          <div className="p-4 border-t border-slate-700">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={status === 'submitted' || status === 'streaming'}
                className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === 'submitted' || status === 'streaming'}
                className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
