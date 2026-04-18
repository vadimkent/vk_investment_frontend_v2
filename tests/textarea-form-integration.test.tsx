import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TextareaComponent } from "@/components/base/Textarea";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

describe("Textarea + FormStateContext", () => {
  it("unmounts when visible_when evaluates false", () => {
    const { container } = render(
      <FormStateProvider initial={{ mode: "short" }}>
        <TextareaComponent
          component={{
            type: "textarea",
            id: "t",
            props: {
              name: "notes",
              visible_when: { field: "mode", op: "eq", value: "long" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('textarea[name="notes"]')).toBeNull();
  });

  it("publishes typed value so a visible_when that reads it can react", () => {
    const { container } = render(
      <FormStateProvider initial={{ notes: "" }}>
        <TextareaComponent
          component={{
            type: "textarea",
            id: "ta",
            props: { name: "notes" },
          }}
        />
        <InputComponent
          component={{
            type: "input",
            id: "flag",
            props: {
              name: "flag",
              visible_when: { field: "notes", op: "ne", value: "" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('input[name="flag"]')).toBeNull();
    const ta = container.querySelector(
      'textarea[name="notes"]',
    ) as HTMLTextAreaElement;
    fireEvent.input(ta, { target: { value: "anything" } });
    expect(container.querySelector('input[name="flag"]')).not.toBeNull();
  });
});
