import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const screenshotDir = path.join(process.cwd(), "reports", "cta-governance-screenshots");

async function capture(page: Page, fileName: string) {
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, fileName), fullPage: true });
}

async function gotoAndMeasure(page: Page, url: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-app-shell="root"]')).toBeVisible();
}

async function expectNoGlobalCta(page: Page) {
  const cta = page.locator('[data-global-cta="shell"]');
  await expect(cta).toHaveCount(1);
  await expect(cta).toBeHidden();
}

async function expectNoGlobalCtaBlock(page: Page) {
  await expect(page.locator('[data-global-cta="shell"]')).toHaveCount(0);
}

test.describe("Governanca do CTA global", () => {
  test("home mobile nao exibe CTA global permanente", async ({ page }) => {
    await gotoAndMeasure(page, "/", { width: 390, height: 844 });
    await expectNoGlobalCta(page);
    await expect(page.locator('[data-bottom-nav="root"]')).toBeVisible();
    await capture(page, "home-mobile-390x844.png");
  });

  test("home desktop vazio nao exibe CTA global", async ({ page }) => {
    await gotoAndMeasure(page, "/", { width: 1440, height: 900 });
    await expectNoGlobalCta(page);
    await expect(page.locator('[data-hero-primary="home-map"]')).toBeVisible();
    await capture(page, "home-desktop-empty-1440x900.png");
  });

  test("home desktop com recorte ativo exibe CTA contextual", async ({ page }) => {
    await gotoAndMeasure(page, "/?city=Volta%20Redonda", { width: 1440, height: 900 });
    const cta = page.locator('[data-global-cta="shell"]');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("data-global-cta-label", "Enviar preço");
    await expect(cta).toHaveAttribute("data-global-cta-href", "/enviar");
    await expect(cta).toHaveAttribute("data-global-cta-placement", "shell");
    await capture(page, "home-desktop-context-1440x900.png");
  });

  test("atualizacoes mobile nao exibe CTA global permanente", async ({ page }) => {
    await gotoAndMeasure(page, "/atualizacoes", { width: 390, height: 844 });
    await expectNoGlobalCta(page);
    await expect(page.locator('[data-rail-useful="updates"]')).toBeHidden();
    await capture(page, "atualizacoes-mobile-390x844.png");
  });

  test("atualizacoes desktop exibe CTA contextual e rail xl+", async ({ page }) => {
    await gotoAndMeasure(page, "/atualizacoes", { width: 1440, height: 900 });
    const cta = page.locator('[data-global-cta="shell"]');
    await expect(cta).toBeVisible();
    const label = await cta.getAttribute("data-global-cta-label");
    const href = await cta.getAttribute("data-global-cta-href");
    expect(["Fechar lacunas", "Abrir mapa"]).toContain(label);
    if (label === "Fechar lacunas") {
      expect(href).toBe("/postos/sem-atualizacao");
    } else {
      expect(href).toBe("/");
    }
    await expect(page.locator('[data-rail-useful="updates"]')).toBeVisible();
    const nav = page.locator('[data-bottom-nav="root"]');
    const ctaBox = await cta.boundingBox();
    const navBox = await nav.boundingBox();
    expect(ctaBox && navBox && ctaBox.y + ctaBox.height < navBox.y).toBeTruthy();
    await capture(page, "atualizacoes-desktop-1440x900.png");
  });

  test("enviar mobile nao exibe CTA global permanente", async ({ page }) => {
    await gotoAndMeasure(page, "/enviar", { width: 390, height: 844 });
    await expectNoGlobalCtaBlock(page);
    await expect(page.locator('[data-hero-primary="submit-form"]')).toBeVisible();
    await capture(page, "enviar-mobile-390x844.png");
  });

  test("enviar desktop nao exibe CTA global", async ({ page }) => {
    await gotoAndMeasure(page, "/enviar", { width: 1440, height: 900 });
    await expectNoGlobalCtaBlock(page);
    await expect(page.locator('[data-rail-useful="submit"]')).toBeVisible();
    await capture(page, "enviar-desktop-1440x900.png");
  });

  test("hub mobile nao exibe CTA global permanente", async ({ page }) => {
    await gotoAndMeasure(page, "/hub", { width: 390, height: 844 });
    await expectNoGlobalCtaBlock(page);
    await expect(page.locator('[data-hero-primary="hub-continuity"]')).toBeVisible();
    await capture(page, "hub-mobile-390x844.png");
  });

  test("hub desktop nao exibe CTA global", async ({ page }) => {
    await gotoAndMeasure(page, "/hub", { width: 1536, height: 960 });
    await expectNoGlobalCtaBlock(page);
    await expect(page.locator('[data-rail-useful="hub"]')).toBeVisible();
    await capture(page, "hub-desktop-1536x960.png");
  });

  test("rail completo so existe em xl+ na home", async ({ page }) => {
    await gotoAndMeasure(page, "/", { width: 412, height: 915 });
    await expect(page.locator('[data-rail-useful="home"]')).toBeHidden();

    await gotoAndMeasure(page, "/", { width: 1440, height: 900 });
    await expect(page.locator('[data-rail-useful="home"]')).toBeVisible();
  });
});
