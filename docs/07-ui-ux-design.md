# MRI Lab — UI/UX Design Specification

## 1. Purpose

This document defines MRI Lab's information architecture, visual identity, page layouts, interaction patterns, accessibility requirements, and responsive behaviour.

The interface should feel like a professional scientific workbench: precise, calm, data-oriented, and trustworthy. It must present a large, dense, highly visual scientific object (a volumetric MRI scan) clearly and legibly without distraction, while keeping every supporting workflow — projects, datasets, pipelines, runs, and settings — consistent.

The design must support the workflows defined in:

- `00-overview.md` — product vision and the primary user workflow.
- `01-requirements.md` — functional and non-functional requirements (FR-001..FR-022).
- `03-user-stories.md` — user goals and acceptance scenarios.
- `02-features.md` — user-visible behaviour, states, and edge cases.
- `04-architecture.md` — system boundaries, the viewer data path, and display-versus-analysis rules.
- `05-data-model.md` — canonical entities.
- `08-tech-stack.md` — technology choices.

The canonical stack is Next.js (App Router) + React + TypeScript, with TailwindCSS and the daisyUI component layer, React Query for server state, and vtk.js for the volumetric multiplanar viewer.

The design must respect one architectural rule above all: the viewer and the pipeline runner operate on the same project and artifact system, and display transformations in the viewer are never recorded as analytical inputs to a run.

## 2. Design Principles

### 2.1 Clarity before decoration

Every screen should make three things obvious:

1. Where am I?
2. What data am I looking at?
3. What can I do next?

Avoid decorative components that compete with scientific data. The volume is the primary content; chrome and scaffolding must recede.

### 2.2 One project and artifact system

Projects, datasets, the viewer, pipelines, runs, artifacts, comparisons, and experiment history all operate on the same project-scoped records. Navigation must never imply that the viewer, a notebook, or a pipeline runner manages files separately.

### 2.3 Data density with readable hierarchy

Researchers inspect spatial metadata, tables, run states, logs, and overlays efficiently. Use compact layouts for scientific information while preserving readable text, explicit labels, and sufficient spacing.

### 2.4 Scientific precision

Always display units, coordinate spaces, orientation conventions, timestamps, checksums, and provenance where relevant. Voxel and world coordinates must be explicit, and region labels must be shown with their atlas name and coordinate space.

Never imply that an approximate display representation, a downsampled preview, or a display transform is the original stored volume.

### 2.5 Honest system feedback

Every asynchronous operation must communicate its state truthfully. Do not show a success notification before the server confirms success, and never mark a run `succeeded` before its artifacts and manifest are persisted.

### 2.6 Consistent interactions

Use the same patterns for navigation, forms, status badges, dialogs, tables, overlays, errors, and confirmations throughout the application.

### 2.7 Security-aware presentation

Do not expose resources, identifiers, metadata, or actions that the current user is not authorised to access. Frontend visibility is a usability measure, not a substitute for server-side authorisation.

## 3. Visual Direction

### Design concept

**Scientific workstation meets modern research platform.**

The interface should resemble a focused, dark-room scientific instrument rather than a consumer wellness application or a generic light administrative dashboard. A dark theme reduces glare, lets grayscale anatomical data dominate, and gives colour-map and overlay colours maximum perceptual separation. The application ships both a `lab-light` and a `lab-dark` theme with a user toggle: `lab-light` is the default and `lab-dark` is preferred when the user's system is set to dark.

Characteristics:

- Deep neutral backgrounds with clear surface separation (lab-dark); the lab-light theme mirrors the same structure on light surfaces.
- High-contrast, slightly cool text.
- Restrained blue accent for actions and focus.
- Subtle one-pixel borders; minimal shadows.
- Monospaced typography for hashes, identifiers, coordinates, and numerical values where useful.
- Consistent, scientifically named colour maps for the viewer.
- Accessible semantic status colours that never rely on hue alone.
- A near-black canvas behind the multiplanar views in the viewer.

Avoid excessive gradients, glassmorphism, neon glows, animated backgrounds, and oversized marketing headings inside the authenticated application.

### 3.1 Duality: marketing and application

The landing/explore surface is public and may use a slightly more expressive visual treatment (a larger hero, a screenshot-led layout, an illustrative multiplanar preview). The authenticated application is dense, quiet, and task-oriented. Both share the same token system and component layer.

## 4. Design Tokens

Implement the visual system through reusable design tokens and component-level styling rather than scattered one-off values.

### 4.1 Colour palette

The palette is defined once and rendered through two themes: `lab-light` (the
default) and `lab-dark`. Both are declared in `globals.css` as daisyUI themes and
as `--color-*` semantic tokens (kebab-case); components reference the token,
never a literal. Contrast ratios against their intended backgrounds should meet
WCAG 2.1 AA.

| Token             | Light       | Dark      | Usage                                    |
| ----------------- | ----------- | --------- | ---------------------------------------- |
| `background`      | `#F6F8FB`   | `#0B0F14` | Application background                   |
| `surface`         | `#FFFFFF`   | `#121821` | Cards, tables, panels                    |
| `surface-muted`   | `#EEF2F7`   | `#1A2230` | Secondary surfaces, table headers        |
| `surface-raised`  | `#E2E8F0`   | `#212B3A` | Menus, popovers, tooltips, drawers       |
| `overlay-scrim`   | `#17203366` | `#05080B` | Modal and drawer backdrop (with opacity) |
| `text-primary`    | `#172033`   | `#E6EDF5` | Main text                                |
| `text-secondary`  | `#5B6578`   | `#9BA9BC` | Supporting text                          |
| `text-muted`      | `#8A94A6`   | `#6B7A90` | Disabled and de-emphasised text          |
| `border`          | `#DCE3EC`   | `#263244` | Dividers and outlines                    |
| `border-strong`   | `#C3CDD9`   | `#35455C` | Emphasised borders, active separators    |
| `accent`          | `#4059C7`   | `#4C8DFF` | Primary actions and links                |
| `accent-hover`    | `#3146A5`   | `#6BA1FF` | Hover state                              |
| `accent-muted`    | `#E8ECFB`   | `#1C3355` | Accent tint backgrounds                  |
| `success`         | `#18794E`   | `#3FB950` | Successful operations, `succeeded`       |
| `success-muted`   | `#E1F4EC`   | `#16301F` | Success tint backgrounds                 |
| `warning`         | `#986500`   | `#D9A441` | Warnings, `approaching_limit`            |
| `warning-muted`   | `#FBF0DE`   | `#33290F` | Warning tint backgrounds                 |
| `danger`          | `#B42318`   | `#F0554D` | Errors and destructive actions           |
| `danger-muted`    | `#FBEAE9`   | `#3A1C1A` | Error tint backgrounds                   |
| `info`            | `#175CD3`   | `#58A6FF` | Informational feedback                   |
| `info-muted`      | `#E7EEFC`   | `#16283F` | Info tint backgrounds                    |
| `neutral-state`   | `#8A94A6`   | `#5B6578` | Pending / queued / cancelled states      |
| `focus-ring`      | `#4059C7`   | `#7FB2FF` | Keyboard focus outline                   |

Status colours must always be accompanied by text or another non-colour indicator.

### 4.2 Viewer-specific tokens

These tokens are reserved for the multiplanar viewer and its overlays. They are kept separate from the application palette so viewer rendering never depends on component-layer colours.

| Token         | Light     | Dark      | Usage                                     |
| ------------- | --------- | --------- | ----------------------------------------- |
| `canvas`      | `#EEF2F7` | `#05080B` | Background behind slice views             |
| `atlas`       | `#7C3AED` | `#B07CFF` | Default atlas region overlay tint         |
| `mask`        | `#18794E` | `#3FB950` | Default binary mask overlay tint          |
| `annotation`  | `#B42318` | `#F0554D` | Annotation markers and region-of-interest |
| `measurement` | `#986500` | `#D9A441` | Measurement and distance readouts         |

Viewport separators and grid lines use `border`; the inactive crosshair uses
`text-secondary` and the focused crosshair uses `accent`. The coordinate/hover
readout uses `surface`.

### 4.3 Colour maps

The viewer exposes a documented, fixed set of colour maps. Colour-blind-safe maps are listed first and are the recommended default for quantitative overlays. Rainbow-style maps (`jet`, `rainbow`) must not be offered.

| Map       | Type       | Colour-blind safe | Intended use                               |
| --------- | ---------- | ----------------- | ------------------------------------------ |
| `gray`    | Sequential | Yes               | Default anatomical display                 |
| `bone`    | Sequential | Yes               | Anatomical display with soft ramp          |
| `viridis` | Sequential | Yes               | Quantitative intensity and overlays        |
| `cividis` | Sequential | Yes               | Quantitative intensity (maximum Cb safety) |
| `inferno` | Sequential | Partial           | High-dynamic-range intensity               |
| `magma`   | Sequential | Partial           | High-dynamic-range intensity               |
| `hot`     | Sequential | No                | Familiar radiology-warm display            |

Each map must be selectable with a text label and, where practical, a small gradient preview. Overlay colour maps (atlas labels, masks) must be distinct from anatomical maps.

### 4.4 Typography

Use a clean sans-serif font for the interface. Use a monospace stack for hashes, identifiers, coordinates, timestamps, logs, and technical values.

Recommended sans stack:

`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Recommended mono stack:

`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`

Type scale:

| Token              | Size / line height | Weight | Usage                                  |
| ------------------ | ------------------ | ------ | -------------------------------------- |
| `text-display`     | 32 / 40 px         | 700    | Landing hero only                      |
| `text-h1`          | 28 / 36 px         | 650    | Page title                             |
| `text-h2`          | 22 / 30 px         | 600    | Major section heading                  |
| `text-h3`          | 18 / 26 px         | 600    | Card and panel heading                 |
| `text-body`        | 14 / 22 px         | 400    | Default body text                      |
| `text-body-strong` | 14 / 22 px         | 600    | Emphasised body and labels             |
| `text-sm`          | 13 / 20 px         | 400    | Dense table content, metadata          |
| `text-caption`     | 12 / 16 px         | 500    | Captions, badges, overlines            |
| `text-mono`        | 13 / 20 px         | 400    | Hashes, coordinates, logs, identifiers |
| `text-readout`     | 13 / 18 px         | 500    | Viewer coordinate readouts             |

Maintain a comfortable line height for paragraphs and documentation. Do not truncate scientific values to satisfy a layout; wrap or scroll instead.

### 4.5 Spacing

Use a consistent 4 px base spacing scale.

| Token      | Value | Typical usage                   |
| ---------- | ----- | ------------------------------- |
| `space-1`  | 4 px  | Icon-to-label spacing           |
| `space-2`  | 8 px  | Compact component spacing       |
| `space-3`  | 12 px | Form field and metadata spacing |
| `space-4`  | 16 px | Standard component padding      |
| `space-5`  | 20 px | Grouped control spacing         |
| `space-6`  | 24 px | Card and section spacing        |
| `space-8`  | 32 px | Major section separation        |
| `space-10` | 40 px | Large page-level separation     |
| `space-12` | 48 px | Landing and hero separation     |
| `space-16` | 64 px | Landing section separation      |

Avoid inconsistent arbitrary spacing values.

### 4.6 Radii

| Token         | Value  | Usage                          |
| ------------- | ------ | ------------------------------ |
| `radius-sm`   | 4 px   | Inputs, badges, small controls |
| `radius-md`   | 6 px   | Buttons, chips                 |
| `radius-lg`   | 8 px   | Cards, panels, tables          |
| `radius-xl`   | 12 px  | Dialogs, drawers, large panels |
| `radius-pill` | 999 px | Pills, status chips, toggles   |

### 4.7 Elevation

Use subtle one-pixel borders to distinguish surfaces; reserve shadows for genuinely elevated overlays.

| Token         | Treatment (light → dark)                                     | Usage                         |
| ------------- | ------------------------------------------------------------ | ----------------------------- |
| `elevation-0` | No shadow, `border` outline                                  | Base surfaces and tables      |
| `elevation-1` | `0 1px 2px rgba(23,32,51,0.06)` → `0 1px 2px rgba(0,0,0,0.4)` | Cards, sticky headers        |
| `elevation-2` | `0 8px 24px rgba(23,32,51,0.12)` → `0 8px 24px rgba(0,0,0,0.45)` | Popovers, dropdowns, tooltips |
| `elevation-3` | `0 16px 48px rgba(23,32,51,0.16)` → `0 16px 48px rgba(0,0,0,0.55)` | Modals, drawers          |

Avoid nested cards unless each level has a clear semantic purpose.

### 4.8 Focus ring

| Token               | Value                             | Usage                              |
| ------------------- | --------------------------------- | ---------------------------------- |
| `focus-ring-color`  | `#4059C7` light / `#7FB2FF` dark  | Keyboard focus outline             |
| `focus-ring-width`  | 2 px                              | Outline width                      |
| `focus-ring-offset` | 2 px                              | Offset from the control edge       |
| `focus-ring-style`  | solid                             | Always visible on `:focus-visible` |

The focus ring must remain visible on every interactive element, including viewer controls, sliders, and the multiplanar viewports. Never remove the outline without an equally visible replacement.

### 4.9 Motion tokens

| Token             | Value                        | Usage                          |
| ----------------- | ---------------------------- | ------------------------------ |
| `duration-fast`   | 120 ms                       | Hover and focus feedback       |
| `duration-normal` | 200 ms                       | Panel expand/collapse, drawers |
| `duration-slow`   | 320 ms                       | Modal and page transitions     |
| `ease-standard`   | `cubic-bezier(0.2, 0, 0, 1)` | Default easing                 |
| `ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Attention transitions          |

### 4.10 Component layer (daisyUI)

The palette is implemented as two daisyUI v5 themes declared in `globals.css`: `lab-light` (default, `color-scheme: light`) and `lab-dark` (`prefersdark: true`, `color-scheme: dark`). Every component inherits consistent colours, radii, and control sizing from the active theme.

The theme is switched at runtime by setting the `data-theme` attribute on the root element. A `ThemeProvider`/`ThemeToggle` pair (in `components/atoms`) exposes the active theme and a toggle; the choice is persisted in `localStorage` under the key `lab-theme`, and with no stored value the page follows the user's `prefers-color-scheme`. An inline boot script applies the stored theme before first paint.

Mapping from design tokens (§4.1) to daisyUI theme variables (identical for both themes):

| daisyUI variable          | MRI Lab token    |
| ------------------------- | ---------------- |
| `--color-base-100`        | `surface`        |
| `--color-base-200`        | `surface-muted`  |
| `--color-base-300`        | `border`         |
| `--color-base-content`    | `text-primary`   |
| `--color-primary`         | `accent`         |
| `--color-primary-content` | `#FFFFFF` (light) / `background` (dark) |
| `--color-secondary`       | `text-secondary` |
| `--color-neutral`         | `text-primary` (light) / `surface-raised` (dark) |
| `--color-info`            | `info`           |
| `--color-success`         | `success`        |
| `--color-warning`         | `warning`        |
| `--color-error`           | `danger`         |

Radii map `--radius-field` to `radius-sm`, `--radius-box` to `radius-lg`, and `--radius-selector` to `radius-pill`.

Prefer daisyUI component classes — `btn`, `input`, `select`, `textarea`, `file-input`, `badge`, `card`, `table`, `steps`, `progress`, `alert`, `menu`, `dropdown`, `drawer`, `tabs`, and `loading` — inside the reusable components in §24 instead of bespoke utility stacks. Viewer viewports and canvas overlays are custom components and are not built from daisyUI primitives.

## 5. Application Layout

### 5.1 Desktop layout

Use a persistent left navigation sidebar and a main content area, with a compact top bar.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ MRI Lab                    Project selector        Notifications  User │
├───────────────┬──────────────────────────────────────────────────────┤
│               │ Breadcrumbs                                           │
│ Home          │ Page title                          Primary action    │
│ Projects      │ Supporting description                                │
│ Datasets      │                                                       │
│ Viewer        │ Main content                                          │
│ Pipelines     │ Tables / Forms / Viewer / Logs                        │
│ Notebooks     │                                                       │
│ Explore       │                                                       │
│               │                                                       │
│ Settings      │                                                       │
└───────────────┴──────────────────────────────────────────────────────┘
```

### 5.2 Sidebar

The sidebar includes, in order:

- MRI Lab brand / logo.
- Home.
- Projects.
- Datasets.
- Viewer.
- Pipelines.
- Notebooks (P2, deferred — hidden until implemented).
- Explore.
- Settings.

The sidebar should:

- Highlight the active destination.
- Group items with consistent icons (conceptual, muted, single-colour).
- Support keyboard navigation with a visible focus ring.
- Collapse to an icon rail on smaller screens and to a drawer on mobile.
- Omit deferred destinations (Notebooks) until they exist. Do not show links to unimplemented features.

### 5.3 Top bar

The top bar includes:

- Active project selector (clearly showing the current project name and visibility).
- Global search where implemented.
- Notifications for run completion and failures.
- User account menu with sign-out.
- Breadcrumbs on deeper pages.

Switching the active project must clearly indicate the change and refresh project-scoped content safely, clearing stale caches.

### 5.4 Content area

Use a consistent maximum width for ordinary forms (e.g. settings) and full available width for the viewer, tables, logs, and comparisons. Avoid horizontal overflow on common desktop widths; where tables are wide, allow the table region to scroll rather than the whole page.

## 6. Information Architecture

Primary navigation: Home; Projects; Datasets; Viewer; Pipelines; Notebooks (P2, deferred); Explore; Settings.

Recommended route structure:

```text
/
├── (marketing)
│   ├── (landing)
│   ├── sign-in
│   ├── register
│   └── reset-password
├── app
│   ├── home
│   ├── projects
│   │   ├── new
│   │   └── [projectId]
│   │       ├── (overview)
│   │       ├── datasets
│   │       │   ├── new
│   │       │   └── [datasetId]
│   │       │       ├── (overview)
│   │       │       └── versions
│   │       ├── pipelines
│   │       │   └── [pipelineId]
│   │       │       └── versions
│   │       ├── runs
│   │       │   ├── new
│   │       │   └── [runId]
│   │       ├── compare
│   │       ├── experiments
│   │       └── settings
│   ├── datasets
│   │   └── [datasetId]
│   ├── viewer
│   │   └── [datasetVersionId]
│   │       └── compare
│   ├── pipelines
│   │   └── [pipelineId]
│   ├── runs
│   │   └── [runId]
│   ├── explore
│   │   └── [slug]
│   └── settings
│       ├── account
│       ├── security
│       ├── storage
│       └── usage
└── not-found
```

This is a logical route map. Adapt it to the Next.js App Router, and do not create empty pages for every path.

### Navigation rules

- Protected pages require authentication.
- Resource pages require server-verified project access.
- Breadcrumbs use human-readable resource names (project, dataset, pipeline, run) where available, and never expose internal identifiers as the primary label.
- Refreshing a deep link preserves the intended destination if the user remains authorised.
- Unknown routes display a proper not-found page.
- Unauthorised and nonexistent resources are handled consistently to avoid leaking resource existence.

## 7. Landing / Marketing Page

### Purpose

Communicate the promise — "Explore real brain MRI data, run computational neuroscience experiments, and share reproducible results — all in the cloud" — and let a visitor reach the bundled sample scan without uploading anything.

### Layout

A centered, single-column marketing page reusing the token system:

1. Hero: product name, one-line promise, primary action ("Explore the sample scan") and secondary action ("Sign in").
2. Product preview: a static or lightweight-interactive image of the multiplanar viewer (three linked planes with a visible crosshair and coordinate readout).
3. Three capability blocks: View (multiplanar navigation and overlays); Compute (versioned pipelines and reproducible runs); Share (provenance, manifests, and scoped sharing).
4. Public sample project card with its licence and citation note.
5. Footer with documentation and licence links.

### Interactions

- The sample scan action opens the read-only Explore sample viewer without authentication.
- Read-only sample viewing is permitted; saving a view, creating annotations, or submitting a run prompts sign-in.
- The hero must not claim clinical validity, diagnosis, or regulatory approval.

### States

- Static content; no loading state required beyond fonts and images.
- If the sample project cannot be loaded, show an inline error and keep the sign-in path available.

## 8. Authentication (Sign in / Register / Password Reset)

### Purpose

Provide a clear, trustworthy entry point and a safe recovery path.

### Layout

Use a focused centered card on a muted background. Provide a compact brand header and a link back to the landing page.

1. **Sign in:** email + password, "Forgot password?" link, submit, and a link to register. Where OIDC is configured, show a clearly labelled provider button as an alternative.
2. **Register:** display name, email, password, password confirmation, accept terms, submit, and a link to sign in.
3. **Password reset request:** email field, submit, and a neutral confirmation that does not reveal whether an account exists.
4. **Password reset confirm:** new password and confirmation, submit, then redirect to sign in.

### Forms

- Every field has a visible label and inline validation.
- Passwords support show/hide toggle.
- The submit button shows a progress state and is disabled during submission to prevent duplicates.
- Errors are shown inline and summarised at the top of the form where multiple fields fail.

### States

- **Loading:** submit button progress; the form fields remain visible.
- **Validation error:** field-level message with corrective guidance.
- **Authentication error:** a single non-enumerating message ("Email or password is incorrect").
- **Session expired:** when redirected from a protected page, a clearly worded explanation and a return to the original destination after sign-in.
- **Provider unavailable:** explain the failure and offer the password path if available.

## 9. Dashboard (Home)

### Purpose

Provide a concise overview of the current user's research activity across their projects.

### Suggested content

- Welcome heading and the active project, when relevant.
- Summary row: counts of projects, datasets, ready dataset versions, and active runs.
- Recent datasets (name, project, validation status, last updated).
- Recent runs (pipeline, status, dataset, submitted time).
- Recent artifacts and recent experiment activity where available.
- Shortcuts: create a project, upload a dataset, open the viewer, start a run.

### Layout

Use a compact summary row followed by recent-activity sections. Avoid charts that carry little actionable information.

### States

- **First-time user:** a guided empty state explaining the first three steps (create a project, upload a NIfTI volume, open the viewer) with an option to open the public sample.
- **No project membership:** explain what the user can do (create a project or open the sample).
- **Loading:** skeleton placeholders for each section.
- **Error:** explain which section could not load and offer a safe retry. A failed section must not block the rest of the dashboard.
- **Partial:** a section may succeed while another fails; label each independently.

## 10. Projects List and Project Detail

### 10.1 Projects list

**Purpose:** help users find and organise projects.

**Layout:**

- Page title and concise description.
- Search field.
- Create-project action for authorised users.
- Table or responsive card list of projects.
- Pagination when needed.

**Columns:** project name; dataset count; run count; status (`active` / `archived`); visibility (`private` / `public sample`); last updated; row actions.

**Interactions:**

- Selecting a project opens its detail page and sets it as the active project.
- Search updates results predictably.
- Archive requires confirmation; destructive delete is clearly identified.
- Keyboard users can reach row actions.

**States:** empty (prompt to create a project or open the sample); no-results (distinct from empty); loading (skeleton rows); error (retry).

### 10.2 Project detail

**Purpose:** the central workspace for a project.

**Header:** project name; status and visibility badges; description; last updated; role-based actions (edit, archive, share, delete).

**Main sections (tabs):**

1. Overview — metadata and a compact activity summary.
2. Datasets — list with validation status and row actions.
3. Pipelines — list with version counts and status.
4. Runs — recent and historical experiment runs.
5. Experiments — the full reproducible history (§16).
6. Settings — visibility, members (P1), sharing, and deletion semantics.

Avoid deeply nested tabs. A user must be able to jump directly to a dataset, pipeline, or run.

### 10.3 Membership (P1)

Where implemented, provide a members table with role (`owner`, `admin`, `member`, `viewer`), add-member flow, and role change. Preserve the last-owner invariant and disable the controls that would violate it, explaining why. Do not show invitation controls before they function.

## 11. Dataset Upload and Dataset Detail

### 11.1 Dataset upload

**Purpose:** make uploading and validating a NIfTI volume understandable, resumable, and recoverable.

**Layout:** a focused multi-step form rather than a dashboard.

1. Dataset details: name (required) and source/provenance (optional).
2. File selection: `.nii` or `.nii.gz`. The file input clearly displays the selected filename, size, supported format, and the configured size limit, with remove/replace before submission. A standard accessible file picker must remain available in addition to drag-and-drop.
3. Metadata: subject identifier (anonymised) and source notes where provided.
4. Upload and validation progress: a labelled stage indicator.

```text
Upload → Validate → Ready
```

5. Outcome: ready summary, or a safe, actionable rejection.

**Validation report:** on completion, show a structured report of what was checked:

| Check           | Display                                              |
| --------------- | ---------------------------------------------------- |
| Format          | `.nii` / `.nii.gz` and content agreement             |
| Integrity       | SHA-256 checksum with a copy action                  |
| Header          | NIfTI version (`nifti1` / `nifti2`) and parseability |
| Dimensions      | Voxels per axis (and volumes for 4D)                 |
| Voxel spacing   | Millimetres per axis                                 |
| Orientation     | Axis direction codes and convention (e.g. RAS+)      |
| Data type       | e.g. `float32`, `int16`                              |
| Affine          | Finite and invertible; rendered as a compact matrix  |
| Resource limits | Decompressed size within bounds                      |

**Interactions and states:**

- Resumable uploads preserve entered dataset name and source if the transfer is interrupted; offer resume and retry.
- Progress reflects real transfer and validation state, not a timer.
- **Rejected:** a concise, safe explanation (e.g. "Only `.nii` and `.nii.gz` volumes are supported.", "The compressed volume could not be decompressed safely.", "The NIfTI header is malformed."), the affected file/property, and a corrective action.
- **Failed (operational):** explain that validation could not complete and offer retry.
- Do not show `ready` until the backend confirms validation succeeded.
- A duplicate submission is prevented; the final action is disabled while in progress.

### 11.2 Dataset detail

**Purpose:** the authoritative summary of a dataset and its versions.

**Header:** dataset name and identifier; validation status; parent project; primary action to open the viewer (enabled only when `ready`); run action; download where permitted.

**Metadata section:** labelled values, not prose:

- Format, checksum (copyable), source and provenance.
- Dimensions (voxels per axis), voxel spacing (mm), orientation and affine, data type.
- Number of volumes for 4D data.
- Validation status and timestamps (uploaded, validated).

**Versions section:** an immutable list of `dataset_versions` with version label, created time, checksum, validation status, and the actions available for each version.

**File assets section:** a table of `file_assets` (name, media type, size, checksum) with scoped downloads where permitted.

**Status behaviour:**

- If `validating`, disable viewer and run actions and explain why.
- If `rejected` / `failed`, show the safe reason and recovery options.
- If the coordinate space is unknown or the affine is invalid, disable spatial features and explain.

## 12. MRI Viewer

### Purpose

Provide a focused workspace for exploring an MRI volume in three linked anatomical views. The viewer is the most visually important scientific screen in the product. It is an exploration tool, not a clinical interpretation system.

### 12.1 Desktop layout

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Project / Dataset breadcrumb                                          │
│ Dataset name · version            Ready            [Open in Compare]  │
├───────────────────────┬───────────────────────────────────────────────┤
│ Controls (left)       │ Multiplanar views                             │
│                       │                                                │
│ Colour map  [gray ▾]  │  ┌──────────────┐  ┌──────────────┐            │
│ Window/level  [——●—]  │  │   AXIAL      │  │   CORONAL    │            │
│ Brightness    [——●—]  │  │              │  │              │            │
│                       │  │   + cross    │  │   + cross    │            │
│ Overlays              │  └──────────────┘  └──────────────┘            │
│  ☐ Atlas [none ▾]     │  ┌──────────────┐                             │
│  Opacity    [——●—]    │  │   SAGITTAL   │      Voxel: (123, 145, 98)  │
│  ☐ Mask    [none ▾]   │  │              │      World: (12.3, -45.6,   │
│                       │  │   + cross    │              78.9) mm       │
│ [Reset view]          │  └──────────────┘      Space: RAS+ / MNI      │
│ [Save view state]     │                                                │
│                       │  Region: Left Hippocampus (atlas: AAL, MNI)   │
├───────────────────────┴───────────────────────────────────────────────┤
│ Annotation: [Point ▾] [Region]   |   Slice readouts and orientation    │
└───────────────────────────────────────────────────────────────────────┘
```

This is a conceptual layout. View axis directions and labels must be derived from the volume metadata, not hardcoded.

### 12.2 Multiplanar views

- Render axial, coronal, and sagittal planes.
- Linked crosshairs keep the same anatomical point selected across all three views; moving the crosshair in one view updates the other two.
- Scrolling the mouse wheel over a viewport advances slices in that view.
- The focused viewport shows its crosshair in `accent`; other viewports show theirs in `text-secondary`.
- Each viewport displays its anatomical orientation (e.g. L/R, A/P, S/I) and the current slice index / total.

### 12.3 Display controls

- Colour map selection from the fixed set in §4.3.
- Window/level (contrast) and brightness, adjusted by slider and by drag gestures in a viewport.
- Zoom and pan per view, with a per-view reset and a global reset.
- Overlay visibility and opacity for atlas and mask layers.
- Toggle for the coordinate crosshair readout overlay.

### 12.4 Coordinate and region readout

For the selected point, always display:

- Voxel coordinates (integer indices per axis).
- World coordinates in millimetres in the volume's coordinate space.
- The active coordinate space and orientation convention (e.g. `RAS+`, `MNI`).
- Region label(s) when an atlas is loaded, always with the atlas name and its coordinate space.

Display readouts in monospace (`text-readout`). Provide a copy action. Never show world coordinates without stating their space.

### 12.5 Atlas overlays and region inspection

- Select an available atlas and toggle it as an overlay, then adjust opacity.
- The overlay is registered through the volume affine; if alignment is not possible, explain the mismatch instead of drawing a misleading overlay.
- Region labels for a point are accompanied by the atlas name and coordinate space.
- Out-of-bounds points and probabilistic/multi-region points are handled explicitly (e.g. "No labelled region at this voxel", or a ranked list of probabilistic regions).

### 12.6 Annotations

- Annotation tools: point marker, region-of-interest, and free text note.
- Annotation markers use the `annotation` token and are listed in a side panel with coordinates, coordinate space, and body.
- Annotations are stored with explicit coordinate-space metadata and attached to the dataset version.
- Saving annotations requires authentication.

### 12.7 View-state save

- A user can save the current view state (viewport configuration, slice indices, crosshair coordinates, window/level, zoom, pan, colour map, overlays) as a named view on the dataset or project.
- Saved views can be reopened and shared.
- The interface must state that a saved view is a display preference and is not an analytical input to any run.

### 12.8 Performance and data retrieval

- Fetch the volume through a short-lived, single-object signed URL; slice client-side with vtk.js.
- Show skeleton viewports while the first slices load.
- Request only the data needed; never stream unbounded arrays through the API.
- Identify when a downsampled representation is being displayed.
- Keep interactions responsive after data is loaded; asynchronous overlay loads must not block navigation.
- Never modify the source volume; rendering is a display transform.

### 12.9 States

| State     | Presentation                                                    |
| --------- | --------------------------------------------------------------- |
| `loading` | Three skeleton viewports with a progress indicator              |
| `ready`   | Fully interactive                                               |
| `partial` | The volume renders while overlays or derived layers still load  |
| `error`   | A clear message with retry; the current view state is preserved |

**Empty/edge explanations:**

- Dataset still validating: "This dataset is still being validated."
- No displayable volume: explain that the asset has no renderable image data.
- 4D volume: require selecting a volume/time index before display.
- Anisotropic spacing: render with correct physical proportions and label spacing.
- Slice or window beyond allowed limits: explain the limit.
- Fetch failure: offer retry without losing state.
- Navigating to another dataset mid-load: cancel obsolete requests; do not let stale data replace the new volume.

## 13. Pipelines List and Pipeline Builder / Versions

### 13.1 Pipelines list

**Purpose:** discover templates and manage project pipelines.

**Layout:** title and description; template gallery (cards) and a project-pipelines table.

**Template card contents:** name; short description; documented inputs and outputs; parameter summary; status (`draft` / `published` / `deprecated`); "Use template" action.

**Table columns:** pipeline name; latest version; status; run count; last updated; actions.

**States:** empty (point to templates); loading (skeleton); error (retry).

### 13.2 Pipeline builder / versions

**Purpose:** inspect a pipeline's versions and their parameter schemas. A full visual pipeline editor is P2 and, until implemented, the screen must not imply drag-and-drop editing.

**Layout (initial, P1):**

- Header: pipeline name; status; latest version.
- Version list: immutable `pipeline_versions`, each showing version label, `image_digest` (shortened, copyable), created time, and a changelog note.
- Version detail: parameter schema rendered as a typed form preview (types, units, defaults, validation rules, and documented inputs/outputs).

**Behaviour and states:**

- Published versions are immutable; an edit action creates a new version rather than mutating in place, and the UI states this clearly.
- Deprecated versions are labelled and cannot be selected for a new run, with an explanation.
- `draft` versions are editable and clearly distinguished.
- Missing or invalid parameters are surfaced with inline validation.

## 14. New Run Form and Run Detail

### 14.1 New run form

**Purpose:** configure and submit a run against a specific dataset version.

**Layout:** a focused form.

1. Input dataset version (selected, with checksum and coordinate space shown).
2. Pipeline version (published only), with the container `image_digest` shown.
3. Parameters: rendered from the pipeline version's schema with types, units, defaults, and validation rules.
4. Resource estimate: expected runtime/memory class and any quota impact.
5. Submit and cancel.

**Behaviour:**

- Do not expose parameters the backend does not support.
- The submit button is disabled while required parameters are missing or the dataset is not `ready`; the reason is shown.
- Duplicate submissions are prevented; a submission idempotency key is used.
- On submit, the API returns a run identifier promptly and the app navigates to the run detail page.

### 14.2 Run detail

**Purpose:** monitor a run, inspect its provenance, and reach its results.

**Layout:**

- Header: pipeline name and version; run status badge; dataset version; submitted timestamp; cancel action when eligible.
- **Status timeline:** a vertical or horizontal timeline of state transitions (`queued` → `running` → `succeeded` / `failed` / `cancelled`) with timestamps at each transition.
- **Logs panel:** streamed or polled structured log lines (timestamp, severity, operation, message) with a copy/download action and a follow/pause toggle. Logs must not contain credentials, signed URLs, or raw voxel data.
- **Artifacts:** a table of output artifacts (name, media type, size, checksum) with scoped downloads and links that open n-dimensional outputs in the viewer where applicable.
- **Manifest:** a rendered, copyable machine-readable experiment manifest (`schema_version`, run id, pipeline name/version/`image_digest`, input dataset versions and checksums, parameters, environment, coordinate conventions, seeds, outputs, status).
- **Provenance:** rerun action, and when rerun is not possible, an explicit explanation (e.g. referenced dataset version or container digest unavailable).

### 14.3 Status presentation

Use a text label and a consistent visual indicator for each state. The indicator never implies a known completion percentage unless the backend actually provides meaningful progress.

| State       | Presentation                                    |
| ----------- | ----------------------------------------------- |
| `queued`    | Neutral label, "Queued" text                    |
| `running`   | Progress indicator, "Running" text              |
| `succeeded` | Success indicator, "Succeeded" text             |
| `failed`    | Error indicator, "Failed" text plus safe reason |
| `cancelled` | Neutral label, "Cancelled" text                 |

### 14.4 Cancellation

- Cancellation is enabled while `queued` or `running` and disabled once `succeeded`.
- Cancelling requires confirmation and is recorded.
- A race with completion is handled gracefully (the final state is authoritative).

### 14.5 States

- **Loading:** skeleton status timeline and log panel.
- **Running:** streaming or polling logs; no false completion.
- **Partial success:** if some outputs exist and others failed, show what succeeded and flag the missing outputs.
- **Failed:** a safe failure reason and the run identifier; never expose stack traces or internal paths.
- **Permission:** runs outside the user's projects return a clear, non-revealing denial.

## 15. Compare (Input vs Derived)

### Purpose

Compare an input volume and a derived volume side by side to inspect the effect of a computation.

### Layout

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Compare: [input ▾] vs [derived ▾]        Comparable · RAS+             │
├──────────────────────────────┬────────────────────────────────────────┤
│ INPUT: dataset v3            │ DERIVED: run 8f2c… (smoothed)          │
│ Axial / Coronal / Sagittal   │ Axial / Coronal / Sagittal             │
│  with linked crosshairs      │  with linked crosshairs                │
├──────────────────────────────┴────────────────────────────────────────┤
│ [Sync crosshairs ☑]  [Overlay input ☐]  [Difference view ☐]             │
│ Colour map ▾   Window/level [——●—]                                     │
└───────────────────────────────────────────────────────────────────────┘
```

### Behaviour

- Both panels share synchronised crosshairs and view controls when the volumes are comparable.
- Each panel is clearly labelled as input or derived, with its dataset version and coordinate space.
- Optional difference view and input-overlay toggles are available where the coordinate spaces and dimensions align.
- Region volume statistics, where a mask is produced, are shown with millimetre-cubed and voxel-count units.

### States

- **Comparable:** synchronised navigation is enabled.
- **Not comparable:** explain the mismatch (dimensions, spacing, orientation, or coordinate space) and disable synchronised comparison. Do not silently misalign.
- **Loading:** skeleton panels.
- **Error:** explain which volume could not be loaded; keep the other panel usable.

### Export

- Export a PNG snapshot of the current multiplanar view.
- Export the difference view where available.
- Exports respect permissions and use scoped download URLs.

## 16. Experiment History

### Purpose

Provide a reproducible, traceable history of a project's experiment runs.

### Layout

- Title and description.
- Filters: pipeline, dataset, status, date range, and submitter.
- Table columns: run identifier (shortened, copyable); pipeline and version; dataset version; status; duration; submitted time; actions.
- Row expansion or a detail link to the run page (§14.2).

### Behaviour

- Every row links to a manifest with traceable input references; the history is the entry point to reproducibility.
- Rerun from a row is available when the configuration is still reproducible, and the UI distinguishes:
  - Rerunning an existing run (where supported).
  - Creating a new run from the same dataset version and parameters.
  - Creating a run against a newer dataset version.
- Historical results remain attributed to their original inputs and software version; the UI never merges results from different versions.

### States

- **Empty:** prompt to select a pipeline and submit a run.
- **No-results:** distinct filtered-empty state.
- **Loading:** skeleton rows.
- **Error:** retry; a failed filter should not clear the page.
- **Not reproducible:** a row whose inputs or container digest are unavailable is labelled and explains why.

## 17. Explore (Public Sample Projects)

### Purpose

Let unauthenticated and authenticated visitors explore public sample projects, datasets, and templates.

### Layout

- Title and description.
- Grid of public sample project cards: project name; description; data description; viewer preview thumbnail; licence and citation badge; dataset/version count.
- Public template list where available.
- Search and filter by modality, atlas, or topic.

### Sample project detail (read-only)

- Overview with licence and citation requirements displayed prominently.
- Public dataset metadata and a viewer that supports read-only exploration.
- Actions: open in viewer; sign in to save a view, annotate, compare, or run.

### States

- **Empty:** explain that no public samples are available.
- **Loading:** skeleton cards.
- **Error:** explain and retry.
- **Licence/attribution:** required attribution is always visible and never hidden behind an interaction.

## 18. Settings

### Purpose

Manage account, security, storage, and usage. Organised into sub-sections in the secondary navigation.

### 18.1 Account

- Display name, email (read-only where managed by the identity provider), and profile details.
- Save with inline validation and a confirmation.
- Danger zone: sign out of all sessions and account deletion per documented semantics.

### 18.2 Security

- Password change where the password path is used.
- Active sessions list with device, last active, and revoke.
- Two-factor / OIDC provider status where configured.
- API keys (P2) listed with a create/revoke flow and a scoped-permission summary.

### 18.3 Storage and usage

- Storage usage per project: bytes used against quota, with a bar and numeric figure.
- Compute usage: CPU seconds and run counts over a selectable range.
- Quota states shown explicitly:

| State               | Presentation                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `within_quota`      | Neutral summary with headroom                                      |
| `approaching_limit` | Warning styling and remaining headroom                             |
| `limit_reached`     | Danger styling; the affected action is blocked with an explanation |

- Resource estimates before expensive runs are surfaced here and in the run form.

### 18.4 Project settings

- Visibility (`private` / `public sample`).
- Sharing links (create, scope, expiry, revoke) with a clear scope summary.
- Members (P1) per §10.3.
- Deletion semantics: clearly state what is removed (source data, derived files, cached copies, backups) and require confirmation for the affected resource.

### States

- **Loading:** skeleton fields.
- **Save success:** a non-blocking confirmation; values reflect server state.
- **Validation error:** inline, preserving entered values.
- **Permission:** non-owner roles see read-only controls with an explanation.

## 19. Forms, Dialogs, and Feedback

### Forms

Every form should have:

- A clear title.
- A label for every field.
- Required-field indicators where appropriate.
- Inline validation with corrective guidance.
- A disabled or progress state during submission.
- A clear success or failure outcome.
- Preserved values after recoverable failures.

### Dialogs

Use dialogs for short, focused actions (rename, archive, confirm cancellation, revoke share). Do not place multi-step scientific workflows (upload, pipeline configuration, comparison) inside small dialogs.

### Notifications

- Use non-blocking toasts for routine success and failure.
- For important validation failures, repeat the explanation in the page or form.
- Notifications must be announced to assistive technologies, remain readable, avoid conveying meaning by colour alone, and never claim success before the server confirms it.

### Destructive actions

- Clearly identify the affected resource and the consequence.
- Require confirmation for destructive or hard-to-reverse operations.
- Prefer archive or reversible operations over permanent deletion where appropriate.

### Quota and permission feedback

- When an action is blocked by a quota, state the limit and the current usage.
- When an action is blocked by permissions, explain that it is unavailable without exposing protected resource existence.

## 20. Responsive Behaviour

### Desktop: 1200 px and wider

- Persistent sidebar.
- Multi-column metadata layouts.
- Full multiplanar viewer with all three viewports and the control panel.
- Tables with their important columns visible.

### Tablet: 768–1199 px

- Collapsible sidebar or icon rail.
- Reduced card columns.
- The viewer shows the three viewports in a condensed grid; the control panel becomes a collapsible drawer.
- Comparison panels stack or reduce to two visible planes.

### Mobile: below 768 px

- Drawer navigation.
- Single-column forms and detail layouts.
- The viewer presents one anatomical plane at a time with a plane switcher; linked crosshairs remain synchronised across planes.
- Coordinate readout stays visible as a compact bar.
- Tables become stacked resource cards.
- No essential workflow depends on hover; touch gestures for slice scroll, zoom, and pan are supported.

These breakpoints are starting points, not rigid rules. Adjust them based on real content and usability testing.

## 21. Accessibility

Target WCAG 2.1 Level AA. The viewer is a graphics-heavy surface and requires explicit keyboard and non-visual support.

Requirements include:

- Sufficient text and interface contrast against the dark surfaces.
- Keyboard access to primary workflows, including:
  - Tab to each viewport and to every control.
  - Arrow keys to move the crosshair; `[` / `]` or `PageUp` / `PageDown` to step slices in the focused viewport.
  - `+` / `-` to zoom; reset via a focusable control.
  - A visible focus ring (`§4.8`) on the focused viewport and controls.
- A textual readout of voxel coordinates, world coordinates, coordinate space, and region label that is always available, so essential spatial information is not conveyed by image alone.
- An accessible tabular or textual alternative for region statistics and run results.
- Colour-blind-safe colour maps (`gray`, `bone`, `viridis`, `cividis`) offered as defaults; rainbow maps excluded.
- Status indicators that never depend on colour alone (text + icon + colour).
- Overlay and annotation colours that remain distinguishable for common colour-vision deficiencies; provide an alternative tint or pattern where practical.
- Meaningful labels and accessible names; semantic heading hierarchy.
- Accessible form errors, associated with their fields.
- Respect for `prefers-reduced-motion`.
- Usable layouts at 200% zoom and with increased text size.
- Documented keyboard-shortcut help available from within the viewer.

Do not sacrifice accessibility to achieve a visually minimal interface.

## 22. Loading, Empty, and Error States

Every data-driven screen must distinguish the following states. Concrete MRI examples are given in `02-features.md` §17.

### Loading

Use a progress indicator or skeleton. Avoid flashing an empty state before data arrives. The viewer shows three skeleton viewports; the dataset page shows placeholder rows while validation proceeds.

### Empty

Explain why the collection is empty and provide a next step if the user has permission to take one.

- No datasets: prompt to upload a NIfTI volume or open the sample.
- No runs: prompt to select a pipeline and submit a run.
- No artifacts: explain the run produced no outputs.

### No results

Explain that the current filter or search found no matching resources, distinctly from a truly empty collection.

### Success

Confirm the completed operation and show the resulting resource or next step (dataset `ready` with dimensions/spacing/orientation; run `succeeded` with artifact and manifest links).

### Validation error

Identify the invalid field or file property and explain how to fix it, using safe, non-internal messages.

### Permission error

Explain that the resource or operation is unavailable without exposing protected information or leaking resource existence.

### Network failure

Provide a safe retry. Preserve entered form data. Do not automatically repeat non-idempotent mutations unless their idempotency is guaranteed.

### Unexpected server error

Display a friendly message and a request identifier when available. Never expose stack traces, SQL errors, credentials, or internal service details.

### Partial success

Indicate which parts succeeded and which did not (e.g. a mask was produced but region-volume statistics failed).

### Disabled

Disable controls that cannot currently be used and explain why (run submit while parameters are missing; cancel after `succeeded`).

## 23. Motion and Micro-interactions

Motion should clarify state transitions rather than decorate the interface.

Appropriate examples:

- Subtle hover and focus feedback using `duration-fast`.
- Short `duration-normal` transitions for expanding panels, drawers, and the control panel.
- A progress indicator during uploads and while slices or overlays load.
- A visible state change when a run completes or a dataset becomes `ready`.
- Crosshair and overlay updates that track interaction without lag or easing delay.

Avoid:

- Constantly moving backgrounds or animated canvas effects.
- Unnecessary animated chart or overlay effects.
- Long transitions that slow down scientific work.
- Motion that ignores `prefers-reduced-motion`; when reduced motion is set, replace transition-based feedback with immediate state changes and keep only essential progress indicators.
- Easing applied to viewer crosshair movement, which must feel direct and precise.

## 24. Component Library

Implement reusable components for repeated patterns on top of the daisyUI primitives described in §4.10. Use the actual naming conventions of the framework. Do not create abstractions that have only one trivial use without a clear benefit.

Suggested components:

- `AppShell`
- `Sidebar`
- `TopBar`
- `ProjectSwitcher`
- `Breadcrumbs`
- `PageHeader`
- `Button`
- `TextField`
- `SelectField`
- `TextareaField`
- `FilePicker`
- `StatusBadge`
- `DataTable`
- `MetadataGrid`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `NoResultsState`
- `ConfirmDialog`
- `ToastProvider`
- `QuotaMeter`
- `CoordinateReadout`
- `ColourMapSelect`
- `OverlayControl`
- `VersionList`
- `ParameterForm`
- `RunStatusTimeline`
- `LogViewer`
- `ArtifactList`
- `ManifestViewer`
- `MultiplanarViewer`
- `CompareViewer`
- `AnnotationPanel`

### 24.1 Atomic Design Structure

The component library follows the **Atomic Design** methodology to ensure maintainability, reusability, and clear separation of concerns.

#### 24.1.1 Atoms — Basic building blocks

Foundational, indivisible UI elements:

| Component                    | Purpose                                                             |
| ---------------------------- | ------------------------------------------------------------------- |
| `Button`                     | Primary, secondary, ghost, and outline actions                      |
| `TextField`                  | Single-line text input with label and validation                    |
| `TextareaField`              | Multi-line text input                                               |
| `SelectField`                | Single-select dropdown                                              |
| `Checkbox` / `Toggle`        | Boolean controls for overlays and options                           |
| `Slider`                     | Window/level, brightness, and opacity adjustment                    |
| `Card`                       | Content container with optional title and actions                   |
| `DataTable`                  | Sortable, paginated data table                                      |
| `MetadataGrid`               | Key–value grid for structured metadata                              |
| `StatusBadge`                | Semantic status indicator (success, warning, danger, info, neutral) |
| `RunStatusBadge`             | Pipeline run state presentation                                     |
| `Badge`                      | Tag for visibility, version, and licence                            |
| `ToastProvider` / `useToast` | Non-blocking notification system                                    |
| `LoadingState`               | Spinner with optional label                                         |
| `EmptyState`                 | Empty collection with action                                        |
| `ErrorState`                 | Error display with request ID and retry                             |
| `NoResultsState`             | Filtered search with no matches                                     |
| `Breadcrumbs`                | Hierarchical navigation trail                                       |
| `SignOutButton`              | Authentication sign-out action                                      |
| `CopyButton`                 | Copy a checksum, identifier, or coordinate to the clipboard         |

#### 24.1.2 Molecules — Combinations of atoms

Composed components combining atoms into a functional unit:

| Component           | Composition                                             | Purpose                             |
| ------------------- | ------------------------------------------------------- | ----------------------------------- |
| `LoginForm`         | `TextField`, `Button`, `Toast`                          | Authentication                      |
| `RegisterForm`      | `TextField`, `Checkbox`, `Button`                       | Account creation                    |
| `ProjectForm`       | `TextField`, `TextareaField`, `SelectField`, `Button`   | Project CRUD                        |
| `DatasetUploadForm` | `FilePicker`, stage steps, `ValidationReport`, `Button` | Resumable upload + validation       |
| `ValidationReport`  | `MetadataGrid`, `StatusBadge`                           | Structured NIfTI validation results |
| `PageHeader`        | Title, description, `Breadcrumbs`, action               | Consistent page headers             |
| `TopBar`            | `ProjectSwitcher`, notifications, user menu             | Application header                  |
| `ProjectSwitcher`   | `SelectField`, project list                             | Active project context switcher     |
| `Sidebar`           | Navigation links, active state, mobile drawer           | Primary navigation                  |
| `VersionList`       | `DataTable`, `StatusBadge`, actions                     | Dataset/pipeline version history    |
| `ParameterForm`     | schema-driven `TextField`/`SelectField`/`Slider`        | Typed pipeline parameter entry      |
| `RunStatusTimeline` | `RunStatusBadge`, timestamps                            | Run state-transition display        |
| `ArtifactList`      | `DataTable`, download action                            | Run output files                    |
| `ManifestViewer`    | `CodeBlock`, `CopyButton`                               | Experiment manifest display         |
| `QuotaMeter`        | progress bar, numeric usage                             | Storage and compute usage           |

#### 24.1.3 Organisms — Complex components

Sophisticated components combining molecules and atoms into complete application sections:

| Component           | Composition                                                                                                                   | Purpose                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `AppShell`          | `Sidebar`, `TopBar`, main content, skip link                                                                                  | Application layout shell  |
| `MultiplanarViewer` | three viewports, `SliceViewport`, `CoordinateReadout`, `ColourMapSelect`, `OverlayControl`, `AnnotationPanel`, `ViewStateBar` | Full MRI viewer           |
| `SliceViewport`     | vtk.js canvas, crosshair, orientation labels, wheel/slice controls                                                            | A single anatomical plane |
| `CompareViewer`     | two `MultiplanarViewer` instances, sync controls, difference toggle                                                           | Input vs derived compare  |
| `LogViewer`         | virtualised log list, follow/pause, severity filters                                                                          | Streaming run logs        |
| `RunWorkspace`      | `RunStatusTimeline`, `LogViewer`, `ArtifactList`, `ManifestViewer`                                                            | Full run detail           |

#### 24.1.4 Directory structure

```text
src/components/
├── atoms/
│   ├── button.tsx
│   ├── text-field.tsx
│   ├── ... (atoms)
│   ├── status-badge.tsx
│   ├── copy-button.tsx
│   ├── index.ts
│   └── __tests__/
├── molecules/
│   ├── login-form.tsx
│   ├── dataset-upload-form.tsx
│   ├── parameter-form.tsx
│   ├── validation-report.tsx
│   ├── ... (molecules)
│   ├── index.ts
│   └── __tests__/
├── organisms/
│   ├── app-shell.tsx
│   ├── multiplanar-viewer.tsx
│   ├── slice-viewport.tsx
│   ├── compare-viewer.tsx
│   ├── run-workspace.tsx
│   ├── index.ts
│   └── __tests__/
└── index.ts  # Barrel export: atoms → molecules → organisms
```

Each layer exports a barrel file (`index.ts`) so consumers import from the layer root (`@/components/atoms`, `@/components/molecules`, `@/components/organisms`) rather than individual files. The top-level `src/components/index.ts` re-exports all three layers.

**Benefits:**

- Clear ownership: atoms are framework-agnostic primitives; molecules express domain logic; organisms assemble full features.
- Testability: atoms and molecules are unit-tested in isolation; organisms test composition (including viewer interaction tests).
- Reusability: atoms and molecules are reused across organisms and pages.
- Scalability: new components fit naturally into one layer without restructuring.

## 25. Frontend State and Interaction Rules

- Use React Query for all server state: fetching metadata, dataset versions, pipelines, runs, logs, artifacts, and viewer slice/asset URLs.
- Use URL state for navigable context: active project, selected dataset version, selected run, and viewer slice/crosshair coordinates where shareable.
- Keep ephemeral viewer interactions (hover, temporary zoom, transient window/level while dragging) in local component state; persist only on explicit "Save view state".
- Clear project-scoped caches when the active project changes.
- Cancel obsolete requests when users rapidly change datasets, slices, or runs; prevent stale responses from overwriting newer selections.
- Poll or subscribe to run status; stop polling on terminal states and on unmount.
- Disable duplicate submissions for uploads, run submissions, annotations, and sharing while an operation is in progress; use idempotency keys where the API requires them.
- Do not use optimistic success for uploads, validation, run submission, artifact persistence, or any operation whose success requires server confirmation.
- Keep server-owned resource state distinct from local presentation state. Viewer display settings are never treated as run parameters.

## 26. Design Deliverables

The implementation should include:

- A reusable design-token system (§4) and the dual daisyUI `lab-light`/`lab-dark` themes.
- A consistent application shell with persistent navigation.
- Responsive navigation and a mobile drawer.
- The landing/marketing page.
- Sign in, register, and password-reset screens.
- Dashboard, projects list, and project detail.
- Dataset upload (resumable with a validation report) and dataset detail with versions and assets.
- The multiplanar MRI viewer with linked crosshairs, display controls, coordinate readout, atlas overlays, annotation tools, and view-state save.
- Pipelines list and pipeline builder/versions.
- New run form and run detail (status timeline, logs, artifacts, manifest, cancel, rerun).
- Compare (input vs derived) with synchronised navigation.
- Experiment history.
- Explore (public sample projects).
- Settings (account, security, storage/usage, quotas).
- Reusable loading, empty, no-results, and error states.
- Accessible forms, controls, and a keyboard-operable viewer.
- Consistent status indicators.
- A not-found page and a clear authentication experience.
- An HTML design prototype under `docs/07-ui-ux-design/html/` and matching screenshots under `docs/07-ui-ux-design/images/`, covering the core screens of primary user journeys A and B.

## 27. Definition of Done

The design is considered implemented when:

1. Primary workflows follow a consistent visual system built on the tokens in §4 and the dual daisyUI `lab-light`/`lab-dark` themes.
2. Users can navigate between projects, datasets, pipelines, runs, and the viewer without confusion, and the viewer, pipeline runner, and artifact system share the same project-scoped records.
3. The multiplanar viewer makes the three planes, linked crosshairs, voxel and world coordinates, coordinate space, colour map, overlays, and region labels clear.
4. The viewer distinguishes display transforms from analytical computations and never records a display state as a run input.
5. Upload, validation, comparison, and run statuses reflect actual backend state; no success is shown before the server confirms it.
6. All primary actions have appropriate loading, success, partial, failure, disabled, and permission feedback.
7. Layouts remain usable on desktop, tablet, and mobile, including a single-plane mobile viewer with synchronised crosshairs.
8. Keyboard navigation and focus management work across primary workflows, including crosshair movement and slice stepping in the viewer.
9. Essential spatial and statistical information has an accessible textual or tabular alternative that does not depend on colour alone.
10. Colour maps offered by default are colour-blind safe, and `prefers-reduced-motion` is respected.
11. No control advertises unsupported or deferred functionality (for example Notebooks or a visual drag-and-drop pipeline editor).
12. The interface does not make unsupported medical, diagnostic, or scientific claims.
13. The HTML design prototype in `docs/07-ui-ux-design/html/` and its screenshots in `docs/07-ui-ux-design/images/` cover the core screens of the primary journeys.
14. Changed frontend source files pass the Husky pre-commit ESLint and Prettier checks; full frontend tests and type checks remain separate gates.
