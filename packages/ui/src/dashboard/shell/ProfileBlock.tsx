import type { DashboardProfile } from "../types";

type ProfileBlockProps = {
  profile: DashboardProfile;
};

const statusClasses: Record<DashboardProfile["status"], string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-slate-400",
};

export function ProfileBlock({ profile }: ProfileBlockProps) {
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
      <div className="relative">
        <div className="h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-white/10">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
              {initials || "?"}
            </div>
          )}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${statusClasses[profile.status]}`}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{profile.name}</p>
        <p className="truncate text-xs text-slate-300">{profile.roleLabel}</p>
        <p className="truncate text-[11px] uppercase tracking-wide text-slate-400">
          {profile.company}
        </p>
      </div>
    </div>
  );
}
