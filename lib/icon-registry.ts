import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

const iconRegistry: Record<string, LucideIcon> = {
  alert_circle: AlertCircle,
  alert_triangle: AlertTriangle,
  brain: BrainCircuit,
  check: Check,
  chevron_down: ChevronDown,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  chevron_up: ChevronUp,
  close: X,
  delete: Trash2,
  download: Download,
  edit: Pencil,
  eye: Eye,
  eye_off: EyeOff,
  loading: Loader2,
  plus: Plus,
  radio: Radio,
  refresh: RefreshCw,
  reset: RotateCcw,
  send: Send,
  trash: Trash2,
  upload: Upload,
};

export function getIcon(name: string): LucideIcon | null {
  const normalized = name.replace(/-/g, "_");
  return iconRegistry[normalized] ?? iconRegistry[name] ?? null;
}
