// Entry point: run features on load and after GitHub's client-side navigations.
(() => {
  const G = globalThis.GitUp;
  const features = [G.prBranches, G.prListBranches, G.actionsBranches].filter(Boolean);

  let timer = null;
  function run() {
    timer = null;
    for (const f of features) {
      try {
        if (f.matches(location.pathname)) f.run();
      } catch (err) {
        console.debug('[GitUp]', err);
      }
    }
  }
  // Throttled: GitHub mutates the DOM constantly; one pass per 200ms is plenty.
  const schedule = () => {
    if (!timer) timer = setTimeout(run, 200);
  };

  for (const ev of ['turbo:load', 'turbo:render', 'pjax:end']) document.addEventListener(ev, schedule);
  window.addEventListener('popstate', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

  run();
})();
