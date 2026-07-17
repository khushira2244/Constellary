"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOutAction } from "@/app/(auth)/actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    const result = await signOutAction();
    if (result.ok) {
      router.replace("/login");
      router.refresh();
      return;
    }
    setPending(false);
  }

  return (
    <button className="sign-out" disabled={pending} onClick={signOut} type="button">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
