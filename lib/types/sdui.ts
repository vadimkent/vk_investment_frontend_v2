export type SDUILoadingScope = "section" | "full";

export type SDUILoading =
  | SDUILoadingScope
  | { scope: SDUILoadingScope; messages?: string[] };

export interface SDUIAction {
  trigger: string;
  type: string;
  url?: string;
  target?: string;
  endpoint?: string;
  method?: string;
  target_id?: string;
  loading?: SDUILoading;
}

export interface SDUIComponent {
  type: string;
  id: string;
  props: Record<string, unknown>;
  children?: SDUIComponent[];
  actions?: SDUIAction[];
}

export interface SDUIActionResponse {
  action: "replace" | "navigate" | "refresh" | "none";
  target_id?: string;
  tree?: SDUIComponent;
  feedback?: SDUIComponent;
}
