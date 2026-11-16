// Pull request page: show "into <base> ← from <head>" with copy buttons.
(() => {
  const G = globalThis.GitUp;
  const PR_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/|$)/;
  const BAR_CLASS = 'gitup-pr-branches';

  function render(info) {
    const key = `${info.base.branch}\u0000${info.head.branch}`;
    const existing = document.querySelector(`.${BAR_CLASS}`);
    if (existing && existing.dataset.key === key) return;
    existing?.remove();

    const bar = document.createElement('div');
    bar.className = BAR_CLASS;
    bar.dataset.gitup = '';
    bar.dataset.key = key;
    bar.append(...G.buildBranchPair(info));
    info.anchor.insertAdjacentElement('afterend', bar);
  }

  G.prBranches = {
    matches: (path) => PR_PATH.test(path),
    run() {
      const info = G.findPrBranches(document);
      if (info) render(info);
    },
  };
})();
