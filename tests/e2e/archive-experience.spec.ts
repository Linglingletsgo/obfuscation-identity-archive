import { expect, test } from "@playwright/test";

test("opens into the Stage5 archive experience", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("archive-experience")).toBeVisible();
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "5");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
});

test("search control keeps the graph usable after filtering", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search archive").fill("Dream");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
});
