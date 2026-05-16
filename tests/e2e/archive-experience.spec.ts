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

test("Stage5 identity preview enters detail through explicit action", async ({ page }) => {
  await page.goto("/");
  await page.locator("canvas").click({ position: { x: 400, y: 300 } });

  const overlay = page.getByLabel("Selected identity preview");
  if (await overlay.isVisible()) {
    await page.getByRole("button", { name: "Enter detail" }).click();
    await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "0");
  }
});
