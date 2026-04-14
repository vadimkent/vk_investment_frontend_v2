import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";

export function RowComponent({ component }: { component: SDUIComponent }) {
  const widths = component.props.widths as string[] | undefined;
  const shared = containerProps(component);

  const style = {
    display: "grid" as const,
    gridTemplateColumns: widths?.join(" ") ?? "1fr",
    ...shared.style,
  };

  const classes = [shared.className].filter(Boolean).join(" ");

  return (
    <div className={classes || undefined} style={style}>
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
