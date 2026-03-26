import { expect, test } from "@playwright/test";

test.describe("Bottom nav debug", () => {
  test("inspects bottom nav hit targets on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sobre");

    const nav = page.locator("nav").filter({ hasText: "Atualizações" }).first();
    await expect(nav).toBeVisible();

    const checks = [
      { label: "Mapa", url: "/", start: "/sobre" },
      { label: "Atualizações", url: "/atualizacoes", start: "/sobre" },
      { label: "Enviar", url: "/enviar", start: "/sobre" },
      { label: "Meu Hub", url: "/hub", start: "/sobre" }
    ];

    for (const { label, url, start } of checks) {
      await page.goto(start);
      await expect(page).toHaveURL(new RegExp(`${start === "/" ? "\\/$" : start.replace("/", "\\/") + "$"}`));

      const target = page.getByRole("link", { name: new RegExp(label, "i") });
      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      if (!box) {
        throw new Error(`No bounding box for ${label}`);
      }

      const point = {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      };

      const hit = await page.evaluate(({ x, y }) => {
        const element = document.elementFromPoint(x, y);
        if (!element) {
          return null;
        }

        const tag = element.tagName;
        const text = (element.textContent ?? "").trim();
        const cls = element.className;
        return { tag, text, cls };
      }, point);

      console.log("HIT", label, hit);
      await target.click({ force: true });
      await page.waitForURL(new RegExp(`${url.replace("/", "\\/")}$`), { timeout: 10000 });
      console.log("URL_AFTER", label, page.url());
    }
  });
});
