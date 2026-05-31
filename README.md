# PyQuiz (GitHub Pages build)

A static, multi-file build of PyQuiz for hosting on GitHub Pages.

- `index.html` — the marketing / landing page (the site root).
- `docs.html` — documentation and the AI prompt.
- `student/index.html` — the student tool.
- `teacher/index.html` — the authoring tool.
- `student/`, `teacher/` — each app's own css/ and js/.
- `site/` — the landing-page stylesheet.
- `packs/` — activity packs (`.pyquiz`) plus `index.json` (the manifest).

## Hosting

Push this folder to a repository and enable GitHub Pages (Settings -> Pages -> Deploy from a branch, root). The site is fully static; no build step is needed.

Adding a pack: drop its `.pyquiz` file into `packs/` and add an entry to `packs/index.json`. The student chooser reads that manifest.
