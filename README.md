# Grasping More-than-Digital Futures

A complete static GitHub Pages website for the informal academic research collective **Grasping More-than-Digital Futures**.

The site is built with plain HTML, CSS, and JavaScript. It uses a light, monochrome, early graphical-interface visual language inspired by old desktop window systems without using Apple branding or logos.

## File Structure

```text
index.html
members.html
news.html
research.html
literature.html
contact.html
assets/
  css/
    style.css
  js/
    main.js
README.md
```

## Run Locally

You can open `index.html` directly in a browser.

For a local server, run:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Edit Content

- Homepage content lives in `index.html`.
- Member profiles live in `members.html`. Search for the comment beginning `Edit member cards here`.
- News and events live in `news.html`. Search for the comment beginning `Edit news and event items here`.
- Research themes live in `research.html`.
- Literature references live in `literature.html`. Search for the comment beginning `Edit literature categories and references here`.
- Contact text and email placeholder live in `contact.html`.

The shared visual style is in `assets/css/style.css`. Small interactions, including the mobile menu, news filter, draggable homepage windows, and homepage desktop companion, are in `assets/js/main.js`.

## Deploy on GitHub Pages

1. Create a GitHub repository.
2. Add these files to the repository root.
3. Commit and push to GitHub.
4. In the repository, open **Settings** → **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the branch, usually `main`, and the root folder `/`.
7. Save. GitHub Pages will publish the site after a short build.

## Notes

- No external dependencies are required.
- The site is responsive for desktop and mobile.
- Placeholder people, events, links, and bibliography entries should be replaced with verified information before public launch.
- The design intentionally uses system fonts, high-contrast borders, and simple CSS-drawn details for fast loading and easy maintenance.
