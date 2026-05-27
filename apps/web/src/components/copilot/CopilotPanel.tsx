// ============================================================
// VibeModerator OS — ModGPT Copilot Panel
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, RotateCcw, Copy } from 'lucide-react';
import { useCopilotStore, useSubredditStore } from '../../store';
import { copilotApi } from '../../lib/api';
import { formatRelativeTime } from '@vibemod/shared';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const QUICK_PROMPTS = [
  'Summarize the mod queue',
  'What rules should I add?',
  'Why was this post flagged?',
  'Generate a crypto spam rule',
  'Draft a modmail reply',
];

export function CopilotPanel() {
  const { isOpen, setOpen, messages, addMessage, sessionId, setSession, isLoading, setLoading, clearSession } = useCopilotStore();
  const { getActiveSubreddit } = useSubredditStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeSubreddit = getActiveSubreddit();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setInput('');
    setLoading(true);

    // Optimistically add user message
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    });

    try {
      const res = await copilotApi.chat(
        messageText,
        sessionId || undefined,
        activeSubreddit?.id,
        activeSubreddit ? { subredditName: activeSubreddit.name } : undefined
      );

      if (res.data.data) {
        if (!sessionId) setSession(res.data.data.sessionId);
        addMessage(res.data.data.message);
      }
    } catch {
      toast.error('ModGPT is unavailable. Check your API configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed right-0 top-0 h-screen w-[380px] z-50 flex flex-col border-l border-white/[0.06] bg-surface-950/95 backdrop-blur-xl"
          initial={{ x: 380 }}
          animate={{ x: 0 }}
          exit={{ x: 380 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">ModGPT</p>
                <p className="text-[10px] text-muted-foreground">AI Moderation Copilot</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearSession}
                className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Clear session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Context pill */}
          {activeSubreddit && (
            <div className="px-4 py-2 border-b border-white/[0.06]">
              <span className="badge badge-brand text-[10px]">
                Context: r/{activeSubreddit.name}
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">ModGPT is ready</p>
                <p className="text-xs text-muted-foreground mb-6">Ask about your subreddit, rules, queue, or moderation strategy.</p>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/08 text-xs text-muted-foreground hover:text-foreground hover:bg-white/8 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask ModGPT anything..."
                rows={1}
                className="flex-1 input-base resize-none min-h-[38px] max-h-32"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 128) + 'px';
                }}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Enter to send, Shift+Enter for new line
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({ message }: { message: { id: string; role: string; content: string; timestamp: Date } }) {
  const isUser = message.role === 'user';

  const copyContent = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Copied to clipboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex gap-2 items-start group', isUser && 'flex-row-reverse')}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      )}

      <div className={clsx('max-w-[85%] relative', isUser && 'items-end flex flex-col')}>
        <div
          className={clsx(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'gradient-brand text-white rounded-tr-sm'
              : 'glass-card text-foreground rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
        <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(new Date(message.timestamp))}
          </span>
          <button onClick={copyContent} className="text-muted-foreground hover:text-foreground transition-colors">
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
