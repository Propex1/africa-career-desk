"use client";

import { useState } from "react";
import Image from "next/image";

interface LogoContainerProps {
  company: string;
  initials: string;
  logoUrl?: string;
  // sm  = 62 px square  — Programmes, Open Applications
  // md  = 70 px mobile / 84 px desktop square  — Job cards (default)
  // lg  = 104 × 72 px  — Job detail page
  size?: "sm" | "md" | "lg";
}

export default function LogoContainer({
  company,
  initials,
  logoUrl,
  size = "md",
}: LogoContainerProps) {
  const [imgError, setImgError] = useState(false);

  const containerCls =
    size === "sm"
      ? "w-[62px] h-[62px] rounded-[15px]"
      : size === "lg"
      ? "w-[104px] h-[72px] rounded-[12px]"
      : "w-[70px] h-[70px] md:w-[84px] md:h-[84px] rounded-[14px]";

  const textCls =
    size === "sm"
      ? "text-[19px]"
      : size === "lg"
      ? "text-[15px]"
      : "text-[18px] md:text-[22px]";

  const imgSizes =
    size === "sm"
      ? "62px"
      : size === "lg"
      ? "104px"
      : "(max-width: 768px) 70px, 84px";

  // Intrinsic hint for Next.js image optimisation — use the largest display size
  const intrinsicW = size === "sm" ? 62 : size === "lg" ? 104 : 84;
  const intrinsicH = size === "sm" ? 62 : size === "lg" ? 72 : 84;

  return (
    <div
      className={`${containerCls} border border-[#ECEDE6] bg-acd-logo-bg flex items-center justify-center shrink-0 overflow-hidden font-serif font-semibold tracking-[0.3px] text-acd-green-mid`}
    >
      {logoUrl && !imgError ? (
        <Image
          src={logoUrl}
          alt={company}
          width={intrinsicW}
          height={intrinsicH}
          sizes={imgSizes}
          className="max-w-[84%] max-h-[76%] w-auto h-auto object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={textCls}>{initials}</span>
      )}
    </div>
  );
}
