import { expect, test } from "@playwright/test";

function webGLCanvas(page: import("@playwright/test").Page) {
  return page.locator(".archive-scene-shell canvas");
}

async function expectCollectiveWebGLVisible(page: import("@playwright/test").Page) {
  await expect(page.getByRole("button", { name: /Name:/ }).first()).toBeVisible({ timeout: 12000 });
}

async function forceWebGLContextLoss(page: import("@playwright/test").Page) {
  await webGLCanvas(page).evaluate((canvasElement) => {
    const canvas = canvasElement as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!gl || !extension) throw new Error("WEBGL_lose_context is not available");
    extension.loseContext();
  });
}

async function expectCurrentCanvasContextLive(page: import("@playwright/test").Page) {
  await expect
    .poll(
      () =>
        webGLCanvas(page).evaluate((canvasElement) => {
          const canvas = canvasElement as HTMLCanvasElement;
          const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
          return Boolean(gl && !gl.isContextLost());
        }),
      { timeout: 12000 },
    )
    .toBe(true);
}

async function enterCollectiveFromTimeline(page: import("@playwright/test").Page) {
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-entry-mode", "unified");
  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight - window.innerHeight, behavior: "auto" });
  });
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-entry-mode", "unified", { timeout: 12000 });
  await expect(page.getByRole("button", { name: /Name:/ }).first()).toBeVisible({ timeout: 12000 });
}

async function getCollectiveWebGLPixelCentroid(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: /Name:/ }).evaluateAll((elements) => {
    let count = 0;
    let totalX = 0;
    let totalY = 0;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      count += 1;
      totalX += rect.left + rect.width / 2;
      totalY += rect.top + rect.height / 2;
    }

    return { x: totalX / Math.max(1, count), y: totalY / Math.max(1, count), count };
  });
}

test("opens into collective overview without in-scene search controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("archive-experience")).toBeVisible();
  await enterCollectiveFromTimeline(page);
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-view", "collective");
  await expect(page.getByLabel("Archive graph controls")).toHaveCount(0);
});

test("index database link opens searchable 2D identity table", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: maxScroll * 0.76, behavior: "auto" });
  });
  await expect(page.getByRole("link", { name: "Index Database" })).toBeVisible();
  await page.getByRole("link", { name: "Index Database" }).evaluate((element) => {
    (element as HTMLAnchorElement).click();
  });
  await expect(page.getByLabel("Archive index database")).toBeVisible();
  await expect(page.locator(".index-table")).toBeVisible();
});

test("collective graph survives pointer movement without React or WebGL remount warnings", async ({ page }) => {
  const renderingFailures: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      text.includes("Encountered two children with the same key") ||
      text.includes("THREE.WebGLRenderer: Context Lost") ||
      text.includes("Too many active WebGL contexts") ||
      text.includes("The above error occurred") ||
      text.includes("Cannot update a component")
    ) {
      renderingFailures.push(text);
    }
  });
  page.on("pageerror", (error) => renderingFailures.push(error.message));

  await page.goto("/");
  await enterCollectiveFromTimeline(page);
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-view", "collective");
  await expect(webGLCanvas(page)).toBeVisible();

  await page.mouse.move(340, 260);
  await page.mouse.move(620, 420);
  await page.mouse.move(480, 300);
  await page.waitForTimeout(300);

  expect(renderingFailures).toEqual([]);
});

test("collective orbit drag does not snap back to its initial camera framing", async ({ page }) => {
  await page.goto("/");
  await enterCollectiveFromTimeline(page);
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-view", "collective");
  await expectCollectiveWebGLVisible(page);

  const before = await getCollectiveWebGLPixelCentroid(page);
  await page.mouse.move(760, 360);
  await page.mouse.down();
  await page.mouse.move(840, 420, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1400);
  const after = await getCollectiveWebGLPixelCentroid(page);

  expect(before.count).toBeGreaterThan(0);
  expect(after.count).toBeGreaterThan(0);
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(5);
});

test("collective remounts the WebGL scene after context loss", async ({ page }) => {
  await page.goto("/");
  await enterCollectiveFromTimeline(page);
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-view", "collective");
  await expectCollectiveWebGLVisible(page);
  await page.mouse.move(760, 360);
  await page.mouse.down();
  await page.mouse.move(820, 390, { steps: 6 });
  await page.mouse.up();
  await expectCollectiveWebGLVisible(page);

  await forceWebGLContextLoss(page);

  await expectCurrentCanvasContextLive(page);
  await expectCollectiveWebGLVisible(page);
});

test("collective identity preview enters detail through explicit action", async ({ page }) => {
  await page.goto("/");
  await enterCollectiveFromTimeline(page);
  await webGLCanvas(page).click({ position: { x: 400, y: 300 } });

  const overlay = page.getByLabel("Selected identity preview");
  if (await overlay.isVisible()) {
    await page.getByRole("button", { name: "Enter Individual" }).click();
    await expect(page.locator(".archive-experience")).toHaveAttribute("data-view", "individual");
    await expect(page.getByLabel("Individual details")).toBeVisible();
    await page.getByRole("button", { name: "Return to collective" }).click();
    await expect(page.locator(".archive-experience")).toHaveAttribute("data-view", "collective");
  }
});
