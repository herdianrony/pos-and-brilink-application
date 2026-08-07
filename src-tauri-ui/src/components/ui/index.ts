/* ── Legacy exports (backward-compatible) ── */
export { Badge } from "./Badge";
export { Button } from "./Button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./Card";
export { EmptyState, Spinner } from "./EmptyState";
export { Field } from "./Field";
export { Input, Select } from "./Input";
export { Modal } from "./Modal";
export { PageHeader } from "./PageHeader";
export { DataPanel, SectionCard } from "./SectionCard";
export { StatCard } from "./StatCard";
export { Tabs, ChipTabs } from "./Tabs";

/* ── shadcn/ui primitives (for new code or incremental migration) ── */
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogEyebrow,
  DialogClose,
  DialogTrigger,
  type DialogSize,
} from "./shadcn/dialog";
export { Label } from "./shadcn/label";
export { Tabs as ShadcnTabs, TabsList, TabsTrigger, TabsContent } from "./shadcn/tabs";
export {
  Select as ShadcnSelect,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "./shadcn/select";
