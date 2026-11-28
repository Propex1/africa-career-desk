# Frontend board usability and accessibility review

Agent C, issue #12, based on coordinator commit `58a95fa`. This bounded change preserves source jobs, taxonomy, shared contracts and public publishing. It introduces no backend, account flow, dependency or deployment.

## Problems and resulting behaviour

| Problem found | Change |
|---|---|
| Generic filter controls declared a multiselect listbox but used buttons without the required listbox keyboard model | Use native labelled checkboxes in a named group. Standard Tab/Space behaviour is provided by the browser, rather than claiming an incomplete listbox interaction |
| Filter trigger names stayed “Country” or “Career Area” after selection, hiding selected state from assistive technology | Accessible names now include selected values; result-count spans are excluded from checkbox names |
| Generic popovers could remain open after keyboard focus moved outside the filter | Close on focus leaving the root, retaining existing Escape-to-trigger behaviour |
| The All option could become disabled when zero jobs matched the other dimensions | Keep the clear/all checkbox enabled; individual zero-count unselected options remain disabled |
| Small checkbox rows, expansion targets and chip remove controls | Use 44px filter rows/expansion buttons and 32px chip remove buttons; add visible focus styles to filter and clearing controls |
| Career Area's 390px popover could overflow the right edge when it occupied the third tablet column | Align it to the right at 701–1100px; retain full-width mobile treatment |
| Full-width Career Area shifts the later mobile filters: Experience is in the left column and Language in the right, so the old even-child alignment could place their menus offscreen | Align Country and Language to the right, keeping Experience left-aligned |
| Mobile card titles were reduced to 13.5px | Increase to 16px, and make secondary mobile function text 12px, retaining existing wrapping and card structure |
| A role with no discoverable classification only displayed its old RoleType on the card | Add discreet “Awaiting classification” text only in the protected career preview. Public cards do not show editorial pending metadata |
| Changed filter results were not announced near the result summary | Mark the result summary as an atomic polite status region |

No category/function dropdown was added. The seven-area/23-subcategory registry, Private Markets default expansion, filter URL logic, date eligibility, source ordering and data contract remain unchanged. The card still uses the existing discoverability selector: proposed functions cannot become public metadata through this UI change.

## Validation

- Existing `npm run acd:test`: 183 passed, zero failed.
- New standalone `frontend-board-accessibility.test.ts`: five passed, zero failed. It renders the actual TSX with React's server renderer and the installed TypeScript compiler, checks native control semantics/zero-result clearing, selected career naming, existing job links, preview-only pending text and proposed-versus-approved function visibility. A static mobile-grid regression checks popover alignment against the actual control order.
- Preview Next.js build passed.
- TypeScript and changed-file ESLint passed.
- `acd:v2:preflight` passed; canonical publishing files match the latest synced main commit.
- No dependency/package/CI/shared test runner changes. The coordinator should register the new test file in the shared runner during integration, or run it separately:

```bash
node --experimental-strip-types tools/acd/tests/frontend-board-accessibility.test.ts
```

## Verification limits and follow-up

No authenticated live browser walkthrough or device screenshot is claimed. Server-rendered tests establish markup and visibility behaviour; they do not prove pixel layout, screen-reader announcements, pointer/focus event ordering or touch handling in a browser. The tablet/mobile CSS correction has been reviewed from the responsive layout rules and compiled successfully, but still needs the coordinator's protected-preview visual review.

Suggested manual checks on the protected preview:

1. At 320/390px, open Filters, Career Area, Experience and Language; verify long labels/cards wrap without horizontal overflow and the pending text stays discreet.
2. At 768/1024px, open Career Area in the third column and verify the popover stays inside the viewport.
3. At desktop width, Tab into each filter; use Space to toggle native checkboxes; Tab out to close; Escape should close and return focus to the trigger.
4. Narrow results to zero and confirm the All/clear option can still clear that dimension. Confirm selected values and result changes are announced sensibly.
5. Open a job and return to the board; verify existing URLs, filters, shown count and position behaviour remain intact.
6. Compare public versus protected-preview fixtures: pending text and proposed functions must remain preview-only.

## Resumed coordinator review

The original Agent C run ended after committing its deliverable. A follow-up review reran the tests and corrected the mobile Experience/Language menu alignment described above. The extra regression is a source/markup check, not browser geometry validation. Selected zero-count checkbox fixtures remain enabled for deselection. No authenticated browser walkthrough or production deployment was performed.
