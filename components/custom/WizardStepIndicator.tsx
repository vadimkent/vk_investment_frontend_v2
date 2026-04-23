import type { WizardStep } from "@/components/custom/Wizard";

export function WizardStepIndicator({
  steps,
  activeStepId,
  onJump,
}: {
  steps: WizardStep[];
  activeStepId: string | undefined;
  onJump: (stepId: string) => void;
}) {
  const activeIndex = steps.findIndex((s) => s.id === activeStepId);
  const oneBased = activeIndex < 0 ? 1 : activeIndex + 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-content-secondary">
        Step {oneBased} of {steps.length}
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => {
          const isActive = step.id === activeStepId;
          const cls = isActive
            ? "px-3 py-1 rounded-full text-xs bg-surface-accent text-content-inverse font-medium"
            : "px-3 py-1 rounded-full text-xs border border-border text-content-secondary hover:bg-surface-secondary";
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onJump(step.id)}
              className={cls}
              aria-current={isActive ? "step" : undefined}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
