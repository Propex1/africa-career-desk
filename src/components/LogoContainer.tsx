"use client";

import { useState } from "react";
import Image from "next/image";
import { logoPresentation } from "./logo-presentation";

interface LogoContainerProps {
  company: string;
  initials: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
}

export default function LogoContainer({ company, initials, logoUrl, size = "md" }: LogoContainerProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const profile = logoUrl ? logoPresentation[logoUrl] : undefined;
  const src = profile?.src ?? logoUrl;
  const containerCls = size === "sm"
    ? "[--logo-w:90px] [--logo-h:64px] rounded-[13px]"
    : size === "lg"
    ? "[--logo-w:128px] [--logo-h:88px] rounded-[12px]"
    : "[--logo-w:80px] [--logo-h:64px] md:[--logo-w:104px] md:[--logo-h:84px] rounded-[13px] md:rounded-[14px]";
  const textCls = size === "sm" ? "text-[19px]" : size === "lg" ? "text-[20px]" : "text-[18px] md:text-[22px]";
  const frameCls = src === "/logos/bii.svg"
    ? "border-transparent bg-transparent"
    : src === "/logos/mtn.svg"
    ? "border-[#FFCB05] bg-[#FFCB05]"
    : src === "/logos/visa-wordmark.png"
    ? "border-[#1434CB] bg-[#1434CB]"
    : src === "/logos/ebrd.svg" || src === "/logos/ithmar-capital-official.png"
    ? "border-acd-navy bg-acd-navy"
    : "border-[#ECEDE6] bg-white";

  const [x, y, width, height] = profile?.bounds ?? [0, 0, 1, 1];
  const aspect = profile ? profile.width / profile.height : 1;
  // Fit the visible artwork, not its surrounding empty canvas. The full image
  // retains its proportions; only blank margins can extend beyond the frame.
  const imageStyle = profile ? {
    width: "min(calc(var(--logo-w) * " + (0.9 / width) + "), calc(var(--logo-h) * " + (0.82 * aspect / height) + "))",
    height: "auto",
    aspectRatio: String(aspect),
    maxWidth: "none",
    maxHeight: "none",
    transform: "translate(" + ((0.5 - x - width / 2) * 100) + "%, " + ((0.5 - y - height / 2) * 100) + "%)",
  } : undefined;
  // Request sufficient image resolution even for originals with large margins.
  const renderedWidth = Math.ceil(Math.min(128 * 0.9 / width, 88 * 0.82 * aspect / height));
  const intrinsicW = profile ? Math.min(profile.width, renderedWidth) : 128;
  const intrinsicH = profile ? Math.round(intrinsicW / aspect) : 88;

  return (
    <div className={containerCls + " w-[var(--logo-w)] h-[var(--logo-h)] border " + frameCls + " flex items-center justify-center shrink-0 overflow-hidden font-serif font-semibold tracking-[0.3px] text-acd-green-mid"}>
      {src && failedSrc !== src ? (
        <Image
          src={src}
          alt={company}
          width={intrinsicW}
          height={intrinsicH}
          sizes={renderedWidth + "px"}
          className="max-w-[90%] max-h-[82%] w-auto h-auto object-contain shrink-0"
          style={imageStyle}
          onError={() => setFailedSrc(src)}
        />
      ) : <span className={textCls}>{initials}</span>}
    </div>
  );
}
