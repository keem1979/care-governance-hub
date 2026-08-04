# ATOM Digital Service Catalogue

The public ATOM catalogue is available at `/catalogue`. It is separate from the authenticated QCGMS application and does not alter customer records, permissions or operational modules.

## Files created or changed

- `src/app/catalogue/page.tsx` — catalogue content, package data and reusable page sections.
- `src/app/catalogue/catalogue.css` — responsive, motion, accessibility and A4 print styling.
- `src/components/catalogue/catalogue-interactions.tsx` — mobile navigation, FAQ, print and back-to-top controls.
- `public/catalogue/atom-leadership-hero.png` — original leadership photography used for the cover and closing call to action.
- `public/catalogue/governance-review.png` — original Registered Manager and governance consultant photography.
- `src/app/(auth)/login/page.tsx` — public link from sign-in to the catalogue.
- `docs/CATALOGUE_ASSET_PLAN.md` — image purpose, dimensions, alt text and provenance.

## Run the catalogue locally

Run the normal application development command and open `/catalogue` in the browser. The existing login and operational routes continue to work normally.

## Replace images

Replace the files in `public/catalogue` while retaining their filenames, or update the matching `Image` source in `src/app/catalogue/page.tsx`. Use optimised landscape images with enough edge space for responsive cropping. Update `docs/CATALOGUE_ASSET_PLAN.md` with the new source and licence information.

## Add ATOM contact details

Search `src/app/catalogue/page.tsx` for:

- `[INSERT EMAIL]`
- `[INSERT TELEPHONE]`
- `[INSERT WEBSITE]`

Replace every occurrence and update the `mailto:` links in the closing call to action. Do not publish the contact call to action until the placeholders have been replaced with approved business details.

## Change pricing or package scope

Package names, prices, fees, descriptions and inclusion lists are held in the `packages` constant near the top of `src/app/catalogue/page.tsx`. The comparison rows are held in the `comparison` constant. Update both together and obtain commercial approval before publishing pricing changes.

## Print or export as PDF

Open `/catalogue`, select **Print / save PDF**, choose A4 paper and enable background graphics. The print stylesheet creates brochure page breaks, hides navigation and optimises colour output. Review the PDF before sending it to a prospective client.

## Future connections

The current calls to action scroll to the contact section or open a placeholder email action. They can later connect to a booking system, CRM form, analytics event or proposal workflow without changing the core catalogue structure.
