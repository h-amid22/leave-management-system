"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Icon, type IconName } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { UserRole } from "@/generated/prisma/enums";
import type { AuthenticatedUser } from "@/lib/auth/types";

interface AppShellProps {
  user: AuthenticatedUser;
  children: ReactNode;
}

export interface NavigationItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const personalNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Overview", icon: "dashboard" },
  { href: "/leave", label: "My leave", icon: "calendar" },
  { href: "/leave/new", label: "Request leave", icon: "plus" },
];

export function getNavigationForRole(role: UserRole): NavigationItem[] {
  return getNavigationGroups(role).flatMap((group) => group.items);
}

export function getNavigationGroups(role: UserRole): NavigationGroup[] {
  if (role === "ADMIN") {
    return [
      { label: "Overview", items: [{ href: "/admin", label: "Admin overview", icon: "dashboard" }] },
      { label: "People", items: [
        { href: "/admin/employees", label: "Employees", icon: "users" },
        { href: "/admin/departments", label: "Departments", icon: "building" },
      ] },
      { label: "Leave", items: [
        { href: "/admin/policies", label: "Policies", icon: "file" },
        { href: "/admin/leave-types", label: "Leave types", icon: "tag" },
        { href: "/admin/balances", label: "Balances", icon: "chart" },
      ] },
      { label: "System", items: [
        { href: "/admin/audit", label: "Audit log", icon: "history" },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
      ] },
    ];
  }

  const workspace = [...personalNavigation];
  if (role === "MANAGER" || role === "HR") {
    workspace.push({ href: "/approvals", label: "Approvals", icon: "check" });
  }
  return [{ label: "Workspace", items: workspace }];
}

export function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  if (href === "/leave") {
    return pathname === href || (pathname.startsWith("/leave/") && pathname !== "/leave/new");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const navigationGroups = getNavigationGroups(user.role);
  const mobileNavigation = navigationGroups[0]?.items ?? [];
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (drawerOpen) drawerRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [drawerOpen]);

  function closeDrawer() {
    setDrawerOpen(false);
    window.setTimeout(() => drawerTriggerRef.current?.focus(), 0);
  }

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>("a, button") ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function renderNavigation(groups: NavigationGroup[], closeAfterNavigation = false) {
    return groups.map((group) => (
      <div className="nav-group" key={group.label}>
        <span className="nav-section-label">{group.label}</span>
        {group.items.map((item) => {
          const active = isNavigationItemActive(pathname, item.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={active ? "nav-link nav-link-active" : "nav-link"}
              href={item.href}
              key={item.href}
              onClick={closeAfterNavigation ? closeDrawer : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    ));
  }

  return (
    <div className={`${collapsed ? "app-shell app-shell-collapsed" : "app-shell"}${user.role === "ADMIN" ? " app-shell-admin" : ""}`}>
      <aside className="sidebar" aria-label="Workspace sidebar">
        <Link className="brand" href="/dashboard" aria-label="LeaveFlow home">
          <span className="brand-mark"><Icon name="calendar" /></span>
          <span className="brand-copy"><strong>LeaveFlow</strong><small>People workspace</small></span>
        </Link>

        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-toggle"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          <Icon name="menu" />
        </button>

        <nav className="side-nav" aria-label="Application navigation">
          {renderNavigation(navigationGroups)}
        </nav>

        <div className="sidebar-user">
          <UserAvatar name={user.name} />
          <span className="sidebar-user-copy">
            <strong>{user.name}</strong>
            <small>{user.role.toLowerCase()}</small>
          </span>
          <LogoutButton compact />
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div><span>{user.role === "ADMIN" ? "LeaveFlow" : "Employee leave"}</span><strong>{user.role === "ADMIN" ? "Administration" : user.role === "EMPLOYEE" ? "Personal workspace" : `${user.role.charAt(0)}${user.role.slice(1).toLowerCase()} workspace`}</strong></div>
          <div className="topbar-user"><span><strong>{user.name}</strong><small>{user.email}</small></span><UserAvatar name={user.name} size="small" /></div>
        </header>
        <header className="mobile-header">
          <Link className="brand" href="/dashboard">
            <span className="brand-mark"><Icon name="calendar" /></span>
            <span>LeaveFlow</span>
          </Link>
          <div className="mobile-header-actions">
            {user.role === "ADMIN" ? <button aria-controls="admin-navigation-drawer" aria-expanded={drawerOpen} aria-label="Open Admin navigation" className="mobile-menu-button" onClick={() => setDrawerOpen(true)} ref={drawerTriggerRef} type="button"><Icon name="menu" /></button> : null}
            <UserAvatar name={user.name} size="small" />
          </div>
        </header>
        {user.role === "ADMIN" && drawerOpen ? (
          <div className="navigation-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
            <div aria-label="Admin navigation" aria-modal="true" className="navigation-drawer" id="admin-navigation-drawer" onKeyDown={handleDrawerKeyDown} ref={drawerRef} role="dialog">
              <div className="navigation-drawer-header"><strong>Administration</strong><button aria-label="Close Admin navigation" className="mobile-menu-button" onClick={closeDrawer} type="button">×</button></div>
              <nav className="side-nav" aria-label="Admin mobile navigation">{renderNavigation(navigationGroups, true)}</nav>
            </div>
          </div>
        ) : null}
        <div className="page-container">{children}</div>
        {user.role !== "ADMIN" ? <nav className="mobile-nav" aria-label="Mobile navigation">
          {mobileNavigation.map((item) => (
            <Link
              aria-current={isNavigationItemActive(pathname, item.href) ? "page" : undefined}
              className={isNavigationItemActive(pathname, item.href) ? "mobile-nav-active" : ""}
              href={item.href}
              key={item.href}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav> : null}
      </div>
    </div>
  );
}
