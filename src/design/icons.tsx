// One icon set (Lucide). Manifests refer to icons by name; unknown names fall back to AppWindow.
import { AppWindow, Sparkles, Terminal, Folder, Code2, Languages, Menu, X, Minus, Square, Copy, Search, Command, Bell, Info, CheckCircle2, AlertTriangle, XCircle, Trash2, Settings, Activity, HelpCircle, ShieldCheck, PanelLeft, PanelRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = { AppWindow, Sparkles, Terminal, Folder, Code2, Languages, Menu, X, Minus, Square, Copy, Search, Command, Bell, Info, CheckCircle2, AlertTriangle, XCircle, Trash2, Settings, Activity, HelpCircle, ShieldCheck, PanelLeft, PanelRight };
export const getIcon = (name: string): LucideIcon => ICONS[name] ?? AppWindow;
export { Menu, X, Minus, Square, Copy, Languages, Search, Command, Bell, Info, CheckCircle2, AlertTriangle, XCircle, Trash2, PanelLeft, PanelRight };
