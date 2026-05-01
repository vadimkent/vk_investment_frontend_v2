"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOverrideMap } from "@/components/override-map-context";
import { useSnackbar } from "@/components/snackbar-provider";
import type { SDUILoading } from "@/lib/types/sdui";

type ActionResponse = {
  action: string;
  target_id?: string;
  tree?: import("@/lib/types/sdui").SDUIComponent;
  feedback?: import("@/lib/types/sdui").SDUIComponent;
  redirect?: string;
  auth_changed?: boolean;
  error?: string;
};

type DispatchOptions = {
  loading?: SDUILoading;
  targetId?: string;
};

function parseLoading(loading: SDUILoading | undefined): {
  scope: "section" | "full" | undefined;
  messages: string[];
} {
  if (!loading) return { scope: undefined, messages: [] };
  if (typeof loading === "string") return { scope: loading, messages: [] };
  return { scope: loading.scope, messages: loading.messages ?? [] };
}

import { stripScreens } from "@/lib/strip-screens";

export function collectFormData(targetId: string): Record<string, unknown> {
  const container = document.querySelector(`[data-sdui-id="${targetId}"]`);
  if (!container) return {};
  const data: Record<string, unknown> = {};
  container.querySelectorAll<HTMLInputElement>("input[name]").forEach((i) => {
    if (i.type === "checkbox") {
      data[i.name] = i.checked;
    } else if (i.type === "file") {
      const f = i.files?.[0];
      if (f) data[i.name] = f;
    } else if (i.dataset.sduiKind === "toggle") {
      data[i.name] = i.value === "true";
    } else if (i.type === "datetime-local" && i.value) {
      // Browser returns "YYYY-MM-DDTHH:mm" (local, no tz). BE expects RFC3339.
      // Date(...) interprets as local time; toISOString() emits UTC.
      const d = new Date(i.value);
      data[i.name] = isNaN(d.getTime()) ? i.value : d.toISOString();
    } else {
      data[i.name] = i.value;
    }
  });
  container
    .querySelectorAll<HTMLSelectElement>("select[name]")
    .forEach((s) => (data[s.name] = s.value));
  container
    .querySelectorAll<HTMLTextAreaElement>("textarea[name]")
    .forEach((t) => (data[t.name] = t.value));
  return data;
}

export function hasInvalidFields(targetId: string): boolean {
  const container = document.querySelector(`[data-sdui-id="${targetId}"]`);
  if (!container) return false;
  if (container.querySelector('[data-sdui-invalid="true"]')) return true;
  const nativeFields = container.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input[name]:not([type='hidden']), textarea[name], select[name]");
  for (const f of nativeFields) {
    if (!f.validity.valid) return true;
  }
  return false;
}

export function useActionDispatcher() {
  const router = useRouter();
  const { setOverride, setLoading, clearLoading } = useOverrideMap();
  const { show } = useSnackbar();

  return useCallback(
    async (
      endpoint: string,
      method: string,
      data?: Record<string, unknown>,
      options?: DispatchOptions,
    ): Promise<ActionResponse> => {
      const loadingTarget = options?.targetId;
      const { scope: loadingScope, messages: loadingMessages } = parseLoading(
        options?.loading,
      );

      if (loadingTarget && loadingScope) {
        setLoading(loadingTarget, loadingScope, loadingMessages);
      }

      const hasFile =
        !!data && Object.values(data).some((v) => v instanceof File);

      try {
        let response: Response;
        try {
          if (hasFile) {
            const fd = new FormData();
            fd.set("__endpoint", endpoint);
            fd.set("__method", method);
            for (const [k, v] of Object.entries(data!)) {
              if (v instanceof File) {
                fd.append(k, v, v.name);
              } else if (typeof v === "boolean") {
                fd.append(k, v ? "true" : "false");
              } else if (v != null) {
                fd.append(k, String(v));
              }
            }
            response = await fetch("/api/action-multipart", {
              method: "POST",
              body: fd,
            });
          } else {
            response = await fetch("/api/action", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint, method, data }),
            });
          }
        } catch {
          show("Algo falló, reintentá", "error");
          return { action: "none", error: "network" };
        }

        let body: ActionResponse;
        try {
          body = await response.json();
        } catch {
          show("Algo falló, reintentá", "error");
          return { action: "none", error: "parse" };
        }

        if (response.status === 401 && body.redirect) {
          window.location.href = stripScreens(body.redirect);
          return { action: "none" };
        }

        if (body.error || (!response.ok && response.status !== 401)) {
          show("Algo falló, reintentá", "error");
          if (!body.error) body.error = `http_${response.status}`;
        }

        if (body.feedback?.type === "snackbar") {
          const msg = body.feedback.props.message;
          const variant = body.feedback.props.variant;
          if (typeof msg === "string") {
            show(
              msg,
              variant === "success" ||
                variant === "error" ||
                variant === "warning" ||
                variant === "info"
                ? variant
                : "info",
            );
          }
        }

        switch (body.action) {
          case "navigate":
            if (body.target_id) {
              const url = stripScreens(body.target_id);
              if (body.auth_changed) {
                window.location.href = url;
              } else {
                router.push(url);
              }
            }
            break;
          case "logout":
            if (body.target_id) {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = stripScreens(body.target_id);
            }
            break;
          case "refresh":
            router.refresh();
            break;
          case "replace":
            if (body.target_id && body.tree)
              setOverride(body.target_id, body.tree);
            break;
        }

        return body;
      } finally {
        if (loadingTarget) {
          clearLoading(loadingTarget);
        }
      }
    },
    [router, setOverride, setLoading, clearLoading, show],
  );
}
