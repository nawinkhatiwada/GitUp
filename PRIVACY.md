# GitUp — Privacy Policy

_Last updated: 2026-11-12_

GitUp is a browser extension that adds branch information and copy buttons to github.com.

## What GitUp does with data

- **Runs only on `https://github.com/*`.** It reads the GitHub page you are viewing to find branch and tag names.
- **Talks only to github.com.** To show branches on PR lists and for tag-triggered Actions runs, it requests pages
  from github.com (e.g. a PR page, a PR hovercard, or the "branches containing this commit" fragment). These requests
  are made by your browser with your existing GitHub session, exactly as if you opened those pages yourself.
- **Stores only a short-lived cache** of branch names in your browser's `sessionStorage` for github.com
  (expires after 10 minutes and is cleared when the tab closes).
- **Clipboard:** writes a branch/tag name to your clipboard only when you click a copy button. It never reads your clipboard.

## What GitUp does NOT do

- No analytics, tracking, telemetry or advertising.
- No data is sent to the developer or any third party. There is no GitUp server.
- No personal information, credentials, or browsing history is collected, stored, sold or shared.

## Permissions

GitUp requests no special browser permissions. It only declares a content script for `https://github.com/*`.

## Contact

Developer: Nabin Khatiwada — https://github.com/nawinkhatiwada

Questions or issues: https://github.com/nawinkhatiwada/GitUp/issues
