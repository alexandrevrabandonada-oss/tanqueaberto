import { test, expect } from "@playwright/test";

const smokeTimeout = 45_000;

test.describe.configure({ timeout: 90_000 });

test.describe("Go-live public smoke", () => {
  test("home opens with value in the first fold", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page).toHaveTitle(/Bomba Aberta/);
    await expect(page.getByText(/Mapa vivo|Carregando mapa vivo/i).first()).toBeVisible({ timeout: smokeTimeout });
    await expect(page.getByRole("link", { name: "Mapa" })).toBeVisible({ timeout: smokeTimeout });
  });

  test("updates route renders the feed surface", async ({ page }) => {
    await page.goto("/atualizacoes", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: /Atualizações/i })).toBeVisible({ timeout: smokeTimeout });
  });

  test("station to submit flow stays public", async ({ page }) => {
    await page.goto("/postos/sem-atualizacao", { waitUntil: "commit", timeout: smokeTimeout });
    await expect(page.getByRole("heading", { name: /Postos cadastrados sem preço recente/i })).toBeVisible({ timeout: smokeTimeout });
    await page.getByRole("link", { name: /^Enviar preço$/i }).click({ force: true });
    await expect(page).toHaveURL(/\/enviar/, { timeout: smokeTimeout });
    await expect(page.getByRole("heading", { name: /Enviar preço/i })).toBeVisible({ timeout: smokeTimeout });
    await expect(page.getByText(/Comece pela foto/i)).toBeVisible({ timeout: smokeTimeout });
  });

  test("hub opens continuity without login", async ({ page }) => {
    await page.goto("/hub", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: /Centro de continuidade real\.?|Continuar de onde parou|Proximo melhor gesto|Abrir o eixo principal/i })).toBeVisible({ timeout: smokeTimeout });
  });
});
