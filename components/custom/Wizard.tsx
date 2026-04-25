"use client";

import { useMemo, useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import {
  FormStateProvider,
  useFormState,
} from "@/components/form-state-context";
import { collectInitialValues } from "@/lib/collect-initial-values";
import { hasInvalidFields } from "@/components/action-dispatcher";
import { WizardStepIndicator } from "@/components/custom/WizardStepIndicator";

export type WizardStep = {
  id: string;
  label: string;
  kind: "info" | "entry" | "summary";
  skippable: boolean;
  include_default: boolean;
  children: SDUIComponent[];
};

export function WizardComponent({ component }: { component: SDUIComponent }) {
  const wizardId = component.id;
  const steps = (component.props.steps as WizardStep[] | undefined) ?? [];

  const initial = useMemo(() => {
    const allChildren: SDUIComponent[] = steps.flatMap((s) => s.children);
    return collectInitialValues({
      type: "wizard_root",
      id: `${wizardId}__root`,
      props: {},
      children: allChildren,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardId]);

  return (
    <FormStateProvider initial={initial}>
      <WizardInner component={component} />
    </FormStateProvider>
  );
}

function WizardInner({ component }: { component: SDUIComponent }) {
  const wizardId = component.id;
  const title = component.props.title as string;
  const steps = (component.props.steps as WizardStep[] | undefined) ?? [];
  const initialStepId =
    (component.props.initial_step_id as string | undefined) ?? steps[0]?.id;

  const [activeStepId, setActiveStepId] = useState<string | undefined>(initialStepId);
  const formCtx = useFormState();

  const activeIndex = steps.findIndex((s) => s.id === activeStepId);
  const activeStep: WizardStep | undefined = steps[activeIndex];

  function validateActiveStep(): boolean {
    if (!activeStep) return true;
    const containerId = `${wizardId}__step__${activeStep.id}`;
    if (!hasInvalidFields(containerId)) return true;
    formCtx?.triggerRevealErrors();
    const container = document.querySelector(`[data-sdui-id="${containerId}"]`);
    if (container) {
      const fields = container.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input[name]:not([type='hidden']), textarea[name], select[name]");
      for (const f of fields) {
        f.dispatchEvent(new Event("input", { bubbles: true }));
        f.dispatchEvent(new Event("blur", { bubbles: true }));
      }
      const firstInvalid =
        container.querySelector<HTMLElement>('[data-sdui-invalid="true"]') ??
        container.querySelector<HTMLElement>(
          "input[name]:not([type='hidden']):invalid, textarea[name]:invalid, select[name]:invalid",
        );
      firstInvalid?.focus();
    }
    return false;
  }

  function goToStep(id: string) {
    setActiveStepId(id);
  }
  function goBack() {
    if (activeIndex > 0) setActiveStepId(steps[activeIndex - 1].id);
  }
  function goNext() {
    if (!validateActiveStep()) return;
    if (activeIndex < steps.length - 1) setActiveStepId(steps[activeIndex + 1].id);
  }
  function skip() {
    if (activeIndex < steps.length - 1) setActiveStepId(steps[activeIndex + 1].id);
  }
  function include() {
    if (!validateActiveStep()) return;
    if (activeIndex < steps.length - 1) setActiveStepId(steps[activeIndex + 1].id);
  }
  function update() {
    if (!validateActiveStep()) return;
    if (activeIndex < steps.length - 1) setActiveStepId(steps[activeIndex + 1].id);
  }
  function submit() {}
  function dismiss() {}

  return (
    <div
      data-sdui-id={wizardId}
      data-sdui-form="true"
      className="flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <WizardStepIndicator
        steps={steps}
        activeStepId={activeStepId}
        onJump={goToStep}
      />
      {steps.map((step) => (
        <div
          key={step.id}
          data-step-id={step.id}
          data-sdui-id={`${wizardId}__step__${step.id}`}
          hidden={step.id !== activeStepId}
        >
          {step.children.map((child) => (
            <ComponentRenderer key={child.id} component={child} />
          ))}
        </div>
      ))}
      {activeStep && (
        <WizardButtonRow
          step={activeStep}
          isFirst={activeIndex === 0}
          onBack={goBack}
          onNext={goNext}
          onSkip={skip}
          onInclude={include}
          onUpdate={update}
          onSubmit={submit}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}

function WizardButtonRow({
  step,
  isFirst,
  onBack,
  onNext,
  onSkip,
  onInclude,
  onUpdate,
  onSubmit,
  onDismiss,
}: {
  step: WizardStep;
  isFirst: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onInclude: () => void;
  onUpdate: () => void;
  onSubmit: () => void;
  onDismiss: () => void;
}) {
  const buttons: { label: string; onClick: () => void; primary?: boolean }[] = [
    { label: "Dismiss", onClick: onDismiss },
  ];

  if (!isFirst && step.kind !== "info") {
    buttons.push({ label: "Back", onClick: onBack });
  }

  if (step.kind === "info") {
    buttons.push({ label: "Next", onClick: onNext, primary: true });
  } else if (step.kind === "entry") {
    if (step.skippable) {
      buttons.push({ label: "Skip", onClick: onSkip });
      buttons.push({ label: "Include", onClick: onInclude, primary: true });
    } else {
      buttons.push({ label: "Update", onClick: onUpdate, primary: true });
    }
  } else if (step.kind === "summary") {
    buttons.push({ label: "Submit", onClick: onSubmit, primary: true });
  }

  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-border">
      {buttons.map((b) => {
        const cls = b.primary
          ? "px-4 py-2 rounded bg-surface-accent text-content-inverse text-sm font-medium hover:opacity-90"
          : "px-4 py-2 rounded border border-border text-sm hover:bg-surface-secondary";
        return (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            className={cls}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}
