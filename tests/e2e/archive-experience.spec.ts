import { expect, test } from "@playwright/test";

function webGLCanvas(page: import("@playwright/test").Page) {
  return page.locator(".archive-scene-shell canvas");
}

async function countCollectiveWebGLPixels(page: import("@playwright/test").Page) {
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

async function expectCollectiveWebGLVisible(page: import("@playwright/test").Page) {
  await expect
    .poll(() => countCollectiveWebGLPixels(page), { timeout: 12000 })
    .toBeGreaterThan(120);
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
  await expect(page.getByLabel("Research narrative timeline")).toBeVisible();
  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight - window.innerHeight, behavior: "auto" });
  });
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-entry-mode", "collective", { timeout: 12000 });
}

async function getCollectiveWebGLPixelCentroid(page: import("@playwright/test").Page) {
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
    if (!context) return { x: 0, y: 0, count: 0 };

    context.drawImage(image, 0, 0);
    const startY = Math.floor(image.height * 0.18);
    const pixels = context.getImageData(0, startY, image.width, image.height - startY).data;
    let count = 0;
    let totalX = 0;
    let totalY = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const pixelOffset = index / 4;
      const x = pixelOffset % image.width;
      const y = startY + Math.floor(pixelOffset / image.width);
      const redNode = pixels[index] > 170 && pixels[index + 1] < 130 && pixels[index + 2] < 120;
      const blueLineOrAvatar = pixels[index + 2] > 110 && pixels[index] < 170 && pixels[index + 1] < 190;
      if (pixels[index + 3] > 0 && (redNode || blueLineOrAvatar)) {
        count += 1;
        totalX += x;
        totalY += y;
      }
    }

    return { x: totalX / Math.max(1, count), y: totalY / Math.max(1, count), count };
  }, dataUrl);
}

test("opens into collective overview with graph controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("archive-experience")).toBeVisible();
  await expect(page.getByLabel("Research narrative timeline")).toBeVisible();
  await enterCollectiveFromTimeline(page);
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-view", "collective");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
});

test("search keeps collective graph usable without entering detail", async ({ page }) => {
  await page.goto("/");
  await enterCollectiveFromTimeline(page);
  await page.getByLabel("Search archive").fill("Dream");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-view", "collective");
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

  expect(before.count).toBeGreaterThan(120);
  expect(after.count).toBeGreaterThan(120);
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
