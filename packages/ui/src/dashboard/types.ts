export type WidgetSize = "sm" | "md" | "lg" | "tall";

export type LayoutWidget = {
  id: string;
  type: string;
  sizePreset: WidgetSize;
};

export type ModuleLayout = {
  widgets: LayoutWidget[];
};

export type ModuleDef = {
  id: string;
  label: string;
  description?: string;
};

export type DashboardProfile = {
  name: string;
  roleLabel: string;
  company: string;
  avatarUrl?: string;
  status: "online" | "away" | "offline";
};

export type ModulesByRole = Record<string, ModuleDef[]>;
export type StandardLayoutsDef = Record<string, Record<string, ModuleLayout>>;

export type DashboardAppProps = {
  appId: string;
  profile: DashboardProfile;
  role: string;
  roleOptions: string[];
  modulesByRole: ModulesByRole;
  standardLayouts: StandardLayoutsDef;
  onRoleChange?: (role: string) => void;
};
