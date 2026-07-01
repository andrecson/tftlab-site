// The Twitter card reuses the Open Graph image (US-023). Re-exporting the
// default Image handler plus its `alt`/`size`/`contentType` gives Next.js a
// distinct `twitter-image` route that renders the same 1200×630 image, so both
// `og:image` and `twitter:image` are populated.
export { default, alt, size, contentType } from "./opengraph-image";
