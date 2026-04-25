import type { WizardStep } from "@/components/custom/Wizard";

export function WizardSummaryEntries({
  steps,
  includeMap,
  onEdit,
}: {
  steps: WizardStep[];
  includeMap: Record<string, boolean>;
  onEdit: (stepId: string) => void;
}) {
  const included = steps.filter(
    (s) => s.kind === "entry" && includeMap[s.id] === true,
  );

  return (
    <div
      data-wizard-summary-entries
      className="flex flex-col gap-1 mt-2 border-t border-border pt-2"
    >
      {included.map((s) => (
        <div
          key={s.id}
          data-wizard-summary-entry
          className="flex items-center justify-between text-sm"
        >
          <span>{s.label}</span>
          <button
            type="button"
            data-testid="wizard-summary-edit"
            onClick={() => onEdit(s.id)}
            className="text-content-accent hover:underline text-xs"
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}
