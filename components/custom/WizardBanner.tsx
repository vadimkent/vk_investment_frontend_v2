"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type WizardBannerProps = {
  variant: "info" | "success" | "warning" | "error";
  message: string;
  title?: string;
  dismissible?: boolean;
};

const variantClass: Record<WizardBannerProps["variant"], string> = {
  info: "bg-accent-primary/10 border-accent-primary/40 text-content-primary",
  success: "bg-status-success/10 border-status-success/40 text-content-primary",
  warning: "bg-status-warning/10 border-status-warning/40 text-content-primary",
  error: "bg-status-error/10 border-status-error/40 text-content-primary",
};

export function WizardBanner({ banner }: { banner: WizardBannerProps }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const cls = `relative rounded border px-4 py-3 text-sm ${variantClass[banner.variant]}`;
  return (
    <div data-wizard-banner data-variant={banner.variant} className={cls}>
      {banner.title && (
        <span className="font-semibold mr-2">{banner.title}</span>
      )}
      <span>{banner.message}</span>
      {banner.dismissible && (
        <button
          type="button"
          data-wizard-banner-close
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-content-secondary hover:text-content-primary"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
