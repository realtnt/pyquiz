# PyQuiz (GitHub Pages build)

A static, multi-file build of PyQuiz for hosting on GitHub Pages.

- `index.html` — the student tool (the landing page).
- `teacher.html` — the authoring tool.
- `student/css`, `student/js` — the student tool's stylesheets and scripts.
- `teacher/css`, `teacher/js` — the authoring tool's stylesheets and scripts.

Each app has its own css/js folder because the two share module file names but not their contents (the teacher build adds the editor).

## Hosting

Push this folder to a repository and enable GitHub Pages (Settings -> Pages -> Deploy from a branch, root). The site is fully static; no build step is needed.

Open `index.html` for students; link to `teacher.html` to author packs. Everything runs client-side and saves progress in the browser.
