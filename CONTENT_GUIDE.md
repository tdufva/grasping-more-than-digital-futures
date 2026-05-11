# Content Editing Guide

This site is generated with Eleventy. Most regular updates happen in small JSON files inside `src/_data/`; the layouts and visual design stay in reusable templates.

## Quick Start

Install dependencies once:

```bash
npm install
```

Run the editable site locally:

```bash
npm start
```

Build the static site:

```bash
npm run build
```

The built site appears in `docs/`. GitHub Pages publishes that folder.

## What to Edit

```text
src/_data/site.json              Homepage title, subtitle, CTAs, core interests
src/_data/members.json           Member and coordinator profiles
src/_data/news.json              News, events, calls, seminars, archive
src/_data/researchThemes.json    Research theme descriptions
src/_data/literature.json        Reading list and bibliography categories
src/_data/contact.json           Contact text and email
src/_data/companion.json         Pixel dog messages and fetched prompts
```

Templates live in `src/*.njk` and `src/_includes/`. Edit those only when changing layout or structure.

## Add a Member

Open `src/_data/members.json` and add a new object inside `items`:

```json
{
  "name": "Name Surname",
  "role": "Doctoral Researcher",
  "institution": "University / affiliation",
  "researchInterests": "Post-digital education, craft, AI, culture",
  "bio": "Short biography in one paragraph.",
  "links": [
    { "label": "Website", "url": "https://example.org" },
    { "label": "Email", "url": "mailto:name@example.org" }
  ]
}
```

Keep commas between member objects. The final object in the list should not have a trailing comma.

## Add News or Events

Open `src/_data/news.json` and add an item inside `current`:

```json
{
  "date": "2026-11-04",
  "title": "Seminar: Title of the Event",
  "type": "Seminar",
  "typeSlug": "seminar",
  "description": "Short description.",
  "url": "https://example.org",
  "linkLabel": "More information"
}
```

Allowed `typeSlug` values used by the filter are:

```text
seminar
workshop
publication
call
reading-group
```

Items are sorted automatically in reverse chronological order.

## Add Literature

Open `src/_data/literature.json`. Add a new item inside the relevant category:

```json
{
  "author": "Author, A.",
  "year": "2026",
  "title": "Title of the publication.",
  "source": "Journal, book, or source.",
  "note": "Why this matters for the group.",
  "url": "https://doi.org/example",
  "linkLabel": "DOI"
}
```

Verify all real citations before publishing.

## Optional Markdown Pages

Markdown is available when a longer note or announcement is easier to write as prose. Create a file such as:

```text
src/notes/2026-11-seminar.md
```

Use this front matter:

```markdown
---
layout: layouts/note.njk
title: "Seminar: More-than-Digital Pedagogies"
pageTitle: "Seminar: More-than-Digital Pedagogies"
current: news
description: "A short page description for search engines."
permalink: "2026-11-seminar.html"
---

Write the longer announcement here.
```

Then link to it from `src/_data/news.json`:

```json
"url": "2026-11-seminar.html",
"linkLabel": "Read more"
```

Markdown is optional. If JSON fields are enough, do not create a Markdown page.

## Edit the Visual Design

```text
assets/css/style.css
assets/js/main.js
```

The CSS controls the Mac OS 7-inspired visual language. The JavaScript controls the mobile menu, news filter, draggable homepage windows, and Pixel the desktop companion.

## Publish Changes

Before publishing, run:

```bash
npm run build
```

Then commit both the edited source files and the regenerated `docs/` folder, and push to `main`. GitHub Pages will publish the contents of `docs/`.

The live site remains:

```text
https://tdufva.github.io/grasping-more-than-digital-futures/
```
