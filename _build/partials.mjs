// Shared partials for the Gear Hub marketing site generator.
// head() builds the full <head> with per-page SEO; nav()/footer() are identical site-wide.

export const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,600&family=Schibsted+Grotesk:wght@400;500;600;700&family=Spline+Sans+Mono:wght@500;600&display=swap" rel="stylesheet"/>`;

export function head({ title, description, path, keywords = "", jsonld = [], ogType = "website", noindex = false }) {
  const url = "https://gearhub.in" + path;
  const ld = jsonld.length
    ? `\n<script type="application/ld+json">\n${JSON.stringify(jsonld.length === 1 ? jsonld[0] : { "@context": "https://schema.org", "@graph": jsonld }, null, 2)}\n</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<meta name="description" content="${description}"/>
<link rel="canonical" href="${url}"/>
<meta name="robots" content="${noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}"/>
<meta name="theme-color" content="#1d2520"/>
${keywords ? `<meta name="keywords" content="${keywords}"/>` : ""}
<meta property="og:type" content="${ogType}"/>
<meta property="og:site_name" content="Gear Hub"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${description}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="https://gearhub.in/assets/og-cover.png"/>
<meta property="og:locale" content="en_IN"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${description}"/>
<meta name="twitter:image" content="https://gearhub.in/assets/og-cover.png"/>
${FONTS}
<link rel="stylesheet" href="/assets/site.css"/>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"/>${ld}
</head>
<body>
<a href="#main" class="skip">Skip to content</a>`;
}

export const NAV = `<header class="nav">
  <input type="checkbox" id="navtoggle" class="nav-checkbox" hidden/>
  <div class="container nav-inner">
    <a class="brand" href="/">
      <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="8" cy="22" r="5"/><circle cx="24" cy="22" r="5"/><path d="M8 22 14 10h6l4 12M14 10h3M20 10l-4 12"/></svg></span>
      Gear Hub
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a href="/features/">Features</a>
      <a href="/features/multi-shop/">Multi-shop</a>
      <a href="/solutions/cycle-shops/">For Cycle Shops</a>
      <a href="/pricing/">Pricing</a>
      <a href="/blog/">Blog</a>
      <a class="nav-m-cta" href="https://app.gearhub.in/">Sign in</a>
      <a class="nav-m-cta primary" href="https://app.gearhub.in/?signup=1">Start free</a>
    </nav>
    <div class="nav-cta">
      <a class="btn" href="https://app.gearhub.in/">Sign in</a>
      <a class="btn primary" href="https://app.gearhub.in/?signup=1">Start free</a>
    </div>
    <label for="navtoggle" class="nav-toggle" aria-label="Toggle menu"><span></span><span></span><span></span></label>
  </div>
</header>`;

export const FOOTER = `<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="brand" href="/" style="margin-bottom:14px"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="8" cy="22" r="5"/><circle cx="24" cy="22" r="5"/><path d="M8 22 14 10h6l4 12M14 10h3M20 10l-4 12"/></svg></span> Gear Hub</a>
        <p style="font-size:.92rem;color:var(--ink-3);max-width:30ch">GST billing &amp; POS, built in India for India's small shops.</p>
      </div>
      <div><h4>Product</h4><ul>
        <li><a href="/features/">All features</a></li>
        <li><a href="/features/gst-billing/">GST Billing</a></li>
        <li><a href="/features/multi-shop/">Multi-shop</a></li>
        <li><a href="/pricing/">Pricing</a></li>
      </ul></div>
      <div><h4>Solutions</h4><ul>
        <li><a href="/solutions/cycle-shops/">Cycle shops</a></li>
        <li><a href="/solutions/retail-shops/">Retail shops</a></li>
        <li><a href="/solutions/service-shops/">Service shops</a></li>
      </ul></div>
      <div><h4>Company</h4><ul>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="mailto:hello@gearhub.in">hello@gearhub.in</a></li>
        <li><a href="/terms.html">Terms</a></li>
        <li><a href="/privacy.html">Privacy</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Gear Hub. Made in India 🇮🇳</span>
      <span class="mono">hello@gearhub.in</span>
    </div>
  </div>
</footer>
</body>
</html>`;

// Reusable breadcrumb + JSON-LD BreadcrumbList. trail = [{name, path}], last is current (no link).
export function crumbs(trail) {
  const html = `<div class="crumbs">` + trail.map((t, i) =>
    i === trail.length - 1 ? `<span aria-current="page">${t.name}</span>`
      : `<a href="${t.path}">${t.name}</a><span>/</span>`).join("") + `</div>`;
  const ld = {
    "@type": "BreadcrumbList",
    "itemListElement": trail.map((t, i) => ({
      "@type": "ListItem", "position": i + 1, "name": t.name,
      "item": "https://gearhub.in" + t.path
    }))
  };
  return { html, ld };
}

export const CTA = `<section class="section"><div class="container"><div class="cta-band reveal">
  <span class="eyebrow" style="color:var(--saffron)">Free for 14 days</span>
  <h2>Try it on your next sale.</h2>
  <p>No card, no installation. Set up your shop in five minutes and bill a real customer on Gear Hub today.</p>
  <a class="btn primary lg" href="https://app.gearhub.in/?signup=1">Start your free trial</a>
</div></div></section>`;
