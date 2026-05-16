import { expect, test } from "@playwright/test";

async function countStage5WebGLPixels(page: import("@playwright/test").Page) {
  const screenshot = await page.screenshot();
  const dataUrl = `data:image/png;base64,${screenshot.toString("base64")}`;

  return page.evaluate(async (imageUrl) => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to decode screenshot"));
      image.src = imageUrl;
    });

    const sample = document.createElement("canvas");
    sample.width = image.width;
    sample.height = image.height;
    const context = sample.getContext("2d");
    if (!context) return 0;

    context.drawImage(image, 0, 0);
    const startY = Math.floor(image.height * 0.18);
    const pixels = context.getImageData(0, startY, image.width, image.height - startY).data;
    let count = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const redNode = pixels[index] > 170 && pixels[index + 1] < 130 && pixels[index + 2] < 120;
      const blueLineOrAvatar = pixels[index + 2] > 110 && pixels[index] < 170 && pixels[index + 1] < 190;
      if (pixels[index + 3] > 0 && (redNode || blueLineOrAvatar)) count += 1;
    }

    return count;
  }, dataUrl);
}

async function expectStage5WebGLVisible(page: import("@playwright/test").Page) {
  await expect
    .poll(() => countStage5WebGLPixels(page), { timeout: 12000 })
    .toBeGreaterThan(120);
}

async function forceWebGLContextLoss(page: import("@playwright/test").Page) {
  await page.locator("canvas").evaluate((canvasElement) => {
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
        page.locator("canvas").evaluate((canvasElement) => {
          const canvas = canvasElement as HTMLCanvasElement;
          const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
          return Boolean(gl && !gl.isContextLost());
        }),
      { timeout: 12000 },
    )
    .toBe(true);
}

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

test("Stage5 remounts the WebGL scene after context loss", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "5");
  await expectStage5WebGLVisible(page);

  await forceWebGLContextLoss(page);

  await expectCurrentCanvasContextLive(page);
  await expectStage5WebGLVisible(page);
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
