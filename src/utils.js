// Shared helpers. All content scripts share this isolated world, so features
// hang off a single global namespace.
(() => {
  const G = (globalThis.GitUp = globalThis.GitUp || {});

  // GitHub Octicons (MIT) — static markup only, never user data.
  G.icons = {
    copy:
      '<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>',
    check:
      '<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>',
    branch:
      '<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path></svg>',
    tag:
      '<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"></path></svg>',
    arrowLeft:
      '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"></path></svg>',
  };

  const safeDecode = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  /**
   * Git ref names cannot contain ':' — so "owner:branch" or "owner/repo:branch"
   * (how GitHub labels fork heads) reduces to the part after the last colon.
   */
  G.cleanBranch = (text) => {
    let t = (text || '').trim();
    if (!t) return null;
    if (t.includes(':')) t = t.slice(t.lastIndexOf(':') + 1).trim();
    if (!t || /\s/.test(t) || t.length > 255) return null;
    return t;
  };

  /** Extract a branch from "/owner/repo/tree/<branch>" or "?query=branch:<branch>". */
  G.branchFromHref = (href) => {
    if (!href) return null;
    let url;
    try {
      url = new URL(href, location.origin);
    } catch {
      return null;
    }
    if (url.origin !== location.origin) return null;

    const tree = url.pathname.match(/^\/[^/]+\/[^/]+\/tree\/(.+?)\/?$/);
    if (tree) return G.cleanBranch(safeDecode(tree[1]));

    const query = url.searchParams.get('query');
    if (query) {
      const m = query.match(/(?:^|\s)branch:(?:"([^"]+)"|(\S+))/);
      if (m) return G.cleanBranch(m[1] || m[2]);
    }
    return null;
  };

  G.copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for contexts where the async clipboard API is blocked.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {}
      ta.remove();
      return ok;
    }
  };

  let toastTimer = null;
  G.toast = (message, ok = true) => {
    let el = document.querySelector('.gitup-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'gitup-toast';
      el.dataset.gitup = '';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.toggle('gitup-toast--error', !ok);
    el.classList.add('gitup-toast--show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('gitup-toast--show'), 1600);
  };

  G.createCopyButton = (text, what = 'branch') => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gitup-copy-btn';
    btn.dataset.gitup = '';
    btn.title = `Copy ${what}: ${text}`;
    btn.setAttribute('aria-label', `Copy ${what} name ${text}`);
    btn.innerHTML = G.icons.copy;

    let resetTimer = null;
    btn.addEventListener('click', async (e) => {
      // Branch labels often live inside clickable rows/links — don't navigate.
      e.preventDefault();
      e.stopPropagation();
      const ok = await G.copyText(text);
      G.toast(ok ? `Copied “${text}”` : 'Copy failed', ok);
      if (!ok) return;
      btn.innerHTML = G.icons.check;
      btn.classList.add('gitup-copy-btn--done');
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        btn.innerHTML = G.icons.copy;
        btn.classList.remove('gitup-copy-btn--done');
      }, 1500);
    });
    return btn;
  };

  G.isOurs = (el) => !!el.closest('[data-gitup]');

  // Shared request limiter so features don't hammer github.com.
  const MAX_CONCURRENT = 4;
  let active = 0;
  const queue = [];
  const pump = () => {
    while (active < MAX_CONCURRENT && queue.length) {
      const { fn, resolve, reject } = queue.shift();
      active++;
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  };
  G.limit = (fn) => new Promise((resolve, reject) => (queue.push({ fn, resolve, reject }), pump()));

  /** Session cache (memory + sessionStorage). fn's falsy results are not stored. */
  const memo = new Map();
  G.cached = (key, ttlMs, fn) => {
    if (memo.has(key)) return memo.get(key);
    const sk = `gitup:${key}`;
    try {
      const hit = JSON.parse(sessionStorage.getItem(sk) || 'null');
      if (hit && Date.now() - hit.t < ttlMs) {
        const p = Promise.resolve(hit.v);
        memo.set(key, p);
        return p;
      }
    } catch {}
    const p = G.limit(fn)
      .catch(() => null)
      .then((v) => {
        if (v) {
          try {
            sessionStorage.setItem(sk, JSON.stringify({ t: Date.now(), v }));
          } catch {}
        } else memo.delete(key);
        return v;
      });
    memo.set(key, p);
    return p;
  };
})();
