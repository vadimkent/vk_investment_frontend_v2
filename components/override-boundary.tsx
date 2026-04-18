"use client";

import type { ReactNode } from "react";
import { useOverrideMap } from "@/components/override-map-context";
import { RawRenderer } from "@/components/renderer";

function SectionLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin h-5 w-5 border-2 border-accent-primary border-t-transparent rounded-full" />
    </div>
  );
}

export function OverrideBoundary({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { getOverride, isLoading } = useOverrideMap();
  const override = getOverride(id);
  const loading = isLoading(id);

  if (loading) return <SectionLoading />;

  const content = override ? <RawRenderer component={override} /> : children;
  return <>{content}</>;
}
