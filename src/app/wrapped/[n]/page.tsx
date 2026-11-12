"use client";
import { use } from "react";
import { WrappedStory } from "@/features/Wrapped";

export default function WrappedPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = use(params);
  const num = parseInt(n, 10);
  return <WrappedStory n={Number.isFinite(num) && num >= 3 ? num : 3} />;
}
