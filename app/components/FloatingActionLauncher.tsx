'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';

type Action = 'whatsapp' | 'ai' | 'location';
type Message = { role: 'user' | 'assistant'; content: string };

function WhatsAppIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function LocationIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#1976D2" d="M24,4c-7.7,0-14,6.3-14,14c0,10.5,14,26,14,26s14-15.5,14-26C38,10.3,31.7,4,24,4z" />
      <circle fill="#FFF" cx="24" cy="17" r="5" />
      <path fill="#1976D2" d="M24,11c-3.3,0-6,2.7-6,6s2.7,6,6,6s6-2.7,6-6S27.3,11,24,11z M24,20c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S25.7,20,24,20z" />
      <path fill="#EA4335" d="M24,44S10,28.5,10,18c0-2.4,0.6-4.6,1.7-6.6" />
      <path fill="#FBBC04" d="M37.3,11.4C36.4,9.6,35.3,8,34,6.7" />
      <path fill="#34A853" d="M29.7,5.3C27.9,4.5,25.9,4,24,4" />
    </svg>
  );
}

export default function FloatingActionLauncher() {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<Action | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const closeAll = () => {
    setExpanded(false);
    setActive(null);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) closeAll();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chooseAction = (action: Action) => {
    setExpanded(false);
    setActive(action);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', content: input.trim() };
    const simpleWords = ['thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'hi', 'hello', 'bye', 'goodbye', 'cool', 'nice', 'great'];
    const isSimple = simpleWords.some((word) => input.toLowerCase().includes(word)) && input.split(' ').length <= 3;
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage], includeProductContext: !isSimple }),
      });
      const data = await response.json();
      setMessages((current) => [...current, {
        role: 'assistant',
        content: response.ok ? data.message || 'Sorry, I could not process your request.' : data.message || 'Sorry, something went wrong. Please try again.',
      }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'Network error. Please check your connection and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 z-[70] sm:bottom-5 sm:right-5">
      {active === 'whatsapp' && (
        <section role="dialog" aria-label="WhatsApp support" className="absolute bottom-20 right-0 w-64 rounded-xl border-2 border-[#25D366] force-bg-white p-4 shadow-2xl animate-fade-in-up">
          <button onClick={() => setActive(null)} aria-label="Close WhatsApp panel" className="absolute right-2 top-2 rounded-md p-1 force-black hover:bg-gray-100"><X size={20} /></button>
          <h3 className="mb-2 pr-7 font-bold force-black">Chat with us on WhatsApp</h3>
          <p className="mb-3 text-sm force-gray-dark">We&apos;ll reply as soon as possible.</p>
          <a href="https://wa.me/233243380902?text=Hello%20MacSunny%20Electronics!" target="_blank" rel="noopener noreferrer" onClick={closeAll} className="block rounded-md bg-[#25D366] py-2 text-center font-semibold force-white transition hover:bg-[#20BA5A]">Open Chat</a>
        </section>
      )}

      {active === 'location' && (
        <section role="dialog" aria-label="Store location" className="absolute bottom-20 right-0 w-64 rounded-xl border-2 border-blue-400 force-bg-white p-4 shadow-2xl animate-fade-in-up">
          <button onClick={() => setActive(null)} aria-label="Close location panel" className="absolute right-2 top-2 rounded-md p-1 force-black hover:bg-gray-100"><X size={20} /></button>
          <h3 className="mb-2 pr-7 font-bold force-black">Find Us</h3>
          <p className="mb-3 text-sm force-gray-dark">ZONGOLANE ACCRA CENTRAL, ACCRA, GHANA</p>
          <a href="https://maps.app.goo.gl/2Nn1h2YZgfJ59n8C8" target="_blank" rel="noopener noreferrer" onClick={closeAll} className="block rounded-md bg-[#1976D2] py-2 text-center font-semibold force-white transition hover:bg-[#1565C0]">View on Google Maps</a>
        </section>
      )}

      {active === 'ai' && (
        <section role="dialog" aria-label="MacSunny AI Assistant" className="absolute bottom-20 right-0 flex max-h-[min(500px,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-xl border-2 border-purple-400 force-bg-white shadow-2xl animate-fade-in-up">
          <header className="relative rounded-t-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4 pr-12">
            <button onClick={() => setActive(null)} aria-label="Close AI Assistant" className="absolute right-3 top-3 rounded-md p-1 text-white hover:bg-white/20"><X size={20} /></button>
            <h3 className="flex items-center gap-2 font-bold text-white"><span className="text-xl">🤖</span>MacSunny AI Assistant</h3>
            <p className="mt-1 text-xs text-white/80">Ask me about products, pricing, or anything!</p>
          </header>
          <div className="min-h-[190px] flex-1 space-y-3 overflow-y-auto p-4 sm:min-h-[200px] sm:max-h-[300px]">
            {messages.length === 0 ? (
              <div className="mt-6 text-center text-gray-500"><p className="text-sm">Hi! How can I help you today?</p><p className="mt-2 text-xs">Ask me about products, technical specifications, pricing, or our location.</p></div>
            ) : messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 force-black'}`}>{message.content}</div></div>
            ))}
            {isLoading && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2"><Loader2 className="h-4 w-4 animate-spin force-black" /><span className="text-sm force-black">Thinking...</span></div></div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-gray-200 p-3"><div className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Type your question..." aria-label="Message MacSunny AI" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none force-black" disabled={isLoading} /><button onClick={() => void sendMessage()} disabled={isLoading || !input.trim()} aria-label="Send message" className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white transition hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /></button></div></div>
        </section>
      )}

      <div id="floating-actions" className="absolute bottom-0 right-0" aria-hidden={!expanded}>
        <button type="button" onClick={() => chooseAction('location')} tabIndex={expanded ? 0 : -1} aria-label="View Location" className={`absolute bottom-0 right-0 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gray-200 bg-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${expanded ? '-translate-y-[216px] opacity-100' : 'pointer-events-none translate-y-0 scale-75 opacity-0'}`}><LocationIcon /></button>
        <button type="button" onClick={() => chooseAction('ai')} tabIndex={expanded ? 0 : -1} aria-label="Chat with AI" className={`absolute bottom-0 right-0 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 p-2 text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 ${expanded ? '-translate-y-36 opacity-100' : 'pointer-events-none translate-y-0 scale-75 opacity-0'}`}><span className="text-[13px] font-black leading-none">Ask</span><span className="text-[11px] font-black leading-none tracking-tighter">macsunny</span><span className="text-[13px] font-black leading-none">AI</span></button>
        <button type="button" onClick={() => chooseAction('whatsapp')} tabIndex={expanded ? 0 : -1} aria-label="Chat on WhatsApp" className={`absolute bottom-0 right-0 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400 ${expanded ? '-translate-y-[72px] opacity-100' : 'pointer-events-none translate-y-0 scale-75 opacity-0'}`}><WhatsAppIcon /></button>
      </div>

      <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-green-400 via-purple-500 to-blue-400 opacity-60 blur-md motion-safe:animate-pulse" />
      <button type="button" onClick={() => { setActive(null); setExpanded((current) => !current); }} aria-expanded={expanded} aria-controls="floating-actions" aria-label={expanded ? 'Close contact and location menu' : 'Open contact and location menu'} className="relative h-[68px] w-[68px] overflow-hidden rounded-full border-2 border-white/80 bg-slate-900 shadow-2xl transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300/70 active:scale-95">
        <svg viewBox="0 0 68 68" className="h-full w-full" aria-hidden="true">
          <defs><linearGradient id="ai-segment" x1="0" x2="1"><stop stopColor="#2563eb" /><stop offset="1" stopColor="#9333ea" /></linearGradient></defs>
          <path d="M34 34 L34 1 A33 33 0 0 1 62.58 50.5 Z" fill="#25D366" stroke="white" strokeWidth="1.5" />
          <path d="M34 34 L62.58 50.5 A33 33 0 0 1 5.42 50.5 Z" fill="url(#ai-segment)" stroke="white" strokeWidth="1.5" />
          <path d="M34 34 L5.42 50.5 A33 33 0 0 1 34 1 Z" fill="white" stroke="white" strokeWidth="1.5" />
          <g transform="translate(39 10) scale(.72)" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></g>
          <text x="34" y="56" fill="white" textAnchor="middle" fontSize="9" fontWeight="900">AI</text>
          <g transform="translate(8 18) scale(.42)"><LocationIcon className="h-12 w-12" /></g>
        </svg>
      </button>
    </div>
  );
}
