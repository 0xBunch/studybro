"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TutorPersona as Tutor } from "@/lib/persona-types";
import { renderNewsCardDataUrl } from "@/lib/newscard";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Concept {
  term: string;
  definition: string;
  category: string;
}

interface Props {
  tutor: Tutor;
  concepts: Concept[];
  weakConcepts: string[];
  studySetId: string;
}

const SUGGESTIONS_REGEX = /\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/;
const NEWSCARD_REGEX = /\[NEWSCARD:\s*([^|\]]+?)\s*\|\s*([^\]]+?)\s*\]/;

interface ParsedMessage {
  text: string;
  suggestions: string[];
  newsCard: { pun: string; desc: string } | null;
}

function parseMessage(content: string): ParsedMessage {
  const suggestMatch = content.match(SUGGESTIONS_REGEX);
  const suggestions = suggestMatch
    ? suggestMatch[1].split("|").map((s) => s.trim()).filter(Boolean)
    : [];

  const newsCardMatch = content.match(NEWSCARD_REGEX);
  const newsCard = newsCardMatch
    ? { pun: newsCardMatch[1].trim(), desc: newsCardMatch[2].trim() }
    : null;

  const text = content
    .replace(SUGGESTIONS_REGEX, "")
    .replace(NEWSCARD_REGEX, "")
    .trim();

  return { text, suggestions, newsCard };
}

function stripInProgressMarkers(content: string): string {
  // While streaming, strip any partial markers from view so the user never sees them
  return content
    .replace(/\[SUGGESTIONS\][\s\S]*/, "")
    .replace(/\[NEWSCARD:[\s\S]*/, "")
    .trim();
}

export function TutorChat({ tutor, concepts, weakConcepts, studySetId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useCallback(
    async (userMessage: string, currentMessages: Message[]) => {
      const newMessages: Message[] = userMessage
        ? [...currentMessages, { role: "user", content: userMessage }]
        : currentMessages;

      if (userMessage) {
        setMessages(newMessages);
      }

      setStreaming(true);
      setInput("");

      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages:
              newMessages.length > 0
                ? newMessages
                : [
                    {
                      role: "user",
                      content:
                        "Let's begin. Start by asking me a specific question about one of the concepts from my study material.",
                    },
                  ],
            concepts,
            weakConcepts,
            tutorId: tutor.id,
          }),
        });

        if (!res.ok) throw new Error("Chat request failed");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + parsed.text,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      } catch (err) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content:
                "I seem to have lost my train of thought. Could you try asking me again?",
            };
          }
          return updated;
        });
        console.error("Chat error:", err);
      }

      setStreaming(false);
      inputRef.current?.focus();
    },
    [concepts, weakConcepts, tutor.id]
  );

  // Auto-send greeting on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    sendMessage("", []);
  }, [sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    sendMessage(input.trim(), messages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const lastParsed =
    lastMessage?.role === "assistant" && !streaming
      ? parseMessage(lastMessage.content)
      : null;

  return (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 py-4">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const isStreamingThis =
            streaming && isLast && msg.role === "assistant";
          const parsed = parseMessage(msg.content);
          const visibleText = isStreamingThis
            ? stripInProgressMarkers(msg.content)
            : parsed.text;
          const showNewsCard = !isStreamingThis && parsed.newsCard;
          return (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] space-y-2",
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                {showNewsCard && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={renderNewsCardDataUrl({
                      pun: parsed.newsCard!.pun,
                      cartoonDesc: parsed.newsCard!.desc,
                    })}
                    alt={parsed.newsCard!.pun}
                    className="rounded-xl border w-full max-w-md shadow-sm"
                  />
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.role === "assistant" && (
                    <span className="text-xs font-medium opacity-60 block mb-1">
                      {tutor.name}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{visibleText}</p>
                  {streaming &&
                    isLast &&
                    msg.role === "assistant" && (
                      <span className="inline-block w-1.5 h-4 bg-current opacity-40 animate-pulse ml-0.5 align-text-bottom" />
                    )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Suggestion chips — only on the latest assistant message after streaming completes */}
        {lastParsed && lastParsed.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {lastParsed.suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => sendMessage(suggestion, messages)}
                disabled={streaming}
                className="rounded-full border bg-background px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.length === 0 && !streaming && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Starting session...
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t py-3 flex gap-2 items-end"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer..."
          disabled={streaming}
          rows={1}
          className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          style={{ minHeight: "40px", maxHeight: "120px" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "40px";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || streaming}
          className="shrink-0"
        >
          Send
        </Button>
      </form>
    </>
  );
}
