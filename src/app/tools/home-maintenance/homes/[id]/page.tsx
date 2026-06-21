"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeManageRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tools/home-maintenance");
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-muted">
      Redirecting…
    </div>
  );
}
