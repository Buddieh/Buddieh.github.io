/*
 * Buddieh hub badge: a small "back to Buddieh" link for project sites.
 *
 * Add one line before </body> in any project site:
 *   <script src="https://buddieh.com/hub.js" defer></script>
 *   (https://buddieh.github.io/hub.js keeps working too: GitHub redirects it)
 *
 * Options (attributes on that script tag):
 *   data-position="left" | "right"   corner to sit in (default: the page's
 *                                    start corner, so left for LTR, right for RTL)
 *   data-theme="light" | "dark"      force a colour scheme (default: follows the
 *                                    visitor's light/dark setting)
 *
 * Edit this one file to change the badge on every project site.
 */
(function () {
  var host = location.hostname;
  if (location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1') return;
  if (document.getElementById('buddieh-hub')) return;

  var script = document.currentScript || document.querySelector('script[src*="hub.js"]');
  var opt = function (k) { return script && script.getAttribute('data-' + k); };

  // The hub is the site this script is served from, so the link keeps
  // working if the sites move to a custom domain.
  var home = script && script.src ? new URL('/', script.src).href : '/';

  var rtl = (document.documentElement.getAttribute('dir') || getComputedStyle(document.documentElement).direction) === 'rtl';
  var side = opt('position') || (rtl ? 'right' : 'left');
  var theme = opt('theme');

  var css =
    '#buddieh-hub{position:fixed;bottom:16px;' + side + ':16px;z-index:2147483000;' +
    'display:flex;align-items:center;gap:0;height:40px;padding:0 7px;border-radius:999px;' +
    'background:#F6F5EF;color:#22242A;border:2px solid #22242A;box-shadow:3px 3px 0 #22242A;' +
    'font:500 13px/1 "IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;text-decoration:none;' +
    'direction:ltr;opacity:.92;transition:transform .12s ease,box-shadow .12s ease,opacity .12s ease}' +
    '#buddieh-hub svg{width:26px;height:22px;flex:none;display:block}' +
    '#buddieh-hub span{max-width:0;overflow:hidden;white-space:nowrap;transition:max-width .2s ease,margin .2s ease}' +
    '#buddieh-hub:hover,#buddieh-hub:focus-visible{opacity:1;transform:translate(-1px,-1px);box-shadow:4px 4px 0 #22242A}' +
    '#buddieh-hub:hover span,#buddieh-hub:focus-visible span{max-width:12em;margin:0 6px 0 8px}' +
    '#buddieh-hub:focus-visible{outline:3px solid #2B5BD7;outline-offset:3px}' +
    (theme === 'light' ? '' :
      (theme === 'dark' ? '' : '@media (prefers-color-scheme:dark){') +
      '#buddieh-hub{background:#22242A;color:#F6F5EF;border-color:#F6F5EF;box-shadow:3px 3px 0 #000}' +
      (theme === 'dark' ? '' : '}')) +
    '@media (prefers-reduced-motion:reduce){#buddieh-hub,#buddieh-hub span{transition:none}}' +
    '@media print{#buddieh-hub{display:none}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var a = document.createElement('a');
  a.id = 'buddieh-hub';
  a.href = home;
  a.title = 'Made by Shahdad "Buddieh" Neshin';
  a.setAttribute('aria-label', 'Made by Shahdad "Buddieh" Neshin: go to the homepage');
  a.innerHTML =
    '<svg viewBox="4 10 92 74" aria-hidden="true"><circle cx="24" cy="22" r="8" fill="#E4572E" stroke="currentColor" stroke-width="5"/>' +
    '<path d="M8 80 C8 40 47 40 47 80 C47 30 92 30 92 80 Z" fill="#F2B92E" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg>' +
    '<span>by Buddieh</span>';
  document.body.appendChild(a);
})();
