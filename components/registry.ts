import type { ComponentType } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";

import { ScreenComponent } from "@/components/base/Screen";
import { RowComponent } from "@/components/base/Row";
import { ColumnComponent } from "@/components/base/Column";
import { GroupComponent } from "@/components/base/Group";
import { TextComponent } from "@/components/base/Text";
import { ImageComponent } from "@/components/base/Image";
import { ButtonComponent } from "@/components/base/Button";
import { CardComponent } from "@/components/base/Card";
import { ListComponent } from "@/components/base/List";
import { ListItemComponent } from "@/components/base/ListItem";
import { InputComponent } from "@/components/base/Input";
import { FormComponent } from "@/components/base/Form";
import { SelectComponent } from "@/components/base/Select";
import { CheckboxComponent } from "@/components/base/Checkbox";
import { ToggleComponent } from "@/components/base/Toggle";
import { TextareaComponent } from "@/components/base/Textarea";
import { RadioGroupComponent } from "@/components/base/RadioGroup";
import { DividerComponent } from "@/components/base/Divider";
import { SpacerComponent } from "@/components/base/Spacer";
import { LoadingComponent } from "@/components/base/Loading";
import { ErrorComponent } from "@/components/base/Error";
import { SnackbarComponent } from "@/components/base/Snackbar";
import { ModalComponent } from "@/components/base/Modal";
import { BadgeComponent } from "@/components/base/Badge";
import { NavHeaderComponent } from "@/components/base/NavHeader";
import { NavMainComponent } from "@/components/base/NavMain";
import { NavFooterComponent } from "@/components/base/NavFooter";
import { NavItemComponent } from "@/components/base/NavItem";
import { BottomBarComponent } from "@/components/base/BottomBar";
import { ContentSlotComponent } from "@/components/base/ContentSlot";
import { TableComponent } from "@/components/base/Table";
import { TableRowComponent } from "@/components/base/TableRow";
import { LineChartComponent } from "@/components/custom/LineChart";
import { PieChartComponent } from "@/components/custom/PieChart";

export type SDUIRenderer = ComponentType<{ component: SDUIComponent }>;

const registry: Record<string, SDUIRenderer> = {
  screen: ScreenComponent,
  row: RowComponent,
  column: ColumnComponent,
  group: GroupComponent,
  text: TextComponent,
  image: ImageComponent,
  button: ButtonComponent,
  card: CardComponent,
  list: ListComponent,
  list_item: ListItemComponent,
  input: InputComponent,
  form: FormComponent,
  select: SelectComponent,
  checkbox: CheckboxComponent,
  toggle: ToggleComponent,
  textarea: TextareaComponent,
  radio_group: RadioGroupComponent,
  divider: DividerComponent,
  spacer: SpacerComponent,
  loading: LoadingComponent,
  error: ErrorComponent,
  snackbar: SnackbarComponent,
  modal: ModalComponent,
  badge: BadgeComponent,
  nav_header: NavHeaderComponent,
  nav_main: NavMainComponent,
  nav_footer: NavFooterComponent,
  nav_item: NavItemComponent,
  bottombar: BottomBarComponent,
  content_slot: ContentSlotComponent,
  table: TableComponent,
  table_row: TableRowComponent,
  line_chart: LineChartComponent,
  pie_chart: PieChartComponent,
};

export function getComponent(type: string): SDUIRenderer | null {
  return registry[type] ?? null;
}

export function registerComponent(type: string, component: SDUIRenderer) {
  registry[type] = component;
}
