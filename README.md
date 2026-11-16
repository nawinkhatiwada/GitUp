<p align="center">
  <img src="icons/icon128.png" width="96" alt="GitUp logo">
</p>

<h1 align="center">GitUp – Pro tools for GitHub</h1>

<p align="center">
  A tiny Chrome extension that makes github.com feel pro: see and copy PR branches everywhere, and get clean
  branch/tag chips in GitHub Actions.
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-2ea44f">
  <img alt="No permissions" src="https://img.shields.io/badge/permissions-none-2ea44f">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue">
</p>

---

![Base ← head branches on every row of PR lists](store/screenshot-1.png)

![Branch & tag chips with copy in GitHub Actions](store/screenshot-2.png)

## Features

### Pull requests
- A bar under the PR title showing `INTO <base> ← FROM <head>`, each with a one-click copy button.
- Fork PRs show `user:branch`, but copying gives just `branch`, ready for `git checkout`.

### Pull request lists
- Every row on `/owner/repo/pulls` and your global `/pulls` dashboard shows `<base> ← <head>` with copy buttons.
- Works on private repos too. Branches are fetched from github.com with your existing session (4 at a time, cached for
  10 minutes per tab).

### GitHub Actions
- **Runs list:** the branch or tag appears as a compact chip with a copy button under each run title.
- **Run detail pages:** GitHub's branch label is restyled in place with a copy button.
- Branches are green and tags are amber. Tag-triggered runs also show the branch the tag points into:
  `v1.2.0 ⧉ on ⑂ main ⧉`.

Copying shows a checkmark and a toast. Styling follows GitHub's own theme, so light and dark mode both work.

## Install

### Chrome Web Store
_Coming soon._ The link will be added here once the listing is approved.

### From source
1. Download or clone this repo:
   ```
   git clone https://github.com/nawinkhatiwada/GitUp.git
   ```
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `GitUp` folder.
4. Refresh any open GitHub tabs.

Works in Chrome, Edge, Brave, Arc and other Chromium browsers.

## Privacy

GitUp has **no tracking, no analytics and no servers**. It runs only on `https://github.com/*`, talks only to
github.com using your existing session, and asks for no browser permissions. See the full
[privacy policy](PRIVACY.md).

## Development

```
manifest.json                     MV3 manifest (no permissions needed)
src/utils.js                      icons, clipboard, toast, branch parsing helpers
src/branches.js                   PR base/head detection + branch chip rendering (shared)
src/features/pr-branches.js       PR base/head bar
src/features/pr-list-branches.js  base/head per row on PR lists
src/features/actions-branches.js  Actions branch copy buttons
src/main.js                       runs features on load + GitHub SPA navigation
src/styles.css
```

Each feature exposes `{ matches(pathname), run() }` and is registered in `src/main.js`. `run()` must be idempotent
because it's re-invoked on DOM changes.

After editing code, click the reload icon on the extension card in `chrome://extensions`, then refresh GitHub.

GitHub changes its markup often, so detection uses layered fallbacks (classic selectors → link heuristics → text
parsing). If something stops appearing, check the selectors in the relevant feature file.

### Releasing

```
python3 scripts/make_icons.py        # regenerate icons/ and store/ promo tiles (needs Pillow)
python3 scripts/make_screenshots.py  # store/raw/*.png -> store/screenshot-N.png
./scripts/package.sh                 # -> dist/gitup-<version>.zip for the Chrome Web Store
```

Bump `version` in `manifest.json` for every store upload. Store listing copy and privacy answers live in
[`store/LISTING.md`](store/LISTING.md).

## Contributing

Bug reports and PRs are welcome. Please [open an issue](https://github.com/nawinkhatiwada/GitUp/issues) if a
feature stops working after a GitHub UI change, and include the page URL pattern.

## Author

Nabin Khatiwada · [@nawinkhatiwada](https://github.com/nawinkhatiwada)

## License

MIT, see [LICENSE](LICENSE).
