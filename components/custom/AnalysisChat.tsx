"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SDUIAction, SDUIComponent } from "@/lib/types/sdui";
import { useActionDispatcher } from "@/components/action-dispatcher";
import { substitutePlaceholders } from "@/lib/url-placeholders";
import { parseSSE } from "@/lib/sse-parser";
import { getIcon } from "@/lib/icon-registry";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const DEFAULT_MAX_INPUT = 2000;
const COUNTER_THRESHOLD = 0.75;
const MAX_TEXTAREA_ROWS = 4;

function buildProxyUrl(
  middleendPath: string,
  method: "GET" | "POST",
): { url: string; method: "GET" | "POST" } {
  return {
    url: `/api/action-stream?url=${encodeURIComponent(middleendPath)}`,
    method,
  };
}

export function AnalysisChatComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const initialEndpoint = String(component.props.initial_endpoint);
  const followupEndpoint = String(component.props.followup_endpoint);
  const placeholder = String(component.props.placeholder);
  const submitLabel = String(component.props.submit_label);
  const streamingLabel = component.props.streaming_label as string | undefined;
  const maxInputLength =
    (component.props.max_input_length as number | undefined) ??
    DEFAULT_MAX_INPUT;
  const errorMessages = (component.props.error_messages ?? {}) as Record<
    string,
    string
  >;
  const terminalErrorCodes = (component.props.terminal_error_codes ??
    []) as string[];
  const terminalCtaLabel = String(component.props.terminal_cta_label);
  const resetAction = component.props.reset_action as SDUIAction | undefined;

  const dispatch = useActionDispatcher();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTerminal, setIsTerminal] = useState(false);
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const followBottomRef = useRef<boolean>(true);

  const SendIcon = getIcon("send");

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    followBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
  }

  function resolveErrorMessage(code: string): string {
    return errorMessages[code] ?? errorMessages["default"] ?? code;
  }

  function appendDelta(text: string) {
    setMessages((prev) => {
      if (prev.length === 0 || prev[prev.length - 1].role !== "assistant") {
        return [...prev, { role: "assistant", content: text }];
      }
      const next = prev.slice();
      const last = next[next.length - 1];
      next[next.length - 1] = { role: "assistant", content: last.content + text };
      return next;
    });
  }

  function dropEmptyAssistantPlaceholder() {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role === "assistant" && last.content === "") {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }

  async function openStream(
    middleendPath: string,
    method: "GET" | "POST",
    body?: string,
  ) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { url } = buildProxyUrl(middleendPath, method);

    setIsStreaming(true);
    setError(null);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: body
          ? { "Content-Type": "application/json" }
          : undefined,
        body,
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) return;
      handleStreamError("INTERNAL_ERROR");
      return;
    }

    if (!response.ok || !response.body) {
      handleStreamError("INTERNAL_ERROR");
      return;
    }

    try {
      for await (const msg of parseSSE(response.body)) {
        let payload: unknown;
        try {
          payload = JSON.parse(msg.data);
        } catch {
          continue;
        }
        switch (msg.event) {
          case "session": {
            const id = (payload as { session_id?: string })?.session_id;
            if (typeof id === "string") {
              sessionIdRef.current = id;
            }
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant" && last.content === "") {
                return prev;
              }
              return [...prev, { role: "assistant", content: "" }];
            });
            break;
          }
          case "delta": {
            const text = (payload as { text?: string })?.text;
            if (typeof text === "string" && text !== "") {
              appendDelta(text);
              if (followBottomRef.current) {
                requestAnimationFrame(scrollToBottom);
              }
            }
            break;
          }
          case "done": {
            setIsStreaming(false);
            return;
          }
          case "error": {
            const code = (payload as { code?: string })?.code ?? "INTERNAL_ERROR";
            handleStreamError(code);
            return;
          }
        }
      }
      setIsStreaming(false);
    } catch (e) {
      if (controller.signal.aborted) return;
      handleStreamError("INTERNAL_ERROR");
    }
  }

  function handleStreamError(code: string) {
    dropEmptyAssistantPlaceholder();
    setIsStreaming(false);
    setError(resolveErrorMessage(code));
    if (terminalErrorCodes.includes(code)) {
      setIsTerminal(true);
    }
  }

  useEffect(() => {
    void openStream(initialEndpoint, "GET");
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (followBottomRef.current) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20");
    const maxHeight = lineHeight * MAX_TEXTAREA_ROWS;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  useEffect(() => {
    autoResize();
  }, [input]);

  function canSend(): boolean {
    if (isStreaming || isTerminal) return false;
    const trimmed = input.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > maxInputLength) return false;
    if (!sessionIdRef.current) return false;
    return true;
  }

  function send() {
    if (!canSend()) return;
    const content = input.trim();
    setInput("");
    followBottomRef.current = true;
    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    const resolved = substitutePlaceholders(followupEndpoint, {
      session_id: sessionIdRef.current ?? "",
    });
    void openStream(resolved, "POST", JSON.stringify({ content }));
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  }

  async function onTerminalCta() {
    if (!resetAction || !resetAction.endpoint || !resetAction.method) return;
    await dispatch(resetAction.endpoint, resetAction.method, undefined, {
      loading: resetAction.loading,
      targetId: resetAction.target_id,
    });
  }

  const inputDisabled = isTerminal;
  const sendDisabled = !canSend();
  const counterShown =
    input.length >= Math.floor(maxInputLength * COUNTER_THRESHOLD);
  const counterOver = input.length > maxInputLength;

  return (
    <div
      data-sdui-id={component.id}
      className="flex flex-col flex-1 min-h-0"
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto max-w-3xl flex flex-col gap-4">
          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            const showCursor =
              isStreaming && isLast && m.role === "assistant";
            if (m.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-accent-primary text-content-on-accent px-4 py-2 whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex">
                <div className="prose prose-sm dark:prose-invert max-w-none text-content-primary prose-strong:text-content-primary prose-headings:text-content-primary prose-h2:text-base prose-h3:text-sm prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-border prose-th:bg-surface-muted prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-th:font-medium prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5 prose-li:my-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                  {showCursor && (
                    <span className="inline-flex items-center gap-2 align-middle">
                      <span className="inline-block w-1.5 h-4 bg-accent-primary animate-pulse" />
                      {streamingLabel && (
                        <span className="text-xs text-content-muted">
                          {streamingLabel}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="border-t border-border px-4 py-3">
          <div className="mx-auto max-w-3xl rounded border border-status-error bg-status-error-surface px-3 py-2 text-sm text-status-error">
            {error}
          </div>
          {isTerminal && resetAction && (
            <div className="mx-auto max-w-3xl mt-2">
              <button
                onClick={onTerminalCta}
                className="text-sm px-3 py-1.5 rounded bg-accent-primary text-content-on-accent"
              >
                {terminalCtaLabel}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                disabled={inputDisabled}
                rows={1}
                className="w-full resize-none bg-transparent text-sm text-content-primary placeholder:text-content-muted border border-border-input rounded px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {counterShown && (
                <div
                  className={`absolute bottom-1 right-2 text-xs ${
                    counterOver ? "text-status-error" : "text-content-muted"
                  }`}
                >
                  {input.length} / {maxInputLength}
                </div>
              )}
            </div>
            <button
              onClick={send}
              disabled={sendDisabled}
              aria-label={submitLabel}
              className="p-2 rounded bg-accent-primary text-content-on-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {SendIcon ? <SendIcon className="w-4 h-4" /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
