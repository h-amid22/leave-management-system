"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";

interface LogoutButtonProps {
  compact?: boolean;
}

export function LogoutButton({ compact = false }: LogoutButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function logout() {
    setIsSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <button
      className={compact ? "logout-button logout-button-compact" : "button button-secondary"}
      type="button"
      onClick={logout}
      disabled={isSubmitting}
      aria-label={compact ? "Sign out" : undefined}
    >
      {isSubmitting ? <span className="button-loader" aria-hidden="true" /> : compact ? <Icon name="logout" /> : "Sign out"}
    </button>
  );
}
