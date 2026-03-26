const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const OUT_DIR = path.resolve(process.cwd(), 'reports/release-hardening-visual');
const REPORT_PATH = path.resolve(process.cwd(), 'reports/2026-03-25-estado-da-nacao-release-hardening-visual.md');
const METRICS_PATH = path.join(OUT_DIR, 'metrics.json');
const START_LOG_PATH = path.join(OUT_DIR, 'start.log');
const BASE_ROUTE = '/';
const VIEWPORTS = {
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
  tablet: { width: 820, height: 1180, isMobile: false, hasTouch: false },
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  'pwa-wide': { width: 1536, height: 960, isMobile: false, hasTouch: false },
};

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'atualizacoes', path: '/atualizacoes' },
  { name: 'enviar', path: '/enviar' },
  { name: 'hub', path: '/hub' },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function json(value) {
  return JSON.stringify(value, null, 2);
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
    groupId: 'release-hardening-visual',
    groupName: 'Matriz Visual',
    stationIds: ['a', 'b', 'c'],
    currentIndex: 0,
    completedIds: [],
    skippedIds: [],
    startedAt: now,
  };
}

function scenarioUrl(routePath) {
  return new URL(routePath, BASE_ROUTE).pathname;
}

function makeScenario(route, viewportName, stateName) {
  const viewport = VIEWPORTS[viewportName];
  return {
    name: `${route.name}-${stateName || 'neutral'}-${viewportName}`,
    route: route.path,
    routeName: route.name,
    viewportName,
    viewport,
    stateName: stateName || 'neutral',
    screenshot: `${route.name}-${stateName || 'neutral'}-${viewportName}.png`,
  };
}

function buildScenarios() {
  const scenarios = [];

  for (const route of ROUTES) {
    for (const viewportName of Object.keys(VIEWPORTS)) {
      scenarios.push(makeScenario(route, viewportName, 'neutral'));
    }
  }

  for (const stateName of ['sticky', 'snapshot-offline', 'gps-active', 'mission-active']) {
    scenarios.push({
      ...makeScenario(ROUTES[0], 'desktop', stateName),
      route: '/',
      routeName: 'home',
      viewportName: 'desktop',
      viewport: VIEWPORTS.desktop,
      stateName,
      screenshot: `home-${stateName}-desktop.png`,
    });
  }

  scenarios.push({
    ...makeScenario(ROUTES[0], 'pwa-wide', 'standalone'),
    route: '/',
    routeName: 'home',
    viewportName: 'pwa-wide',
    viewport: VIEWPORTS['pwa-wide'],
    stateName: 'standalone',
    screenshot: 'home-standalone-pwa-wide.png',
    standalone: true,
  });

  return scenarios;
}

async function createContext(browser, viewport, scenario) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    permissions: scenario.stateName === 'gps-active' ? ['geolocation'] : [],
    geolocation: scenario.stateName === 'gps-active'
      ? { latitude: -22.509, longitude: -44.093, accuracy: 12 }
      : undefined,
  });

  if (scenario.stateName === 'snapshot-offline') {
    await context.addInitScript((snapshot) => {
      localStorage.setItem('bomba-aberta:recorte-snapshot', JSON.stringify(snapshot));
    }, buildWarmSnapshot());
  }

  if (scenario.stateName === 'mission-active') {
    await context.addInitScript((mission) => {
      localStorage.setItem('bomba_aberta_active_mission', JSON.stringify(mission));
    }, buildMissionState());
  }

  if (scenario.standalone) {
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

async function waitForPageReady(page, routeName) {
  await page.waitForSelector('[data-app-shell="root"]', { state: 'visible', timeout: 45000 });
  await page.waitForSelector('[data-bottom-nav="root"]', { state: 'visible', timeout: 45000 });

  if (routeName === 'home') {
    await page.waitForSelector('[data-top-orchestrator="root"]', { state: 'visible', timeout: 45000 });
    await page.waitForTimeout(1500);
  } else {
    await page.waitForTimeout(1000);
  }
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
  ];

  const clippingViolations = candidates
    .filter((item) => item.box)
    .filter((item) => item.box.x < -1 || item.box.y < -1 || item.box.right > viewport.width + 1 || item.box.bottom > viewport.height + 1)
    .map((item) => ({ name: item.name, box: toElementBox(item.box) }));

  const overlapViolations = [];
  if (dockCta && nav && intersects(dockCta, nav)) {
    overlapViolations.push({ name: 'dock-cta-vs-nav', boxA: toElementBox(dockCta), boxB: toElementBox(nav) });
  }
  if (headerCta && header && intersects(headerCta, header) && headerCta.right > header.right + 1) {
    overlapViolations.push({ name: 'header-cta-vs-header', boxA: toElementBox(headerCta), boxB: toElementBox(header) });
  }

  const ctaOffAxis = [];
  if (headerCta && header) {
    const marginLeft = headerCta.x - header.x;
    const marginRight = header.right - headerCta.right;
    if (marginRight < 8 || marginLeft < 0) {
      ctaOffAxis.push({ name: 'header-cta', box: toElementBox(headerCta), header: toElementBox(header) });
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

  const stickyState = scenario.stateName === 'sticky'
    ? await page.locator('[data-top-orchestrator="root"]').evaluate((el) => el.className.includes('sticky')).catch(() => false)
    : null;

  const pageTitle = await page.title().catch(() => '');
  const screenshotPath = path.join(OUT_DIR, scenario.screenshot);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  return {
    route: scenario.routeName,
    path: scenario.route,
    viewport: `${viewport.width}x${viewport.height}`,
    state: scenario.stateName,
    screenshot: path.relative(path.resolve(process.cwd(), 'reports'), screenshotPath).replace(/\\/g, '/'),
    title: pageTitle,
    shell: toElementBox(shell),
    header: toElementBox(header),
    top: toElementBox(top),
    nav: toElementBox(nav),
    headerCta: toElementBox(headerCta),
    dockCta: toElementBox(dockCta),
    main: toElementBox(main),
    rail: toElementBox(rail),
    clippingViolations,
    overlapViolations,
    ctaOffAxis,
    navObstruction,
    stickyState,
  };
}

function summarize(metrics) {
  const summary = {
    totalCaptures: metrics.length,
    clippingViolations: 0,
    overlapViolations: 0,
    ctaOffAxis: 0,
    navObstruction: 0,
    stickyChecks: 0,
    stickyPassed: 0,
  };

  for (const item of metrics) {
    summary.clippingViolations += item.clippingViolations.length;
    summary.overlapViolations += item.overlapViolations.length;
    summary.ctaOffAxis += item.ctaOffAxis.length;
    summary.navObstruction += item.navObstruction.length;
    if (item.state === 'sticky') {
      summary.stickyChecks += 1;
      if (item.stickyState) summary.stickyPassed += 1;
    }
  }

  return summary;
}

function buildReport(summary, metrics, port) {
  const lines = [];
  lines.push('# Estado da Nacao - Release Hardening Visual');
  lines.push('');
  lines.push('Data: 2026-03-25');
  lines.push('');
  lines.push('## Resumo');
  lines.push('');
  lines.push('Matriz minima de regressao visual executada em quatro viewports e nos estados criticos do produto: home/mapa, atualizacoes, enviar, Meu Hub, topo sticky, snapshot offline, GPS ativo, missao ativa e janela ampla com emulacao de PWA instalada.');
  lines.push('');
  lines.push('## Cobertura');
  lines.push('');
  lines.push(`- Portas testadas: navegador local em ${port}`);
  lines.push(`- Capturas totais: ${summary.totalCaptures}`);
  lines.push(`- Clipping: ${summary.clippingViolations}`);
  lines.push(`- Overlap: ${summary.overlapViolations}`);
  lines.push(`- CTA fora do eixo: ${summary.ctaOffAxis}`);
  lines.push(`- Nav obstruindo conteudo: ${summary.navObstruction}`);
  lines.push(`- Sticky verificado: ${summary.stickyPassed}/${summary.stickyChecks}`);
  lines.push('');
  lines.push('## Arquivos');
  lines.push('');
  lines.push(`- [metrics.json](C:/Projetos/Tanque%20Aberto/${path.relative(process.cwd(), METRICS_PATH).replace(/\\/g, '/')})`);
  lines.push(`- [start.log](C:/Projetos/Tanque%20Aberto/${path.relative(process.cwd(), START_LOG_PATH).replace(/\\/g, '/')})`);
  lines.push('');
  lines.push('### Screenshots');
  lines.push('');
  for (const item of metrics) {
    lines.push(`- [${item.route} ${item.state} ${item.viewport}](C:/Projetos/Tanque%20Aberto/${item.screenshot.replace(/\\/g, '/')})`);
  }
  lines.push('');
  lines.push('## Falhas por Categoria');
  lines.push('');
  lines.push(`- Clipping: ${summary.clippingViolations}`);
  lines.push(`- Overlap: ${summary.overlapViolations}`);
  lines.push(`- CTA fora do eixo: ${summary.ctaOffAxis}`);
  lines.push(`- Nav obstruindo conteudo: ${summary.navObstruction}`);
  lines.push('');
  lines.push('## Observacoes');
  lines.push('');
  lines.push('- O estado sticky foi validado como classe presente no topo quando a pagina rola acima do limiar de colapso.');
  lines.push('- O estado snapshot offline usa o warm start salvo em localStorage com a mesma chave da aplicacao.');
  lines.push('- O estado GPS ativo usa permissao e geolocalizacao do navegador para acionar o hook real.');
  lines.push('- A janela ampla/PWA foi emulada como standalone em viewport desktop larga, sem alterar o produto em runtime.');
  lines.push('');
  lines.push('## Leitura Final');
  lines.push('');
  lines.push('Se as contagens de clipping, overlap, CTA fora do eixo e nav obstruindo conteudo permanecerem zeradas, o pacote esta apto para seguir para deploy com risco visual reduzido.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  ensureDir(OUT_DIR);

  const port = await findFreePort();
  const startLogStream = fs.createWriteStream(START_LOG_PATH, { flags: 'w' });
  const proc = spawn('cmd.exe', ['/c', `npm run start -- --port ${port}`], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout?.pipe(startLogStream);
  proc.stderr?.pipe(startLogStream);
  proc.unref();

  const baseURL = `http://127.0.0.1:${port}`;
  await waitForServer(`${baseURL}/hub`);

  const browser = await chromium.launch({ headless: true });
  const metrics = [];

  try {
    for (const scenario of buildScenarios()) {
      const context = await createContext(browser, scenario.viewport, scenario);
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      page.setDefaultNavigationTimeout(60000);

      try {
        await page.goto(`${baseURL}${scenario.route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForPageReady(page, scenario.routeName);

        if (scenario.stateName === 'sticky') {
          await page.evaluate(() => window.scrollTo(0, 720));
          await page.waitForTimeout(1200);
        }

        if (scenario.stateName === 'gps-active') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-system="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('GPS ativo'));
          }, { timeout: 20000 });
        }

        if (scenario.stateName === 'snapshot-offline') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-system="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('Snapshot offline'));
          }, { timeout: 20000 });
        }

        if (scenario.stateName === 'mission-active') {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-top-orchestrator="root"]');
            return Boolean(el && el.textContent && el.textContent.includes('Missão ativa'));
          }, { timeout: 20000 });
        }

        if (scenario.standalone) {
          await page.waitForTimeout(1000);
        }

        metrics.push(await collectMetrics(page, scenario));
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
  }

  const summary = summarize(metrics);
  fs.writeFileSync(METRICS_PATH, json({ summary, metrics }), 'utf8');
  fs.writeFileSync(REPORT_PATH, buildReport(summary, metrics, port), 'utf8');

  console.log(json(summary));

  if (summary.clippingViolations || summary.overlapViolations || summary.ctaOffAxis || summary.navObstruction) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});






