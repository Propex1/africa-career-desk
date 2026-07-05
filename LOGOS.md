# Employer Logos

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

- `logoUrl` is set ✓ on the entry, **or**
- the image file fails to load (network error, missing file, 404)

The fallback is handled client-side via an `onError` handler. No broken image icon is ever shown.

**Never add a `logoUrl` to an entry until the file is confirmed present in `public/logos/`.** If the file is missing at build time, the page will still render correctly — the fallback kicks in at runtime — but it is better to only set the field once the asset is ready.

---

## Logo quality guidelines

- **Format**: prefer SVG (scalable, small, crisp at all sizes). Use PNG only if SVG is unavailable.
- **Source**: use the official logo from the employer's press kit, brand assets page, or investor relations page. Do not screenshot from a webpage.
- **No hotlinking**: always download and place the file locally. Never set `logoUrl` to an external URL.
- **File size**: SVG under 20 KB, PNG under 60 KB.
- **Dimensions**: the container uses `object-fit: contain` with `max-w-[78%] max-h-[68%]`. Logos do not need to be a specific pixel size — SVG scales automatically.
- **No distortion**: do not resize or crop logos. The container handles sizing.
- **Background**: prefer logos with a transparent background (SVG default, or PNG with alpha). Avoid logos with a white box background that will look wrong on the card's light grey container.
