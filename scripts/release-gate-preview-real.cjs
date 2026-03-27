const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');

const OUT_DIR = path.resolve(process.cwd(), 'reports/release-gate-preview-real');
const METRICS_PATH = path.join(OUT_DIR, 'metrics.json');
const REPORT_PATH = path.resolve(process.cwd(), 'reports/estado-da-nacao-gate-preview-real-corrigido.md');

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const argv = process.argv.slice(2);
  const flagIndex = argv.findIndex((item) => item === '--preview-url' || item === '--url');
  const flagValue = flagIndex >= 0 ? argv[flagIndex + 1] : null;
  const positional = argv.find((item) => item && !item.startsWith('--'));
  const candidate =
    flagValue ||
    positional ||
    process.env.PREVIEW_URL ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_BRANCH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  return normalizeBaseUrl(candidate);
}

async function startPreviewProxy(baseUrl) {
  const cache = new Map();
  const server = http.createServer((req, res) => {
    const parsed = new URL(req.url || '/', 'http://127.0.0.1');
    const requestPath = `${parsed.pathname}${parsed.search}` || '/';
    const cacheKey = `${req.method || 'GET'}:${requestPath}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      res.writeHead(cached.statusCode, cached.headers);
      res.end(cached.body);
      return;
    }

    const isTextLike = /\.(html?|css|js|mjs|cjs|json|txt|xml|svg|webmanifest|map)$/i.test(parsed.pathname) || parsed.pathname === '/' ;
    const args = ['curl', '-s', requestPath, '--deployment', baseUrl];
    const result = spawnSync('vercel', args, { encoding: isTextLike ? 'utf8' : 'buffer', maxBuffer: 20 * 1024 * 1024 });

    if (result.error) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`proxy_error: ${result.error.message}`);
      return;
    }

    if (result.status !== 0) {
      const message = typeof result.stderr === 'string' ? result.stderr : Buffer.from(result.stderr || '').toString('utf8');
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(message || `vercel curl failed for ${requestPath}`);
      return;
    }

    const body = isTextLike ? Buffer.from(result.stdout || '', 'utf8') : Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || '');
    const contentType = getContentType(parsed.pathname);
    const headers = { 'content-type': contentType, 'cache-control': 'no-store' };
    cache.set(cacheKey, { statusCode: 200, headers, body });
    res.writeHead(200, headers);
    res.end(body);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start preview proxy');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function getContentType(requestPath) {
  const lower = requestPath.toLowerCase();
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json') || lower.endsWith('.webmanifest') || lower.endsWith('.map')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.woff2')) return 'font/woff2';
  if (lower.endsWith('.woff')) return 'font/woff';
  return 'text/html; charset=utf-8';
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
  const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.VERCEL_PROTECTION_BYPASS_TOKEN || null;
  const extraHTTPHeaders = protectionBypass ? { 'x-vercel-protection-bypass': protectionBypass } : undefined;
  const context = await browser.newContext({
    viewport: { width: scenario.viewport.width, height: scenario.viewport.height },
    isMobile: scenario.viewport.isMobile,
    hasTouch: scenario.viewport.hasTouch,
    permissions: scenario.stateName === 'gps-ativo' ? ['geolocation'] : [],
    geolocation:
      scenario.stateName === 'gps-ativo'
        ? { latitude: -22.509, longitude: -44.093, accuracy: 12 }
        : undefined,
    extraHTTPHeaders,
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
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);

  const shellRootSelector = '[data-app-shell="root"]';
  let rootError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.waitForSelector(shellRootSelector, { state: 'attached', timeout: attempt === 1 ? 5000 : 2500 });
      rootError = null;
      break;
    } catch (error) {
      rootError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 350 : 0));
    }
  }

  if (rootError) {
    throw new Error(`shell_root_missing: [data-app-shell="root"] not found after retry (${rootError})`);
  }

  const shellFrame = page.locator('[data-app-shell-frame="root"]');
  if ((await shellFrame.count().catch(() => 0)) === 0) {
    throw new Error('shell_frame_missing: [data-app-shell-frame="root"] not found');
  }

  let hydrationError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await shellFrame.waitFor({ state: 'visible', timeout: attempt === 1 ? 5000 : 3000 });
      hydrationError = null;
      break;
    } catch (error) {
      hydrationError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 300 : 0));
    }
  }

  if (hydrationError) {
    throw new Error(`shell_hydration_incomplete: [data-app-shell-frame="root"] not visible after retry (${hydrationError})`);
  }

  await page.waitForSelector('[data-bottom-nav="root"]', { state: 'visible', timeout: 12000 });
  await page.waitForSelector('[data-top-orchestrator="root"]', { state: 'visible', timeout: 12000 }).catch(() => null);

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
    await page.getByText(expectedText, { exact: false }).first().waitFor({ state: 'visible', timeout: 7000 }).catch(() => null);
  }

  await page.waitForTimeout(routeName === 'mapa' ? 500 : 250);
}

async function collectMetrics(page, scenario) {
  const viewport = scenario.viewport;
  const shell = rectFromBox(await page.locator('[data-app-shell-frame="root"]').boundingBox().catch(() => null));
  const header = rectFromBox(await page.locator('[data-app-shell-header="root"]').boundingBox().catch(() => null));
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
    screenshot: path.relative(process.cwd(), scenario.screenshotPath).replace(/\\/g, '/') ,
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

function getTopBudgetLimit(item) {
  const raw = item.topBudgetMode === 'expanded' ? item.topBudgetMaxWide ?? item.topBudgetMax : item.topBudgetMaxWide ?? item.topBudgetMax;
  return parsePx(raw);
}

function classifyIssues(item) {
  const runtime = [];
  const visual = [];

  if (Array.isArray(item.runtimeErrors) && item.runtimeErrors.length > 0) {
    for (const runtimeError of item.runtimeErrors) {
      runtime.push({ code: 'runtime_error', label: runtimeError, detail: runtimeError });
    }
  }

  if (item.error) {
    const error = String(item.error);
    const code = error.includes('shell_root_missing')
      ? 'shell_root_missing'
      : error.includes('shell_frame_missing')
        ? 'shell_frame_missing'
        : error.includes('shell_hydration_incomplete')
          ? 'shell_hydration_incomplete'
          : 'runtime_error';
    runtime.push({ code, label: error, detail: error });
  }

  if (item.clippingViolations.length > 0) {
    visual.push({ code: 'clipping', count: item.clippingViolations.length, label: `clipping: ${item.clippingViolations.length}` });
  }
  if (item.overlapViolations.length > 0) {
    visual.push({ code: 'overlap', count: item.overlapViolations.length, label: `overlap: ${item.overlapViolations.length}` });
  }
  if (item.ctaOffAxis.length > 0) {
    visual.push({ code: 'cta_off_axis', count: item.ctaOffAxis.length, label: `cta_off_axis: ${item.ctaOffAxis.length}` });
  }
  if (item.navObstruction.length > 0) {
    visual.push({ code: 'nav_obstruction', count: item.navObstruction.length, label: `nav_obstruction: ${item.navObstruction.length}` });
  }
  if (getTopBudgetLimit(item) && item.top && item.top.height > getTopBudgetLimit(item) + 4) {
    visual.push({ code: 'top_too_high', count: 1, label: 'top_too_high' });
  }

  return { runtime, visual };
}

function createBucket() {
  return { total: 0, clean: 0, blocked: 0, runtime: 0, visual: 0 };
}

function summarize(metrics) {
  const summary = {
    totalCaptures: metrics.length,
    cleanCaptures: 0,
    blockedCaptures: 0,
    runtimeIssues: 0,
    visualIssues: 0,
    totalBlockingIssues: 0,
    blockerTypeSummary: {},
    routeSummary: {},
    stateSummary: {},
    viewportSummary: {},
  };

  for (const item of metrics) {
    const classification = classifyIssues(item);
    const isBlocked = classification.runtime.length > 0 || classification.visual.length > 0;

    if (isBlocked) {
      summary.blockedCaptures += 1;
    } else {
      summary.cleanCaptures += 1;
    }

    summary.runtimeIssues += classification.runtime.length;
    summary.visualIssues += classification.visual.reduce((total, issue) => total + issue.count, 0);
    summary.totalBlockingIssues += classification.runtime.length + classification.visual.reduce((total, issue) => total + issue.count, 0);

    for (const issue of classification.runtime) {
      summary.blockerTypeSummary[issue.code] = (summary.blockerTypeSummary[issue.code] ?? 0) + 1;
    }
    for (const issue of classification.visual) {
      summary.blockerTypeSummary[issue.code] = (summary.blockerTypeSummary[issue.code] ?? 0) + issue.count;
    }

    for (const key of ['route', 'state', 'viewport']) {
      const value = item[key];
      if (!summary[`${key}Summary`][value]) {
        summary[`${key}Summary`][value] = createBucket();
      }
      const bucket = summary[`${key}Summary`][value];
      bucket.total += 1;
      if (isBlocked) {
        bucket.blocked += 1;
      } else {
        bucket.clean += 1;
      }
      bucket.runtime += classification.runtime.length;
      bucket.visual += classification.visual.reduce((total, issue) => total + issue.count, 0);
    }
  }

  return summary;
}

function collectBlockers(metrics) {
  const runtime = [];
  const visual = [];

  for (const item of metrics) {
    const classification = classifyIssues(item);
    if (classification.runtime.length > 0) {
      runtime.push({
        route: item.route,
        state: item.state,
        viewport: item.viewport,
        screenshot: item.screenshot,
        issues: classification.runtime.map((issue) => issue.code),
        detail: classification.runtime.map((issue) => issue.label).join(' | '),
      });
    }
    if (classification.visual.length > 0) {
      visual.push({
        route: item.route,
        state: item.state,
        viewport: item.viewport,
        screenshot: item.screenshot,
        issues: classification.visual.map((issue) => issue.code),
        detail: classification.visual.map((issue) => issue.label).join(' | '),
      });
    }
  }

  return { runtime, visual };
}

function collectWarnings(summary, blockers) {
  const warnings = [];

  if (summary.totalCaptures > 0 && summary.cleanCaptures === summary.totalCaptures && blockers.runtime.length === 0 && blockers.visual.length === 0) {
    warnings.push('Cobertura limpa em todos os cenários; nenhum warning nao bloqueante para registrar.');
  }

  return warnings;
}

function deriveVerdict(summary, blockers) {
  return summary.totalBlockingIssues === 0 && blockers.runtime.length === 0 && blockers.visual.length === 0 ? 'PASS' : 'HOLD';
}

function assertReportSanity(summary, blockers) {
  const blockerCount = blockers.runtime.length + blockers.visual.length;
  if (summary.totalBlockingIssues === 0 && blockerCount > 0) {
    throw new Error('Sanity failure: blockers recorded for a clean summary');
  }

  if (summary.totalBlockingIssues > 0 && blockerCount === 0) {
    throw new Error('Sanity failure: blocking issues without blockers');
  }
}

function buildRootCauseSummary(summary, blockers) {
  if (summary.totalCaptures === 0) {
    return 'nenhuma captura executada';
  }

  if (blockers.runtime.length > 0) {
    const first = blockers.runtime[0];
    if (first.issues.includes('shell_root_missing')) {
      return 'shell root ausente no preview publicado ou invisível antes da estabilização';
    }
    if (first.issues.includes('shell_frame_missing')) {
      return 'frame do AppShell ausente apesar do root existir';
    }
    if (first.issues.includes('shell_hydration_incomplete')) {
      return 'root presente, mas o frame não estabilizou a tempo para leitura segura';
    }
    return `runtime: ${first.detail || first.issues.join(', ')}`;
  }

  if (blockers.visual.length > 0) {
    const first = blockers.visual[0];
    return `visual: ${first.issues.join(', ')} em ${first.route}/${first.state}/${first.viewport}`;
  }

  return 'sem bloqueio; root e layout coerentes';
}

function buildInventoryLines(metrics) {
  return metrics.map((item) => {
    const classification = classifyIssues(item);
    const status = classification.runtime.length === 0 && classification.visual.length === 0 ? 'OK' : 'ALERTA';
    return `- ${item.route} / ${item.state} / ${item.viewport}: ${status} | ${item.screenshot}`;
  });
}

function buildReport(baseUrl, summary, metrics, blockers, warnings) {
  const verdict = deriveVerdict(summary, blockers);
  assertReportSanity(summary, blockers);
  const rootCause = buildRootCauseSummary(summary, blockers);

  const lines = [];
  lines.push('# Estado da Nação — Preview Real Gate');
  lines.push('');
  lines.push(`Data: ${new Date().toISOString()}`);
  lines.push(`URL: ${baseUrl}`);
  lines.push(`Causa raiz: ${rootCause}`);
  lines.push('');
  lines.push('## Resumo Executivo');
  lines.push(`- Veredito: ${verdict}`);
  lines.push(`- Capturas totais: ${summary.totalCaptures}`);
  lines.push(`- Limpos: ${summary.cleanCaptures}`);
  lines.push(`- Bloqueados: ${summary.blockedCaptures}`);
  lines.push(`- Runtime blockers: ${summary.runtimeIssues}`);
  lines.push(`- Visual blockers: ${summary.visualIssues}`);
  lines.push('');
  lines.push('## Métricas Agregadas');
  lines.push(`- Runtime: ${summary.runtimeIssues}`);
  lines.push(`- Visual: ${summary.visualIssues}`);
  lines.push('');

  lines.push('## Blockers por Tipo');
  const blockerTypes = Object.entries(summary.blockerTypeSummary).sort((left, right) => right[1] - left[1]);
  if (blockerTypes.length === 0) {
    lines.push('- Nenhum blocker registrado.');
  } else {
    for (const [type, count] of blockerTypes) {
      lines.push(`- ${type}: ${count}`);
    }
  }
  lines.push('');

  lines.push('### Agregado por rota');
  for (const [route, counts] of Object.entries(summary.routeSummary)) {
    lines.push(`- ${route}: ${counts.clean}/${counts.total} limpos, runtime ${counts.runtime}, visual ${counts.visual}`);
  }
  lines.push('');
  lines.push('### Agregado por estado');
  for (const [state, counts] of Object.entries(summary.stateSummary)) {
    lines.push(`- ${state}: ${counts.clean}/${counts.total} limpos, runtime ${counts.runtime}, visual ${counts.visual}`);
  }
  lines.push('');
  lines.push('### Agregado por viewport');
  for (const [viewport, counts] of Object.entries(summary.viewportSummary)) {
    lines.push(`- ${viewport}: ${counts.clean}/${counts.total} limpos, runtime ${counts.runtime}, visual ${counts.visual}`);
  }
  lines.push('');

  lines.push('## Blockers de Runtime');
  if (blockers.runtime.length === 0) {
    lines.push('- Nenhum blocker de runtime.');
  } else {
    for (const blocker of blockers.runtime) {
      lines.push(`- ${blocker.route} / ${blocker.state} / ${blocker.viewport}: ${blocker.issues.join(', ')} | ${blocker.screenshot}`);
    }
  }
  lines.push('');

  lines.push('## Blockers Visuais');
  if (blockers.visual.length === 0) {
    lines.push('- Nenhum blocker visual.');
  } else {
    for (const blocker of blockers.visual) {
      lines.push(`- ${blocker.route} / ${blocker.state} / ${blocker.viewport}: ${blocker.issues.join(', ')} | ${blocker.screenshot}`);
    }
  }
  lines.push('');

  lines.push('## Warnings Nao Bloqueantes');
  if (warnings.length === 0) {
    lines.push('- Nenhum warning nao bloqueante.');
  } else {
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }
  lines.push('');

  lines.push('## Inventario por rota/estado/viewport');
  for (const line of buildInventoryLines(metrics)) {
    lines.push(line);
  }
  lines.push('');
  lines.push('## Observacoes');
  lines.push('- O gate aponta para a URL publicada informada por --preview-url, PREVIEW_URL, VERCEL_URL, VERCEL_BRANCH_URL ou argumento na linha de comando.');
  lines.push('- O estado PWA wide e emulado por display-mode: standalone em viewport larga.');
  lines.push('- O gate grava screenshots e metrics em reports/release-gate-preview-real.');
  return { report: lines.join('\n'), verdict };
}
function createSanityFixture() {
  return [
    {
      route: 'fixture',
      path: '/',
      viewport: '1440x900',
      state: 'normal',
      screenshot: 'reports/release-gate-preview-real/fixture.png',
      title: 'Fixture',
      shell: null,
      header: null,
      top: { x: 0, y: 0, width: 100, height: 80, right: 100, bottom: 80 },
      nav: null,
      shellCta: null,
      dockCta: null,
      main: null,
      rail: null,
      clippingViolations: [],
      overlapViolations: [],
      ctaOffAxis: [],
      navObstruction: [],
      topBudgetMode: 'expanded',
      topBudgetMax: '112px',
      topBudgetMaxWide: '100px',
    },
  ];
}

function runSanityCheck() {
  const cleanFixture = createSanityFixture();
  const cleanSummary = summarize(cleanFixture);
  const cleanBlockers = collectBlockers(cleanFixture);
  const cleanVerdict = deriveVerdict(cleanSummary, cleanBlockers);
  if (cleanVerdict !== 'PASS' || cleanSummary.totalBlockingIssues !== 0 || cleanBlockers.runtime.length !== 0 || cleanBlockers.visual.length !== 0) {
    throw new Error('Sanity failure: clean fixture must resolve to PASS');
  }

  const missingRootFixture = [{
    route: 'fixture',
    state: 'normal',
    viewport: '1440x900',
    screenshot: 'reports/release-gate-preview-real/fixture.png',
    error: 'shell_root_missing: [data-app-shell="root"] not found',
    clippingViolations: [],
    overlapViolations: [],
    ctaOffAxis: [],
    navObstruction: [],
    topBudgetMode: null,
    topBudgetMax: null,
    topBudgetMaxWide: null,
    top: null,
  }];
  const missingRootBlockers = collectBlockers(missingRootFixture);
  if (missingRootBlockers.runtime.length === 0 || !missingRootBlockers.runtime[0].issues.includes('shell_root_missing')) {
    throw new Error('Sanity failure: missing shell root must be classified explicitly');
  }

  const hydrationFixture = [{
    route: 'fixture',
    state: 'normal',
    viewport: '1440x900',
    screenshot: 'reports/release-gate-preview-real/fixture.png',
    error: 'shell_hydration_incomplete: [data-app-shell-frame="root"] not visible after retry (timeout)',
    clippingViolations: [],
    overlapViolations: [],
    ctaOffAxis: [],
    navObstruction: [],
    topBudgetMode: 'expanded',
    topBudgetMax: '112px',
    topBudgetMaxWide: '100px',
    top: { x: 0, y: 0, width: 100, height: 80, right: 100, bottom: 80 },
  }];
  const hydrationBlockers = collectBlockers(hydrationFixture);
  if (hydrationBlockers.runtime.length === 0 || !hydrationBlockers.runtime[0].issues.includes('shell_hydration_incomplete')) {
    throw new Error('Sanity failure: hydrated shell timeout must be classified explicitly');
  }
}

async function main() {
  runSanityCheck();
  ensureDir(OUT_DIR);

  const baseUrl = resolvePreviewUrl();
  if (!baseUrl) {
    const pseudoMetrics = [
      {
        route: 'environment',
        path: '',
        viewport: 'n/a',
        state: 'config',
        screenshot: 'n/a',
        title: 'preview_url_missing',
        shell: null,
        header: null,
        top: null,
        nav: null,
        shellCta: null,
        dockCta: null,
        main: null,
        rail: null,
        clippingViolations: [],
        overlapViolations: [],
        ctaOffAxis: [],
        navObstruction: [],
        topBudgetMode: null,
        topBudgetMax: null,
        topBudgetMaxWide: null,
        runtimeErrors: [],
        error: 'preview_url_missing',
      },
    ];
    const summary = summarize(pseudoMetrics);
    const blockers = collectBlockers(pseudoMetrics);
    const warnings = collectWarnings(summary, blockers);
    const { report } = buildReport('n/a', summary, pseudoMetrics, blockers, warnings);
    fs.writeFileSync(METRICS_PATH, JSON.stringify({ verdict: 'HOLD', blockers, summary, metrics: pseudoMetrics }, null, 2));
    fs.writeFileSync(REPORT_PATH, report);
    console.log(report);
    process.exit(1);
  }

  const useProxy = process.env.RELEASE_GATE_USE_PROXY === '1';
  const proxy = useProxy ? await startPreviewProxy(baseUrl) : null;
  const browseBaseUrl = proxy ? proxy.baseUrl : baseUrl;
  const browser = await chromium.launch({ headless: true });
  const metrics = [];

  try {
    for (const scenario of buildScenarios()) {
      const context = await createContext(browser, scenario);
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      page.setDefaultNavigationTimeout(60000);
      const runtimeErrors = [];

      page.on('pageerror', (error) => {
        runtimeErrors.push(error instanceof Error ? error.message : String(error));
      });

      try {
        await page.goto(`${browseBaseUrl}${scenario.route.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForPageReady(page, scenario.route.name, scenario.stateName);

        if (scenario.stateName === 'sticky') {
          await page.evaluate(() => window.scrollTo(0, 720));
          await page.waitForTimeout(1200);
        }

        if (scenario.stateName === 'gps-ativo') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-system="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('GPS ativo'));
          }, { timeout: 7000 }).catch(() => null);
        }

        if (scenario.stateName === 'snapshot-offline') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-system="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('Snapshot offline'));
          }, { timeout: 7000 }).catch(() => null);
        }

        if (scenario.stateName === 'missao-ativa') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-orchestrator="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('Missão ativa'));
          }, { timeout: 7000 }).catch(() => null);
        }

        if (scenario.viewportName === 'pwa-wide') {
          await page.waitForTimeout(1000);
        }

        const collected = await collectMetrics(page, scenario);
        collected.runtimeErrors = runtimeErrors.slice();
        metrics.push(collected);
      } catch (error) {
        metrics.push({
          route: scenario.route.name,
          path: scenario.route.path,
          viewport: `${scenario.viewport.width}x${scenario.viewport.height}`,
          state: scenario.stateName,
          screenshot: screenshotPath(scenario.route.name, scenario.stateName, scenario.viewportName).replace(/\\/g, '/'),
          title: error instanceof Error ? error.message : String(error),
          shell: null,
          header: null,
          top: null,
          nav: null,
          shellCta: null,
          dockCta: null,
          main: null,
          rail: null,
          clippingViolations: [],
          overlapViolations: [],
          ctaOffAxis: [],
          navObstruction: [],
          topBudgetMode: null,
          topBudgetMax: null,
          topBudgetMaxWide: null,
          runtimeErrors: runtimeErrors.slice(),
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
    await proxy?.close().catch(() => undefined);
  }

  const summary = summarize(metrics);
  const blockers = collectBlockers(metrics);
  const warnings = collectWarnings(summary, blockers);
  const { report, verdict } = buildReport(baseUrl, summary, metrics, blockers, warnings);

  fs.writeFileSync(METRICS_PATH, JSON.stringify({ baseUrl, summary, metrics, blockers, warnings, verdict }, null, 2));
  fs.writeFileSync(REPORT_PATH, report);

  console.log(report);
  process.exit(verdict === 'PASS' ? 0 : 1);
}

main().catch((error) => {
  const report = [
    '# Estado da Nação — Preview Real Gate',
    '',
    `Data: ${new Date().toISOString()}`,
    '',
    '## Resumo Executivo',
    '- Veredito: HOLD',
    '',
    '## Blockers de Runtime',
    `- runtime_error: ${error instanceof Error ? error.message : String(error)}`,
  ].join('\n');
  fs.writeFileSync(REPORT_PATH, report);
  console.error(error);
  process.exit(1);
});
