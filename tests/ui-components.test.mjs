import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { extract } from '../lib/evidence.ts';
import { verificationBasis } from '../lib/verification.ts';
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

test('Career Pack starts with explicit selection and no automatic sharing', async () => {
  const { default: CareerPack } = await vite.ssrLoadModule('/app/career-pack.tsx');
  const r = extract('I checked the order.', 'Retail sales', '2026-09-02');
  r.title = 'Order check'; r.claims = r.claims.map(c => ({ ...c, state: c.state === 'MISSING EVIDENCE' ? c.state : 'USER VERIFIED' }));
  const html = renderToStaticMarkup(React.createElement(CareerPack, { records: [r] }));
  assert.match(html, /Nothing is shared automatically/);
  assert.match(html, /0 experience/);
  assert.match(html, /Excludes full raw history/);
  assert.doesNotMatch(html, /aria-checked="true"/);
});
test('Capability cards label counts without promoting interpretations to verified skills', async () => {
  const { CapabilitySummary } = await vite.ssrLoadModule('/app/career-pack.tsx');
  const r = extract('I checked the order.', 'Retail sales', '2026-09-02');
  r.claims = r.claims.map(c => ({ ...c, state: c.state === 'MISSING EVIDENCE' ? c.state : 'USER VERIFIED' }));
  const html = renderToStaticMarkup(React.createElement(CapabilitySummary, { records: [r], onChoose: () => {} }));
  assert.match(html, /Based on 1 experience/); assert.match(html, /Not a rating/);
  assert.doesNotMatch(html, /Verified skill/);
});
test('Privacy page discloses real scope and does not claim account deletion compliance', async () => {
  const { default: Privacy } = await vite.ssrLoadModule('/app/privacy/page.tsx');
  const html = renderToStaticMarkup(React.createElement(Privacy));
  assert.match(html, /does not send experience text to an external AI model/);
  assert.match(html, /not a completed public-release privacy policy/);
  assert.match(html, /not deleted by WorkProof/);
});

test('homepage explains the full proof transition before asking for trust', async () => {
  const source = await readFile(path.join(root, 'app/workproof.tsx'), 'utf8');
  assert.match(source, /See a completed example/);
  assert.match(source, /A claim earns its status/);
  assert.match(source, /review makes it Reported—not independently verified/);
  assert.match(source, /Only their confirmation of that version makes it Verified/);
  assert.match(source, /Your full history stays private/);
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

test('worker review renders Reported, never an external verification badge', async () => {
  const { EvidenceBadge, EvidenceLegend } = await vite.ssrLoadModule('/app/evidence-proof.tsx');
  const record = extract('I checked the order.', 'Retail sales', '2026-09-02');
  const claim = record.claims.find(c => c.kind === 'action'); claim.state = 'USER VERIFIED';
  const html = renderToStaticMarkup(React.createElement(EvidenceBadge, { record, claim }));
  assert.match(html, />Reported</); assert.doesNotMatch(html, />Verified</);
  const legend = renderToStaticMarkup(React.createElement(EvidenceLegend));
  assert.match(legend, /Reported/); assert.match(legend, /Supported/); assert.match(legend, /Verified/);
  assert.match(legend, /not independently certified/);
});

test('sharing preview exposes only the selected source and approved context, not the raw history', async () => {
  const { SharedEvidence } = await vite.ssrLoadModule('/app/evidence-proof.tsx');
  const record = extract('I checked the order. My unrelated project involved confidential details.', 'Retail sales', '2026-09-02');
  const claim = record.claims.find(c => c.kind === 'action'); claim.state = 'USER VERIFIED';
  const html = renderToStaticMarkup(React.createElement(SharedEvidence, { snapshot: verificationBasis(record, claim), workerName: 'Fictional worker' }));
  assert.match(html, /I checked the order/); assert.match(html, /Fictional worker/);
  assert.doesNotMatch(html, /confidential details/);
});

test('verification composer has explicit recipient consent and manual delivery, with no team sharing', async () => {
  const { default: VerificationPanel } = await vite.ssrLoadModule('/app/verification-panel.tsx');
  const record = extract('I checked the order.', 'Retail sales', '2026-09-02');
  record.claims = record.claims.map(c => ({ ...c, state: c.state === 'MISSING EVIDENCE' ? c.state : 'USER VERIFIED' }));
  const html = renderToStaticMarkup(React.createElement(VerificationPanel, { record, workerName: 'Fictional worker', onUpdate: () => {} }));
  assert.match(html, /Verifier email/); assert.match(html, /Share this exact evidence with this person/);
  assert.match(html, /You send the link yourself/); assert.match(html, /14 days/);
  assert.match(html, /link does not grant site access/);
  assert.match(html, /disabled=""[^>]*>[^]*?Create request link/);
  assert.doesNotMatch(html, /leaderboard|performance score|employee ranking/i);
  const demo = renderToStaticMarkup(React.createElement(VerificationPanel, { record: { ...record, demo: true }, workerName: 'Fictional worker', onUpdate: () => {} }));
  assert.equal(demo, '');
});
