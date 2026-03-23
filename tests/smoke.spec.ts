import { test, expect } from "@playwright/test";

test.describe("Fluxos Vitais do Bomba Aberta", () => {
  test("deve carregar o mapa e buscar um posto", async ({ page }) => {
    // 1. Abrir a Home
    await page.goto("/");
    await expect(page).toHaveTitle(/Bomba Aberta/);

    // 2. Verificar se o Mapa está presente
    const map = page.locator(".leaflet-container");
    await expect(map).toBeVisible();

    // 3. Simular busca ou filtro (se houver input de busca no mapa)
    // O app usa geolocalização e lista de recorte.
    // Vamos verificar se a lista de postos aparece.
    const stationList = page.locator("text=Postos no seu filtro");
    await expect(stationList).toBeVisible();
  });

  test("deve permitir abrir um posto e iniciar o fluxo de envio", async ({ page }) => {
    await page.goto("/");
    
    // Abrir o primeiro posto da lista
    const firstStation = page.locator("a[href^='/postos/']").first();
    await expect(firstStation).toBeVisible();
    await firstStation.click();

    // Verificar se a página do posto carregou
    await expect(page).toHaveURL(/\/postos\/.+/);
    
    // Verificar CTA de envio
    const submitBtn = page.locator("text=Enviar preço").first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Deve ir para a página de envio
    await expect(page).toHaveURL(/\/enviar/);
    await expect(page.locator("h2:has-text('Enviar preço')")).toBeVisible();
  });

  test("deve salvar rascunho na fila local se interrompido", async ({ page }) => {
    await page.goto("/enviar");

    // Preencher parte do form
    const priceInput = page.locator("#price");
    await priceInput.fill("6.29");

    // Navegar para fora e voltar
    await page.goto("/");
    await page.goto("/enviar");

    // O rascunho deve ser restaurado (verificando se o valor continua lá ou se há aviso de rascunho)
    // No app, aparece "Rascunho recuperado" ou o valor volta ao input.
    await expect(priceInput).toHaveValue("6.29");
  });

  test("deve carregar o admin e mostrar a fila de moderação", async ({ page }) => {
    // Nota: Requer bypass de auth ou mock de sessão. 
    // Como é smoke em dev/ci, assumimos que as variáveis de bypass estão ok se necessário.
    await page.goto("/admin");
    
    // Verificar se o painel de moderação aparece
    const moderationTitle = page.locator("text=Fila de Aprovação");
    await expect(moderationTitle).toBeVisible();
  });
});
