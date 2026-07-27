import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createCollectiveLayoutPositions,
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
    expect(geometry.getAttribute("partNumber").count).toBe(2);
    expect(geometry.getAttribute("seed").count).toBe(2);

    geometry.dispose();
  });

  it("can preserve GLB part accents as GPU attributes", () => {
    const geometry = createCollectiveModelPartGeometry(
      new Float32Array([0, 0, 0, 1, 1, 1]),
      new Float32Array([1, 0, 0, 0, 1, 0]),
      new Float32Array([0.8, 0.4, 0.2, 0.2, 0.5, 0.9]),
      new Float32Array([0, 1]),
      new Float32Array([20, 21]),
    );

    expect([...geometry.getAttribute("partColor").array].map((value) => Number(value.toFixed(2)))).toEqual([
      0.8, 0.4, 0.2, 0.2, 0.5, 0.9,
    ]);
    expect([...geometry.getAttribute("partId").array]).toEqual([0, 1]);
    expect([...geometry.getAttribute("partNumber").array]).toEqual([20, 21]);

    geometry.dispose();
  });

  it("uses shader uniforms for local interaction instead of per-point meshes", () => {
    const material = createCollectiveModelPointMaterial();

    expect(material.uniforms.uRayOrigin).toBeDefined();
    expect(material.uniforms.uRayDirection).toBeDefined();
    expect(material.uniforms.uInfluence).toBeDefined();
    expect(material.uniforms.uPointerPresence).toBeDefined();
    expect(material.uniforms.uPointerVelocity).toBeDefined();
    expect(material.uniforms.uDragIntensity).toBeDefined();
    expect(material.uniforms.uScatterStrength.value).toBe(1);
    expect(material.uniforms.uPointTexture).toBeDefined();
    expect(material.transparent).toBe(true);
    expect(material.blending).toBe(THREE.AdditiveBlending);

    material.dispose();
  });

  it("expands graph layout positions with the same part offsets", () => {
    const positions = new Float32Array([
      0, 0, 0,
      1, 1, 1,
      2, 2, 2,
    ]);
    const transformed = createCollectiveLayoutPositions(
      positions,
      new Float32Array([0.1, 0.2, 0.3]),
      new Float32Array([14, 20, 17]),
      1,
    );

    expect([...transformed.slice(0, 3)]).toEqual([
      expect.closeTo(2.35),
      expect.closeTo(-0.1),
      expect.closeTo(-0.12),
    ]);
    expect([...transformed.slice(3, 6)]).toEqual([1, 1, 1]);
    expect([...transformed.slice(6, 9)]).toEqual([
      expect.closeTo(6.45),
      expect.closeTo(2.8),
      expect.closeTo(1.8),
    ]);
    expect([...positions]).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2]);
  });
});
