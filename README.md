# PyQuiz source tree

Modular source for the student and teacher apps. The files in `src/`
run directly from disk (open `src/student.html` or `src/teacher.html`
in a browser — no build step). When you're happy with the UI and
behaviour, run `build.py` to concatenate everything into the two
self-contained single-file deliverables in `/mnt/user-data/outputs/`.

## Folder layout

```
src/
├── student.html         Student shell — links css/* and js/* below
├── teacher.html         Teacher shell — same plus editors/
├── css/
│   ├── base.css         Tokens, layout, top bar, buttons, modals — shared
│   ├── activities.css   Per-activity rendering styles — shared
│   └── editor.css       Teacher-only form, line editor, validation
└── js/
    ├── core/            Logic (no DOM dependencies except where noted)
    │   ├── constants.js
    │   ├── strings.js      UI strings (British English)
    │   ├── schema.js       Machine-readable schema + prompt generator
    │   ├── normalise.js    Text-equality profiles
    │   ├── codec.js        Pack encode/decode (gzip + base64url)
    │   ├── storage.js      localStorage adapter
    │   ├── validator.js    Pack + activity validation
    │   ├── marker.js       Per-type response marking
    │   ├── pack.js         Pack factory + mutation helpers — AI seam
    │   └── demo.js         Built-in demo pack
    ├── ui/              DOM-aware helpers
    │   ├── dom.js          el(), button(), field() etc.
    │   ├── modal.js        Modal dialog with focus management
    │   ├── settings.js     User preference modal + persistence
    │   └── a11y.js         Live-region announcers
    ├── renderers/       Student-facing activity views (registry)
    │   ├── index.js        Renderers.register / .render
    │   ├── parsons.js
    │   ├── cloze.js
    │   ├── trace_table.js
    │   ├── spot_the_bug.js
    │   ├── predict_output.js
    │   └── starter_challenge.js
    ├── editors/         Teacher form editors (registry)
    │   ├── index.js        Editors.register / .edit
    │   ├── parsons.js
    │   ├── cloze.js
    │   ├── trace_table.js
    │   ├── spot_the_bug.js
    │   ├── predict_output.js
    │   └── starter_challenge.js
    └── apps/            Shell entry points
        ├── student.js
        └── teacher.js
```

## The PyQuiz namespace

Every module attaches its public API to `window.PyQuiz.<Module>`.
Modules are loaded in dependency order by the HTML shells. No bundler
is involved — the order of `<script>` tags in `student.html` and
`teacher.html` is the contract.

| Module                | Depends on                | Purpose |
|-----------------------|---------------------------|---------|
| `PyQuiz.Constants`    | —                         | Schema and pack-format version strings, list of activity types |
| `PyQuiz.Strings`      | —                         | All UI strings (British English) |
| `PyQuiz.Schema`       | Constants                 | Machine-readable schema; `promptSpec()` for AI prompts |
| `PyQuiz.Normalise`    | —                         | Text-equality profiles (`pythonCode`, `outputText`, `traceCell`) |
| `PyQuiz.Codec`        | —                         | `encode(pack)` / `decode(string)` — gzip + base64url + `v1.` |
| `PyQuiz.Storage`      | —                         | `get/set/remove/keys` with localStorage / in-memory fallback |
| `PyQuiz.Validator`    | Constants                 | `pack(p)` / `activity(a)` returning issue lists |
| `PyQuiz.Marker`       | Normalise, Strings        | `mark(activity, response)` returning `MarkResult` |
| `PyQuiz.Pack`         | Constants, Validator      | Factory + mutations; ingest path for external/AI JSON |
| `PyQuiz.Demo`         | —                         | Demo pack object |
| `PyQuiz.DOM`          | —                         | DOM construction helpers |
| `PyQuiz.Modal`        | DOM                       | Accessible modal dialog |
| `PyQuiz.Settings`     | Storage, DOM, Modal       | User preferences + dialog |
| `PyQuiz.A11y`         | —                         | Live-region announcers |
| `PyQuiz.Renderers`    | —                         | Registry + `render(activity, host, callbacks)` |
| `PyQuiz.Editors`      | —                         | Registry + `edit(activity, host, ctx)` (teacher only) |
| `PyQuiz.StudentApp`   | all of the above          | Student shell, auto-inits on DOMContentLoaded |
| `PyQuiz.TeacherApp`   | all of the above + Editors| Teacher shell, auto-inits on DOMContentLoaded |

## Extension contract — adding a new activity type

Suppose you want to add a `regex_match` type. You need to touch four
files plus add two `<script>` tags. Existing files stay closed.

1. `js/core/pack.js` — add the type to `Constants.ACTIVITY_TYPES` and
   a case to `defaultPayload(type)`. (These are the only two places
   where the type registry is hard-coded; everything else looks up the
   registries.)
2. `js/core/schema.js` — add a `Schema.payloads.regex_match` entry.
3. `js/core/validator.js` — assign `Validator.types.regex_match = ...`.
4. `js/core/marker.js` — assign `Marker.types.regex_match = ...`.
5. New file `js/renderers/regex_match.js`:
   ```js
   PyQuiz.Renderers.register("regex_match", function (activity, host, cb) {
     // build DOM in `host`
     return { getResponse, setResponse, reset, highlight };
   });
   ```
6. New file `js/editors/regex_match.js`:
   ```js
   PyQuiz.Editors.register("regex_match", function (host, act, ctx) {
     // build form in `host`; call ctx.onChange() after mutations
   });
   ```
7. Add `<script src="js/renderers/regex_match.js"></script>` to BOTH
   shells, and the editor script to `teacher.html` only.

No app-shell changes required.

## AI activity generation (planned)

The architecture is set up for a future "generate this activity with
AI" workflow:

- **Prompt source.** `PyQuiz.Schema.promptSpec({ types: ["parsons"] })`
  returns a markdown spec ready to embed in a system prompt.
- **Ingest.** Generated JSON should be passed through
  `PyQuiz.Pack.ingestActivity(pack, json)`. It validates strictly and
  refuses on errors, returning `{ ok, issues, activity? }`. The
  teacher then either accepts or fine-tunes via the existing form
  editor.
- **No special path.** AI-generated activities go through the same
  validator, the same renderer, and the same marker as
  hand-authored ones. There is no shadow code path.

When that step lands, it adds one module (e.g. `js/core/ai.js`) plus
top-bar buttons; no existing module needs to change.

## Pack format

- `pack_format_version` — covers encoding pipeline and storage layout
- `schema_version` — covers activity field shapes

Bump independently. Both are declared in `js/core/constants.js`.

The encoded pack is `v1.<base64url(gzip(JSON))>`. The `v1.` prefix
exists so we can branch the codec without breaking older encoded
packs.

**Honest security note.** Encoded packs are obfuscation only. Anyone
with the student tool can recover the answers. The export dialog
surfaces this.

## Storage keys

```
pyquiz.v1.student.packs              packId -> minimal pack metadata
pyquiz.v1.student.progress.<packId>  per-pack progress record
pyquiz.v1.teacher.drafts             id -> teacher JSON
pyquiz.v1.teacher.lastOpen           id of the last open draft
pyquiz.v1.settings                   shared user preferences
```

The student and teacher tools share `pyquiz.v1.settings` so font /
theme / motion preferences carry across.

## Tests

Three layers, all using Node + jsdom (see `test-*.js` at the repo
root):

1. `test-shared.js` — pure unit tests for codec, normalise, validator,
   marker.
2. `test-dom.js` — DOM smoke: both apps mount in jsdom with no console
   errors.
3. `test-student-deep.js` / `test-teacher-deep.js` — exercise the
   apps via simulated clicks.

Run all three with `node test-shared.js && node test-dom.js && node
test-student-deep.js && node test-teacher-deep.js`.

## Building single-file deliverables

```
python3 build.py
```

Reads everything under `src/` and writes
`/mnt/user-data/outputs/student.html` and
`/mnt/user-data/outputs/teacher.html`, each fully self-contained
(inline CSS and JS, no external dependencies). The build script
preserves load order by following the `<script>` and `<link>` tags
in the shells.
