// Pull request lists (/owner/repo/pulls and /pulls): show "<base> ← <head>" per row.
// The list HTML has no branch names, so each PR's branches are fetched
// (same-origin, so private repos work) and cached for the session.
(() => {
  const G = globalThis.GitUp;
  const LIST_PATH = /^\/(?:[^/]+\/[^/]+\/)?pulls(?:\/|$)/;
  const PR_HREF = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/;
  const ROW = '.js-issue-row, [data-testid="list-row"], [role="listitem"], [role="row"], li, .Box-row';
  const WIDGET = 'gitup-row-branches';
  const CACHE_TTL = 10 * 60 * 1000;
  const MAX_CONCURRENT = 4;

  // ---- cache (memory + sessionStorage) -------------------------------------
  const memory = new Map(); // key -> Promise<info|null>
  const storeKey = (key) => `gitup:pr-branches:${key}`;
  function readStore(key) {
    try {
      const raw = sessionStorage.getItem(storeKey(key));
      if (!raw) return null;
      const { t, info } = JSON.parse(raw);
      return Date.now() - t < CACHE_TTL ? info : null;
    } catch {
      return null;
    }
  }
  function writeStore(key, info) {
    try {
      sessionStorage.setItem(storeKey(key), JSON.stringify({ t: Date.now(), info }));
    } catch {}
  }

  // ---- fetching ------------------------------------------------------------
  let active = 0;
  const queue = [];
  const limit = (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      pump();
    });
  function pump() {
    while (active < MAX_CONCURRENT && queue.length) {
      const { fn, resolve, reject } = queue.shift();
      active++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  }

  let hovercardWorks = true; // flips off after the first miss to avoid double requests

  async function fetchHtml(url, headers = {}) {
    const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html', ...headers } });
    return res.ok ? res.text() : null;
  }

  async function fetchBranches({ owner, repo, num }) {
    const path = `/${owner}/${repo}/pull/${num}`;
    if (hovercardWorks) {
      try {
        const html = await fetchHtml(`${path}/hovercard`, { 'X-Requested-With': 'XMLHttpRequest' });
        const info = html && G.parsePrBranchesHtml(html);
        if (info) return info;
      } catch {}
      hovercardWorks = false;
    }
    try {
      const html = await fetchHtml(path);
      return (html && G.parsePrBranchesHtml(html)) || null;
    } catch {
      return null;
    }
  }

  function getBranches(pr) {
    if (memory.has(pr.key)) return memory.get(pr.key);
    const cached = readStore(pr.key);
    const p = cached
      ? Promise.resolve(cached)
      : limit(() => fetchBranches(pr)).then((info) => {
          if (info) writeStore(pr.key, info);
          else memory.delete(pr.key); // allow a retry on a later navigation
          return info;
        });
    memory.set(pr.key, p);
    return p;
  }

  // ---- DOM -----------------------------------------------------------------
  function parsePrLink(a) {
    let url;
    try {
      url = new URL(a.getAttribute('href'), location.origin);
    } catch {
      return null;
    }
    if (url.origin !== location.origin || url.hash) return null;
    const m = url.pathname.match(PR_HREF);
    return m ? { owner: m[1], repo: m[2], num: m[3], key: `${m[1]}/${m[2]}#${m[3]}` } : null;
  }

  /** Map each list row to its first (title) PR link. */
  function collectRows() {
    const root = document.querySelector('main') || document.body;
    const rows = new Map();
    for (const a of root.querySelectorAll('a[href*="/pull/"]')) {
      if (G.isOurs(a)) continue;
      const row = a.closest(ROW);
      if (!row || rows.has(row)) continue;
      const pr = parsePrLink(a);
      if (pr) rows.set(row, { a, pr });
    }
    return rows;
  }

  /**
   * The row's meta line ("#123 · user opened … · Review required · ✓ 4/4").
   * Elements are matched on their full textContent because React often splits
   * "#123" into separate text nodes ("#", "123"). In document order the first
   * match is the outermost one, i.e. the whole line — as long as it doesn't
   * also contain the title link.
   */
  function findMetaLine(row, titleLink, num) {
    const startsWithNum = new RegExp(`^\\s*#\\s*${num}(?!\\d)`);
    for (const el of row.querySelectorAll('*')) {
      if (el.contains(titleLink) || titleLink.contains(el) || G.isOurs(el)) continue;
      if (startsWithNum.test(el.textContent || '')) return el;
    }
    return null;
  }

  /**
   * The CI checks counter ("4/4") in the meta line. Returns the *innermost*
   * element whose text is just that (usually the link itself): outer wrappers
   * can be stretched flex items, which would push our widget to the far right.
   */
  function findChecks(meta) {
    const isCount = (el) => /^\s*\d+\s*\/\s*\d+\s*$/.test(el.textContent || '');
    let found = null;
    for (const el of meta.querySelectorAll('*')) {
      if (G.isOurs(el) || !isCount(el)) continue;
      if (!found || found.contains(el)) found = el; // keep descending
    }
    return found;
  }

  function processRow(row, a, pr) {
    let widget = row.querySelector(`.${WIDGET}`);
    if (widget && widget.dataset.key === pr.key) return; // already done / in flight
    widget?.remove();

    widget = document.createElement('span');
    widget.className = `${WIDGET} gitup-row-branches--loading`;
    widget.dataset.gitup = '';
    widget.dataset.key = pr.key;
    widget.textContent = '…';
    widget.title = 'GitUp: loading branches';

    const meta = findMetaLine(row, a, pr.num);
    if (meta) {
      widget.classList.add('gitup-row-branches--meta');
      const checks = findChecks(meta);
      if (checks) checks.insertAdjacentElement('afterend', widget);
      else meta.appendChild(widget);
    } else {
      const heading = a.closest('h1, h2, h3, h4');
      const target = heading && row.contains(heading) ? heading : a;
      target.insertAdjacentElement('afterend', widget);
    }

    getBranches(pr).then((info) => {
      if (!widget.isConnected || widget.dataset.key !== pr.key) return;
      widget.classList.remove('gitup-row-branches--loading');
      widget.removeAttribute('title');
      if (!info) {
        widget.hidden = true; // keep the marker so we don't refetch on every DOM change
        return;
      }
      widget.replaceChildren(...G.buildBranchPair(info, { compact: true }));
    });
  }

  G.prListBranches = {
    matches: (path) => LIST_PATH.test(path),
    run() {
      for (const [row, { a, pr }] of collectRows()) processRow(row, a, pr);
    },
  };
})();
