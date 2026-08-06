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

Check editable JSON content:

```bash
npm run check
```

## What to Edit

```text
src/_data/site.json              Homepage title, subtitle, CTAs, core interests
src/_data/members.json           Member and coordinator profiles
src/_data/news.json              News, events, calls, seminars, archive
src/_data/researchThemes.json    Research theme descriptions
src/_data/contact.json           Contact text and protected email labels
src/_data/companion.json         Pixel dog messages and fetched prompts
```

Templates live in `src/*.njk` and `src/_includes/`. Edit those only when changing layout or structure.

## Edit in the Browser

For regular content edits, open the static admin editor:

```text
https://tdufva.github.io/grasping-more-than-digital-futures/admin/
```

The editor provides form-based tabs for the homepage, members, news/events, research themes, contact wording, and Pixel's messages. It previews changes, validates required fields, keeps recoverable drafts in your browser, prepares the correct JSON file, and opens that file in GitHub's web editor. After you paste and commit the change in GitHub, GitHub Actions rebuilds and publishes the site automatically.

Browser drafts are stored only in that browser and are not public. After a committed update has been deployed, reloading the admin page recognizes the published data and clears the matching draft automatically. "Restore Published" discards the current draft and returns to the version loaded from the public site.

Because GitHub Pages is static, the editor cannot save directly to the repository. It prepares the JSON file for GitHub.

## Add a Member

Open `src/_data/members.json` and add a new object inside `items`:

```json
{
  "name": "Name Surname",
  "role": "Doctoral Researcher",
  "institution": "University / affiliation",
  "image": {
    "src": "assets/images/members/name-surname.jpg",
    "alt": "Portrait of Name Surname",
    "width": 900,
    "height": 1200
  },
  "researchInterests": "Post-digital education, craft, AI, culture",
  "bio": "Short biography in one paragraph.",
  "links": [
    { "label": "Website", "url": "https://example.org" },
    { "label": "Email", "url": "mailto:name@example.org" }
  ]
}
```

Portraits are optional. Put member images in `assets/images/members/`, keep them reasonably small for the web, and include clear alt text.

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

Use `YYYY-MM-DD` dates for items that should sort by date. Text dates such as `TBA` are also allowed and will appear before dated items. The `typeSlug` should be a short lower-case label such as `seminar`, `workshop`, `call`, `reading-group`, or `zoom`; the filter menu is generated automatically from the items in this file.

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

For normal edits made through GitHub's web editor, commit the changed JSON file on `main`. GitHub Actions will run `npm run check`, build the site, and deploy it to Pages automatically.

If you edit locally, publish to GitHub Pages with:

```bash
npm run publish -- "Describe the update"
```

The publish command validates the JSON files, rebuilds `docs/`, stages only website files, creates a commit, and pushes to `main`. The push triggers the GitHub Actions deployment.

To check what would be published without committing or pushing:

```bash
npm run publish -- --dry-run
```

The live site remains:

```text
https://tdufva.github.io/grasping-more-than-digital-futures/
```
