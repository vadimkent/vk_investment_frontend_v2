"use client";

import { useEffect } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { useRouter } from "next/navigation";
import { stripScreens } from "@/lib/strip-screens";

const NAV_SLOT_TYPES = new Set([
  "nav_header",
  "nav_main",
  "nav_footer",
  "bottombar",
]);

function isNavSlot(child: SDUIComponent): boolean {
  return NAV_SLOT_TYPES.has(child.type);
}

function SidebarLayout({ component }: { component: SDUIComponent }) {
  const navChildren = component.children?.filter((c) => isNavSlot(c)) ?? [];
  const contentChildren =
    component.children?.filter((c) => !isNavSlot(c)) ?? [];

  return (
    <div
      className="min-h-screen"
      style={{ display: "grid", gridTemplateColumns: "240px 1fr" }}
    >
      <div className="flex flex-col border-r border-border bg-surface-primary h-screen sticky top-0 overflow-y-auto">
        {navChildren.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
      <div className="flex flex-col min-h-screen [&>*:only-child]:flex-1">
        {contentChildren.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </div>
  );
}

function BottombarLayout({ component }: { component: SDUIComponent }) {
  const bottombar = component.children?.find((c) => c.type === "bottombar");
  const navHeader = component.children?.find((c) => c.type === "nav_header");
  const rest =
    component.children?.filter(
      (c) => c.type !== "bottombar" && c.type !== "nav_header",
    ) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      {navHeader && <ComponentRenderer component={navHeader} />}
      <div className="flex-1 flex flex-col [&>*:only-child]:flex-1">
        {rest.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
      {bottombar && <ComponentRenderer component={bottombar} />}
    </div>
  );
}

function HeaderFooterLayout({ component }: { component: SDUIComponent }) {
  const navHeader = component.children?.find((c) => c.type === "nav_header");
  const navMain = component.children?.find((c) => c.type === "nav_main");
  const navFooter = component.children?.find((c) => c.type === "nav_footer");
  const contentChildren =
    component.children?.filter((c) => !isNavSlot(c)) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      {navHeader && (
        <div className="border-b border-border bg-surface-primary">
          <ComponentRenderer component={navHeader} />
          {navMain && <ComponentRenderer component={navMain} />}
        </div>
      )}
      <div className="flex-1 flex flex-col [&>*:only-child]:flex-1">
        {contentChildren.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
      {navFooter && (
        <div className="border-t border-border bg-surface-primary">
          <ComponentRenderer component={navFooter} />
        </div>
      )}
    </div>
  );
}

function HeaderOnlyLayout({ component }: { component: SDUIComponent }) {
  const navHeader = component.children?.find((c) => c.type === "nav_header");
  const navMain = component.children?.find((c) => c.type === "nav_main");
  const contentChildren =
    component.children?.filter((c) => !isNavSlot(c)) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      {navHeader && (
        <div className="border-b border-border bg-surface-primary">
          <ComponentRenderer component={navHeader} />
          {navMain && <ComponentRenderer component={navMain} />}
        </div>
      )}
      <div className="flex-1 flex flex-col [&>*:only-child]:flex-1">
        {contentChildren.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </div>
  );
}

function DefaultLayout({ component }: { component: SDUIComponent }) {
  const hasBackAction = component.props.back_action === true;
  const subtitle = component.props.subtitle as string | undefined;
  const icon = component.props.icon as string | undefined;
  const router = useRouter();
  const hasHeader = hasBackAction || icon || subtitle;

  function handleBack() {
    const action = component.actions?.[0];
    if (action && action.type === "navigate_back") {
      router.back();
    } else if (action && action.type === "navigate" && action.url) {
      router.push(stripScreens(action.url));
    } else {
      router.back();
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {hasHeader && (
        <div className="p-4">
          <div className="flex items-center gap-3">
            {hasBackAction && (
              <button
                onClick={handleBack}
                className="text-content-secondary hover:text-content-primary"
              >
                <span className="text-xl">&larr;</span>
              </button>
            )}
            {icon && <span className="text-2xl">{icon}</span>}
            {subtitle && (
              <p className="text-sm text-content-muted">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col [&>*:only-child]:flex-1">
        {component.children?.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </div>
  );
}

export function ScreenComponent({ component }: { component: SDUIComponent }) {
  const title = component.props.title as string | undefined;
  const navType = component.props.nav_type as string | undefined;

  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  switch (navType) {
    case "sidebar":
      return <SidebarLayout component={component} />;
    case "bottombar":
      return <BottombarLayout component={component} />;
    case "header_footer":
      return <HeaderFooterLayout component={component} />;
    case "header_only":
      return <HeaderOnlyLayout component={component} />;
    default:
      return <DefaultLayout component={component} />;
  }
}
