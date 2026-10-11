import { OPPORTUNITIES } from '@/data/opportunities';
import { productionFreshness } from '@/lib/production-freshness';
export const dynamic = 'force-static';
export const revalidate = false;
export function GET() {
  return Response.json(productionFreshness(OPPORTUNITIES, new Date().toISOString()), {
    headers: { 'Cache-Control': 'public, max-age=0, must-revalidate', 'X-Robots-Tag': 'noindex' },
  });
}
