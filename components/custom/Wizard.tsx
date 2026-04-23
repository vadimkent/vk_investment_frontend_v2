"use client";

import { useMemo, useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { FormStateProvider } from "@/components/form-state-context";
import { collectInitialValues } from "@/lib/collect-initial-values";

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
  const title = component.props.title as string;
  const steps = (component.props.steps as WizardStep[] | undefined) ?? [];
  const initialStepId =
    (component.props.initial_step_id as string | undefined) ?? steps[0]?.id;

  const [activeStepId] = useState<string | undefined>(initialStepId);

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
      <div
        data-sdui-id={wizardId}
        data-sdui-form="true"
        className="flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
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
      </div>
    </FormStateProvider>
  );
}
