import { describe, expect, it } from "vitest";
import {
  createCollectiveModelPartGeometry,
  createCollectiveModelPointGeometry,
  createCollectiveModelPointMaterial,
} from "./CollectiveModelPointCloud";

describe("CollectiveModelPointCloud", () => {
  it("creates one GPU point geometry with color and seed attributes", () => {
    const geometry = createCollectiveModelPointGeometry(
      new Float32Array([0, 0, 0, 1, 1, 1]),
      new Float32Array([1, 0, 0, 0, 1, 0]),
    );

    expect(geometry.getAttribute("position").count).toBe(2);
    expect(geometry.getAttribute("color").count).toBe(2);
    expect(geometry.getAttribute("partColor").count).toBe(2);
    expect(geometry.getAttribute("partId").count).toBe(2);
    expect(geometry.getAttribute("seed").count).toBe(2);

    geometry.dispose();
  });

  it("can preserve GLB part accents as GPU attributes", () => {
    const geometry = createCollectiveModelPartGeometry(
      new Float32Array([0, 0, 0, 1, 1, 1]),
      new Float32Array([1, 0, 0, 0, 1, 0]),
      new Float32Array([0.8, 0.4, 0.2, 0.2, 0.5, 0.9]),
      new Float32Array([0, 1]),
    );

    expect([...geometry.getAttribute("partColor").array].map((value) => Number(value.toFixed(2)))).toEqual([
      0.8, 0.4, 0.2, 0.2, 0.5, 0.9,
    ]);
    expect([...geometry.getAttribute("partId").array]).toEqual([0, 1]);

    geometry.dispose();
  });

  it("uses shader uniforms for local interaction instead of per-point meshes", () => {
    const material = createCollectiveModelPointMaterial();

    expect(material.uniforms.uRayOrigin).toBeDefined();
    expect(material.uniforms.uRayDirection).toBeDefined();
    expect(material.uniforms.uInfluence).toBeDefined();
    expect(material.uniforms.uPointerVelocity).toBeDefined();
    expect(material.uniforms.uPointTexture).toBeDefined();
    expect(material.transparent).toBe(true);

    material.dispose();
  });
});
