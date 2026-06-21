"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TaskDetailRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace("/tools/home-maintenance/schedule");
  }, [params.id, router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-muted">
      Opening schedule…
    </div>
  );
}
