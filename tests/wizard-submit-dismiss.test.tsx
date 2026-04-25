import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { OverrideMapProvider } from "@/components/override-map-context";
import { SnackbarProvider } from "@/components/snackbar-provider";
import { ComponentRenderer } from "@/components/renderer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ action: "none" }),
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => cleanup());

function wrap(component: SDUIComponent) {
  return (
    <OverrideMapProvider>
      <SnackbarProvider>
        <ComponentRenderer component={component} />
      </SnackbarProvider>
    </OverrideMapProvider>
  );
}

function textChild(id: string, content: string): SDUIComponent {
  return { type: "text", id, props: { content } };
}
function inputChild(id: string, name: string, opts: Record<string, unknown> = {}): SDUIComponent {
  return { type: "input", id, props: { name, ...opts } };
}

function w(steps: SDUIComponent["props"]["steps"], extra: Record<string, unknown> = {}) {
  return {
    type: "wizard",
    id: "w1",
    props: {
      mode: "create",
      title: "T",
      submit_action: {
        trigger: "click",
        type: "submit",
        endpoint: "/actions/snapshots/create",
        method: "POST",
      },
      dismiss_action: {
        trigger: "click",
        type: "replace",
        target_id: "slot",
        tree: null,
      },
      steps,
      ...extra,
    },
  } as SDUIComponent;
}

describe("Wizard submit", () => {
  it("dispatches submit_action with collected info inputs only when no entries are included", async () => {
    const wiz = w([
      {
        id: "info",
        label: "Info",
        kind: "info",
        skippable: false,
        include_default: true,
        children: [inputChild("i1", "recorded_at", { default_value: "2026-04-22" })],
      },
      {
        id: "e1",
        label: "AAPL",
        kind: "entry",
        skippable: true,
        include_default: false,
        children: [inputChild("i2", "entries[a].mode", { default_value: "long" })],
      },
      {
        id: "summary",
        label: "Summary",
        kind: "summary",
        skippable: false,
        include_default: true,
        children: [textChild("t1", "Review")],
      },
    ]);
    const { getByText } = render(wrap(wiz));
    fireEvent.click(getByText("Summary"));
    fireEvent.click(getByText("Submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/action");
    const body = JSON.parse(call[1].body as string);
    expect(body.endpoint).toBe("/actions/snapshots/create");
    expect(body.method).toBe("POST");
    expect(body.data).toEqual({ recorded_at: "2026-04-22" });
    expect(body.data["entries[a].mode"]).toBeUndefined();
  });

  it("includes entry step inputs when included=true", async () => {
    const wiz = w([
      {
        id: "info",
        label: "Info",
        kind: "info",
        skippable: false,
        include_default: true,
        children: [inputChild("i1", "recorded_at", { default_value: "2026-04-22" })],
      },
      {
        id: "e1",
        label: "AAPL",
        kind: "entry",
        skippable: true,
        include_default: false,
        children: [inputChild("i2", "entries[a].mode", { default_value: "long" })],
      },
      {
        id: "summary",
        label: "Summary",
        kind: "summary",
        skippable: false,
        include_default: true,
        children: [textChild("t1", "Review")],
      },
    ]);
    const { getByText } = render(wrap(wiz));
    fireEvent.click(getByText("AAPL"));
    fireEvent.click(getByText("Include"));
    fireEvent.click(getByText("Submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.data).toEqual({
      recorded_at: "2026-04-22",
      "entries[a].mode": "long",
    });
  });

  it("skipping an entry leaves it out of the submit payload", async () => {
    const wiz = w([
      {
        id: "info",
        label: "Info",
        kind: "info",
        skippable: false,
        include_default: true,
        children: [inputChild("i1", "recorded_at", { default_value: "2026-04-22" })],
      },
      {
        id: "e1",
        label: "AAPL",
        kind: "entry",
        skippable: true,
        include_default: true,
        children: [inputChild("i2", "entries[a].mode", { default_value: "long" })],
      },
      {
        id: "summary",
        label: "Summary",
        kind: "summary",
        skippable: false,
        include_default: true,
        children: [textChild("t1", "Review")],
      },
    ]);
    const { getByText } = render(wrap(wiz));
    fireEvent.click(getByText("AAPL"));
    fireEvent.click(getByText("Skip"));
    fireEvent.click(getByText("Submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.data).toEqual({ recorded_at: "2026-04-22" });
  });
});
