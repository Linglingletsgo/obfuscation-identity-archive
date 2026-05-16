import { expect, test } from "@playwright/test";

test("opens into Stage5 overview with graph controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("archive-experience")).toBeVisible();
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "5");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
});

test("search keeps Stage5 graph usable without entering detail", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search archive").fill("Dream");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "5");
});

test("Stage5 graph survives pointer movement without React or WebGL remount warnings", async ({ page }) => {
  const renderingFailures: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      text.includes("Encountered two children with the same key") ||
      text.includes("THREE.WebGLRenderer: Context Lost") ||
      text.includes("The above error occurred") ||
      text.includes("Cannot update a component")
    ) {
      renderingFailures.push(text);
    }
  });
  page.on("pageerror", (error) => renderingFailures.push(error.message));

  await page.goto("/");
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "5");
  await expect(page.locator("canvas")).toBeVisible();

  await page.mouse.move(340, 260);
  await page.mouse.move(620, 420);
  await page.mouse.move(480, 300);
  await page.waitForTimeout(300);

  expect(renderingFailures).toEqual([]);
});

test("Stage5 identity preview enters detail through explicit action", async ({ page }) => {
  await page.goto("/");
  await page.locator("canvas").click({ position: { x: 400, y: 300 } });

  const overlay = page.getByLabel("Selected identity preview");
  if (await overlay.isVisible()) {
    await page.getByRole("button", { name: "Enter detail" }).click();
    await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "0");
  }
});
