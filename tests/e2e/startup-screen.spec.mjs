import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("la splash copre download, demo e avvio successivo senza bloccare la scelta demo", async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", route => route.abort());
  let releaseProgram;
  let programReady = new Promise(resolve => { releaseProgram = resolve; });
  await page.route("**/assets/index-*.js", async route => {
    await programReady;
    await route.continue();
  });
  let releaseDemo;
  const demoReady = new Promise(resolve => { releaseDemo = resolve; });
  await page.route("**/match_demo.json*", async route => {
    await demoReady;
    await route.continue();
  });
  await page.goto("./", { waitUntil: "commit" });
  await expect(page.locator("#startup-screen")).toBeVisible();
  await expect(page.locator("#root")).toHaveAttribute("inert", "");
  releaseProgram();
  await expect(page.locator("#startup-status")).toContainText("Preparazione delle squadre");
  releaseDemo();
  await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");
  await expect(page.locator("#startup-screen")).toHaveCount(0);
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  await page.locator('[data-demo-choice="keep"]').click();
  await expect(page.locator("#saved-matches-list")).toContainText("Aurora");

  programReady = new Promise(resolve => { releaseProgram = resolve; });
  await page.reload({ waitUntil: "commit" });
  await expect(page.locator("#startup-screen")).toBeVisible();
  releaseProgram();
  await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");
  await expect(page.locator("#startup-screen")).toHaveCount(0);
  await expect(page.locator('[data-demo-choice="keep"]')).not.toBeVisible();
  await page.locator("#theme-light-lobby").click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
});
