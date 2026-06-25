// Shown only when NEXT_PUBLIC_SHOW_DEMO_NOTICE=true (e.g. Vercel preview builds).
// Hidden in production by default — do not add visible fallback text here.
export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_SHOW_DEMO_NOTICE !== "true") return null;

  return (
    <div className="w-full bg-[#FFF8E1] border-b border-[#F5E08A] px-5 py-[10px] text-center text-[13.5px] font-medium text-[#6B5800]">
      Preview mode: Opportunities are being reviewed before public launch.
    </div>
  );
}
