// GitHub Actions (runs list + run detail):
//  - restyle branch labels as compact chips with a copy button
//  - for tag-triggered runs, mark the label as a tag and show the branch(es)
//    containing the tagged commit ("v1.2.0 ⧉ on ⑂ main ⧉")
(() => {
  const G = globalThis.GitUp;
  const ACTIONS_PATH = /^\/([^/]+)\/([^/]+)\/actions(?:\/|$)/;

  const CANDIDATES = [
    '.branch-name',
    '[class*="BranchName"]',
    'a[href*="/tree/"]',
    'a[href*="query=branch"]',
  ].join(',');

  // Skip menus/filters/nav — those list branches as options, not run metadata.
  const EXCLUDE =
    '[data-gitup], [role="menu"], [role="listbox"], [role="dialog"], details-menu, .SelectMenu, nav, header, .UnderlineNav';
  const ROW = '.Box-row, [role="row"], [role="listitem"], tr, li';
  const SHA_RE = /\/commit\/([0-9a-f]{7,40})(?:[/?#]|$)/;
  const RUN_RE = /\/actions\/runs\/(\d+)/;
  const TTL = 10 * 60 * 1000;
  const MAX_ON_BRANCHES = 2;
  const DONE = 'gitupDone';

  function branchOf(el) {
    const link = el.matches('a[href]') ? el : el.querySelector('a[href]');
    return (
      (link && G.branchFromHref(link.getAttribute('href'))) ||
      ((el.getAttribute('title') || '').trim() && G.cleanBranch(el.getAttribute('title'))) ||
      G.cleanBranch(el.textContent)
    );
  }

  // If the label sits inside a CSS-truncation wrapper, put the button outside it.
  function insertionPoint(el) {
    const parent = el.parentElement;
    if (parent && /truncate/i.test(parent.className) && parent.childElementCount === 1) return parent;
    return el;
  }

  const smallCopy = (text, what) => {
    const btn = G.createCopyButton(text, what);
    btn.classList.add('gitup-copy-btn--sm');
    return btn;
  };

  // ---- tag → branches ------------------------------------------------------

  /** "Branches/tags containing this commit" — same endpoint the commit page uses. */
  function refsContaining(repo, sha) {
    return G.cached(`bc:${repo}:${sha}`, TTL, async () => {
      const res = await fetch(`${repo}/branch_commits/${sha}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json, text/html;q=0.9', 'X-Requested-With': 'XMLHttpRequest' },
      });
      return res.ok ? parseBranchCommits(await res.text()) : null;
    });
  }

  function parseBranchCommits(text) {
    try {
      const j = JSON.parse(text);
      const names = (arr) =>
        (Array.isArray(arr) ? arr : [])
          .map((x) => (typeof x === 'string' ? x : x && (x.branch || x.name)))
          .filter(Boolean);
      if (j && (j.branches || j.tags)) return { branches: names(j.branches), tags: names(j.tags) };
    } catch {}
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const branches = [];
    const tags = [];
    for (const a of doc.querySelectorAll('a[href*="/tree/"], a[href*="/releases/tag/"]')) {
      const name = (a.textContent || '').trim();
      if (!name) continue;
      const isTag = /\/releases\/tag\//.test(a.getAttribute('href')) || a.closest('.branches-tag-list');
      (isTag ? tags : branches).push(name);
    }
    return branches.length || tags.length ? { branches, tags } : null;
  }

  /** Head commit of a run, read from its page (used when the list row has no commit link). */
  function shaForRun(repo, runId) {
    return G.cached(`run-sha:${repo}:${runId}`, TTL, async () => {
      const res = await fetch(`${repo}/actions/runs/${runId}`, { credentials: 'same-origin' });
      if (!res.ok) return null;
      const m = (await res.text()).match(/\/commit\/([0-9a-f]{40})/);
      return m ? m[1] : null;
    });
  }

  const looksLikeTag = (ref) => /^v?\d+(\.\d+)+/i.test(ref) || /^(release|rel)[-/]?v?\d/i.test(ref);

  async function findSha(el, repo, ref, knownTag = false) {
    const scope = el.closest(ROW) || document.querySelector('main') || document.body;
    for (const a of scope.querySelectorAll('a[href*="/commit/"]')) {
      const m = a.getAttribute('href').match(SHA_RE);
      if (m) return m[1];
    }
    // No commit link: only pay for a run-page fetch when the ref looks like a tag.
    if (!knownTag && !looksLikeTag(ref)) return null;
    const runLink = scope.querySelector('a[href*="/actions/runs/"]');
    const id = (runLink && runLink.getAttribute('href').match(RUN_RE)?.[1]) || location.pathname.match(RUN_RE)?.[1];
    return id ? shaForRun(repo, id) : null;
  }

  function branchChip(name) {
    const chip = document.createElement('span');
    chip.className = 'gitup-chip';
    chip.title = `Branch containing this tag: ${name}`;
    chip.insertAdjacentHTML('afterbegin', G.icons.branch);
    const t = document.createElement('span');
    t.className = 'gitup-chip-text';
    t.textContent = name;
    chip.appendChild(t);
    return chip;
  }

  /** scopeEl: where to look for the commit; chipEl: the label to mark as a tag. */
  function markTag(chipEl, btn, ref) {
    chipEl.classList.add('gitup-actions-ref--tag');
    btn.title = `Copy tag: ${ref}`;
    btn.setAttribute('aria-label', `Copy tag name ${ref}`);
  }

  /**
   * scopeEl: where to look for the commit; chipEl: the label to mark as a tag.
   * isTag: true/false when known from a "refs/tags/…" / "refs/heads/…" prefix, null if unknown.
   */
  async function resolveTag(scopeEl, chipEl, btn, ref, repo, isTag = null) {
    if (isTag === false) return;
    if (isTag) markTag(chipEl, btn, ref);
    const sha = await findSha(scopeEl, repo, ref, isTag === true);
    if (!sha) return;
    const refs = await refsContaining(repo, sha);
    if (!refs || !chipEl.isConnected) return;
    if (!isTag) {
      if (!refs.tags.includes(ref) || refs.branches.includes(ref)) return;
      markTag(chipEl, btn, ref);
    }
    if (!refs.branches.length || btn.nextElementSibling?.classList.contains('gitup-actions-on')) return;

    // Prefer the default-ish branches first.
    const order = (b) => ['main', 'master', 'dev', 'develop'].indexOf(b) >>> 0;
    const branches = [...refs.branches].sort((a, b) => order(a) - order(b));

    const on = document.createElement('span');
    on.className = 'gitup-actions-on';
    on.dataset.gitup = '';
    const label = document.createElement('span');
    label.className = 'gitup-actions-on-label';
    label.textContent = 'on';
    on.appendChild(label);
    for (const b of branches.slice(0, MAX_ON_BRANCHES)) on.append(branchChip(b), smallCopy(b, 'branch'));
    if (branches.length > MAX_ON_BRANCHES) {
      const more = document.createElement('span');
      more.className = 'gitup-actions-more';
      more.textContent = `+${branches.length - MAX_ON_BRANCHES}`;
      more.title = branches.slice(MAX_ON_BRANCHES).join('\n');
      on.appendChild(more);
    }
    btn.insertAdjacentElement('afterend', on);
  }

  // ---- runs list: render directly under the run title ------------------

  /** "refs/heads/x" → branch x, "refs/tags/v1" → tag v1, anything else → unknown. */
  function parseRef(raw) {
    if (raw.startsWith('refs/tags/')) return { ref: raw.slice(10), isTag: true };
    if (raw.startsWith('refs/heads/')) return { ref: raw.slice(11), isTag: false };
    return { ref: raw, isTag: null };
  }

  /** The visible run title link (ignores hidden/overlay/screen-reader links). */
  function findTitle(row, sideLabel) {
    const links = [...row.querySelectorAll('a[href*="/actions/runs/"]')].filter((a) => {
      if (sideLabel.contains(a) || G.isOurs(a) || !(a.textContent || '').trim()) return false;
      const r = a.getBoundingClientRect();
      return r.width > 20 && r.height > 8;
    });
    return links.sort((x, y) => y.textContent.trim().length - x.textContent.trim().length)[0] || null;
  }

  function renderBelow(el, ref, isTag, repo) {
    const row = el.closest(ROW);
    if (!row) return false;
    if (row.querySelector('.gitup-run-ref')) return true; // already rendered for this row
    const title = findTitle(row, el);
    if (!title) return false;

    // Insert after the title's heading, or after the outermost wrapper holding only the title.
    let target = title.closest('h1, h2, h3, h4');
    if (!target || !row.contains(target)) {
      target = title;
      while (target.parentElement && target.parentElement !== row && target.parentElement.childElementCount === 1) {
        target = target.parentElement;
      }
    }

    const wrap = document.createElement('div');
    wrap.className = 'gitup-run-ref';
    wrap.dataset.gitup = '';
    const chip = document.createElement('span');
    chip.className = 'gitup-actions-ref';
    chip.title = ref;
    const text = document.createElement('span');
    text.className = 'gitup-chip-text'; // ellipsis for long names
    text.textContent = ref;
    chip.appendChild(text);
    const btn = smallCopy(ref, 'branch');
    wrap.append(chip, btn);
    target.insertAdjacentElement('afterend', wrap);

    insertionPoint(el).classList.add('gitup-hidden'); // hide GitHub's side-column label
    resolveTag(row, chip, btn, ref, repo, isTag).catch(() => {});
    return true;
  }

  // ---- main ----------------------------------------------------------------

  G.actionsBranches = {
    matches: (path) => ACTIONS_PATH.test(path),
    run() {
      const [, owner, name] = location.pathname.match(ACTIONS_PATH);
      const repo = `/${owner}/${name}`;
      const root = document.querySelector('main') || document.body;
      for (const el of root.querySelectorAll(CANDIDATES)) {
        if (el.dataset[DONE] || el.closest(EXCLUDE)) continue;
        // Avoid double handling when a .branch-name wraps a branch link (or vice versa).
        if (el.parentElement?.closest('[data-gitup-done]') || el.querySelector('[data-gitup-done]')) continue;

        const raw = branchOf(el);
        if (!raw) continue;
        const { ref, isTag } = parseRef(raw);
        if (!ref) continue;
        el.dataset[DONE] = '1';

        // Runs list rows: show under the run title. Elsewhere (run page): style in place.
        if (renderBelow(el, ref, isTag, repo)) continue;

        el.classList.add('gitup-actions-ref');
        const btn = smallCopy(ref, 'branch');
        insertionPoint(el).insertAdjacentElement('afterend', btn);
        resolveTag(el, el, btn, ref, repo, isTag).catch(() => {});
      }
    },
  };
})();
