"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOverrideMap } from "@/components/override-map-context";
import { useSnackbar } from "@/components/snackbar-provider";

type ActionResponse = {
  action: string;
  target_id?: string;
  tree?: import("@/lib/types/sdui").SDUIComponent;
  redirect?: string;
  auth_changed?: boolean;
  error?: string;
};

type DispatchOptions = {
  loading?: "section" | "full";
  targetId?: string;
};

import { stripScreens } from "@/lib/strip-screens";

export function collectFormData(targetId: string): Record<string, unknown> {
  const container = document.querySelector(`[data-sdui-id="${targetId}"]`);
  if (!container) return {};
  const data: Record<string, unknown> = {};
  container.querySelectorAll<HTMLInputElement>("input[name]").forEach((i) => {
    if (i.type === "checkbox") {
      data[i.name] = i.checked;
    } else if (i.dataset.sduiKind === "toggle") {
      data[i.name] = i.value === "true";
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
  return !!container?.querySelector('[data-sdui-invalid="true"]');
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
      const loadingMode = options?.loading;

      if (loadingTarget && loadingMode) {
        setLoading(loadingTarget, loadingMode);
      }

      try {
        let response: Response;
        try {
          response = await fetch("/api/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint, method, data }),
          });
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
          router.push(stripScreens(body.redirect));
          return { action: "none" };
        }

        if (body.error || (!response.ok && response.status !== 401)) {
          show("Algo falló, reintentá", "error");
          if (!body.error) body.error = `http_${response.status}`;
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
