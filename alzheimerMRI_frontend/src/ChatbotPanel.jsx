import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  BrainCircuit,
  ChevronRight,
  Expand,
  Shrink,
  Minimize2,
  SendHorizonal,
  Sparkles,
  UserRound,
  X
} from 'lucide-react';
import { postChatbotQuestion } from './api';

const quickPrompts = [
  'What does a Moderate Demented MRI result usually imply?',
  'How should I prepare follow-up questions for a neurologist?',
  'Explain MMSE and ADL in simple language.',
  'What warning signs suggest the patient needs urgent evaluation?'
];

const initialMessages = [
  {
    id: 'intro',
    role: 'assistant',
    content:
      'I can help explain MRI classifications, clinical metrics, and next-step questions in plain language using the Alzheimer knowledge base behind the FastAPI chatbot.',
    timestamp: 'Now'
  }
];

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex gap-3 ${isAssistant ? 'items-start' : 'items-start justify-end'}`}>
      {isAssistant && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
          <Bot size={18} />
        </div>
      )}

      <div
        className={`min-w-0 max-w-[86%] rounded-[28px] border px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)] ${
          isAssistant
            ? 'border-white/10 bg-white/[0.08] text-slate-100'
            : 'border-fuchsia-300/20 bg-[linear-gradient(135deg,rgba(232,121,249,0.22),rgba(59,130,246,0.18))] text-white'
        }`}
      >
        {message.headline && (
          <p className="mb-1 text-sm font-semibold tracking-wide text-white">{message.headline}</p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
          {message.content}
        </p>

        {Array.isArray(message.cues) && message.cues.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.cues.map((cue) => (
              <span
                key={cue}
                className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium tracking-wide text-slate-300"
              >
                {cue}
              </span>
            ))}
          </div>
        )}

        {Array.isArray(message.sources) && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.sources.map((source) => (
              <span
                key={source}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium tracking-wide text-cyan-100"
              >
                {source}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {isAssistant ? <BrainCircuit size={12} /> : <UserRound size={12} />}
          <span>{message.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatbotPanel() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const messageViewportRef = useRef(null);
  const messageIdRef = useRef(1);
  const isOpenRef = useRef(isOpen);
  const hasOpenedRef = useRef(hasOpened);

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    hasOpenedRef.current = hasOpened;
  }, [hasOpened]);

  useEffect(() => {
    if (hasOpened) return undefined;

    const timer = window.setTimeout(() => {
      setShowWelcomeBubble(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [hasOpened]);

  const conversationCount = useMemo(
    () => messages.filter((message) => message.role === 'user').length,
    [messages]
  );

  const submitPrompt = async (rawPrompt) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || isTyping) return;
    const nextUserId = `user-${messageIdRef.current++}`;

    const userMessage = {
      id: nextUserId,
      role: 'user',
      content: trimmed,
      timestamp: formatTime()
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    setIsTyping(true);

    try {
      const response = await postChatbotQuestion(trimmed);
      let payload = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const detail = payload?.detail || payload?.error || 'Chatbot request failed.';
        throw new Error(detail);
      }

      const nextAssistantId = `assistant-${messageIdRef.current++}`;
      const answer = typeof payload?.answer === 'string' && payload.answer.trim()
        ? payload.answer.trim()
        : 'The chatbot returned an empty response.';

      setMessages((prev) => [
        ...prev,
        {
          id: nextAssistantId,
          role: 'assistant',
          headline: 'Knowledge-base answer',
          content: answer,
          sources: Array.isArray(payload?.sources) ? payload.sources : [],
          timestamp: formatTime()
        }
      ]);
    } catch (error) {
      const nextAssistantId = `assistant-${messageIdRef.current++}`;
      setMessages((prev) => [
        ...prev,
        {
          id: nextAssistantId,
          role: 'assistant',
          headline: 'Chatbot unavailable',
          content:
            error instanceof Error
              ? error.message
              : 'The chatbot request failed. Confirm the FastAPI server is running and reachable.',
          cues: ['Start FastAPI on port 8000', 'Check Vite proxy or REACT_APP_API_URL', 'Verify /chatbot returns JSON'],
          timestamp: formatTime()
        }
      ]);
    } finally {
      if (!isOpenRef.current && hasOpenedRef.current) {
        setUnreadCount((count) => count + 1);
      }
      setIsTyping(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitPrompt(draft);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitPrompt(draft);
    }
  };

  const toggleChat = () => {
    if (!isOpenRef.current) {
      setUnreadCount(0);
      if (!hasOpenedRef.current) {
        setHasOpened(true);
      }
    }
    setIsOpen((prev) => !prev);
    setShowWelcomeBubble(false);
  };

  return (
    <div
      className={`pointer-events-none fixed z-[70] transition-all duration-300 ease-out ${
        isExpanded && isOpen
          ? 'inset-3 md:inset-4'
          : 'bottom-4 right-4 md:bottom-6 md:right-6'
      }`}
    >
      <div
        className={`pointer-events-auto flex gap-3 ${
          isExpanded && isOpen ? 'h-full flex-col' : 'flex-col items-end'
        }`}
      >
        <div
          className={`origin-bottom-right flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[30px] border bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.18),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.97),rgba(2,6,23,0.98))] shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur-xl transition-all duration-300 ease-out ${
            isOpen
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100 border-white/10'
              : 'pointer-events-none translate-y-4 scale-95 opacity-0 border-white/0'
          } ${
            isExpanded
              ? 'h-full min-h-0 max-h-full w-full max-w-none'
              : 'max-h-[min(760px,calc(100vh-6.5rem))] max-w-[390px] md:max-h-[min(760px,calc(100vh-7.5rem))]'
          }`}
        >
            <div className="border-b border-white/10 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mt-1 text-base font-semibold tracking-[0.02em] text-white">NeuroGuide Assistant</p>
                  <p className="mt-1 text-xs text-slate-400">Ask about MRI findings, cognitive scores, and follow-up planning.</p>
                  <p className="mt-1 text-[11px] leading-5 text-amber-100/70">
                    Educational support only. MRI interpretation and clinical decisions still need a qualified clinician.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-300 transition hover:border-white/20 hover:bg-black/30 hover:text-white"
                    aria-label={isExpanded ? 'Shrink chat' : 'Expand chat'}
                  >
                    {isExpanded ? <Shrink size={14} /> : <Expand size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-300 transition hover:border-white/20 hover:bg-black/30 hover:text-white"
                    aria-label="Minimize chat"
                  >
                    <Minimize2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={messageViewportRef}
              className="min-h-[180px] min-w-0 flex-1 space-y-4 overflow-y-auto bg-black/20 px-4 py-4"
            >
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                    <Bot size={18} />
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.08] px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200 [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200 [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Suggested prompts</p>
                <p className="text-xs text-slate-500">{conversationCount} prompts</p>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitPrompt(prompt)}
                    className="group flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-left text-xs text-slate-200 transition hover:border-cyan-300/30 hover:bg-white/[0.08]"
                  >
                    <span className="max-w-[220px] truncate">{prompt}</span>
                    <ChevronRight size={14} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-100" />
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-3 py-2.5">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about MRI findings, MMSE, ADL, follow-up planning..."
                    rows={2}
                    className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-5 text-slate-100 outline-none placeholder:text-slate-500"
                  />

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 px-2 pt-3">
                    <p className="text-xs text-slate-500">Enter to send</p>
                    <button
                      type="submit"
                      disabled={!draft.trim() || isTyping}
                      className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#22d3ee,#d946ef)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <SendHorizonal size={15} />
                      Send
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

        {!isOpen && showWelcomeBubble && (
          <button
            type="button"
            onClick={toggleChat}
            className="max-w-[280px] rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] px-4 py-3 text-left shadow-[0_22px_50px_rgba(2,6,23,0.45)] backdrop-blur-xl transition duration-300 hover:border-cyan-300/40"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-300/12 text-cyan-100">
                <Sparkles size={14} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Need help reading the results?</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Ask about MRI classes, MMSE, ADL, or what to discuss with a neurologist.
                </p>
              </div>
            </div>
          </button>
        )}

        {!(isExpanded && isOpen) && (
          <button
            type="button"
            onClick={toggleChat}
            className="group relative flex items-center gap-3 rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-4 py-3 text-left shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl transition duration-300 hover:border-cyan-300/50 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_36px_rgba(34,211,238,0.24),0_24px_60px_rgba(2,6,23,0.45)]"
          >
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(217,70,239,0.16))]" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#22d3ee,#d946ef)] text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.3)]">
              {isOpen ? <X size={18} /> : <Bot size={18} />}
            </span>
            {!isOpen && unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-950 bg-rose-500 px-1.5 text-[11px] font-bold text-white shadow-[0_0_18px_rgba(244,63,94,0.55)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="relative hidden sm:block">
              <span className="block text-sm font-semibold text-white">Chat With Assistant</span>
              <span className="block text-xs text-slate-400">MRI and cognitive support</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
