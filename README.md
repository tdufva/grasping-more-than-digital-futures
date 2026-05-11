# Grasping More-than-Digital Futures

A complete static GitHub Pages website for the informal academic research collective **Grasping More-than-Digital Futures**.

The site is built with Eleventy and published as plain static HTML, CSS, and JavaScript. It uses a light, monochrome, early graphical-interface visual language inspired by old desktop window systems without using Apple branding or logos.

## File Structure

```text
src/
  _data/
    site.json
    members.json
    news.json
    researchThemes.json
    literature.json
    contact.json
    companion.json
  _includes/
    layouts/
  index.njk
  members.njk
  news.njk
  research.njk
  literature.njk
  contact.njk
assets/
  css/
    style.css
  js/
    main.js
docs/
CONTENT_GUIDE.md
README.md
```

## Run Locally

Install dependencies once:

```bash
npm install
```

Run the local development server:

```bash
npm start
```

Then visit the local URL printed by Eleventy, usually:

```text
http://localhost:8080
```

Build the static site:

```bash
npm run build
```

The generated site appears in `docs/`.

## Edit Content

Most content lives in JSON files under `src/_data/`:

- Homepage content: `src/_data/site.json`
- Member profiles: `src/_data/members.json`
- News and events: `src/_data/news.json`
- Research themes: `src/_data/researchThemes.json`
- Literature references: `src/_data/literature.json`
- Contact text and email: `src/_data/contact.json`
- Pixel companion prompts: `src/_data/companion.json`

Optional longer Markdown pages can be added when useful. See `CONTENT_GUIDE.md` for examples.

The shared visual style is in `assets/css/style.css`. Small interactions, including the mobile menu, news filter, draggable homepage windows, and homepage desktop companion, are in `assets/js/main.js`.

## Deploy on GitHub Pages

GitHub Pages serves the generated static site from the `docs/` folder on the `main` branch.

Before publishing content edits, run:

```bash
npm run build
```

Then commit both the source files and the regenerated `docs/` output.

## Notes

- Runtime site visitors receive only static HTML, CSS, and JavaScript.
- Eleventy is used only at build time.
- The site is responsive for desktop and mobile.
- Placeholder people, events, links, and bibliography entries should be replaced with verified information before public launch.
- The design intentionally uses system fonts, high-contrast borders, and simple CSS-drawn details for fast loading and easy maintenance.
