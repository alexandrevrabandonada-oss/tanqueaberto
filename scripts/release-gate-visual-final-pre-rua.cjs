const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const OUT_DIR = path.resolve(process.cwd(), 'reports/release-gate-visual-final-pre-rua');
const REPORT_PATH = path.resolve(process.cwd(), 'reports/2026-03-26-estado-da-nacao-release-gate-visual-final-pre-rua.md');
const METRICS_PATH = path.join(OUT_DIR, 'metrics.json');
const START_LOG_PATH = path.join(OUT_DIR, 'start.log');

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
  { name: 'primeira-visita', setup: async (context) => {
    await context.addInitScript(() => {
      localStorage.removeItem('bomba_aberta_home_guide_dismissed');
      localStorage.removeItem('bomba-aberta:my-submissions');
      localStorage.removeItem('bomba_aberta_active_mission');
      localStorage.removeItem('bomba-aberta:recorte-snapshot');
      localStorage.removeItem('bomba_lista_mode');
    });
  } },
  { name: 'missao-ativa', setup: async (context) => {
    await context.addInitScript((mission) => {
      localStorage.setItem('bomba_aberta_active_mission', JSON.stringify(mission));
      localStorage.removeItem('bomba_aberta_home_guide_dismissed');
    }, buildMissionState());
  } },
  { name: 'gps-ativo', setup: async (context) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -22.509, longitude: -44.093, accuracy: 12 });
  } },
  { name: 'snapshot-offline', setup: async (context) => {
    await context.addInitScript((snapshot) => {
      localStorage.setItem('bomba-aberta:recorte-snapshot', JSON.stringify(snapshot));
      localStorage.removeItem('bomba_aberta_active_mission');
    }, buildWarmSnapshot());
  } },
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
    groupId: 'release-gate-visual-final-pre-rua',
    groupName: 'Gate Visual Final',
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

function parsePx(value) {
  if (!value) return null;
  const parsed = Number(String(value).replace('px', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function issue(category, severity, message, details = {}) {
  return { category, severity, message, details };
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not determine free port')));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 180000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok || response.status === 200 || response.status === 404) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Server did not become ready at ${url}${lastError ? `: ${lastError.message}` : ''}`);
}

function scenarioScreenshotPath(routeName, stateName, viewportName) {
  return path.join(OUT_DIR, routeName, stateName, `${viewportName}.png`);
}

function makeScenario(route, stateName, viewportName) {
  return {
    route,
    stateName,
    viewportName,
    viewport: VIEWPORTS[viewportName],
    screenshotPath: scenarioScreenshotPath(route.name, stateName, viewportName),
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
    geolocation: scenario.stateName === 'gps-ativo'
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
      stateName === 'primeira-visita' ? 'Primeira visita' :
      stateName === 'missao-ativa' ? 'Missão ativa' :
      stateName === 'gps-ativo' ? 'GPS ativo' :
      'Snapshot offline';
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
  const headerCta = rectFromBox(await page.locator('[data-global-cta="header"]').boundingBox().catch(() => null));
  const dockCta = rectFromBox(await page.locator('[data-global-cta="dock"]').boundingBox().catch(() => null));
  const main = rectFromBox(await page.locator('[data-layout-role="main"]').first().boundingBox().catch(() => null));
  const rail = rectFromBox(await page.locator('[data-layout-role="rail"]').first().boundingBox().catch(() => null));

  const candidates = [
    { name: 'shell', box: shell },
    { name: 'header', box: header },
    { name: 'top', box: top },
    { name: 'nav', box: nav },
    { name: 'headerCta', box: headerCta },
    { name: 'dockCta', box: dockCta },
    { name: 'main', box: main },
    { name: 'rail', box: rail },
  ];

  const issues = [];

  for (const candidate of candidates) {
    if (!candidate.box) continue;
    if (candidate.box.x < -1 || candidate.box.y < -1 || candidate.box.right > viewport.width + 1 || candidate.box.bottom > viewport.height + 1) {
      issues.push(issue('clipping', 'high', `${candidate.name} sai do viewport`, { box: candidate.box }));
    }
  }

  if (top) {
    const budgetMax = scenario.viewportName === 'mobile' || scenario.viewportName === 'tablet'
      ? parsePx(await page.locator('[data-top-orchestrator="root"]').getAttribute('data-top-budget-max-height'))
      : parsePx(await page.locator('[data-top-orchestrator="root"]').getAttribute('data-top-budget-max-height-wide'));
    if (budgetMax && top.height > budgetMax + 4) {
      issues.push(issue('top-budget', 'high', `Topo acima do orçamento (${Math.round(top.height)}px > ${budgetMax}px)`, { topHeight: top.height, budgetMax }));
    }
  }

  if (nav && main && intersects(nav, main)) {
    issues.push(issue('overlap', 'high', 'Bottom nav está obstruindo conteúdo principal', { nav, main }));
  }

  if (headerCta && main) {
    const axisDelta = Math.abs(headerCta.centerX - main.centerX);
    if (axisDelta > Math.max(220, viewport.width * 0.18)) {
      issues.push(issue('cta-axis', 'medium', 'CTA do header saiu do eixo da coluna principal', { axisDelta, headerCta, main }));
    }
  }

  if (dockCta && main) {
    const axisDelta = Math.abs(dockCta.centerX - main.centerX);
    if (axisDelta > Math.max(200, viewport.width * 0.18) && viewport.width >= 768) {
      issues.push(issue('cta-axis', 'medium', 'CTA dock saiu do eixo do shell', { axisDelta, dockCta, main }));
    }
  }

  if (nav && top && intersects(nav, top)) {
    issues.push(issue('overlap', 'high', 'Bottom nav colidiu com o topo', { nav, top }));
  }

  if (main && !rail && viewport.width >= 1280) {
    const rightVoid = Math.max(0, viewport.width - main.right);
    if (rightVoid > 240 && main.width < viewport.width * 0.72) {
      issues.push(issue('wide-empty-space', 'medium', 'Shell largo com vazio lateral injustificado', { rightVoid, mainWidth: main.width }));
    }
  }

  if (main && rail && viewport.width >= 1280) {
    const occupiedWidth = Math.max(main.right, rail.right) - Math.min(main.x, rail.x);
    const unused = viewport.width - occupiedWidth;
    if (unused > 220 && main.width < viewport.width * 0.6) {
      issues.push(issue('wide-empty-space', 'low', 'Layout largo com pouco aproveitamento da largura', { unused, mainWidth: main.width, railWidth: rail.width }));
    }
  }

  const screenshotDir = path.dirname(scenario.screenshotPath);
  ensureDir(screenshotDir);
  await page.screenshot({ path: scenario.screenshotPath, fullPage: false });

  const topBudgetMode = await page.locator('[data-top-orchestrator="root"]').getAttribute('data-top-budget-mode').catch(() => null);
  const topBudgetMax = await page.locator('[data-top-orchestrator="root"]').getAttribute('data-top-budget-max-height').catch(() => null);
  const topBudgetMaxWide = await page.locator('[data-top-orchestrator="root"]').getAttribute('data-top-budget-max-height-wide').catch(() => null);

  return {
    route: scenario.route.name,
    path: scenario.route.path,
    state: scenario.stateName,
    viewport: scenario.viewportName,
    screenshot: path.relative(process.cwd(), scenario.screenshotPath),
    boxes: {
      shell,
      header,
      top,
      nav,
      headerCta,
      dockCta,
      main,
      rail,
    },
    topBudgetMode,
    topBudgetMax,
    topBudgetMaxWide,
    issues,
  };
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Object.fromEntries(map.entries());
}

function formatIssueSummary(results) {
  const counts = {};
  for (const result of results) {
    for (const issueItem of result.issues) {
      counts[issueItem.category] = (counts[issueItem.category] || 0) + 1;
    }
  }
  return counts;
}

function buildReport(results) {
  const hasIssues = results.some((result) => result.issues.length > 0);
  const verdict = hasIssues ? 'HOLD' : 'GO';
  const totals = {
    scenarios: results.length,
    clean: results.filter((result) => result.issues.length === 0).length,
    flagged: results.filter((result) => result.issues.length > 0).length,
  };
  const issueSummary = formatIssueSummary(results);
  const routeSummary = groupBy(results, (result) => `${result.route}:${result.state}`);

  const lines = [];
  lines.push('# Estado da Nação — Release Gate Visual Final Pré-Rua');
  lines.push('');
  lines.push(`Data: ${new Date().toISOString()}`);
  lines.push(`Veredito: ${verdict}`);
  lines.push('');
  lines.push('## Cobertura');
  lines.push(`- Cenários: ${totals.scenarios}`);
  lines.push(`- Limpos: ${totals.clean}`);
  lines.push(`- Com alerta: ${totals.flagged}`);
  lines.push('');
  lines.push('## Resumo Automático');
  if (Object.keys(issueSummary).length === 0) {
    lines.push('- Nenhuma regressão visual automática detectada nas matrizes capturadas.');
  } else {
    for (const [category, count] of Object.entries(issueSummary)) {
      lines.push(`- ${category}: ${count}`);
    }
  }
  lines.push('');
  lines.push('## Checklist Automático');
  lines.push(`- Clipping: ${issueSummary.clipping ? 'HOLD' : 'OK'}`);
  lines.push(`- Overlap: ${issueSummary.overlap ? 'HOLD' : 'OK'}`);
  lines.push(`- CTA fora do eixo: ${issueSummary['cta-axis'] ? 'HOLD' : 'OK'}`);
  lines.push(`- Nav obstruindo conteúdo: ${issueSummary.overlap ? 'HOLD' : 'OK'}`);
  lines.push(`- Topo consumindo altura demais: ${issueSummary['top-budget'] ? 'HOLD' : 'OK'}`);
  lines.push(`- Shell largo com vazio injustificado: ${issueSummary['wide-empty-space'] ? 'HOLD' : 'OK'}`);
  lines.push('');
  lines.push('## Checklist Manual');
  lines.push('- Confirmar leitura no navegador real em desktop largo.');
  lines.push('- Confirmar navegação em PWA instalada wide.');
  lines.push('- Confirmar que o topo não chama mais atenção que o mapa/lista.');
  lines.push('- Confirmar que o CTA global parece nascido do shell.');
  lines.push('');
  lines.push('## Matrizes');
  for (const result of results) {
    lines.push(`- ${result.route} / ${result.state} / ${result.viewport}: ${result.issues.length === 0 ? 'OK' : 'ALERTA'} | screenshot: ${result.screenshot}`);
  }
  lines.push('');
  lines.push('## Veredito');
  lines.push(verdict === 'GO'
    ? 'GO. A matriz visual fechou sem alertas automáticos relevantes.'
    : 'HOLD. Há regressões visuais automáticas que precisam ser corrigidas antes do beta ampliado.');
  lines.push('');
  lines.push('## Observações');
  lines.push('- O gate cobre mapa, atualizações, enviar e Meu Hub em mobile, tablet, desktop e PWA wide.');
  lines.push('- Os estados cobertos incluem normal, primeira visita, missão ativa, GPS ativo e snapshot offline.');
  lines.push('- Screenshots e métricas ficam em reports/release-gate-visual-final-pre-rua.');

  return { report: lines.join('\n'), verdict, totals, issueSummary, routeSummary };
}

(async () => {
  ensureDir(OUT_DIR);
  let results = [];

  try {
    const port = await findFreePort();
    const proc = spawn('cmd.exe', ['/c', `npm run start -- --port ${port}`], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const log = fs.createWriteStream(START_LOG_PATH, { flags: 'a' });
    proc.stdout.pipe(log);
    proc.stderr.pipe(log);

    const baseURL = `http://127.0.0.1:${port}`;
    await waitForServer(`${baseURL}/hub`);

    const browser = await chromium.launch({ headless: true });
    try {
      const scenarios = buildScenarios();
      for (const scenario of scenarios) {
        const context = await createContext(browser, scenario);
        const page = await context.newPage();
        page.setDefaultTimeout(45000);
        page.setDefaultNavigationTimeout(60000);
        try {
          await page.goto(`${baseURL}${scenario.route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await waitForPageReady(page, scenario.route.name, scenario.stateName);
          const metrics = await collectMetrics(page, scenario);
          results.push(metrics);
        } finally {
          await page.close().catch(() => undefined);
          await context.close().catch(() => undefined);
        }
      }
    } finally {
      await browser.close().catch(() => undefined);
      try {
        proc.kill('SIGTERM');
      } catch {
        try {
          spawn('cmd.exe', ['/c', `taskkill /PID ${proc.pid} /T /F`], { stdio: 'ignore' });
        } catch {
          // ignore
        }
      }
      log.end();
    }
  } catch (error) {
    const message = error && typeof error === 'object' && 'code' in error && error.code === 'EPERM'
      ? 'Gate bloqueado pelo ambiente local: spawn EPERM ao abrir o servidor de visual gate.'
      : error instanceof Error
        ? error.message
        : String(error);
    const fallbackReport = [
      '# Estado da Nação — Release Gate Visual Final Pré-Rua',
      '',
      `Data: ${new Date().toISOString()}`,
      'Veredito: HOLD',
      '',
      '## Falha de Execução',
      `- ${message}`,
      '',
      '## Checklist Automático',
      '- Clipping: HOLD',
      '- Overlap: HOLD',
      '- CTA fora do eixo: HOLD',
      '- Nav obstruindo conteúdo: HOLD',
      '- Topo consumindo altura demais: HOLD',
      '- Shell largo com vazio injustificado: HOLD',
      '',
      '## Checklist Manual',
      '- Confirmar o gate em ambiente com permissão para subir o servidor local.',
      '- Validar screenshots no navegador real antes do beta ampliado.',
      '',
      '## Veredito',
      'HOLD. O gate não conseguiu executar a matriz visual neste ambiente.',
    ].join('\n');
    fs.writeFileSync(METRICS_PATH, JSON.stringify({ results, verdict: 'HOLD', error: message }, null, 2));
    fs.writeFileSync(REPORT_PATH, fallbackReport);
    console.log(fallbackReport);
    process.exit(1);
  }

  const { report, verdict, totals, issueSummary } = buildReport(results);
  fs.writeFileSync(METRICS_PATH, JSON.stringify({ results, totals, issueSummary, verdict }, null, 2));
  fs.writeFileSync(REPORT_PATH, report);

  console.log(report);
  process.exit(verdict === 'GO' ? 0 : 1);
})();
