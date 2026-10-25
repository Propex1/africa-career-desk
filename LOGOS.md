# Employer Logos

## Owner-supplied additions, 17 October 2026

| Employer | Stored file | Use |
|---|---|---|
| HC Securities & Investment | `public/logos/hc-securities-investment.png` | `/logos/hc-securities-investment.png` |
| African Trade & Investment Development Insurance (ATIDI) | `public/logos/atidi.png` | `/logos/atidi.png` |

Copied unchanged from the owner's attached PNG files. The local accepted-preview generator sets these logos on the matching employer records. Do not replace these assets with screenshots of the website.

## Where to store logos

Place all logo files in:

```
public/logos/
```

Files placed here are served at `/logos/<filename>` in production and locally.

---

## Upload checklist — 34 employers

| # | Employer name | Recommended filename | Local path | `logoUrl` set? | Notes |
|---|---|---|---|---|---|
| 1 | Accion | `accion.svg` | `public/logos/accion.svg` | set ✓ | |
| 2 | Actis / General Atlantic | `actis-ga.svg` | `public/logos/actis-ga.svg` | set ✓ | Slash in name — use hyphen |
| 3 | Africa Finance Corporation (AFC) | `afc.svg` | `public/logos/afc.svg` | set ✓ | Parenthetical in name — use abbreviation |
| 4 | Africa50 | `africa50.svg` | `public/logos/africa50.svg` | set ✓ | Number in name — keep as-is |
| 5 | AgDevCo | `agdevco.svg` | `public/logos/agdevco.svg` | set ✓ | Camel case — use lowercase |
| 6 | Afreximbank | `afreximbank.svg` | `public/logos/afreximbank.svg` | set ✓ | |
| 7 | ARM-Harith Infrastructure Investment Limited | `arm-harith.svg` | `public/logos/arm-harith.svg` | set ✓ | Long name — use short form |
| 8 | BIO Invest | `bio-invest.svg` | `public/logos/bio-invest.svg` | set ✓ | |
| 9 | CardinalStone Capital Advisers | `cardinalstone.svg` | `public/logos/cardinalstone.svg` | set ✓ | Camel case — use lowercase |
| 10 | Catalyst Fund | `catalyst-fund.svg` | `public/logos/catalyst-fund.svg` | set ✓ | |
| 11 | Cauris Management | `cauris.svg` | `public/logos/cauris.svg` | set ✓ | |
| 12 | CrossBoundary Group | `crossboundary.svg` | `public/logos/crossboundary.svg` | set ✓ | Camel case — use lowercase |
| 13 | DEG - Deutsche Investitions- und Entwicklungsgesellschaft | `deg.svg` | `public/logos/deg.svg` | set ✓ | Long German name — use abbreviation |
| 14 | Globeleq | `globeleq.svg` | `public/logos/globeleq.svg` | set ✓ | |
| 15 | InfraCredit | `infracredit.svg` | `public/logos/infracredit.svg` | set ✓ | Camel case — use lowercase |
| 16 | Lorax Capital Partners | `lorax.svg` | `public/logos/lorax.svg` | set ✓ | |
| 17 | Meridiam | `meridiam.svg` | `public/logos/meridiam.svg` | set ✓ | |
| 18 | M-KOPA | `mkopa.svg` | `public/logos/mkopa.svg` | set ✓ | Hyphen + caps — strip hyphen |
| 19 | Open Capital Advisors | `open-capital.svg` | `public/logos/open-capital.svg` | set ✓ | |
| 20 | PIDG / GuarantCo | `pidg.svg` | `public/logos/pidg.svg` | set ✓ | Slash in name — use primary entity |
| 21 | responsAbility Investments | `responsability.svg` | `public/logos/responsability.svg` | set ✓ | Intentional lowercase `r` — use lowercase filename |
| 22 | Sahel Capital | `sahel-capital.svg` | `public/logos/sahel-capital.svg` | set ✓ | |
| 23 | SPE Capital | `spe-capital.svg` | `public/logos/spe-capital.svg` | set ✓ | |
| 24 | Ventures Platform | `ventures-platform.svg` | `public/logos/ventures-platform.svg` | set ✓ | |
| 25 | XSML Capital | `xsml.svg` | `public/logos/xsml.svg` | set ✓ | All caps — use lowercase |
| 26 | Proparco | `proparco.png` | `public/logos/proparco.png` | set ✓ | V2 — applies to ACD-0056, 0057, 0058, 0060 |
| 27 | Investisseurs & Partenaires | `ip.png` | `public/logos/ip.png` | set ✓ | V2 — applies to ACD-0061, 0062, 0063 |
| 28 | IFC | `ifc.svg` | `public/logos/ifc.svg` | set ✓ | V2 — applies to ACD-0064 |
| 29 | African Development Bank | `afdb.jpeg` | `public/logos/afdb.jpeg` | set ✓ | V2 — applies to ACD-0068 |
| 30 | FMO | `fmo.png` | `public/logos/fmo.png` | set ✓ | V2 — applies to ACD-0069 |
| 31 | FinDev Canada | `findev-canada.png` | `public/logos/findev-canada.png` | set ✓ | V2 — applies to ACD-0073 |
| 32 | DBSA | `dbsa.svg` | `public/logos/dbsa.svg` | set ✓ | V2 — applies to ACD-0076, 0077, 0081 |
| 33 | TLG Capital | `tlg-capital.jpeg` | `public/logos/tlg-capital.jpeg` | set ✓ | V2 — applies to ACD-0078 |
| 34 | RMB | `rmb.png` | `public/logos/rmb.png` | set ✓ | V2 — applies to ACD-0080 |

---

## How to add a logo to an opportunity

1. Place the file in `public/logos/` using the filename from the table above.
2. Open `src/data/opportunities.ts`.
3. Find the entry (or entries) for that employer.
4. Add the `logoUrl` field:

```ts
{
  id: "ACD-0002",
  company: "Afreximbank",
  companyInitials: "Af",
  logoUrl: "/logos/afreximbank.svg",   // ← add this line
  boardSection: "Jobs",
  ...
}
```

5. Run `npm run build` to confirm.

Some employers appear in multiple entries (e.g. Afreximbank has ACD-0002, 0003, 0004, 0042). Add `logoUrl` to every entry for that employer.

**V2 wiring — add these `logoUrl` fields once the files are in `public/logos/`:**

| File | Entries wired |
|---|---|
| `proparco.png` | ACD-0056, ACD-0057, ACD-0058, ACD-0060 — set ✓ |
| `ip.png` | ACD-0061, ACD-0062, ACD-0063 — set ✓ |
| `ifc.svg` | ACD-0064 — set ✓ |
| `afdb.jpeg` | ACD-0068 — set ✓ |
| `fmo.png` | ACD-0069 — set ✓ |
| `findev-canada.png` | ACD-0073 — set ✓ |
| `dbsa.svg` | ACD-0076, ACD-0077, ACD-0081 — set ✓ |
| `tlg-capital.jpeg` | ACD-0078 — set ✓ |
| `rmb.png` | ACD-0080 — set ✓ |

---

## Fallback behaviour

`LogoContainer` renders `companyInitials` automatically when:

- `logoUrl` is missing on the entry, **or**
- the image file fails to load (network error, missing file, 404)

The fallback is handled client-side via an `onError` handler. No broken image icon is ever shown.

**Never add a `logoUrl` to an entry until the file is confirmed present in `public/logos/`.** If the file is missing at build time, the page will still render correctly — the fallback kicks in at runtime — but it is better to only set the field once the asset is ready.

---

## Logo quality guidelines

- **Format**: prefer SVG (scalable, small, crisp at all sizes). Use PNG only if SVG is unavailable.
- **Source**: use the official logo from the employer's press kit, brand assets page, or investor relations page. Do not screenshot from a webpage.
- **No hotlinking**: always download and place the file locally. Never set `logoUrl` to an external URL.
- **File size**: SVG under 20 KB, PNG under 60 KB.
- **Dimensions**: `LogoContainer` fits visible artwork within 90% of the frame width and 82% of its height. Reviewed optical bounds in `src/components/logo-presentation.ts` compensate for empty margins. The frame is 80 × 64 px on mobile job cards, 104 × 84 px on desktop, 90 × 64 px for programmes/open applications, and 128 × 88 px on detail pages.
- **No distortion**: keep original assets intact. The component preserves the original aspect ratio and centres visible artwork. Only empty outer margins may extend beyond the frame; lettering, marks and taglines must remain visible.
- **Background**: prefer logos with a transparent background (SVG default, or PNG with alpha). Avoid logos with a white box background that will look wrong on the card's light grey container.

## Official employer additions, 25 October 2026

These original logo files were retrieved from official employer websites, official careers portals or the Orange brand library. They are stored locally, without cropping or recolouring, and reused for every matching listing. Vodafone is the displayed employer for the Egypt role; the Orange group mark matches its careers portal. Siemens Energy uses the mark currently supplied by its careers portal.

| Employer | Local file | Official source |
|---|---|---|
| CFAO | `public/logos/cfao.png` | [Source](https://cfaocareers.talent-soft.com/) · [Original asset](https://cfaocareers.talent-soft.com/Handlers/Image.ashx?imagetype=logo) |
| Africa Global Logistics | `public/logos/africa-global-logistics.svg` | [Official corporate header logo](https://www.aglgroup.com/en) — original inline SVG |
| TotalEnergies | `public/logos/totalenergies.png` | [Source](https://totalenergies.com/) · [Original asset](https://totalenergies.com/themes/custom/totalenergies_com/dist/img/logo_totalenergies.png) |
| MTN Group | `public/logos/mtn.svg` | [Source](https://www.mtn.com/) · [Original asset](https://www.mtn.com/wp-content/themes/mtn-refresh/public/img/mtn-logo.svg) |
| Mastercard | `public/logos/mastercard.svg` | [Source](https://www.mastercard.com/global/en.html) · [Original asset](https://www.mastercard.com/content/dam/mccom/shared/header/ma_symbol.svg) |
| Vodafone | `public/logos/vodafone.svg` | [Source](https://www.vodafone.com/) · [Original asset](https://www.vodafone.com/~/media/Images/V/vodafone/corp/logo/logo-dark.svg) |
| HEINEKEN | `public/logos/heineken.svg` | [Source](https://www.theheinekencompany.com/) · [Original asset](https://www.theheinekencompany.com/sites/heineken-corp/files/heineken-corp/HeinekenLogo.svg) |
| Dangote Industries | `public/logos/dangote.png` | [Source](https://careers.dangote.com/) · [Original asset](https://rmkcdn.successfactors.com/1ffd0d7e/fa43ef07-1ca0-43d0-9a6d-3.png) |
| Visa | `public/logos/visa-wordmark.png` | [Official source](https://www.visa.com/en-us) · [Original asset](https://www.visa.com/vcom-assets/content/dam/visa/header/Vector.png) |
| Orange Business | `public/logos/orange.svg` | [Source](https://boosted.orange.com/docs/5.3/about/brand/) · [Original asset](https://boosted.orange.com/docs/5.3/assets/brand/orange-logo.svg) |
| Siemens Energy | `public/logos/siemens-energy.webp` | [Source](https://jobs.siemens-energy.com/en_US/jobs/FolderDetail/Commercial-Project-Manager/304446) · [Original asset](https://jobs.siemens-energy.com/portal/140/images/logo--hiring-organization.webp) |
| CMA CGM | `public/logos/cma-cgm-mark.svg` | [Official source](https://jobs.cmacgm-group.com/) · [Original asset](https://rmkcdn.successfactors.com/18121c37/2e488cb1-c47e-4b60-9727-6.svg) |
| Afrinvest | `public/logos/afrinvest.svg` | [Source](https://afrinvest.com/) · [Original asset](https://afrinvest.com/wp-content/uploads/2024/10/logo-full.svg) |

### Display refinements requested by the owner

- Visa uses the unmodified white wordmark from its official website on Visa Blue (`#1434CB`). The previous PNG was a flat blue rectangle and has been replaced.
- MTN uses its original black mark on MTN Yellow (`#FFCB05`), the colour used by its official website header.
- CMA CGM uses its standalone careers logo without the small Better Ways slogan. It fills more of the existing logo frame (96% width / 90% height), preserving its proportions.

## Whole-folder visibility review, 25 October 2026

All 101 pre-existing assets were visually inspected at card size. Larger frames and reviewed optical bounds improve small/padded logos throughout Jobs, Programmes, Open Applications and detail pages, including assets retained for historical listings. Original files remain intact. All 159 visible listings retain their existing content, order and logo paths.

Five clearer original assets are selected centrally by the shared component; legacy paths remain valid aliases, so historical data and future imports require no rewriting.

| Existing path | Display asset | Official source |
|---|---|---|
| `bio-invest.png` | `bio-invest.svg` | [Website](https://www.bio-invest.be/en/) · [Original asset](https://www.bio-invest.be/cpresources/601ca55/BIO_logo_25_colour_RGB.svg?v=1776935899) |
| `spe-capital.jpeg` | `spe-capital.svg` | [Website](https://spe-capital.com/) · [Original asset](https://spe-capital.com/images/logo-blue.svg) |
| `crossboundary.png` | `crossboundary.svg` | [Website](https://crossboundary.com/) · [Original asset](https://crossboundary.com/wp-content/uploads/2023/08/logo-dark.svg) |
| `EBRD_logo.png` | `ebrd.svg` | [Website](https://www.ebrd.com/home.html) · [Original asset](https://www.ebrd.com/content/dam/ebrd_dxp/background-images/Vector.svg) |
| `ithmar-capital.png` | `ithmar-capital-official.png` | [Website](https://www.ithmar.gov.ma/) · [Original asset](https://www.ithmar.gov.ma/wp-content/uploads/2021/10/ithmar-logo-light2.png) |

BIO uses the current official 25th-anniversary header logo. EBRD uses its official compact header mark, avoiding the previous raster checkerboard background. EBRD and Ithmar use dark ACD frames for their original light artwork; MTN Yellow and Visa Blue remain unchanged. Rejected candidates (a different ARISE company, a white Amethis wordmark, and a less legible Lorax variation) were not installed.

For a future asset, add reviewed bounds only after checking its full mark at mobile, card and detail sizes. Unlisted assets still receive ordinary proportional containment and missing files retain the initials fallback. The original source files are never stretched, recoloured or destructively cropped. New assets exceeding the preferred size budget are retained as supplied; Next image optimisation serves smaller raster responses.
