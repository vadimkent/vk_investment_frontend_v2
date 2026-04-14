"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { useRouter } from "next/navigation";
export function ErrorComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const hasRetry = component.props.retry_action === true;

  async function handleRetry() {
    const action = component.actions?.[0];
    if (!action) return;

    if (action.type === "reload" && action.endpoint) {
      await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: action.endpoint, method: "GET" }),
      });
      router.refresh();
    } else if (action.type === "refresh") {
      router.refresh();
    }
  }

  return (
    <div className="text-red-600 p-4 border border-red-200 rounded">
      <p>{String(component.props.message)}</p>
      {hasRetry && (
        <button
          onClick={handleRetry}
          className="mt-2 text-sm text-red-700 underline hover:text-red-900"
        >
          Retry
        </button>
      )}
    </div>
  );
}
