import type { ReactNode } from "react";
import { placeholderStaticParams } from "@/app/static-export-params";

export function generateStaticParams() {
  return placeholderStaticParams();
}

export default function RoomDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
