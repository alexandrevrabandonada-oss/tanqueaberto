const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = path.resolve(process.cwd(), 'reports/release-gate-preview-real');
const REPORT_PATH = path.resolve(process.cwd(), 'reports/2026-03-26-estado-da-nacao-preview-real-gate.md');
const METRICS_PATH = path.join(OUT_DIR, 'metrics.json');

const VIEWPORTS = {
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
  tablet: { width: 820, height: 1180, isMobile: false, hasTouch: false },
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  'pwa-wide': { width: 1536, height: 960, isMobile: false, hasTouch: false },
};

const ROUTES = [
  { name: 'mapa', path: '/' },
  { name: 'atualizacoes', path: '/atualizacoes' },
  { name: 'enviar', path: '/enviar' },
  { name: 'meu-hub', path: '/hub' },
];

const STATES = [
  { name: 'normal' },
  {
    name: 'primeira-visita',
    setup: async (context) => {
      await context.addInitScript(() => {
        localStorage.removeItem('bomba_aberta_home_guide_dismissed');
        localStorage.removeItem('bomba-aberta:my-submissions');
        localStorage.removeItem('bomba_aberta_active_mission');
        localStorage.removeItem('bomba-aberta:recorte-snapshot');
        localStorage.removeItem('bomba_lista_mode');
      });
    },
  },
  {
    name: 'missao-ativa',
    setup: async (context) => {
      await context.addInitScript((mission) => {
        localStorage.setItem('bomba_aberta_active_mission', JSON.stringify(mission));
        localStorage.removeItem('bomba_aberta_home_guide_dismissed');
      }, buildMissionState());
    },
  },
  {
    name: 'gps-ativo',
    setup: async (context) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: -22.509, longitude: -44.093, accuracy: 12 });
    },
  },
  {
    name: 'snapshot-offline',
    setup: async (context) => {
      await context.addInitScript((snapshot) => {
        localStorage.setItem('bomba-aberta:recorte-snapshot', JSON.stringify(snapshot));
        localStorage.removeItem('bomba_aberta_active_mission');
      }, buildWarmSnapshot());
    },
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildWarmSnapshot() {
  const now = new Date().toISOString();
  return {
    data: {
      stations: [],
      selectedCity: '',
      query: '',
      fuelFilter: 'all',
      recencyFilter: 'all',
      presenceFilter: 'all',
      timestamp: now,
    },
    timestamp: now,
    version: '1.0',
  };
}

function buildMissionState() {
  const now = new Date().toISOString();
  return {
    groupId: 'release-gate-preview-real',
    groupName: 'Gate Preview Real',
    stationIds: ['a', 'b', 'c'],
    currentIndex: 0,
    completedIds: [],
    skippedIds: [],
    startedAt: now,
  };
}

function rectFromBox(box) {
  if (!box) return null;
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    right: box.x + box.width,
    bottom: box.y + box.height,
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2,
  };
}

function intersects(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
}

function toElementBox(box) {
  if (!box) return null;
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
    right: Math.round(box.right),
    bottom: Math.round(box.bottom),
  };
}

function parsePx(value) {
  if (!value) return null;
  const parsed = Number(String(value).replace('px', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBaseUrl(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function resolvePreviewUrl() {
  const candidate =
    process.argv[2] ||
    process.env.PREVIEW_URL ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_BRANCH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  return normalizeBaseUrl(candidate);
}

function screenshotPath(routeName, stateName, viewportName) {
  return path.join(OUT_DIR, routeName, stateName, `${viewportName}.png`);
}

function makeScenario(route, stateName, viewportName) {
  return {
    route,
    stateName,
    viewportName,
    viewport: VIEWPORTS[viewportName],
    screenshotPath: screenshotPath(route.name, stateName, viewportName),
  };
}

function buildScenarios() {
  const scenarios = [];
  for (const route of ROUTES) {
    for (const state of STATES) {
      for (const viewportName of Object.keys(VIEWPORTS)) {
        scenarios.push(makeScenario(route, state.name, viewportName));
      }
    }
  }
  return scenarios;
}

async function createContext(browser, scenario) {
  const context = await browser.newContext({
    viewport: { width: scenario.viewport.width, height: scenario.viewport.height },
    isMobile: scenario.viewport.isMobile,
    hasTouch: scenario.viewport.hasTouch,
    permissions: scenario.stateName === 'gps-ativo' ? ['geolocation'] : [],
    geolocation:
      scenario.stateName === 'gps-ativo'
        ? { latitude: -22.509, longitude: -44.093, accuracy: 12 }
        : undefined,
  });

  const state = STATES.find((item) => item.name === scenario.stateName);
  if (state?.setup) {
    await state.setup(context);
  }

  if (scenario.viewportName === 'pwa-wide') {
    await context.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (query.includes('display-mode: standalone')) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() { return false; },
          };
        }
        return originalMatchMedia(query);
      };
    });
  }

  return context;
}

async function waitForPageReady(page, routeName, stateName) {
  await page.waitForSelector('[data-app-shell="root"]', { state: 'visible', timeout: 45000 });
  await page.waitForSelector('[data-bottom-nav="root"]', { state: 'visible', timeout: 45000 });
  await page.waitForSelector('[data-top-orchestrator="root"]', { state: 'visible', timeout: 45000 }).catch(() => null);

  const expectedStates = new Set(['primeira-visita', 'missao-ativa', 'gps-ativo', 'snapshot-offline']);
  if (routeName === 'mapa' && expectedStates.has(stateName)) {
    const expectedText =
      stateName === 'primeira-visita'
        ? 'Primeira visita'
        : stateName === 'missao-ativa'
          ? 'Missão ativa'
          : stateName === 'gps-ativo'
            ? 'GPS ativo'
            : 'Snapshot offline';
    await page.getByText(expectedText, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
  }

  await page.waitForTimeout(routeName === 'mapa' ? 1600 : 1000);
}

async function collectMetrics(page, scenario) {
  const viewport = scenario.viewport;
  const shell = rectFromBox(await page.locator('[data-app-shell="root"]').boundingBox().catch(() => null));
  const header = rectFromBox(await page.locator('[data-app-shell="root"] > header').boundingBox().catch(() => null));
  const top = rectFromBox(await page.locator('[data-top-orchestrator="root"]').boundingBox().catch(() => null));
  const nav = rectFromBox(await page.locator('[data-bottom-nav="root"]').boundingBox().catch(() => null));
  const shellCta = rectFromBox(await page.locator('[data-global-cta="shell"]').boundingBox().catch(() => null));
  const dockCta = rectFromBox(await page.locator('[data-global-cta="dock"]').boundingBox().catch(() => null));
  const main = rectFromBox(await page.locator('[data-layout-role="main"]').first().boundingBox().catch(() => null));
  const rail = rectFromBox(await page.locator('[data-layout-role="rail"]').first().boundingBox().catch(() => null));

  const candidates = [
    { name: 'shell', box: shell },
    { name: 'header', box: header },
    { name: 'top', box: top },
    { name: 'nav', box: nav },
    { name: 'shellCta', box: shellCta },
    { name: 'dockCta', box: dockCta },
    { name: 'main', box: main },
    { name: 'rail', box: rail },
  ];

  const clippingViolations = candidates
    .filter((item) => item.box)
    .filter((item) => item.box.x < -1 || item.box.y < -1 || item.box.right > viewport.width + 1 || item.box.bottom > viewport.height + 1)
    .map((item) => ({ name: item.name, box: toElementBox(item.box) }));

  const overlapViolations = [];
  if (dockCta && nav && intersects(dockCta, nav)) {
    overlapViolations.push({ name: 'dock-cta-vs-nav', boxA: toElementBox(dockCta), boxB: toElementBox(nav) });
  }
  if (shellCta && header && intersects(shellCta, header) && shellCta.right > header.right + 1) {
    overlapViolations.push({ name: 'shell-cta-vs-header', boxA: toElementBox(shellCta), boxB: toElementBox(header) });
  }

  const ctaOffAxis = [];
  if (shellCta && header) {
    const axisDelta = Math.abs(shellCta.centerX - header.centerX);
    if (viewport.width >= 768 && axisDelta > Math.max(180, viewport.width * 0.16)) {
      ctaOffAxis.push({ name: 'shell-cta', box: toElementBox(shellCta), axisDelta: Math.round(axisDelta) });
    }
  }
  if (dockCta) {
    const centerDelta = Math.abs(dockCta.centerX - viewport.width / 2);
    if (centerDelta > 64) {
      ctaOffAxis.push({ name: 'dock-cta', box: toElementBox(dockCta), centerDelta: Math.round(centerDelta) });
    }
  }

  const navObstruction = [];
  if (dockCta && nav) {
    const gap = nav.y - dockCta.bottom;
    if (gap < 8) {
      navObstruction.push({ name: 'dock-cta-clearance', gap: Math.round(gap) });
    }
  }

  const topBudgetMode = await page.locator('[data-top-orchestrator="root"]').getAttribute('data-top-budget-mode').catch(() => null);
  const topBudgetMax = await page.locator('[data-top-orchestrator="root"]').getAttribute('data-top-budget-max-height').catch(() => null);
  const topBudgetMaxWide = await page.locator('[data-top-orchestrator="root"]').getAttribute('data-top-budget-max-height-wide').catch(() => null);
  const pageTitle = await page.title().catch(() => '');

  ensureDir(path.dirname(scenario.screenshotPath));
  await page.screenshot({ path: scenario.screenshotPath, fullPage: false });

  return {
    route: scenario.route.name,
    path: scenario.route.path,
    viewport: `${viewport.width}x${viewport.height}`,
    state: scenario.stateName,
    screenshot: path.relative(process.cwd(), scenario.screenshotPath).replace(/\\/g, '/'),
    title: pageTitle,
    shell: toElementBox(shell),
    header: toElementBox(header),
    top: toElementBox(top),
    nav: toElementBox(nav),
    shellCta: toElementBox(shellCta),
    dockCta: toElementBox(dockCta),
    main: toElementBox(main),
    rail: toElementBox(rail),
    clippingViolations,
    overlapViolations,
    ctaOffAxis,
    navObstruction,
    topBudgetMode,
    topBudgetMax,
    topBudgetMaxWide,
  };
}

function summarize(metrics) {
  const summary = {
    totalCaptures: metrics.length,
    clippingViolations: 0,
    overlapViolations: 0,
    ctaOffAxis: 0,
    navObstruction: 0,
    topHigh: 0,
  };

  for (const item of metrics) {
    summary.clippingViolations += item.clippingViolations.length;
    summary.overlapViolations += item.overlapViolations.length;
    summary.ctaOffAxis += item.ctaOffAxis.length;
    summary.navObstruction += item.navObstruction.length;
    const budget = parsePx(item.topBudgetMode === 'expanded' ? item.topBudgetMaxWide ?? item.topBudgetMax : item.topBudgetMaxWide ?? item.topBudgetMax);
    if (budget && item.top && item.top.height > budget + 4) {
      summary.topHigh += 1;
    }
  }

  return summary;
}

function buildReport(baseUrl, summary, metrics, blockers = []) {
  const verdict = blockers.length > 0 || summary.clippingViolations > 0 || summary.overlapViolations > 0 || summary.ctaOffAxis > 0 || summary.navObstruction > 0 || summary.topHigh > 0
    ? (blockers.length > 0 ? `HOLD com blockers: ${blockers.join(', ')}` : 'HOLD')
    : 'GO';

  const lines = [];
  lines.push('# Estado da Nação — Preview Real Gate');
  lines.push('');
  lines.push(`Data: ${new Date().toISOString()}`);
  lines.push(`URL: ${baseUrl}`);
  lines.push('');
  lines.push('## Veredito');
  lines.push(verdict);
  lines.push('');
  lines.push('## Cobertura');
  lines.push(`- Capturas totais: ${summary.totalCaptures}`);
  lines.push(`- Clipping: ${summary.clippingViolations}`);
  lines.push(`- Overlap: ${summary.overlapViolations}`);
  lines.push(`- CTA fora do eixo: ${summary.ctaOffAxis}`);
  lines.push(`- Nav obstruindo conteudo: ${summary.navObstruction}`);
  lines.push(`- Topo alto demais: ${summary.topHigh}`);
  lines.push('');
  lines.push('## Checklist Obrigatorio');
  lines.push(`- CTA lateral solto: ${summary.ctaOffAxis > 0 ? 'HOLD' : 'OK'}`);
  lines.push(`- Excesso de vazio preto: ${summary.clippingViolations > 0 ? 'HOLD' : 'OK'}`);
  lines.push(`- Topo alto demais: ${summary.topHigh > 0 ? 'HOLD' : 'OK'}`);
  lines.push(`- Overlap com nav: ${summary.overlapViolations > 0 ? 'HOLD' : 'OK'}`);
  lines.push(`- Card principal muito alto: ${summary.topHigh > 0 ? 'HOLD' : 'OK'}`);
  lines.push(`- Regressao de eixo visual: ${summary.ctaOffAxis > 0 ? 'HOLD' : 'OK'}`);
  lines.push('');
  lines.push('## Inventario');
  for (const item of metrics) {
    const hasIssue = item.clippingViolations.length || item.overlapViolations.length || item.ctaOffAxis.length || item.navObstruction.length;
    lines.push(`- ${item.route} / ${item.state} / ${item.viewport}: ${hasIssue ? 'ALERTA' : 'OK'} | ${item.screenshot}`);
  }
  lines.push('');
  lines.push('## Observacoes');
  lines.push('- O gate aponta para a URL publicada informada por PREVIEW_URL, VERCEL_URL, VERCEL_BRANCH_URL ou argumento na linha de comando.');
  lines.push('- O estado PWA wide e emulado por display-mode: standalone em viewport larga.');
  lines.push('- O gate grava screenshots e metrics em reports/release-gate-preview-real.');
  return lines.join('\n');
}

async function main() {
  ensureDir(OUT_DIR);

  const baseUrl = resolvePreviewUrl();
  if (!baseUrl) {
    const report = [
      '# Estado da Nação — Preview Real Gate',
      '',
      `Data: ${new Date().toISOString()}`,
      '',
      '## Veredito',
      'HOLD com blockers: preview_url_missing',
      '',
      '## Checklist Obrigatorio',
      '- CTA lateral solto: HOLD',
      '- Excesso de vazio preto: HOLD',
      '- Topo alto demais: HOLD',
      '- Overlap com nav: HOLD',
      '- Card principal muito alto: HOLD',
      '- Regressao de eixo visual: HOLD',
      '',
      '## Observacoes',
      '- Defina PREVIEW_URL ou VERCEL_URL para rodar o gate contra a URL publicada.',
    ].join('\n');
    fs.writeFileSync(METRICS_PATH, JSON.stringify({ verdict: 'HOLD', blockers: ['preview_url_missing'] }, null, 2));
    fs.writeFileSync(REPORT_PATH, report);
    console.log(report);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const metrics = [];
  const blockers = [];

  try {
    for (const scenario of buildScenarios()) {
      const context = await createContext(browser, scenario);
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      page.setDefaultNavigationTimeout(60000);

      try {
        await page.goto(`${baseUrl}${scenario.route.path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await waitForPageReady(page, scenario.route.name, scenario.stateName);

        if (scenario.stateName === 'sticky') {
          await page.evaluate(() => window.scrollTo(0, 720));
          await page.waitForTimeout(1200);
        }

        if (scenario.stateName === 'gps-ativo') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-system="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('GPS ativo'));
          }, { timeout: 20000 }).catch(() => null);
        }

        if (scenario.stateName === 'snapshot-offline') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-system="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('Snapshot offline'));
          }, { timeout: 20000 }).catch(() => null);
        }

        if (scenario.stateName === 'missao-ativa') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-orchestrator="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('Missão ativa'));
          }, { timeout: 20000 }).catch(() => null);
        }

        if (scenario.viewportName === 'pwa-wide') {
          await page.waitForTimeout(1000);
        }

        metrics.push(await collectMetrics(page, scenario));
      } catch (error) {
        blockers.push(`${scenario.route.name}:${scenario.stateName}:${scenario.viewportName}`);
        metrics.push({
          route: scenario.route.name,
          path: scenario.route.path,
          viewport: `${scenario.viewport.width}x${scenario.viewport.height}`,
          state: scenario.stateName,
          screenshot: screenshotPath(scenario.route.name, scenario.stateName, scenario.viewportName).replace(/\\/g, '/'),
          error: error instanceof Error ? error.message : String(error),
          clippingViolations: [],
          overlapViolations: [],
          ctaOffAxis: [],
          navObstruction: [],
          shell: null,
          header: null,
          top: null,
          nav: null,
          shellCta: null,
          dockCta: null,
          main: null,
          rail: null,
          topBudgetMode: null,
          topBudgetMax: null,
          topBudgetMaxWide: null,
        });
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const summary = summarize(metrics);
  const report = buildReport(baseUrl, summary, metrics, blockers);
  const verdict = blockers.length > 0 || summary.clippingViolations > 0 || summary.overlapViolations > 0 || summary.ctaOffAxis > 0 || summary.navObstruction > 0 || summary.topHigh > 0 ? 'HOLD' : 'GO';

  fs.writeFileSync(METRICS_PATH, JSON.stringify({ baseUrl, summary, metrics, blockers, verdict }, null, 2));
  fs.writeFileSync(REPORT_PATH, report);

  console.log(report);
  process.exit(verdict === 'GO' ? 0 : 1);
}

main().catch((error) => {
  const report = [
    '# Estado da Nação — Preview Real Gate',
    '',
    `Data: ${new Date().toISOString()}`,
    '',
    '## Veredito',
    'HOLD com blockers: runtime_error',
    '',
    '## Erro',
    `- ${error instanceof Error ? error.message : String(error)}`,
  ].join('\n');
  fs.writeFileSync(REPORT_PATH, report);
  console.error(error);
  process.exit(1);
});
