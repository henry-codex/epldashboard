"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PROFILE_PATH, SECURITY_PATH } from "@/lib/account-settings";
import { queryClient } from "@/utils/trpc";
import {
  IconChevronDown,
  IconLogout,
  IconSettings,
  IconUserCircle,
} from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { useHomePath } from "@/hooks/use-home-path";
import { userAvatarUrl } from "@/lib/user-avatar";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Tenant Admin",
  country_admin: "Country Manager",
  alumni_exec: "Alumni Exec",
  fellow: "Fellow",
  viewer: "Viewer",
};

type UserLike = { name?: string; email?: string; image?: string | null } | null | undefined;

function initialsFrom(user: UserLike) {
  const name = user?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return name.charAt(0).toUpperCase();
  }
  return user?.email?.charAt(0).toUpperCase() ?? "U";
}

function ProfileAvatar({
  user,
  size = "md",
  showStatus = false,
}: {
  user: UserLike;
  size?: "md" | "lg";
  showStatus?: boolean;
}) {
  const dim = size === "lg" ? 52 : 34;
  const avatarSrc = user ? userAvatarUrl(user, size === "lg" ? 160 : 96) : "";

  return (
    <span
      className={`epl-nav-profile-avatar epl-nav-profile-avatar-${size}`}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarSrc} alt="" />
      ) : (
        <span>{initialsFrom(user)}</span>
      )}
      {showStatus && <i className="epl-nav-profile-status" />}
    </span>
  );
}

export function NavProfileMenu({ user }: { user?: UserLike }) {
  const router = useRouter();
  const home = useHomePath();
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const profile = user ?? session?.user ?? null;
  const displayName = profile?.name?.trim() || "Admin";
  const email = profile?.email ?? "";
  const roleLabel = ROLE_LABEL[home.role ?? ""] ?? home.role ?? "Member";
  const settingsHref = PROFILE_PATH;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const hubLabel = useMemo(() => {
    if (home.tenant?.name) return home.tenant.name;
    return null;
  }, [home.tenant?.name]);

  async function handleSignOut() {
    setOpen(false);
    const result = await authClient.signOut();
    if (result.error) return;
    queryClient.clear();
    router.replace("/login");
  }

  if (!profile && !session) return null;

  return (
    <div className={`epl-nav-profile${open ? " epl-nav-profile-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="epl-nav-profile-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={displayName}
      >
        <ProfileAvatar user={profile} showStatus />
        <span className="epl-nav-profile-meta">
          <span className="epl-nav-profile-name">{displayName}</span>
          <span className="epl-nav-profile-role">{roleLabel}</span>
        </span>
        <IconChevronDown size={14} className="epl-nav-profile-chevron" />
      </button>

      {open && (
        <div className="epl-nav-profile-menu" role="menu">
          <div className="epl-nav-profile-menu-hero">
            <ProfileAvatar user={profile} size="lg" />
            <div className="epl-nav-profile-menu-copy">
              <strong>{displayName}</strong>
              <span>{email}</span>
              <em>{roleLabel}</em>
            </div>
          </div>

          {hubLabel && (
            <div className="epl-nav-profile-hub">
              <span>Country hub</span>
              <strong>{hubLabel}</strong>
            </div>
          )}

          <div className="epl-nav-profile-actions">
            <Link
              href={settingsHref as never}
              className="epl-nav-profile-action"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <IconUserCircle size={16} />
              My profile
            </Link>
            <Link
              href={SECURITY_PATH}
              className="epl-nav-profile-action"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <IconSettings size={16} />
              Security
            </Link>
            <button
              type="button"
              className="epl-nav-profile-action epl-nav-profile-action-danger"
              role="menuitem"
              onClick={handleSignOut}
            >
              <IconLogout size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
