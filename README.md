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
    contact.json
    companion.json
  _includes/
    layouts/
  index.njk
  members.njk
  news.njk
  research.njk
  contact.njk
assets/
  images/
    members/
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

Check that all editable JSON content is valid:

```bash
npm run check
```

## Edit Content

Most content lives in JSON files under `src/_data/`:

- Homepage content: `src/_data/site.json`
- Member profiles: `src/_data/members.json`
- News and events: `src/_data/news.json`
- Research themes: `src/_data/researchThemes.json`
- Contact text and protected email labels: `src/_data/contact.json`
- Pixel companion prompts: `src/_data/companion.json`

Optional longer Markdown pages can be added when useful. See `CONTENT_GUIDE.md` for examples.

The shared visual style is in `assets/css/style.css`. Small interactions, including the mobile menu, news filter, draggable homepage windows, and homepage desktop companion, are in `assets/js/main.js`.

## Deploy on GitHub Pages

GitHub Pages serves the generated static site from the `docs/` folder on the `main` branch.

After editing content, publish the site with one command:

```bash
npm run publish -- "Update members and news"
```

That command validates the JSON data, rebuilds `docs/`, commits the website files, and pushes `main` to GitHub. GitHub Pages then publishes the updated `docs/` folder.

To preview what would be included without committing or pushing:

```bash
npm run publish -- --dry-run
```

## Notes

- Runtime site visitors receive only static HTML, CSS, and JavaScript.
- Eleventy is used only at build time.
- The site is responsive for desktop and mobile.
- Placeholder people, events, and links should be replaced with verified information before public launch.
- The design intentionally uses system fonts, high-contrast borders, and simple CSS-drawn details for fast loading and easy maintenance.
