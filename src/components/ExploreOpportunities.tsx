import Link from "next/link";
import { ENABLED_JOB_CATEGORY_PAGES } from "../data/job-categories";
import { ENABLED_JOB_COUNTRY_PAGES } from "../data/job-countries";

const linkClassName = "inline-flex min-h-11 items-center rounded-sm text-[13px] font-medium text-acd-green underline decoration-acd-border-hover underline-offset-4 hover:decoration-acd-green focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acd-green";

export default function ExploreOpportunities() {
  return (
    <aside aria-labelledby="explore-opportunities-heading" className="my-2 border-y border-acd-border py-4">
      <h2 id="explore-opportunities-heading" className="m-0 font-serif text-[19px] font-medium text-acd-navy">
        Explore opportunities
      </h2>
      <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
        <div>
          <h3 className="m-0 text-[12px] font-medium text-acd-muted">By focus</h3>
          <ul className="m-0 flex list-none flex-wrap gap-x-5 p-0">
            {ENABLED_JOB_CATEGORY_PAGES.map((category) => (
              <li key={category.slug}>
                <Link href={`/jobs/category/${category.slug}/`} className={linkClassName}>
                  {category.exploreLabel}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="m-0 text-[12px] font-medium text-acd-muted">By location</h3>
          <ul className="m-0 flex list-none flex-wrap gap-x-5 p-0">
            {ENABLED_JOB_COUNTRY_PAGES.map((country) => (
              <li key={country.slug}>
                <Link href={`/jobs/country/${country.slug}/`} className={linkClassName}>
                  {country.country}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
