"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyUnitEditorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tools/room-coat");
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-muted">
      Redirecting…
    </div>
  );
}
