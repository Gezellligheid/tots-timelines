import { Suspense } from "react";
import { notFound } from "next/navigation";
import { WrappedDemo } from "@/features/WrappedDemo";

// Development only: this page does not exist in production builds.
export default function WrappedDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <WrappedDemo />
    </Suspense>
  );
}
