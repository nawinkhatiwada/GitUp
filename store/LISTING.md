# Chrome Web Store listing — copy/paste source

## Developer
Nabin Khatiwada — https://github.com/nawinkhatiwada

## Name
GitUp – Pro tools for GitHub

## Summary (≤132 chars)
Copy PR base/head branches in one click, see branches on PR lists, and branch/tag chips in GitHub Actions.

## Category
Developer Tools

## Language
English

## Description
GitUp makes github.com feel like a pro tool — small, fast improvements for the things you do every day.

PULL REQUESTS
• See "into <base> ← from <head>" right under the PR title, each with a one-click copy button.
• Fork PRs show "user:branch" but copy just the branch name — ready for git checkout.

PULL REQUEST LISTS
• Every PR row shows its base ← head branches next to the checks status, with copy buttons.
• Works on repository PR lists and your global /pulls dashboard, including private repos.

GITHUB ACTIONS
• Branch names appear as compact chips under each run title, with a copy button.
• Tag-triggered runs are highlighted as tags and show which branch the tag came from.

PRIVACY FIRST
• No tracking, no analytics, no external servers. GitUp only talks to github.com using your existing session.
• No special permissions required.

Open source under the MIT license: https://github.com/nawinkhatiwada/GitUp

## Single purpose (Privacy practices tab)
Enhances github.com pages by displaying pull request and GitHub Actions branch/tag names with copy-to-clipboard buttons.

## Permission justification
Host access (content script on https://github.com/*): needed to read branch/tag names on GitHub pages and add
copy buttons. GitUp requests no other permissions.

Remote code: No — all code is packaged in the extension.

## Data usage (Privacy practices tab)
- Collected data types: none (leave all unchecked).
- Certify: I do not sell or transfer user data to third parties; I do not use or transfer user data for purposes
  unrelated to the item's single purpose; I do not use or transfer user data to determine creditworthiness or for
  lending purposes.

## Privacy policy URL
https://github.com/nawinkhatiwada/GitUp/blob/main/PRIVACY.md  (works once the repo is pushed and public)

## Homepage / Support URL
https://github.com/nawinkhatiwada/GitUp  ·  https://github.com/nawinkhatiwada/GitUp/issues

## Assets
- Store icon: store/store-icon-128x128.png (96px artwork + 16px transparent padding, per CWS guidelines)
- Small promo tile (440×280): store/promo-small-440x280.png
- Marquee promo tile (1400×560, optional): store/promo-marquee-1400x560.png
- Screenshots: 1280×800 or 640×400 PNG/JPEG, 1–5 images. Take them on a PUBLIC repo (no private code or
  colleagues' names): PR page bar, PR list rows, Actions runs list with a tag run.

## Screenshots (1280x800, 24-bit PNG, no alpha, 1–5)

1. Capture GitHub pages with the extension loaded and save them in `store/raw/`, named
   `1-pr.png`, `2-pr-list.png`, `3-actions.png`, `4-tags.png`, `5-dark.png`. Use any subset; each name picks its caption.
2. `python3 scripts/make_screenshots.py` → `store/screenshot-1.png` … `screenshot-5.png`
