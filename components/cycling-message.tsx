"use client";

import { useEffect, useState } from "react";

const ROTATE_MS = 4000;
const FADE_MS = 700;

export function CyclingMessage({
  messages,
  className,
}: {
  messages: string[];
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIdx(0);
    setVisible(true);
    if (messages.length <= 1) return;
    let swapTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setVisible(false);
      swapTimer = setTimeout(() => {
        setIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => {
      clearInterval(interval);
      if (swapTimer) clearTimeout(swapTimer);
    };
  }, [messages]);

  if (messages.length === 0) return null;
  return (
    <div
      className={`text-sm text-content-secondary transition-opacity duration-700 ease-in-out ${visible ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    >
      {messages[idx]}
    </div>
  );
}
