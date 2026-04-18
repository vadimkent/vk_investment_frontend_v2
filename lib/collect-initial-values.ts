import type { SDUIComponent } from "@/lib/types/sdui";

const FORM_FIELD_TYPES = new Set([
  "input",
  "select",
  "checkbox",
  "textarea",
  "radio_group",
]);

export function collectInitialValues(
  component: SDUIComponent,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  walk(component, out);
  return out;
}

function walk(node: SDUIComponent, out: Record<string, unknown>): void {
  if (FORM_FIELD_TYPES.has(node.type)) {
    const name = node.props.name as string | undefined;
    if (name) {
      out[name] = readDefault(node);
    }
  }
  if (node.children) {
    for (const child of node.children) walk(child, out);
  }
}

function readDefault(node: SDUIComponent): unknown {
  switch (node.type) {
    case "checkbox":
      return node.props.checked === true;
    case "input":
    case "textarea":
    case "select":
    case "radio_group":
      return (node.props.default_value as string | undefined) ?? "";
    default:
      return undefined;
  }
}
