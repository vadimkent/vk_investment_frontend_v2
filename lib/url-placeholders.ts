export function substitutePlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in values ? encodeURIComponent(values[name]) : match,
  );
}
