// Shared PR branch detection + rendering, used by the PR page and the PR list.
(() => {
  const G = globalThis.GitUp;
  const STICKY = '.gh-header-sticky, .js-sticky';
  const usable = (el) => !G.isOurs(el) && !el.closest(STICKY);

  /** { branch (what gets copied), label (what's shown, may be "user:branch") } */
  function refFrom(el) {
    const label = (el.textContent || '').replace(/\s+/g, ' ').trim();
    const title = el.getAttribute('title') || '';
    const link = el.matches('a[href]') ? el : el.querySelector('a[href]');
    const branch =
      (title.includes(':') && G.cleanBranch(title)) ||
      (link && G.branchFromHref(link.getAttribute('href'))) ||
      G.cleanBranch(label);
    return branch ? { branch, label: label || branch } : null;
  }

  // Strategy 1: classic markup (.commit-ref.base-ref / .head-ref) — PR page and hovercards.
  function fromCommitRefs(root) {
    const all = (sel) => [...root.querySelectorAll(sel)].filter(usable);
    let b = all('.commit-ref.base-ref')[0];
    let h = all('.commit-ref.head-ref')[0];
    if (!b || !h) {
      const refs = all('.commit-ref');
      if (refs.length !== 2) return null;
      [b, h] = refs; // hovercards render "base ← head"
    }
    const base = refFrom(b);
    const head = refFrom(h);
    if (!base || !head) return null;
    return { base, head, anchor: b.closest('.gh-header-meta') || b.parentElement };
  }

  // Strategy 2: newer UI — a short block reading "... into <link> from <link>".
  const SENTENCE = /(wants to merge|merged|merging)[\s\S]*?\binto\b[\s\S]*?\bfrom\b/i;
  function fromSentenceLinks(root) {
    const links = [...root.querySelectorAll('a[href*="/tree/"]')].filter(usable);
    for (const link of links) {
      let node = link.parentElement;
      for (let i = 0; node && i < 6; i++, node = node.parentElement) {
        const text = node.textContent || '';
        if (text.length > 600) break;
        if (!SENTENCE.test(text)) continue;
        const inner = [...node.querySelectorAll('a[href*="/tree/"]')].filter(usable);
        if (inner.length < 2) continue;
        const base = refFrom(inner[0]);
        const head = refFrom(inner[1]);
        if (base && head) return { base, head, anchor: node };
      }
    }
    return null;
  }

  // Strategy 3: plain text (e.g. head on a deleted fork has no link).
  const TEXT_RE = /(?:wants to merge|merged)\s+\d+\s+commits?\s+into\s+(\S+)\s+from\s+(\S+)/i;
  function fromText(root) {
    const doc = root.ownerDocument || root;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        /wants to merge|merged/i.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });
    let n;
    while ((n = walker.nextNode())) {
      let node = n.parentElement;
      for (let i = 0; node && i < 4; i++, node = node.parentElement) {
        if (!usable(node)) break;
        const m = (node.textContent || '').replace(/\s+/g, ' ').match(TEXT_RE);
        if (!m) continue;
        const base = G.cleanBranch(m[1]);
        const head = G.cleanBranch(m[2]);
        if (base && head) {
          return { base: { branch: base, label: m[1] }, head: { branch: head, label: m[2] }, anchor: node };
        }
      }
    }
    return null;
  }

  // Strategy 4 (fetched HTML only): React payload embedded as JSON.
  function fromEmbeddedJson(html) {
    const grab = (key) => {
      const m = html.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
      if (!m) return null;
      try {
        return G.cleanBranch(JSON.parse(`"${m[1]}"`));
      } catch {
        return null;
      }
    };
    const base = grab('baseRefName');
    const head = grab('headRefName');
    return base && head ? { base: { branch: base, label: base }, head: { branch: head, label: head } } : null;
  }

  /** Find base/head in a live document or element. */
  G.findPrBranches = (root) => {
    const r = root.querySelector?.('main') || root.body || root;
    return fromCommitRefs(r) || fromSentenceLinks(r) || fromText(r);
  };

  /** Find base/head in fetched HTML (PR page or hovercard). */
  G.parsePrBranchesHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const hit = fromCommitRefs(doc.body) || fromEmbeddedJson(html) || fromText(doc.body);
    return hit ? { base: hit.base, head: hit.head } : null;
  };

  function chip(role, ref, compact) {
    const wrap = document.createElement('span');
    wrap.className = `gitup-ref gitup-ref--${role}`;

    if (!compact) {
      const label = document.createElement('span');
      label.className = 'gitup-ref-label';
      label.textContent = role === 'base' ? 'into' : 'from';
      wrap.appendChild(label);
    }

    const name = document.createElement('span');
    name.className = 'gitup-chip';
    name.title = `${role === 'base' ? 'Base (to)' : 'Head (from)'}: ${ref.label}`;
    name.insertAdjacentHTML('afterbegin', G.icons.branch);
    const text = document.createElement('span');
    text.className = 'gitup-chip-text';
    text.textContent = ref.label;
    name.appendChild(text);

    wrap.append(name, G.createCopyButton(ref.branch, role === 'base' ? 'base branch' : 'head branch'));
    return wrap;
  }

  /** Nodes for "<base> [copy] ← <head> [copy]". */
  G.buildBranchPair = (info, { compact = false } = {}) => {
    const arrow = document.createElement('span');
    arrow.className = 'gitup-arrow';
    arrow.innerHTML = G.icons.arrowLeft;
    return [chip('base', info.base, compact), arrow, chip('head', info.head, compact)];
  };
})();
