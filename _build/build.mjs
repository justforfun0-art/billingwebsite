// Static site generator for the Pride POS marketing site.
// Assembles every sub-page from shared partials + a per-page body, writing clean-URL folders
// (e.g. /features/gst-billing/index.html). Run: node web/_build/build.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { head, NAV, FOOTER, CTA, crumbs } from "./partials.mjs";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORG = { "@type": "Organization", "@id": "https://pridepos.com/#org", "name": "Pride POS", "url": "https://pridepos.com/", "email": "support@pridepos.com", "areaServed": "IN" };

// Helper builders ----------------------------------------------------------
const featureLD = (name, desc, url) => ({
  "@type": "SoftwareApplication", name: "Pride POS", applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS, Windows, macOS", description: desc, url,
  offers: { "@type": "Offer", price: "399", priceCurrency: "INR" }
});
const faqLD = (items) => ({ "@type": "FAQPage", mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const faqHtml = (items) => `<div class="faq">${items.map(([q, a], i) => `<details${i === 0 ? " open" : ""}><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`;
const hero = (eyebrow, h1, lede, art = null, primary = "Start free trial") => {
  const copy = `<div class="reveal"${art ? "" : ' style="max-width:760px"'}>
  <span class="eyebrow">${eyebrow}</span><h1>${h1}</h1><p class="lede">${lede}</p>
  <div class="hero-cta"><a class="btn primary lg" href="https://app.pridepos.com/?signup=1">${primary}</a><a class="btn lg" href="/pricing/">See pricing</a></div>
</div>`;
  if (!art) return `<section class="hero"><div class="container">${copy}</div></section>`;
  return `<section class="hero"><div class="container hero-grid">${copy}
  <div class="reveal hero-art" style="animation-delay:.12s"><img src="${art.src}" width="400" height="340" alt="${art.alt}"/></div>
</div></section>`;
};
const cardsSec = (eyebrow, h2, cards, cls = "paper2") => `<section class="section ${cls}"><div class="container">
  <div class="sh"><span class="eyebrow">${eyebrow}</span><h2>${h2}</h2></div>
  <div class="grid c3">${cards.map((c, i) => `<article class="card${c.teal ? " teal" : ""} reveal" style="animation-delay:${(i % 3) * .06}s"><h3>${c.h}</h3><p>${c.p}</p></article>`).join("")}</div>
</div></section>`;

// Comparison table cell: true=yes, false=no, string=partial/text.
const cmpCell = (v, gh = false) => {
  const cls = gh ? ' class="gh"' : "";
  if (v === true) return `<td${gh ? ' class="gh yes"' : ' class="yes"'}>✓</td>`;
  if (v === false) return `<td${cls}><span class="no">✕</span></td>`;
  return `<td${cls}><span class="partial">${v}</span></td>`;
};
// rows: [label, tally, marg, generic, pridepos]
const comparisonTable = (cols, rows) => `<div class="cmp-wrap"><table class="cmp">
  <thead><tr><th></th>${cols.map((c, i) => i === cols.length - 1
    ? `<th class="gh">${c}<small>YOU ARE HERE</small></th>` : `<th>${c}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((v, i) => cmpCell(v, i === r.length - 2)).join("")}</tr>`).join("")}</tbody>
</table></div>`;

const PAGES = [];

// ── Features hub (overview of everything) ────────────────────────────────
// Full feature inventory, grouped. `link` turns a card into a link to a deep page.
const FEATURE_GROUPS = [
  { eyebrow: "Billing & GST", h2: "Invoicing that's compliant by default", cards: [
    { h: "GST invoicing", p: "HSN/SAC codes, automatic CGST/SGST/IGST split by place of supply, round-off and amount-in-words.", link: "/features/gst-billing/", teal: true },
    { h: "e-Invoice IRN", p: "Generate and print the IRN with a signed QR code where the law requires it." },
    { h: "GSTR-1 & GSTR-3B", p: "Portal-ready GSTR-1 JSON, HSN summary and a full GSTR-3B with ITC and legal set-off." },
    { h: "Credit & debit notes", p: "CDNR/CDNUR notes for returns and corrections that flow into your filing." },
    { h: "GSTR-2B reconcile", p: "Import 2B and match it against your purchases to protect input credit." },
    { h: "B2B & B2C modes", p: "Switch bill type per sale; place-of-supply and tax handled automatically." },
    { h: "Inclusive or exclusive tax", p: "Choose whether prices are GST-on-top or GST-inside (MRP); the whole app follows your setting." },
    { h: "Nil, exempt & RCM", p: "Handle zero-rated, exempt and reverse-charge supplies the way the law expects." },
    { h: "Tally export", p: "Export vouchers for your CA in a Tally-friendly shape." },
    { h: "Penny-perfect totals", p: "Money is computed in integer paise, so a printed total never drifts from the saved value." },
  ]},
  { eyebrow: "Point of sale", h2: "A counter that keeps up", cards: [
    { h: "Multi-counter POS", p: "Run up to three billing counters at once, each with its own live cart and paired printer." },
    { h: "Barcode scanning", p: "Any USB/Bluetooth scanner rings items straight into the cart." },
    { h: "Returns & refunds", p: "Whole-bill returns that restore stock and keep credit notes correct." },
    { h: "Multi-rate pricing", p: "Hold MRP, retail and wholesale rates per item; pick one at the counter." },
    { h: "Estimates & quotations", p: "Quote now, convert to a bill in one click when the customer says yes." },
    { h: "Park & resume bills", p: "Hold a half-finished bill, serve the next customer, resume later." },
    { h: "Bundles & combos", p: "Sell pre-set combos that expand into their component lines at the counter." },
    { h: "Line & bill discounts", p: "Flat or percentage discounts per line or on the whole bill." },
    { h: "Integrated UPI payments", p: "Show a dynamic UPI QR at checkout and the bill marks itself paid the moment money lands — no manual matching, no missed entries." },
    { h: "UPI payment links", p: "Send a customer a UPI link over WhatsApp or SMS to collect a due or a remote order; the payment updates the bill automatically." },
    { h: "Split payments", p: "Take cash, UPI, card, bank and credit on a single bill." },
    { h: "Customer display", p: "Mirror the cart to a second tablet screen facing the customer." },
    { h: "Live cross-device sync", p: "Bill on the phone, see it on the shop computer instantly — every device stays in step." },
  ]},
  { eyebrow: "Inventory", h2: "Stock you can actually trust", cards: [
    { h: "Live stock", p: "Every sale and purchase adjusts stock automatically — no separate register." },
    { h: "Multi-shop & transfers", p: "Per-outlet stock with branch-to-branch transfers and a shared catalogue.", link: "/features/multi-shop/", teal: true },
    { h: "Shop & godown stock", p: "Track shop-floor and back-room/godown quantities separately, with moves between them." },
    { h: "Scan a supplier bill", p: "Snap a photo of any supplier invoice and OCR reads the supplier, items, quantities and rates — then fills the purchase entry for you to confirm. No more typing bills line by line.", teal: true },
    { h: "Purchases & suppliers", p: "Record purchase bills, supplier ledgers, payments and outstanding payables." },
    { h: "Reorder suggestions", p: "Below-reorder items grouped by supplier, ready to turn into a purchase draft." },
    { h: "Assemblies (BOM)", p: "Build finished goods (e.g. a wheel set) from components; stock deducts the parts." },
    { h: "Bulk import & edit", p: "Upload your whole catalogue from a spreadsheet; bulk-edit categories, rates and stock." },
    { h: "Barcode label printing", p: "Print Code-128 barcode labels for any item, in bulk or one at a time." },
    { h: "Low-stock alerts", p: "Reorder flags and zero/negative-stock warnings before the shelf is empty." },
    { h: "Stock report & movement", p: "Current snapshot plus full movement history, filterable by shop." },
    { h: "Weighted-average cost", p: "Item cost auto-updates as a WAC across purchases, so margins stay honest." },
    { h: "Categories & brands", p: "Organise the catalogue by category and brand for fast lookup and reporting." },
  ]},
  { eyebrow: "Customers & loyalty", h2: "Keep customers coming back", cards: [
    { h: "Customer master", p: "Phone, GSTIN, address and state — with validation so data stays clean." },
    { h: "Credit & receipts", p: "Track customer dues, record receipts, and print a payment voucher." },
    { h: "Credit limits", p: "Set a credit ceiling per customer and get warned before you cross it." },
    { h: "Loyalty points", p: "Earn-and-redeem loyalty program with per-shop rules." },
    { h: "Programs & offers", p: "Run customer programs and targeted offers from one screen." },
    { h: "Statements", p: "Generate a customer ledger statement for any date range." },
    { h: "WhatsApp & SMS", p: "Send invoices, receipts and reminders over WhatsApp (Cloud API) or a wa.me link." },
    { h: "Automated reminders", p: "Rule-based payment and service reminders queued and sent for you." },
  ]},
  { eyebrow: "Service & repair", h2: "From job card to invoice", cards: [
    { h: "Digital job cards", p: "Log the item, issue and promised date; track received → in-progress → ready." },
    { h: "Mechanic assignment", p: "Assign jobs to a mechanic; labour can be billed tax-free and credited to them." },
    { h: "Public status link", p: "Customers check their repair status on a no-login link; share it on WhatsApp." },
    { h: "Parts + labour billing", p: "Bill stocked spare parts and labour on one GST invoice." },
    { h: "Frame / serial tracking", p: "Capture frame and serial numbers for warranty and service history." },
    { h: "AMC plans", p: "Sell annual maintenance plans; each free service decrements the balance automatically." },
    { h: "Service reminders", p: "Automated reminders bring customers back on time." },
    { h: "Job history", p: "Every past job and bill for a customer, one search away." },
  ]},
  { eyebrow: "Money, reports & books", h2: "Close the day with confidence", cards: [
    { h: "Day book", p: "Every transaction for the selected business date in one ledger." },
    { h: "Opening cash & day-close", p: "Start with opening cash, one-tap close so the drawer always ties out." },
    { h: "Cash denomination count", p: "Count the drawer by note denomination at closing for an accurate till." },
    { h: "Expected closing cash", p: "Opening + cash in − cash out, so you instantly spot a short or excess." },
    { h: "Profit reports", p: "Margin by item, category, brand and period, with cost based on WAC." },
    { h: "Expenses register", p: "Record running costs that feed your closing-cash and profit math." },
    { h: "Accounts sheet", p: "A cash-book / accounts view that ties opening, sales, expenses and closing together." },
    { h: "Insights & forecast", p: "Sales trends, top items, payment mix and a simple demand forecast." },
    { h: "GST period ledger", p: "Close each GST period, lock the 3B and carry unused ITC credit forward." },
    { h: "Year-end close", p: "A 4-step checklist that locks a financial year against new bills." },
  ]},
  { eyebrow: "Run the business", h2: "Built for real shops", cards: [
    { h: "Staff, roles & PINs", p: "Per-staff PIN logins and granular role-based permissions for every action." },
    { h: "Audit trail", p: "Append-only log of who did what — financial records are tamper-proof." },
    { h: "Works offline", p: "Bills, purchases, expenses and more queue locally and auto-sync on reconnect." },
    { h: "Installable PWA", p: "Install Pride POS like an app on any laptop, tablet or phone — no store needed." },
    { h: "Thermal & A4 printing", p: "ESC/POS thermal receipts with cash-drawer kick, or A4/A5 GST invoices." },
    { h: "Print designer", p: "Per-shop layout: choose format, toggle fields, add custom text, drag-and-drop blocks." },
    { h: "Backups & restore", p: "Automatic + nightly backups, integrity checks and one-click restore." },
    { h: "Usage analytics", p: "An owner dashboard showing how the app is used across your shops." },
    { h: "Receipt logo & branding", p: "Upload your shop logo and details to brand every printed invoice." },
    { h: "Multi-language", p: "English, Hindi, Marathi and Tamil at the counter." },
    { h: "Dark mode", p: "A comfortable dark theme for long evenings at the counter." },
    { h: "Demo data & onboarding", p: "Start with sample data to explore, then wipe it in one click when you go live." },
  ]},
];

PAGES.push({
  out: "features/index.html",
  title: "Features — Everything Pride POS Does for Your Shop",
  description: "The complete Pride POS feature set: GST billing & returns, multi-counter POS, inventory & multi-shop, service job cards, reports, offline mode, thermal printing and more.",
  keywords: "billing software features, POS features India, GST software features, inventory billing features, shop management software",
  crumb: [{ name: "Home", path: "/" }, { name: "Features", path: "/features/" }],
  extraLD: [featureLD("Pride POS", "Complete feature set: GST billing, POS, inventory, multi-shop, service, reports, offline, printing.", "https://pridepos.com/features/")],
  body: ({ cr }) => `${hero("Everything in one place", `One app for the <span class="hl">whole shop</span>.`, "Billing, GST returns, inventory, multi-shop, service job cards, reports, offline mode and printing — the entire back office a small Indian shop needs, with nothing bolted on.", { src: "/assets/art/hero-counter.svg", alt: "A shop counter with a GST invoice, a phone showing a UPI payment received, and a thermal receipt printing." })}
<section class="section tight"><div class="container">${cr.html}
  <div class="stats">
    <div class="stat"><b>7</b><span>capability areas</span></div>
    <div class="stat"><b>60+</b><span>built-in features</span></div>
    <div class="stat"><b>₹399</b><span>plans start / month</span></div>
    <div class="stat"><b>5-day</b><span>free trial, no card</span></div>
  </div>
</div></section>
${FEATURE_GROUPS.map((g, gi) => `<section class="section ${gi % 2 ? "paper2" : ""}"><div class="container">
  <div class="sh"><span class="eyebrow">${g.eyebrow}</span><h2>${g.h2}</h2></div>
  <div class="grid c4">${g.cards.map((c, i) => {
    const icon = `<div class="ic" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12l5 5 9-11"/></svg></div>`;
    const cls = `card${c.teal ? " teal" : ""} reveal`;
    const delay = `style="animation-delay:${(i % 4) * .05}s"`;
    // A link-card is itself an <a>, so it must NOT contain a nested <a> (invalid HTML that
    // breaks the layout). Link-cards show a non-anchor "Learn more" cue; plain cards may carry
    // a real inner link.
    return c.link
      ? `<a class="${cls}" href="${c.link}" ${delay}>${icon}<h3>${c.h}</h3><p>${c.p}</p><span class="card-more">Learn more →</span></a>`
      : `<article class="${cls}" ${delay}>${icon}<h3>${c.h}</h3><p>${c.p}</p></article>`;
  }).join("")}</div>
</div></section>`).join("\n")}
<section class="section"><div class="container">
  <div class="sh center"><span class="eyebrow">How it compares</span><h2>Why shops switch to Pride POS.</h2>
    <p class="lede">Honest look at how Pride POS stacks up against Tally, Marg and generic billing apps — cloud-native, online or offline, on any device, with simple monthly plans from ₹399.</p></div>
  ${comparisonTable(
    ["Tally", "Marg", "Generic billing app", "Pride POS"],
    [
      ["GST tax split (CGST/SGST/IGST)", true, true, true, true],
      ["e-Invoice IRN", true, true, "Add-on", true],
      ["GSTR-1 & GSTR-3B exports", true, true, "Higher tier", true],
      ["Live inventory", true, true, true, true],
      ["Scan supplier bill → auto purchase entry (OCR)", false, false, false, true],
      ["Multi-shop & stock transfer", "Higher tier", "Add-on", "Higher tier", true],
      ["Service job cards", false, "Rare", "Rare", true],
      ["Online / cloud billing — any device", false, false, "Partial", true],
      ["Runs in a browser — no install", false, false, "Partial", true],
      ["Offline billing + auto-sync", "Desktop only", "Desktop only", "Rare", true],
      ["Live cross-device sync", false, false, "Rare", true],
      ["Multi-counter POS + customer display", "Partial", "Partial", "Partial", true],
      ["WhatsApp invoices & payment reminders", false, "Add-on", "Rare", true],
      ["Integrated UPI — auto-confirm + payment links", false, "Partial", "Partial", true],
      ["Multi-language receipts (6 languages)", false, "Partial", false, true],
      ["Thermal + cash drawer", "Partial", true, true, true],
      ["Audit trail (tamper-proof)", "Partial", "Partial", "Partial", true],
      ["Free trial, no card", false, false, "Limited", "5 days"],
      ["Price", "License + AMC", "License + AMC", "Per-bill / tiers", "From ₹399/mo"],
    ]
  )}
  <p class="cmp-note">Comparison reflects typical offerings of each category, not any specific product version. Tally and Marg are trademarks of their respective owners; Pride POS is independent and not affiliated with either.</p>
</div></section>
${CTA}`
});

// ── Feature: GST Billing ────────────────────────────────────────────────
PAGES.push({
  out: "features/gst-billing/index.html",
  title: "GST Billing Software for Indian Shops — Pride POS",
  description: "GST-compliant invoicing with HSN codes, automatic CGST/SGST/IGST split, e-invoice IRN and GSTR-1 & GSTR-3B exports. Create your first GST invoice in minutes.",
  keywords: "GST billing software, GST invoice software India, GSTR-1 export, e-invoice IRN, HSN code billing, CGST SGST IGST",
  crumb: [{ name: "Home", path: "/" }, { name: "Features", path: "/features/gst-billing/" }, { name: "GST Billing", path: "/features/gst-billing/" }],
  extraLD: [featureLD("Pride POS", "GST billing software with HSN codes, tax split, e-invoice IRN and GSTR exports.", "https://pridepos.com/features/gst-billing/")],
  body: ({ cr }) => `${hero("Feature · GST billing", `GST invoices that <span class="hl">pass the audit</span>, every time.`, "HSN codes, the right tax split for every customer, e-invoice IRN and one-click GSTR exports — Pride POS turns India's most tedious paperwork into a side-effect of billing.", { src: "/assets/art/gst.svg", alt: "A GST invoice with HSN codes and CGST/SGST tax split beside a verified e-invoice IRN badge." })}
<section class="section"><div class="container">${cr.html}
  <div class="grid c2">
    <div><h2>The tax math, handled for you</h2>
      <p>Pick a customer, add items, take payment. Pride POS reads the customer's state and applies <strong>CGST + SGST</strong> for intra-state sales or <strong>IGST</strong> for inter-state — no manual toggles, no wrong filings.</p>
      <ul class="price" style="border:none;background:none;padding:0;margin:0;list-style:none">
        <li>HSN/SAC code on every line item</li>
        <li>Automatic CGST/SGST/IGST split by place of supply</li>
        <li>Round-off and amount-in-words on the printed invoice</li>
        <li>B2B and B2C invoice modes</li>
        <li>e-Invoice IRN generation where the law requires it</li>
      </ul>
    </div>
    <div><div class="invoice-card" style="transform:rotate(-1.2deg)">
      <div class="inv-top"><div><h3>Tax Invoice</h3><div class="mono" style="font-size:.78rem;color:var(--ink-3)">S1/25-26/000981</div></div><span class="inv-tag">IGST</span></div>
      <div class="inv-row"><span>Item · HSN 8712</span><span>₹12,000.00</span></div>
      <div class="inv-row"><span>IGST 18%</span><span>₹2,160.00</span></div>
      <div class="inv-total"><span>Total</span><span>₹14,160.00</span></div>
      <div class="inv-badge">IRN ✓</div>
    </div></div>
  </div>
</div></section>
${cardsSec("Filing season, sorted", "Returns without the spreadsheet gymnastics.", [
    { h: "GSTR-1 export", p: "Outward supplies, B2B/B2C split and HSN summary in the portal-ready shape — exported every month in a click." },
    { h: "GSTR-3B summary", p: "Output tax, input tax credit and net payable computed from your real bills and purchases.", teal: true },
    { h: "Credit & debit notes", p: "CDNR/CDNUR notes for returns and corrections that flow straight into your filing." },
  ])}
<section class="section"><div class="container" style="max-width:820px"><div class="sh center"><span class="eyebrow">Questions</span><h2>GST billing FAQ</h2></div>
${faqHtml([
    ["Does Pride POS generate e-invoice IRN?", "Yes — for invoices above the turnover threshold where IRN is mandatory, Pride POS generates and prints the IRN and signed QR code."],
    ["Can I file GSTR-1 directly from Pride POS?", "Pride POS produces the portal-compatible GSTR-1 JSON and an HSN summary you upload to the GST portal or hand to your CA. A one-click direct file is on the roadmap."],
    ["Does it handle inter-state sales correctly?", "Yes. The tax split is driven by the customer's place of supply, so inter-state sales automatically use IGST and intra-state use CGST + SGST."],
  ])}
</div></section>
${CTA}`
});

// ── Feature: Multi-shop ─────────────────────────────────────────────────
PAGES.push({
  out: "features/multi-shop/index.html",
  title: "Multi-Shop Billing & Inventory Software — Pride POS",
  description: "Run multiple outlets from one login. Per-shop invoice numbering, stock transfers between branches, per-outlet reports and owner-level oversight. Multi-store POS for India.",
  keywords: "multi shop billing software, multi store POS India, multi outlet inventory, branch stock transfer software, chain store billing",
  crumb: [{ name: "Home", path: "/" }, { name: "Features", path: "/features/multi-shop/" }, { name: "Multi-shop", path: "/features/multi-shop/" }],
  extraLD: [featureLD("Pride POS", "Multi-shop billing and inventory with per-outlet numbering, stock transfers and consolidated reports.", "https://pridepos.com/features/multi-shop/")],
  body: ({ cr }) => `${hero("Feature · Multi-shop", `Two outlets or twenty — <span class="hl">one login</span>.`, "Open a second branch without opening a second headache. Pride POS gives every outlet its own invoice series and stock, while you see the whole business from one owner view.", { src: "/assets/art/multishop.svg", alt: "Two shop storefronts connected to one owner dashboard with stock transferring between branches." })}
<section class="section"><div class="container">${cr.html}
${cardsSec("How multi-shop works", "Independent outlets, one source of truth.", [
    { h: "Per-shop numbering", p: "Each outlet gets its own invoice and estimate prefix and counter, so numbering never collides across branches." },
    { h: "Stock transfers", p: "Move inventory between branches with a receive-side confirmation; both sides' stock update correctly.", teal: true },
    { h: "Per-outlet reports", p: "Filter day book, profit, GST and stock by shop — or roll everything up for the group view." },
    { h: "Staff by outlet", p: "Lock staff to their own branch for billing, or give trusted managers access to all of them." },
    { h: "Owner oversight", p: "Switch shops from the top bar; staff stay on their outlet but can see sister-branch stock read-only.", teal: true },
    { h: "Shared catalogue", p: "One item and customer master across the chain — update a price once, it's live everywhere." },
  ], "")}
</div></section>
<section class="section paper2"><div class="container" style="max-width:820px"><div class="sh center"><span class="eyebrow">Questions</span><h2>Multi-shop FAQ</h2></div>
${faqHtml([
    ["Which plan do I need for multiple shops?", "The Multi-shop plan at ₹1,199/month covers unlimited outlets with per-shop stock and transfers — one flat price for the whole chain, with no per-store surcharge. The Standard and Pro plans run a single shop."],
    ["Can each shop have its own GSTIN and address?", "Yes. Each outlet carries its own name, address, GSTIN and UPI details, and files GST under its own number."],
    ["Can staff be restricted to one branch?", "Yes. Staff can be locked to a single outlet for billing and inventory, while the owner can switch between all shops."],
  ])}
</div></section>
${CTA}`
});

// ── Solution pages ──────────────────────────────────────────────────────
const solution = ({ slug, title, description, keywords, h1, lede, kicker, cards, faq, art }) => ({
  out: `solutions/${slug}/index.html`, title, description, keywords,
  crumb: [{ name: "Home", path: "/" }, { name: "Solutions", path: `/solutions/${slug}/` }, { name: kicker, path: `/solutions/${slug}/` }],
  extraLD: [featureLD("Pride POS", description, `https://pridepos.com/solutions/${slug}/`), faqLD(faq)],
  body: ({ cr }) => `${hero(`For ${kicker.toLowerCase()}`, h1, lede, art || null)}
<section class="section"><div class="container">${cr.html}<div class="grid c3">${cards.map((c, i) => `<article class="card${i % 2 ? " teal" : ""} reveal" style="animation-delay:${(i % 3) * .06}s"><h3>${c.h}</h3><p>${c.p}</p></article>`).join("")}</div></div></section>
<section class="section paper2"><div class="container" style="max-width:820px"><div class="sh center"><span class="eyebrow">Questions</span><h2>FAQ</h2></div>${faqHtml(faq)}</div></section>
${CTA}`
});

PAGES.push(solution({
  slug: "cycle-shops", kicker: "Cycle shops",
  title: "Billing Software for Cycle & Bike Shops in India — Pride POS",
  description: "POS and GST billing built for cycle and bike shops: frame-number tracking, service job cards, AMC plans, spare-part assemblies and warranty-friendly invoices.",
  keywords: "cycle shop billing software, bike shop POS India, bicycle store billing, cycle service job card software, bike shop inventory",
  h1: `Billing built for <span class="hl">cycle shops</span>.`,
  lede: "Pride POS started behind a cycle-shop counter. Frame numbers, service cards, AMC plans and spare-part assemblies are first-class here — not bolted on.",
  art: { src: "/assets/art/cycle.svg", alt: "A bicycle beside a service job card showing the frame number and a parts-and-labour invoice." },
  cards: [
    { h: "Frame & serial tracking", p: "Capture frame and serial numbers on the bill so warranty and service history are always one search away." },
    { h: "Service job cards", p: "Open a job card, track its status, message the customer, and invoice parts plus labour when it's ready." },
    { h: "AMC & service plans", p: "Sell annual maintenance plans and keep a schedule of who's due for a free service." },
    { h: "Spare-part assemblies", p: "Build a wheel set or a service kit from component parts — stock deducts the components automatically." },
    { h: "Warranty-ready invoices", p: "Clean GST invoices that carry the detail a manufacturer warranty claim needs." },
    { h: "Counter speed", p: "Barcode scan, fast item lookup and a four-language counter for busy weekend rushes." },
  ],
  faq: [
    ["Can I record a frame number on each sale?", "Yes — frame and serial numbers can be captured on the bill and are searchable later for warranty and service."],
    ["Does it handle service jobs and repairs?", "Yes. Open a job card, track its status, notify the customer, and bill parts plus labour in one invoice."],
    ["Is it only for cycle shops?", "No — Pride POS also fits general retail and service shops, but cycle shops get purpose-built features like assemblies and AMC plans."],
  ]
}));

PAGES.push(solution({
  slug: "retail-shops", kicker: "Retail shops",
  title: "Retail Billing & Inventory Software for Indian Shops — Pride POS",
  description: "Fast GST billing and inventory for general retail: barcode scanning, bulk item import, multi-rate pricing, low-stock alerts and day-close reports.",
  keywords: "retail billing software India, retail POS software, shop inventory software, barcode billing software, kirana billing software",
  h1: `Counter billing that <span class="hl">keeps up</span> with retail.`,
  lede: "Scan, bill, done. Pride POS handles fast counter sales, large catalogues and the inventory truth a busy retail shop runs on.",
  art: { src: "/assets/art/retail.svg", alt: "A barcode being scanned into a point-of-sale screen, with shelved stock and a thermal receipt." },
  cards: [
    { h: "Barcode billing", p: "Plug in any USB/Bluetooth scanner and ring items straight into the cart — no fiddling." },
    { h: "Bulk item import", p: "Upload your whole catalogue from a spreadsheet, with categories, HSN, rates and opening stock." },
    { h: "Multi-rate pricing", p: "Hold MRP, retail and wholesale rates per item and pick the right one at the counter." },
    { h: "Low-stock alerts", p: "Reorder suggestions and low-stock flags so the shelf is never empty at the wrong time." },
    { h: "Returns & refunds", p: "Whole-bill returns that restore stock and keep your GST credit notes correct." },
    { h: "Day-close that ties out", p: "Opening cash, sales, expenses and a one-tap closing so the drawer always balances." },
  ],
  faq: [
    ["Does it work with a barcode scanner?", "Yes. Any standard USB or Bluetooth scanner works — scanned items drop straight into the bill."],
    ["Can I import my existing item list?", "Yes. Bulk-import your catalogue from a spreadsheet, including HSN codes, multiple rates and opening stock."],
    ["Can I run more than one counter?", "Yes. The POS supports multiple billing counters, each with its own live cart and paired printer."],
  ]
}));

PAGES.push(solution({
  slug: "service-shops", kicker: "Service & repair shops",
  title: "Job Card & Billing Software for Service & Repair Shops — Pride POS",
  description: "Job cards, status tracking, customer WhatsApp/SMS updates and parts-plus-labour GST invoices for service and repair businesses across India.",
  keywords: "service shop billing software, repair shop job card software, workshop billing India, parts and labour invoice, job card POS",
  h1: `Job cards to invoices, <span class="hl">without the paperwork</span>.`,
  lede: "Take the job in, track it through, message the customer, and bill parts plus labour — Pride POS runs the whole repair workflow on one screen.",
  art: { src: "/assets/art/service.svg", alt: "A repair job moving through received, in-progress and ready stages, with a customer notification on a phone." },
  cards: [
    { h: "Digital job cards", p: "Log the item, the issue and the promised date; everything stays attached to the customer." },
    { h: "Status tracking", p: "Move a job through received → in-progress → ready, with a public status link customers can check." },
    { h: "Customer updates", p: "Send WhatsApp or SMS updates when a job is ready, using your own templates." },
    { h: "Parts + labour billing", p: "Add spare parts from stock and labour charges to a single GST invoice." },
    { h: "Reminders & AMC", p: "Schedule maintenance reminders and sell annual service plans." },
    { h: "History at a glance", p: "Every past job and bill for a customer, one search away." },
  ],
  faq: [
    ["Can customers track their repair status?", "Yes. Each job gets a public status link, and you can send WhatsApp/SMS updates when it's ready."],
    ["Can I bill parts and labour together?", "Yes. Add stocked spare parts and labour charges to one GST invoice, with the correct tax on each."],
    ["Does it send reminders?", "Yes. You can schedule service reminders and sell AMC plans so customers come back on time."],
  ]
}));

// ── Pricing page ────────────────────────────────────────────────────────
PAGES.push({
  out: "pricing/index.html",
  title: "Pricing — Pride POS GST Billing Software (from ₹399/month)",
  description: "Simple, honest pricing: Standard ₹399, Pro ₹799, and Multi-shop ₹1,199 per month. 5-day free trial, no card required. Prices exclude government GST.",
  keywords: "Pride POS pricing, GST billing software price, billing software cost India, cheap POS software, multi shop billing price",
  crumb: [{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing/" }],
  extraLD: [
    { "@type": "Product", name: "Pride POS", description: "GST billing & POS software for Indian shops.", brand: { "@type": "Brand", name: "Pride POS" }, offers: [
      { "@type": "Offer", name: "Standard",   price: "399",  priceCurrency: "INR", priceValidUntil: "2027-12-31", availability: "https://schema.org/InStock", url: "https://pridepos.com/pricing/" },
      { "@type": "Offer", name: "Pro",        price: "799",  priceCurrency: "INR", priceValidUntil: "2027-12-31", availability: "https://schema.org/InStock", url: "https://pridepos.com/pricing/" },
      { "@type": "Offer", name: "Multi-shop", price: "1199", priceCurrency: "INR", priceValidUntil: "2027-12-31", availability: "https://schema.org/InStock", url: "https://pridepos.com/pricing/" },
    ] },
    faqLD([
      ["Is there a free trial?", "Yes — 5 days of full access to every feature with no credit card required. Your data carries over if you upgrade."],
      ["What's the difference between the plans?", "Standard (₹399/mo) covers billing and GST for a single shop. Pro (₹799/mo) adds every advanced feature — UPI payments, loyalty, the Owner Trust dashboard and more. Multi-shop (₹1,199/mo) is Pro across unlimited outlets with per-shop stock and transfers."],
      ["Are GST charges included in the price?", "No. The plan price is for the software only; any GST levied by the government is charged separately as applicable."],
      ["Can I cancel anytime?", "Yes. Cancel whenever you like; your account pauses and data is kept for 30 days so you can resume."],
    ])
  ],
  body: ({ cr }) => `<section class="hero"><div class="container center" style="max-width:760px;margin:0 auto"><div class="reveal">
    <span class="eyebrow">Honest pricing</span><h1>Pick the plan that <span class="hl">fits your shop.</span></h1>
    <p class="lede" style="margin:0 auto">No per-bill charges, no setup fees. Start free for 5 days, then choose a plan — upgrade or downgrade anytime.</p>
  </div></div></section>
  <section class="section tight"><div class="container">${cr.html}
  <div class="price-grid three">
    <div class="price reveal"><div class="tier">Standard</div><div class="amt">₹399 <small>/ month</small></div>
      <p style="color:var(--ink-3);font-size:.95rem">Billing &amp; GST essentials for a single shop.</p>
      <ul><li>Unlimited bills, items &amp; customers</li><li>GST invoicing + GSTR-1 / GSTR-3B</li><li>E-invoice IRN <em>(coming soon)</em></li><li>Thermal &amp; A4 printing</li><li>Offline billing &amp; auto-sync</li><li>Email support</li></ul>
      <a class="btn ink" href="https://app.pridepos.com/?signup=1" style="width:100%;justify-content:center">Start free trial</a></div>
    <div class="price feature reveal" style="animation-delay:.08s"><span class="pill">Most popular</span><div class="tier">Pro</div><div class="amt">₹799 <small>/ month</small></div>
      <p style="color:var(--ink-3);font-size:.95rem">Every feature, for one shop.</p>
      <ul><li>Everything in Standard</li><li>Integrated UPI / QR payments</li><li>Loyalty, estimates &amp; purchase orders</li><li>Owner Trust fraud dashboard</li><li>Predictive reorder forecast</li><li>Staff controls &amp; audit</li><li>Priority support</li></ul>
      <a class="btn primary" href="https://app.pridepos.com/?signup=1" style="width:100%;justify-content:center">Start free trial</a></div>
    <div class="price reveal" style="animation-delay:.16s"><div class="tier">Multi-shop</div><div class="amt">₹1,199 <small>/ month</small></div>
      <p style="color:var(--ink-3);font-size:.95rem">All Pro features, across every outlet.</p>
      <ul><li>Everything in Pro</li><li>Unlimited outlets &amp; central godown</li><li>Per-shop stock + stock transfers</li><li>Per-shop &amp; consolidated reports</li><li>Shop-scoped staff roles</li></ul>
      <a class="btn ink" href="https://app.pridepos.com/?signup=1" style="width:100%;justify-content:center">Start free trial</a></div>
  </div>
  <p class="price-note">Every plan starts with a 5-day free trial — no card required. Prices are per month and <strong>exclude GST</strong> charged by the government.</p>
  </div></section>
  <section class="section paper2"><div class="container" style="max-width:820px"><div class="sh center"><span class="eyebrow">Questions</span><h2>Pricing FAQ</h2></div>
  ${faqHtml([
    ["Is there a free trial?", "Yes — 5 days of full access to every feature with no credit card required. Your data carries over if you upgrade."],
    ["What's the difference between the plans?", "Standard (₹399/mo) covers billing and GST for a single shop. Pro (₹799/mo) adds every advanced feature — UPI payments, loyalty, the Owner Trust dashboard and more. Multi-shop (₹1,199/mo) is Pro across unlimited outlets with per-shop stock and transfers."],
    ["Are GST charges included in the price?", "No. The plan price is for the software only; any GST levied by the government is charged separately as applicable."],
    ["Can I cancel anytime?", "Yes. Cancel whenever you like; your account pauses and your data is kept for 30 days so you can resume."],
    ["How do I pay?", "Securely online via Razorpay — UPI, cards or net banking. Billing is monthly and you can stop anytime."],
  ])}</div></section>
  ${CTA}`
});

// ── Contact page ────────────────────────────────────────────────────────
// Static page; the form POSTs to the anon-callable submit_contact_message RPC
// (mig 69) on Supabase. Anon key is public by design; the RPC stores the message
// + emails support@. Honeypot field + DB-side rate-limit guard against spam.
const SB_URL = "https://eoyrqtptuausavhhodnc.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveXJxdHB0dWF1c2F2aGhvZG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Mzk0MTQsImV4cCI6MjA5NDUxNTQxNH0.aLN-BuF-5wA1_ybNiplfSUTDRKs95BsB8cxxy3mu0wI";
PAGES.push({
  out: "contact/index.html",
  title: "Contact Pride POS — talk to us about billing for your shop",
  description: "Questions about Pride POS GST billing software? Send us a message and we'll get back to you, or email support@pridepos.com.",
  keywords: "contact Pride POS, Pride POS support, billing software help India",
  crumb: [{ name: "Home", path: "/" }, { name: "Contact", path: "/contact/" }],
  body: ({ cr }) => `<section class="hero"><div class="container center" style="max-width:760px;margin:0 auto"><div class="reveal">
    <span class="eyebrow">We'd love to hear from you</span><h1>Get in <span class="hl">touch</span></h1>
    <p class="lede" style="margin:0 auto">Questions about features, pricing or moving your shop to Pride POS? Send a message — or email <a href="mailto:support@pridepos.com">support@pridepos.com</a>.</p>
  </div></div></section>
  <section class="section tight"><div class="container" style="max-width:680px">${cr.html}
    <form id="contactForm" class="contact-form card reveal" novalidate>
      <div class="cf-row">
        <div class="cf-field">
          <label for="cf-name">Name <span class="cf-req">*</span></label>
          <input id="cf-name" type="text" name="name" required maxlength="200" autocomplete="name" placeholder="Your name"/>
        </div>
        <div class="cf-field">
          <label for="cf-email">Email <span class="cf-req">*</span></label>
          <input id="cf-email" type="email" name="email" required maxlength="200" autocomplete="email" placeholder="you@shop.com"/>
        </div>
      </div>
      <div class="cf-row">
        <div class="cf-field">
          <label for="cf-phone">Phone <span class="cf-opt">(optional)</span></label>
          <input id="cf-phone" type="tel" name="phone" maxlength="40" autocomplete="tel" placeholder="Mobile number"/>
        </div>
        <div class="cf-field">
          <label for="cf-industry">Industry <span class="cf-opt">(optional)</span></label>
          <select id="cf-industry" name="industry">
            <option value="">Select…</option>
            <option>Cycle shop</option>
            <option>Retail / general store</option>
            <option>Service &amp; repair</option>
            <option>Electronics</option>
            <option>Hardware</option>
            <option>Pharmacy</option>
            <option>Apparel / footwear</option>
            <option>Restaurant / café</option>
            <option>Wholesale / distribution</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div class="cf-field">
        <label for="cf-req">Tell us your requirements <span class="cf-req">*</span></label>
        <textarea id="cf-req" name="requirements" required rows="4" maxlength="600" placeholder="What do you need from a billing system? (GST returns, multi-shop, offline, hardware, migration from another tool…)"></textarea>
        <div class="cf-count"><span id="cf-req-count">0</span>/600</div>
      </div>
      <div class="cf-field">
        <label for="cf-msg">Message <span class="cf-opt">(optional)</span></label>
        <textarea id="cf-msg" name="message" rows="3" maxlength="5000" placeholder="Anything else you'd like to add"></textarea>
      </div>
      <input type="text" name="company" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true"/>
      <button type="submit" class="btn primary lg" id="contactSubmit">Send message</button>
      <p id="contactStatus" class="contact-status" role="status" aria-live="polite"></p>
    </form>
  </div></section>
  <script>
  (function(){
    var f=document.getElementById('contactForm');if(!f)return;
    var btn=document.getElementById('contactSubmit'),st=document.getElementById('contactStatus');
    var req=document.getElementById('cf-req'),cnt=document.getElementById('cf-req-count');
    if(req&&cnt){req.addEventListener('input',function(){cnt.textContent=req.value.length;});}
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var d=new FormData(f);
      st.textContent='';st.className='contact-status';
      btn.disabled=true;btn.textContent='Sending…';
      fetch('${SB_URL}/rest/v1/rpc/submit_contact_message',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':'${SB_ANON}','Authorization':'Bearer ${SB_ANON}'},
        body:JSON.stringify({p_name:d.get('name'),p_email:d.get('email'),p_requirements:d.get('requirements'),p_message:d.get('message')||null,p_phone:d.get('phone')||null,p_industry:d.get('industry')||null,p_hp:d.get('company')||''})
      }).then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});})
        .then(function(res){
          if(res.ok){f.reset();if(cnt)cnt.textContent='0';st.textContent='Thanks — we got your message and will reply to your email soon.';st.className='contact-status ok';}
          else{st.textContent=(res.j&&res.j.message)||'Something went wrong. Please email support@pridepos.com.';st.className='contact-status err';}
        }).catch(function(){st.textContent='Network error. Please email support@pridepos.com.';st.className='contact-status err';})
        .finally(function(){btn.disabled=false;btn.textContent='Send message';});
    });
  })();
  </script>`
});

// ── Blog: data-driven. Each entry generates its own article page AND a card on /blog/. ──
const ARTICLES = [
  {
    slug: "e-invoice-irn-small-business-guide", cat: "GST", read: "6 min read", date: "2026-06-22",
    title: "E-invoicing (IRN) for small businesses: do you need it, and how it works",
    excerpt: "What an IRN and signed QR actually are, the turnover threshold that triggers e-invoicing, and how to generate one without leaving your billing screen.",
    description: "A plain-language guide to GST e-invoicing (IRN) for Indian small businesses: what an Invoice Reference Number and signed QR code are, the turnover threshold, how generation works, and how billing software automates it.",
    keywords: "e-invoice India, IRN generation, e-invoicing threshold, GST e-invoice small business, signed QR code invoice, e-invoice billing software",
    lede: "E-invoicing sounds like an enterprise problem — until the turnover threshold drops to your bracket. Here's what it actually is, whether it applies to you yet, and why the easiest time to get ready is before you're forced to.",
    html: `
    <h2>What "e-invoice" really means (it's not just a PDF)</h2>
    <p>An e-invoice isn't an invoice you email. It's an invoice you <strong>register on the government's portal (IRP)</strong> at the moment you raise it. The portal returns two things: an <strong>IRN</strong> (a unique Invoice Reference Number) and a <strong>signed QR code</strong>. Those are what make the invoice legally an "e-invoice" — and they must be printed on the copy you give the customer.</p>
    <h2>Do you need it? Check the threshold</h2>
    <p>E-invoicing is mandatory for businesses above a prescribed <strong>annual turnover threshold</strong>. That threshold has only come <em>down</em> over the years — what covered only large firms now reaches many mid-sized shops. If you're close to it, assume you'll cross it and prepare early; retrofitting at the deadline is stressful.</p>
    <blockquote>The threshold is based on turnover in any preceding financial year since GST began — not just last year. Check carefully if you've ever had a big year.</blockquote>
    <h2>How generation actually works</h2>
    <p>The flow is: you create the invoice in your billing software → the software sends it to the IRP → the IRP validates and returns the IRN + signed QR → your software prints them on the invoice. Done well, this happens <strong>in the background in a second or two</strong> — you just bill as normal and the IRN appears on the print.</p>
    <h2>What changes on the invoice itself</h2>
    <ul><li>The <strong>IRN</strong> is recorded against the bill.</li>
    <li>The <strong>signed QR code</strong> is printed (officers and customers can scan to verify authenticity).</li>
    <li>An <strong>Ack number and date</strong> from the portal are stored.</li></ul>
    <p>Your invoice numbering, HSN codes and tax split don't change — e-invoicing sits on top of correct billing, it doesn't replace it.</p>
    <h2>E-invoice vs e-way bill — not the same thing</h2>
    <p>People confuse them. The <strong>e-invoice (IRN)</strong> is about registering the sale; the <strong>e-way bill</strong> is about transporting goods above a value threshold. You may need both, one, or neither depending on the transaction — good software can generate the e-way bill from the same invoice data.</p>
    <h2>How Pride POS handles it</h2>
    <p><a href="/features/gst-billing/">Pride POS</a> generates the <strong>IRN and signed QR</strong> at checkout where e-invoicing applies and prints them straight onto the invoice — no separate portal login, no copy-paste. If you're under the threshold today, the feature simply stays out of your way until you need it. <a href="/pricing/">See how it works →</a> or <a href="https://app.pridepos.com/?signup=1">try it free for 5 days</a>.</p>`
  },
  {
    slug: "barcode-scanning-for-shop-billing", cat: "Hardware", read: "5 min read", date: "2026-06-22",
    title: "Barcode scanning at the billing counter: a simple setup guide",
    excerpt: "Faster billing, fewer wrong prices, easier stock counts. How to choose a scanner, label your items, and start scanning — even for products without a barcode.",
    description: "A practical guide to barcode scanning for shop billing in India: choosing a 1D/2D scanner, USB vs Bluetooth, printing your own barcode labels for unlabelled items, and speeding up billing and stock-takes.",
    keywords: "barcode scanner billing, barcode setup shop, print barcode labels, USB barcode scanner India, POS barcode scanning, barcode for inventory",
    lede: "A barcode scanner is a ₹1,500 device that pays for itself in a week — faster checkout, no mis-keyed prices, and stock counts that take minutes. Here's how to set one up, including for the many items that don't come barcoded.",
    html: `
    <h2>Why scanning beats typing</h2>
    <p>Every item you look up and type by hand is a chance to pick the wrong one or fat-finger the price. A scan is one beep: the right item, the right price, every time. At a busy counter that's faster checkout and fewer disputes — and at stock-take time, it's the difference between an evening and an hour.</p>
    <h2>1D or 2D scanner?</h2>
    <p><strong>1D (laser/linear)</strong> scanners read the standard striped barcodes on most products — cheap and perfect for a shop. <strong>2D (image)</strong> scanners also read QR codes and can scan off a phone screen, which is handy if you ever accept QR-based payments or coupons. For pure billing, a good 1D scanner is plenty.</p>
    <h2>USB or Bluetooth?</h2>
    <ul><li><strong>USB</strong> — plug it in and it just works; the scanner acts like a keyboard typing the code. Best for a fixed counter.</li>
    <li><strong>Bluetooth</strong> — cordless, good if you scan items on shelves or at a tablet counter.</li></ul>
    <p>Most shops are happiest with a plain USB scanner — there's nothing to pair and nothing to charge.</p>
    <h2>Step 1 — Store the barcode against each item</h2>
    <p>For products that already carry a barcode (the EAN/UPC printed by the brand), scan it once into the item's record. From then on, scanning that product at the counter finds it instantly.</p>
    <h2>Step 2 — Print your own labels for unbarcoded items</h2>
    <p>Loose goods, local products and spares often have no barcode. The fix: <strong>generate and print your own barcode labels</strong> from your billing software, stick them on, and scan like anything else. This is the step most guides skip — and it's what makes scanning work for a real Indian shop, not just supermarket stock.</p>
    <blockquote>You don't need every item barcoded on day one. Label your fast-movers first; the rest can wait.</blockquote>
    <h2>Step 3 — Scan straight into the bill</h2>
    <p>With items mapped, billing becomes: scan, scan, scan, take payment. No searching, no typing prices. The same codes make purchase entry and stock-takes faster too.</p>
    <h2>Common gotchas</h2>
    <ul><li><strong>Scanner beeps but nothing happens</strong> → the cursor isn't in the item field; click into the bill first.</li>
    <li><strong>Item not found</strong> → that barcode isn't stored against any item yet; add it once.</li>
    <li><strong>Wrong/garbled code</strong> → scanner set to the wrong symbology or a damaged label; reprint it.</li></ul>
    <h2>How Pride POS supports it</h2>
    <p><a href="/features/gst-billing/">Pride POS</a> works with any USB or Bluetooth scanner, lets you <strong>print barcode labels</strong> for items that don't have one, and scans straight into the cart at checkout. <a href="https://app.pridepos.com/?signup=1">Start a free trial →</a></p>`
  },
  {
    slug: "running-two-shops-one-system", cat: "Operations", read: "6 min read", date: "2026-06-22",
    title: "Running two shops on one system: stock, billing and a single view",
    excerpt: "Opening a second outlet? How to keep separate billing and stock per shop while seeing the whole business — and move stock between branches without chaos.",
    description: "A guide for Indian shopkeepers running multiple outlets: per-shop billing and invoice numbering, separate stock with transfers between branches, a shared item catalogue, and one consolidated view of the business.",
    keywords: "multi shop billing software, run two shops one system, multi outlet POS India, stock transfer between branches, multi branch inventory, per shop billing",
    lede: "A second shop doubles your sales and your headaches — two tills, two stock rooms, two sets of numbers. The trick is to keep each outlet independent where it must be, and unified where it helps. Here's how to set that up.",
    html: `
    <h2>Keep billing separate per shop</h2>
    <p>Each outlet needs its <strong>own invoice number series</strong> and its own daily cash — mixing them is an audit and reconciliation nightmare. The right setup gives every shop a clean, consecutive numbering of its own while still rolling up into one business.</p>
    <h2>Stock is per shop — but the catalogue is shared</h2>
    <p>This is the key distinction. Your <strong>item list (names, prices, HSN, barcodes) should be shared</strong> — change a price once, it's live everywhere. But the <strong>quantity on hand is per shop</strong>, because what's on Shop A's shelf isn't on Shop B's. Software that conflates the two leaves you over-ordering or selling stock you don't have.</p>
    <blockquote>One catalogue, many stock counts. Get this model right and multi-shop stops being scary.</blockquote>
    <h2>Move stock between branches properly</h2>
    <p>When you shift goods from one outlet to another, record it as a <strong>stock transfer</strong>, not a quiet adjustment. A transfer decrements the sending shop, increments the receiver, and leaves a trail — so if something goes missing in transit, you know. This is how you stop "I thought it was at the other branch" from eating your margin.</p>
    <h2>See the whole business in one view</h2>
    <p>Per-shop independence is useless if you can't step back and see everything. You want to <strong>filter reports by one shop or view all shops together</strong> — today's sales across both outlets, total stock value, who's selling what. That single consolidated view is the whole reason to run them on one system instead of two.</p>
    <h2>Control who sees what</h2>
    <p>Your Shop B manager probably shouldn't see Shop A's full numbers or switch outlets at will. <strong>Per-staff roles and a shop they're tied to</strong> keep each counter focused while you, the owner, see across all of them.</p>
    <h2>Don't forget GST across branches</h2>
    <p>If your outlets are in the same state under one GSTIN, billing is straightforward; across states you may have separate registrations. Either way, your returns should aggregate correctly — which they will if every bill, in every shop, is captured in one system.</p>
    <h2>How Pride POS does multi-shop</h2>
    <p><a href="/features/multi-shop/">Pride POS</a> gives each outlet its own billing and per-shop stock on a shared catalogue, <strong>stock transfers</strong> between branches, role-based access tied to a shop, and reports you can view per-shop or consolidated. Add a second outlet as a setting, not a migration. <a href="/pricing/">See pricing →</a> or <a href="https://app.pridepos.com/?signup=1">start a free trial</a>.</p>`
  },
  {
    slug: "how-to-file-gstr1-from-billing-software", cat: "GST", read: "6 min read", date: "2026-06-21",
    title: "How to file GSTR-1 from your billing software (the easy way)",
    excerpt: "Stop re-typing invoices into the GST portal. How to export a portal-ready GSTR-1 straight from your bills — and the errors that cause filing rejections.",
    description: "Step-by-step guide to filing GSTR-1 from billing software in India: exporting a portal-ready GSTR-1 JSON, B2B vs B2C sections, HSN summary, common upload errors, and how to keep it reconciled with GSTR-3B.",
    keywords: "how to file GSTR-1, GSTR-1 from billing software, GSTR-1 JSON upload, GSTR1 filing India, GST return software, GSTR-1 B2B B2C HSN summary",
    lede: "Filing GSTR-1 by hand — re-keying every invoice into the GST portal — is slow and exactly how mistakes creep in. If you already bill on software, the return is mostly done. Here's how to get it filed in minutes instead of an evening.",
    html: `
    <h2>What GSTR-1 actually needs from you</h2>
    <p>GSTR-1 is the <strong>invoice-level statement of your sales</strong> for the period. It groups your bills into sections: <strong>B2B</strong> (sales to GSTIN-holders), <strong>B2C large</strong> (big inter-state consumer invoices), a <strong>B2C summary</strong> (everything else), <strong>credit/debit notes</strong>, and an <strong>HSN-wise summary</strong>. Every one of those comes straight out of the bills you already raised — so you shouldn't be typing anything twice.</p>
    <h2>Step 1 — Bill correctly all month, not at filing time</h2>
    <p>The return is only as clean as the bills behind it. Two habits make filing painless: put the right <strong>HSN code</strong> on every item, and capture the <strong>customer's GSTIN and state</strong> for B2B sales so the CGST/SGST-vs-IGST split is right. Fix these at the counter, not on the portal.</p>
    <h2>Step 2 — Generate the GSTR-1 for the period</h2>
    <p>In your software, pick the month (or quarter, if you're on QRMP) and generate the GSTR-1. Good software produces it pre-grouped into the exact B2B / B2C / CDNR / HSN sections the portal expects — no manual sorting.</p>
    <h2>Step 3 — Upload the JSON (or use the offline tool)</h2>
    <p>The GST portal accepts a <strong>JSON file</strong> in the official schema. Export it from your billing tool and upload it under <em>Returns → GSTR-1 → Prepare offline</em>, or import it into the GST Offline Tool. The portal validates and shows you a summary to confirm before you submit.</p>
    <blockquote>If your software exports the portal-ready JSON, "filing" becomes: download, upload, review, submit. The data entry already happened when you billed.</blockquote>
    <h2>The errors that get filings rejected</h2>
    <ul><li><strong>Invalid GSTIN</strong> on a B2B invoice — one wrong digit and that invoice fails validation.</li>
    <li><strong>Wrong place of supply</strong> — charging CGST/SGST when it should be IGST (or vice-versa).</li>
    <li><strong>Missing or wrong HSN</strong> in the HSN summary.</li>
    <li><strong>Invoice number gaps or duplicates</strong> — the portal expects a consecutive series for the year.</li></ul>
    <p>Each of these is far easier to prevent at billing time than to chase down on filing day.</p>
    <h2>Don't forget: GSTR-1 must tie to GSTR-3B</h2>
    <p>The output tax in your <a href="/blog/gstr1-vs-gstr3b-explained/">GSTR-3B summary</a> has to match the tax from the invoices in GSTR-1. When both are built from the same bills, they can't drift apart — which is the whole point of filing from your billing data instead of a spreadsheet.</p>
    <h2>How Pride POS does it</h2>
    <p><a href="/features/gst-billing/">Pride POS</a> builds a portal-ready <strong>GSTR-1</strong> and a <strong>GSTR-3B summary with input tax credit</strong> from your actual invoices and purchases — correct HSN, correct tax split, sections pre-grouped — so filing is a download-and-upload, not a re-typing marathon. <a href="/pricing/">See how it works →</a> or <a href="https://app.pridepos.com/?signup=1">try it free for 5 days</a>.</p>`
  },
  {
    slug: "manage-customer-credit-khata-shop", cat: "Operations", read: "6 min read", date: "2026-06-21",
    title: "Khata done right: managing customer credit without losing money",
    excerpt: "Udhaar keeps customers loyal — and quietly drains your cash. How to run a digital khata with limits, reminders and a balance you can actually trust.",
    description: "A practical guide to managing customer credit (khata / udhaar) for Indian shops: setting credit limits, recording receipts against bills, sending payment reminders, and keeping an accurate khata balance with billing software.",
    keywords: "khata management, udhaar bahi digital, customer credit shop, manage customer credit India, digital khata software, credit limit customers, payment reminder customers",
    lede: "Almost every Indian shop runs a khata — udhaar to trusted regulars. It builds loyalty, but the bahi (credit book) is where profit silently leaks: forgotten balances, no limits, and the awkward chase months later. Here's how to keep the goodwill and the cash.",
    html: `
    <h2>Why the paper bahi costs you money</h2>
    <p>The khata book has one fatal flaw: it relies on memory and honesty to stay accurate. Balances get written in the wrong column, a payment goes unrecorded, and by the time you notice, the customer doesn't remember either. Multiply that across a year and the "small" udhaar adds up to real working capital stuck on the street.</p>
    <h2>1. Give each credit customer a real limit</h2>
    <p>Open-ended credit is how a ₹500 udhaar becomes ₹15,000. Decide a <strong>credit limit</strong> per customer based on how well you know them and how fast they pay. A digital khata can warn you — or block the sale — when a customer is over their limit, before you hand over more goods.</p>
    <h2>2. Record every receipt against the bill it pays</h2>
    <p>When a customer pays something on account, it should reduce a specific balance, not vanish into the till. <strong>Allocating receipts to bills</strong> means you always know exactly what's still due and against which invoice — no more "I think you paid for that one."</p>
    <blockquote>A khata you can't trust at a glance isn't an asset — it's an argument waiting to happen.</blockquote>
    <h2>3. Let the reminders do the chasing</h2>
    <p>The reason balances linger is that asking for money is awkward, so it gets put off. Take the awkwardness out of it: a polite, automatic <strong>WhatsApp or SMS reminder</strong> with the exact balance does the chasing for you, on a schedule, without a face-to-face confrontation.</p>
    <h2>4. Watch the ageing, not just the total</h2>
    <p>A ₹20,000 khata where everyone paid last week is healthy. A ₹20,000 khata where half is over 90 days old is a problem. Sort outstanding balances by <strong>how old they are</strong> and act on the oldest first — that's the money most at risk of never coming back.</p>
    <h2>5. Keep khata opt-in, not the default</h2>
    <p>Not every customer should be a credit customer. Make credit a deliberate choice you enable per person, so a new walk-in can't accidentally run up a tab. The discipline of "who is allowed udhaar" is half the battle.</p>
    <h2>How Pride POS handles khata</h2>
    <p>Pride POS turns the bahi into a live ledger: <strong>per-customer credit that you switch on deliberately</strong>, receipts allocated against specific bills, a balance that's always current, and <strong>WhatsApp payment reminders</strong> so you collect without the awkward calls. You keep the loyalty udhaar earns — and stop the quiet leak. <a href="/features/">See the features →</a> or <a href="https://app.pridepos.com/?signup=1">start a free trial</a>.</p>`
  },
  {
    slug: "gst-invoice-rules-small-shops", cat: "GST", read: "6 min read", date: "2026-06-02",
    title: "GST invoice rules every small Indian shop should know",
    excerpt: "HSN codes, the CGST/SGST/IGST split, e-invoicing thresholds and the fields a tax invoice must carry — in plain language.",
    description: "A plain-language guide to GST invoice rules for small shops: mandatory fields, HSN codes, the CGST/SGST/IGST split, and when e-invoicing applies.",
    keywords: "GST invoice rules, GST invoice format India, HSN code rules, e-invoice threshold, tax invoice fields",
    lede: "If you sell goods or services and you're registered under GST, the humble invoice is a legal document. Here's what it must contain, in language that doesn't need a CA to decode.",
    html: `
    <h2>1. What makes an invoice a "tax invoice"</h2>
    <p>A valid GST tax invoice has to carry a handful of mandatory fields: your shop's name, address and <strong>GSTIN</strong>; a consecutive invoice number for the financial year; the date; the customer's details (and GSTIN for B2B); a description of goods or services with <strong>HSN/SAC codes</strong>; taxable value; the tax rate and amount; and the place of supply.</p>
    <blockquote>The invoice number must be consecutive and unique for the financial year — gaps and duplicates are exactly what an audit looks for.</blockquote>
    <h2>2. HSN codes are not optional</h2>
    <p>Every item needs the correct <strong>HSN code</strong> (or SAC for services). The number of digits you must show depends on your turnover, but the safest habit is to store the code against each item once, so every invoice carries it automatically.</p>
    <h2>3. CGST + SGST, or IGST?</h2>
    <p>This trips up most shopkeepers. It depends on the <strong>place of supply</strong>:</p>
    <ul><li><strong>Same state</strong> as your shop → split the tax into <strong>CGST + SGST</strong>.</li>
    <li><strong>Different state</strong> → charge a single <strong>IGST</strong> at the combined rate.</li></ul>
    <p>Getting this wrong means your GSTR-1 won't reconcile. Good billing software reads the customer's state and applies the right split for you.</p>
    <h2>4. When e-invoicing (IRN) applies</h2>
    <p>Businesses above the prescribed turnover threshold must generate an <strong>e-invoice</strong> — an invoice registered on the government portal that returns an <strong>IRN</strong> and a signed QR code. If you're under the threshold today, build the habit now; thresholds have only come down over time.</p>
    <h2>5. Returns need credit notes</h2>
    <p>When a customer returns goods, don't just delete the bill. Issue a <strong>credit note</strong> (CDNR for registered buyers, CDNUR for unregistered) so your output tax and filings stay correct.</p>
    <h2>The shortcut</h2>
    <p>You can memorise all of this — or you can let your billing tool enforce it. <a href="/features/gst-billing/">Pride POS's GST billing</a> stamps HSN codes, picks the right tax split by state, generates IRN where needed, and exports GSTR-1 and GSTR-3B every month. <a href="/pricing/">Try it free for 5 days →</a></p>`
  },
  {
    slug: "how-to-choose-billing-software-india", cat: "Guides", read: "7 min read", date: "2026-06-02",
    title: "How to choose billing software for your shop in India",
    excerpt: "A practical checklist — GST, offline, hardware, multi-shop, pricing traps — to pick POS software you won't regret in six months.",
    description: "A practical buyer's checklist for choosing billing/POS software in India: GST compliance, offline support, hardware, multi-shop, data ownership and pricing traps to avoid.",
    keywords: "how to choose billing software, best POS software India, billing software comparison, POS buying guide India",
    lede: "Every billing app demo looks great for ten minutes. The pain shows up in month two — at filing time, during a power cut, or when the per-bill charges land. Here's how to choose so that doesn't happen.",
    html: `
    <h2>1. Is it genuinely GST-ready?</h2>
    <p>Not "GST compatible" — genuinely ready. It must put <strong>HSN codes</strong> on every line, pick <strong>CGST/SGST vs IGST</strong> automatically from the customer's state, and export <strong>GSTR-1 and GSTR-3B</strong>. If you have to fix the tax split by hand, you'll fix it wrong eventually.</p>
    <h2>2. What happens when the internet drops?</h2>
    <p>Indian shops lose connectivity — that's reality. Ask the hard question: <em>can I still bill a customer with the Wi-Fi off?</em> Software that just freezes at the counter costs you sales. <a href="/features/gst-billing/">Offline-first billing</a> queues the sale and syncs later, with the invoice number allocated correctly.</p>
    <h2>3. Does it run on what you already own?</h2>
    <p>You shouldn't have to buy a special terminal. Good software runs in a browser on a laptop, tablet or phone, supports a cheap <strong>thermal printer + barcode scanner</strong>, and ideally installs as an app for a desktop-like feel.</p>
    <h2>4. Will it grow with you?</h2>
    <p>Even if you have one shop today, check whether a second outlet is a five-minute setting or a forced upgrade. <a href="/features/multi-shop/">Multi-shop support</a> with per-outlet numbering and stock transfers saves a migration later.</p>
    <h2>5. Read the pricing the way an accountant would</h2>
    <ul><li>Watch for <strong>per-bill or per-invoice</strong> charges — they punish you for growing.</li>
    <li>Check which features are locked behind higher tiers (GST returns and e-invoice often are).</li>
    <li>Confirm the cost <em>per business</em>, not per device or per user.</li></ul>
    <blockquote>A flat, all-inclusive price is almost always cheaper than a "cheap" plan that meters the things you do most.</blockquote>
    <h2>6. Whose data is it?</h2>
    <p>Make sure you can <strong>export a full backup</strong> any time and that the vendor states a clear data-retention policy. If you can't get your data out, you don't really own your business records.</p>
    <h2>The short checklist</h2>
    <p>GST automation ✓ · works offline ✓ · runs on your hardware ✓ · multi-shop ready ✓ · flat pricing ✓ · your data exportable ✓. Pride POS was built to tick all six. <a href="/pricing/">See pricing →</a> or <a href="https://app.pridepos.com/?signup=1">start a free trial</a>.</p>`
  },
  {
    slug: "switch-from-paper-billing", cat: "Operations", read: "5 min read", date: "2026-06-02",
    title: "Moving from a paper bill book to digital billing",
    excerpt: "Nervous about leaving the ledger? A calm, step-by-step way to switch your shop to digital billing without losing a day of sales.",
    description: "A step-by-step guide for Indian shopkeepers switching from a paper bill book to digital billing software — without disrupting daily sales.",
    keywords: "paper to digital billing, switch billing software, digital bill book India, computerised billing shop",
    lede: "The bill book has worked for decades — so why change? Because at month-end it can't add up your GST, tell you your fastest-moving item, or stop a ₹500 note quietly going missing. Here's how to switch calmly.",
    html: `
    <h2>Step 1 — Enter your top items first, not all of them</h2>
    <p>Don't try to type your whole catalogue on day one. Add the <strong>30–50 items you sell most</strong>. Everything else you can add the first time it's sold. You'll be billing digitally within an hour.</p>
    <h2>Step 2 — Run paper and digital together for a week</h2>
    <p>For the first few days, write the paper bill <em>and</em> ring it into the software. It builds your staff's muscle memory and proves the totals match — without betting the shop on a brand-new system.</p>
    <h2>Step 3 — Plug in a thermal printer</h2>
    <p>A ₹2,000 thermal printer turns the experience from "typing on a computer" into "press one button, receipt prints." It's the single change that makes staff actually adopt it. Pride POS also supports a <strong>cash-drawer kick</strong> on print.</p>
    <h2>Step 4 — Start the day with opening cash</h2>
    <p>Each morning, enter the cash in the drawer. Each evening, do a one-tap <strong>day-close</strong>. Now the drawer either balances or it doesn't — no more "the till feels short this week."</p>
    <h2>Step 5 — Let the reports earn their keep</h2>
    <p>After two weeks you'll have something the bill book never gave you: which items make the most margin, who owes you money, and a GST summary that's ready at filing time instead of a frantic month-end.</p>
    <blockquote>You're not throwing away the bill book's discipline — you're keeping it and adding a calculator, an accountant and a CCTV for your cash, all in one.</blockquote>
    <h2>The safety net</h2>
    <p>Worried about losing data? Pride POS takes <a href="/features/gst-billing/">automatic backups</a> and lets you download a full copy any time. Your records are safer digital than they ever were on paper. <a href="https://app.pridepos.com/?signup=1">Try it free for 5 days →</a></p>`
  },
  {
    slug: "gstr1-vs-gstr3b-explained", cat: "GST", read: "6 min read", date: "2026-06-02",
    title: "GSTR-1 vs GSTR-3B: what's the difference, explained simply",
    excerpt: "Two returns, two jobs, one deadline season. What GSTR-1 and GSTR-3B each report, how they relate, and how to keep them reconciled.",
    description: "A plain-language explainer of GSTR-1 vs GSTR-3B for Indian shopkeepers: what each return reports, filing frequency, how they must reconcile, and common mistakes.",
    keywords: "GSTR-1 vs GSTR-3B, difference between GSTR1 and GSTR3B, GST return filing India, GSTR-3B explained, GST reconciliation",
    lede: "Every GST-registered shop files both — but most owners couldn't tell you what the difference actually is. Here it is without the jargon, so you stop dreading filing day.",
    html: `
    <h2>The one-line version</h2>
    <p><strong>GSTR-1 is the detailed list of your sales. GSTR-3B is the summary on which you pay tax.</strong> One tells the government exactly what you sold; the other settles how much you owe after input credit.</p>
    <h2>What GSTR-1 reports</h2>
    <p>GSTR-1 is an <strong>invoice-level statement of outward supplies</strong> (your sales). It breaks down B2B invoices, large inter-state B2C invoices, a B2C summary, credit/debit notes, and an HSN-wise summary. Because it's invoice-level, your buyers' input tax credit depends on you filing it accurately — get it wrong and your B2B customers chase you.</p>
    <h2>What GSTR-3B reports</h2>
    <p>GSTR-3B is a <strong>self-declared summary return</strong>. It nets your output tax (collected on sales) against your <strong>input tax credit</strong> (paid on purchases) and arrives at the tax you actually pay for the period. No invoice detail — just totals — but this is the one that moves money.</p>
    <blockquote>Think of GSTR-1 as the itemised bill you hand the government, and GSTR-3B as the payment slip.</blockquote>
    <h2>How often do you file them?</h2>
    <p>It depends on your turnover and scheme. Many small businesses file <strong>GSTR-1 quarterly</strong> (under QRMP) but pay tax monthly, while larger ones file both monthly. Your CA or the portal will tell you which cycle you're on — the software should support both.</p>
    <h2>The trap: they must reconcile</h2>
    <p>The output tax you declare in <strong>GSTR-3B</strong> should match the total tax from the sales you listed in <strong>GSTR-1</strong>. A mismatch is the single most common reason for a GST notice. If you bill from a spreadsheet and summarise by hand, drift is almost guaranteed.</p>
    <h2>How software keeps them in sync</h2>
    <p>When both returns are built from the <em>same</em> bills, they can't disagree. <a href="/features/gst-billing/">Pride POS</a> generates the portal-ready <strong>GSTR-1</strong> and a <strong>GSTR-3B summary with ITC</strong> from your actual invoices and purchases — so the detail and the summary always tie out. <a href="/pricing/">See how →</a></p>`
  },
  {
    slug: "inventory-management-small-shops", cat: "Operations", read: "7 min read", date: "2026-06-02",
    title: "Inventory management for small shops: a no-nonsense guide",
    excerpt: "Stop guessing what's on the shelf. Reorder points, dead stock, stock-takes and the few numbers that actually protect your cash.",
    description: "A practical inventory management guide for small Indian shops: reorder points, dead stock, stock valuation, multi-location stock and the metrics that protect cash flow.",
    keywords: "inventory management small business, stock management for shops, reorder point, dead stock, stock taking, inventory software India",
    lede: "Inventory is the largest pile of cash in most shops — and the least watched. You don't need an MBA to manage it well. You need a handful of habits and a system that does the counting.",
    html: `
    <h2>Your stock is frozen cash</h2>
    <p>Every item on the shelf is money you've already spent, waiting to be turned back into cash. Too little and you lose sales; too much and your working capital is stuck in slow-movers. The whole game is keeping the right amount of the right things.</p>
    <h2>Set a reorder point for your top items</h2>
    <p>For each fast-moving item, decide the level at which you reorder — roughly <em>(how many you sell per week) × (weeks the supplier takes) + a small buffer</em>. When stock drops to that point, you order. <a href="/features/multi-shop/">Software with low-stock alerts</a> and reorder suggestions does this watching for you.</p>
    <h2>Hunt down dead stock every quarter</h2>
    <p>Pull a list of items that <strong>haven't sold in 90 days</strong>. That's cash on a shelf. Discount it, bundle it, or return it — but don't let it sit silently for a year. A good stock report makes this a five-minute job.</p>
    <h2>Count what matters, often (not everything, rarely)</h2>
    <p>The annual all-night stock-take is dreaded and error-prone. Instead, <strong>cycle-count</strong>: verify a few high-value or fast-moving items each week. Errors surface early and the big count stops being scary.</p>
    <h2>Know these three numbers</h2>
    <ul><li><strong>Stock on hand value</strong> — how much cash is tied up right now.</li>
    <li><strong>Fast vs slow movers</strong> — where to put more money, and where to stop.</li>
    <li><strong>Stockouts</strong> — items that hit zero while customers still wanted them.</li></ul>
    <blockquote>If you only track one thing, track what went to zero. Empty shelves are invisible lost sales.</blockquote>
    <h2>One catalogue, even across branches</h2>
    <p>Running more than one outlet? Counting stock per branch on paper is hopeless. <a href="/features/multi-shop/">Per-shop stock with transfers</a> lets you see what's where and move it before you over-order. A shared item master means a price change is live everywhere at once.</p>
    <h2>Let billing update stock for you</h2>
    <p>The cleanest inventory system is the one you don't maintain separately: when every sale and purchase adjusts stock automatically, your counts stay live without extra work. That's how Pride POS does it. <a href="https://app.pridepos.com/?signup=1">Try it free →</a></p>`
  },
  {
    slug: "thermal-printer-setup-guide", cat: "Hardware", read: "5 min read", date: "2026-06-02",
    title: "Thermal printer setup for your billing counter (step by step)",
    excerpt: "Pick the right thermal printer, connect it, and print your first receipt — plus cash-drawer kick and the gotchas nobody warns you about.",
    description: "A step-by-step guide to setting up a thermal receipt printer for billing in India: choosing 58mm vs 80mm, USB/Bluetooth/LAN connection, drivers, cash-drawer kick and troubleshooting.",
    keywords: "thermal printer setup, receipt printer billing, 58mm vs 80mm printer, ESC POS printer India, cash drawer kick, POS printer connection",
    lede: "A thermal printer is the cheapest upgrade that makes digital billing feel professional — one button, instant receipt. Here's how to choose and set one up without the usual head-scratching.",
    html: `
    <h2>58mm or 80mm?</h2>
    <p>The number is the paper width. <strong>58mm</strong> printers are cheaper and fine for a small shop's short receipts. <strong>80mm</strong> gives a wider, clearer receipt with room for more columns and a logo — better for busier counters and GST invoices. If in doubt, 80mm ages better.</p>
    <h2>How will it connect?</h2>
    <ul><li><strong>USB</strong> — simplest and most reliable for a fixed counter PC or laptop.</li>
    <li><strong>Bluetooth</strong> — good for a tablet or phone counter; pair it once.</li>
    <li><strong>LAN/Wi-Fi</strong> — best when several billing devices share one printer.</li></ul>
    <p>Pick based on your counter device, not the spec sheet. Most shops are happiest with plain USB.</p>
    <h2>Step 1 — Load the roll the right way</h2>
    <p>Thermal paper only prints on one side. If your receipts come out blank, the roll is in upside down — flip it. (Don't worry, you'll do this once and never forget.)</p>
    <h2>Step 2 — Connect and set as default</h2>
    <p>Plug in USB (or pair Bluetooth), let the driver install, and set the printer as your device's default. For ESC/POS printers, Pride POS can talk to them directly for crisp, fast receipts — no fiddly driver dialog each time.</p>
    <h2>Step 3 — Match the paper size in print settings</h2>
    <p>In Pride POS's <strong>Print setup</strong>, choose the Thermal format and set 58mm or 80mm to match your printer. Toggle which fields show (logo, GSTIN, UPI QR) so the receipt looks exactly how you want.</p>
    <h2>Step 4 — Wire the cash drawer (optional)</h2>
    <p>Most cash drawers connect to the printer with an <strong>RJ11/RJ12 cable</strong> and pop open on a "kick" signal when a receipt prints. Pride POS sends the ESC/POS drawer-kick automatically — so cash sales open the till hands-free.</p>
    <h2>Common gotchas</h2>
    <ul><li><strong>Blank receipts</strong> → paper roll upside down.</li>
    <li><strong>Faded print</strong> → cheap or old thermal paper; buy better rolls.</li>
    <li><strong>Wrong width / cut-off text</strong> → printer set to 80mm but receipt formatted for 58mm (or vice-versa).</li>
    <li><strong>Drawer won't open</strong> → it's powered from the printer; check the RJ-cable and that kick is enabled.</li></ul>
    <h2>That's it</h2>
    <p>Once it's set up, billing becomes one tap → receipt → drawer opens. <a href="/features/gst-billing/">Pride POS supports ESC/POS thermal printing</a> with a cash-drawer kick out of the box. <a href="https://app.pridepos.com/?signup=1">Start a free trial →</a></p>`
  },
];

// Pick a header illustration for an article by category (reuses existing art; default spot).
const ARTICLE_ART = (a) => ({
  "GST": "/assets/art/gst.svg",
  "Operations": "/assets/art/retail.svg",
  "Hardware": "/assets/art/retail.svg",
  "Guides": "/assets/art/blog-spot.svg",
}[a.cat] || "/assets/art/blog-spot.svg");

// Blog index page (cards auto-built from ARTICLES, newest first).
PAGES.push({
  out: "blog/index.html",
  title: "Pride POS Blog — GST, billing & running a shop in India",
  description: "Practical guides on GST billing, inventory, pricing and running a small retail or service shop in India, from the Pride POS team.",
  keywords: "GST blog India, small shop guides, billing tips, retail business India",
  crumb: [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }],
  body: ({ cr }) => `<section class="hero"><div class="container" style="max-width:760px"><div class="reveal">
    <span class="eyebrow">The Pride POS blog</span><h1>Running a shop, <span class="hl">made simpler</span>.</h1>
    <p class="lede">Plain-language guides on GST, billing, inventory and the day-to-day of running a small Indian shop.</p>
  </div></div></section>
  <section class="section tight"><div class="container">${cr.html}<div class="grid c3">
  ${ARTICLES.map((p, i) => `<a class="post reveal" href="/blog/${p.slug}/" style="animation-delay:${(i % 3) * .06}s"><div class="post-thumb"><img src="${ARTICLE_ART(p)}" width="400" height="200" alt="" loading="lazy"/></div><div class="post-body"><div class="post-cat">${p.cat}</div><h3>${p.title}</h3><p>${p.excerpt}</p></div></a>`).join("")}
  </div></div></section>`
});

// One page per article.
for (const a of ARTICLES) {
  PAGES.push({
    out: `blog/${a.slug}/index.html`,
    title: `${a.title} — Pride POS`,
    description: a.description,
    keywords: a.keywords,
    ogType: "article",
    crumb: [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }, { name: a.cat, path: "/blog/" }, { name: a.title, path: `/blog/${a.slug}/` }],
    extraLD: [{
      "@type": "Article", headline: a.title, description: a.description,
      author: { "@type": "Organization", name: "Pride POS" }, publisher: ORG,
      datePublished: a.date, dateModified: a.date, image: `https://pridepos.com${ARTICLE_ART(a)}`,
      mainEntityOfPage: `https://pridepos.com/blog/${a.slug}/`
    }],
    body: ({ cr }) => `<section class="section"><div class="container">${cr.html}
  <article class="prose reveal">
    <span class="eyebrow">${a.cat} · ${a.read}</span>
    <h1 style="font-size:clamp(2rem,4.5vw,3.2rem)">${a.title}</h1>
    <figure class="article-art"><img src="${ARTICLE_ART(a)}" width="400" height="200" alt="Illustration for: ${a.title}"/></figure>
    <p class="lede">${a.lede}</p>${a.html}
  </article>
  </div></section>
  ${CTA}`
  });
}

// ── 404 page (served by the host for unknown routes; noindex). ──
PAGES.push({
  out: "404.html",
  path: "/404.html",
  noindex: true,
  title: "Page not found — Pride POS",
  description: "The page you were looking for doesn't exist. Head back to Pride POS.",
  crumb: [{ name: "Home", path: "/" }, { name: "Not found", path: "/404.html" }],
  body: () => `<section class="hero"><div class="container center" style="max-width:640px;margin:0 auto"><div class="reveal">
    <span class="eyebrow">404</span>
    <h1>This page took an <span class="hl">unscheduled day off</span>.</h1>
    <p class="lede" style="margin:0 auto 28px">We couldn't find what you were looking for. It may have moved — let's get you back on track.</p>
    <div class="hero-cta" style="justify-content:center">
      <a class="btn primary lg" href="/">Back to home</a>
      <a class="btn lg" href="/blog/">Read the blog</a>
    </div>
  </div></div></section>`
});

// ── Render all ──────────────────────────────────────────────────────────
let n = 0;
for (const p of PAGES) {
  const cr = crumbs(p.crumb);
  const jsonld = [ORG, ...(p.extraLD || []), cr.ld];
  const html = head({ title: p.title, description: p.description, path: p.path || ("/" + p.out.replace(/index\.html$/, "")), keywords: p.keywords || "", jsonld, ogType: p.ogType || "website", noindex: p.noindex })
    + "\n" + NAV + '\n<main id="main">\n' + p.body({ cr }) + "\n</main>\n" + FOOTER + "\n";
  const dest = join(WEB, p.out);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  n++;
  console.log("✓", p.out);
}
console.log(`\n✓ ${n} pages generated`);
