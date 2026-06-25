import type { Opportunity } from "@/types";
import LogoContainer from "./LogoContainer";

interface OpenAppCardProps {
  item: Opportunity;
}

export default function OpenAppCard({ item }: OpenAppCardProps) {
  return (
    <div className="bg-white border border-acd-border rounded-[18px] p-[26px] flex flex-col transition-[border-color,box-shadow] duration-[180ms] hover:border-acd-border-hover hover:shadow-[0_8px_28px_-16px_rgba(20,43,63,0.22)]">
      <div className="flex items-start gap-4">
        <LogoContainer
          company={item.company}
          initials={item.companyInitials}
          logoUrl={item.logoUrl}
          size="sm"
        />
        <div>
          <p className="m-0 font-serif font-semibold text-[19px] text-acd-navy">
            {item.title}
          </p>
          <p className="m-0 mt-[5px] text-[13.5px] text-acd-dim">
            {item.locationDisplay}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="bg-acd-verified-bg text-acd-green-mid text-[12.5px] font-semibold px-3 py-[6px] rounded-full">
          {item.roleType}
        </span>
        {item.region && (
          <span className="bg-[#F2F2EC] text-[#566169] text-[12.5px] font-medium px-3 py-[6px] rounded-full">
            {item.region}
          </span>
        )}
      </div>

      <p className="mt-4 text-[14.5px] leading-relaxed text-acd-green-body flex-1">
        {item.summary}
      </p>

      <a
        href={item.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-white text-acd-green border-[1.5px] border-acd-border-hover rounded-[11px] px-[13px] py-3 text-[14.5px] font-semibold hover:bg-acd-green hover:text-white hover:border-acd-green transition-colors duration-150 no-underline"
      >
        {item.applyButtonText}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17L17 7M9 7h8v8" />
        </svg>
      </a>
    </div>
  );
}
