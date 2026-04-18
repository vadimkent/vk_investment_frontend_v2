import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FormComponent } from "@/components/base/Form";
import type { SDUIComponent } from "@/lib/types/sdui";

describe("FormComponent renders its children as an SDUI form", () => {
  it("renders an input child with its default_value", () => {
    const tree: SDUIComponent = {
      type: "form",
      id: "f",
      props: {},
      children: [
        {
          type: "input",
          id: "ticker-input",
          props: { name: "ticker", default_value: "AAPL" },
        },
      ],
    };
    const { container } = render(<FormComponent component={tree} />);
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("AAPL");
  });
});
