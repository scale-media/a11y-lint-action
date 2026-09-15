# a11y-lint-action

Static accessibility linter for Shopify Liquid and HTML templates. Runs in
GitHub Actions on pull requests, no browser required. Liquid-aware: `{{ }}`
and `{% %}` content is treated as non-empty.

## Quick start

Add this workflow to any repo in the org:

```yaml
# .github/workflows/a11y-lint.yml
name: Accessibility Lint

on:
  pull_request:
    types: [opened, ready_for_review, synchronize]
    paths:
      - 'layout/**/*.liquid'
      - 'sections/**/*.liquid'
      - 'snippets/**/*.liquid'
      - 'blocks/**/*.liquid'
      - 'templates/**/*.liquid'
      - 'templates/**/*.json'

jobs:
  a11y-lint:
    name: Static a11y lint
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: scale-media/a11y-lint-action@v1
        continue-on-error: true   # remove this line once ready to enforce
```

## Inputs

| Input              | Default | Description                                                      |
|--------------------|---------|------------------------------------------------------------------|
| `structural-only`  | `true`  | Skip files where the diff has no structural HTML changes         |
| `files`            | (empty) | Space-separated list of files. Leave empty for auto PR diff mode |

## What it checks

### Errors (17 rules)

| Rule                       | What it catches                                                 |
|----------------------------|-----------------------------------------------------------------|
| `img-missing-alt`          | `<img>` without an `alt` attribute                              |
| `input-missing-label`      | Form controls with no `<label>`, `aria-label`, or `aria-labelledby` |
| `html-missing-lang`        | `<html>` without a `lang` attribute                             |
| `empty-heading`            | `<h1>`-`<h6>` with no text (Liquid-aware)                       |
| `empty-link`               | `<a>` with no accessible name (Liquid-aware)                    |
| `empty-button`             | `<button>` with no accessible name (Liquid-aware)               |
| `iframe-missing-title`     | `<iframe>` without `title` or `aria-label`                      |
| `missing-document-title`   | Layout file missing `<title>` in `<head>`                       |
| `duplicate-id`             | Two elements with the same static `id`                          |
| `aria-hidden-on-focusable` | `aria-hidden="true"` on a focusable element                     |
| `no-redundant-role`        | Explicit `role` matching the element's implicit role             |
| `nested-interactive`       | Interactive element inside another interactive element           |
| `marquee-detected`         | `<marquee>` usage                                               |
| `meta-refresh-redirect`    | `<meta http-equiv="refresh">` auto-redirect                     |
| `placeholder-as-label`     | Input using `placeholder` as its only label                     |
| `missing-visible-focus`    | Inline `outline: none` removing focus indicators                |
| `div-button-pattern`       | `<div onclick>` or `<span onclick>` without `role`/`tabindex`   |

### Warnings (13 rules)

| Rule                             | What it catches                                          |
|----------------------------------|----------------------------------------------------------|
| `ambiguous-alt`                  | Generic or filename-based `alt` text                     |
| `generic-link-text`              | "Click here", "Learn more", etc.                         |
| `positive-tabindex`              | `tabindex` greater than 0                                |
| `heading-skip`                   | Heading levels that skip (e.g. h1 -> h3)                 |
| `link-opens-new-tab-no-warning`  | `target="_blank"` with no user indication                |
| `meta-viewport-scalable`         | Viewport disabling pinch-to-zoom                         |
| `autoplay-without-muted`         | `<video>`/`<audio>` autoplay without `muted`             |
| `multiple-h1`                    | More than one `<h1>` in a file                           |
| `no-main-landmark`               | Layout file with no `<main>` element                     |
| `missing-skip-link`              | Layout file with no skip-to-content link                 |
| `svg-missing-accessible-name`    | Inline `<svg>` with no accessible name or aria-hidden    |
| `th-missing-scope`               | `<th>` without `scope` attribute                         |
| `accesskey-used`                 | Use of `accesskey` attribute                             |

## Running locally

```bash
# Lint specific files
node lint-a11y.js layout/theme.liquid sections/hero.liquid

# Lint changed files vs main (PR mode)
node lint-a11y.js --diff

# PR mode, skip files with copy-only changes
node lint-a11y.js --diff --structural-only
```

## Running tests

```bash
node --test test/ci-rules.test.js
```

## Enforcing checks

Once you're satisfied the linter isn't producing false positives:

1. Remove `continue-on-error: true` from your workflow
2. In the repo's **Settings -> Branches -> Branch protection rules**, require the **Static a11y lint** status check to pass before merging
