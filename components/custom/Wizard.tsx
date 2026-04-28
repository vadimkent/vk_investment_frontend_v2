"use client";

import { useMemo, useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import {
  FormStateProvider,
  useFormState,
} from "@/components/form-state-context";
import { collectInitialValues } from "@/lib/collect-initial-values";
import {
  collectFormData,
  hasInvalidFields,
  useActionDispatcher,
} from "@/components/action-dispatcher";
import type { SDUIAction } from "@/lib/types/sdui";
import { WizardStepIndicator } from "@/components/custom/WizardStepIndicator";
import { useOverrideMap } from "@/components/override-map-context";
import { useModal } from "@/components/modal-context";
import {
  WizardBanner,
  type WizardBannerProps,
} from "@/components/custom/WizardBanner";
import { WizardSummaryEntries } from "@/components/custom/WizardSummaryEntries";

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

  const [activeStepId, setActiveStepId] = useState<string | undefined>(
    initialStepId,
  );
  const [includeMap, setIncludeMap] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {};
    for (const s of steps) seed[s.id] = s.include_default;
    return seed;
  });
  const formCtx = useFormState();
  const dispatch = useActionDispatcher();
  const submitAction = component.props.submit_action as SDUIAction;
  const { setOverride, clearOverride } = useOverrideMap();
  const modal = useModal();
  const dismissAction = component.props.dismiss_action as SDUIAction & {
    tree?: SDUIComponent | null;
  };
  const banner = component.props.banner as WizardBannerProps | undefined;

  function setIncluded(id: string, value: boolean) {
    setIncludeMap((prev) =>
      prev[id] === value ? prev : { ...prev, [id]: value },
    );
  }

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
    if (activeIndex < steps.length - 1)
      setActiveStepId(steps[activeIndex + 1].id);
  }
  function skip() {
    if (!activeStep) return;
    setIncluded(activeStep.id, false);
    if (activeIndex < steps.length - 1)
      setActiveStepId(steps[activeIndex + 1].id);
  }
  function include() {
    if (!activeStep) return;
    if (!validateActiveStep()) return;
    setIncluded(activeStep.id, true);
    if (activeIndex < steps.length - 1)
      setActiveStepId(steps[activeIndex + 1].id);
  }
  // Semantically distinct from include() (edit mode on pre-existing entry) but
  // currently shares the same steps per spec §3.5. Kept separate so the two
  // can diverge without renaming call sites.
  function update() {
    if (!activeStep) return;
    if (!validateActiveStep()) return;
    setIncluded(activeStep.id, true);
    if (activeIndex < steps.length - 1)
      setActiveStepId(steps[activeIndex + 1].id);
  }
  async function submit() {
    const data: Record<string, unknown> = {};
    for (const s of steps) {
      if (s.kind === "summary") continue;
      if (s.kind === "entry" && !includeMap[s.id]) continue;
      Object.assign(data, collectFormData(`${wizardId}__step__${s.id}`));
    }
    if (!submitAction.endpoint || !submitAction.method) return;
    await dispatch(submitAction.endpoint, submitAction.method, data, {
      targetId: wizardId,
      loading: submitAction.loading,
    });
  }
  async function dismiss() {
    if (dismissAction.type === "dismiss") {
      modal?.close();
      return;
    }
    if (dismissAction.type === "replace" && dismissAction.target_id) {
      if (dismissAction.tree) {
        setOverride(dismissAction.target_id, dismissAction.tree);
      } else {
        clearOverride(dismissAction.target_id);
      }
      return;
    }
    if (dismissAction.endpoint && dismissAction.method) {
      await dispatch(dismissAction.endpoint, dismissAction.method);
    }
  }

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
      {banner && <WizardBanner banner={banner} />}
      {steps.map((step) => (
        <div
          key={step.id}
          data-step-id={step.id}
          data-sdui-id={`${wizardId}__step__${step.id}`}
          data-included={includeMap[step.id] ? "true" : "false"}
          hidden={step.id !== activeStepId}
        >
          {step.children.map((child) => (
            <ComponentRenderer key={child.id} component={child} />
          ))}
          {step.kind === "summary" && step.id === activeStepId && (
            <WizardSummaryEntries
              steps={steps}
              includeMap={includeMap}
              onEdit={goToStep}
            />
          )}
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
