"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 no-underline text-[14.5px] text-acd-dim hover:text-acd-green transition-colors mb-[30px] bg-transparent border-none cursor-pointer p-0"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      Back to jobs
    </button>
  );
}
