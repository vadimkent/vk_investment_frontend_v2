import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { collectFormData } from "@/components/action-dispatcher";

afterEach(() => cleanup());

function form(children: React.ReactNode) {
  return <div data-sdui-id="f1">{children}</div>;
}

describe("collectFormData — datetime-local conversion", () => {
  it("converts datetime-local value to RFC3339 (UTC ISO string)", () => {
    render(
      form(
        <input
          type="datetime-local"
          name="recorded_at"
          defaultValue="2026-04-27T22:15"
        />,
      ),
    );
    const data = collectFormData("f1");
    // The browser interprets "2026-04-27T22:15" as local time. toISOString
    // converts to UTC. Test in a tz-agnostic way: parse back, verify shape.
    const out = data.recorded_at as string;
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // And it must round-trip to the same instant.
    expect(new Date(out).getTime()).toBe(
      new Date("2026-04-27T22:15").getTime(),
    );
  });

  it("leaves an empty datetime-local value as empty string", () => {
    render(
      form(<input type="datetime-local" name="recorded_at" defaultValue="" />),
    );
    const data = collectFormData("f1");
    expect(data.recorded_at).toBe("");
  });

  it("does not touch text input values", () => {
    render(form(<input type="text" name="notes" defaultValue="hello" />));
    const data = collectFormData("f1");
    expect(data.notes).toBe("hello");
  });

  it("preserves checkbox booleans", () => {
    render(form(<input type="checkbox" name="agree" defaultChecked />));
    const data = collectFormData("f1");
    expect(data.agree).toBe(true);
  });
});
