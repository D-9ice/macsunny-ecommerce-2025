'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    
    // Detect simple messages (no need to fetch database)
    const simpleWords = ['thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'hi', 'hello', 'bye', 'goodbye', 'cool', 'nice', 'great'];
    const isSimple = simpleWords.some(word => input.toLowerCase().includes(word)) && input.split(' ').length <= 3;
    
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          includeProductContext: !isSimple, // Skip database for simple messages
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message || 'Sorry, I could not process your request.',
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const error = await response.json();
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: error.message || 'Sorry, something went wrong. Please try again.',
          },
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Network error. Please check your connection and try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Multi-color Spinning Glow Effect */}
      <div className="fixed bottom-[88px] right-5 w-16 h-16 rounded-full animate-spin-slow z-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 opacity-75 blur-md"></div>
      </div>

      {/* Floating AI Chat Button with Bold "Ask macsunny AI" Text */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-[88px] right-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full shadow-lg z-50 hover:from-blue-700 hover:to-purple-700 transition focus:outline-none focus:ring-2 focus:ring-purple-400 w-16 h-16 flex flex-col items-center justify-center"
        aria-label="Chat with AI"
      >
        {open ? (
          <X size={24} />
        ) : (
          <div className="flex flex-col items-center justify-center leading-none gap-0.5">
            <span className="text-[13px] font-black tracking-tight">Ask</span>
            <span className="text-[11px] font-black tracking-tighter">macsunny</span>
            <span className="text-[13px] font-black tracking-tight">AI</span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-[164px] right-5 z-[60] w-80 sm:w-96 rounded-xl force-bg-white shadow-2xl border-2 border-purple-400 animate-fade-in-up flex flex-col" style={{ maxHeight: '500px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-xl">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span className="text-xl">🤖</span>
              MacSunny AI Assistant
            </h3>
            <p className="text-xs text-white/80 mt-1">
              Ask me about products, pricing, or anything!
            </p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: '200px', maxHeight: '300px' }}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-sm">Hi! How can I help you today?</p>
                <p className="text-xs mt-2">Ask me about:</p>
                <ul className="text-xs mt-1 space-y-1">
                  <li>• Product availability</li>
                  <li>• Technical specifications</li>
                  <li>• Pricing & payment</li>
                  <li>• Store location</li>
                </ul>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 force-black'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin force-black" />
                  <span className="text-sm force-black">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 force-black"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
