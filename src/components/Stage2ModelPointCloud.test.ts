import { describe, expect, it } from "vitest";
import { createStage2ModelPointGeometry, createStage2ModelPointMaterial } from "./Stage2ModelPointCloud";

describe("Stage2ModelPointCloud", () => {
  it("creates one GPU point geometry with color and seed attributes", () => {
    const geometry = createStage2ModelPointGeometry(
      new Float32Array([0, 0, 0, 1, 1, 1]),
      new Float32Array([1, 0, 0, 0, 1, 0]),
    );

    expect(geometry.getAttribute("position").count).toBe(2);
    expect(geometry.getAttribute("color").count).toBe(2);
    expect(geometry.getAttribute("seed").count).toBe(2);

    geometry.dispose();
  });

  it("uses shader uniforms for local interaction instead of per-point meshes", () => {
    const material = createStage2ModelPointMaterial();

    expect(material.uniforms.uRayOrigin).toBeDefined();
    expect(material.uniforms.uRayDirection).toBeDefined();
    expect(material.uniforms.uInfluence).toBeDefined();
    expect(material.uniforms.uPointerVelocity).toBeDefined();
    expect(material.transparent).toBe(true);

    material.dispose();
  });
});
