import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { normalizePointCloudPositions, projectNodeIntoAvatarShape, sampleObjectSurface } from "./avatarShape";

describe("avatarShape", () => {
  it("normalizes model surface positions around center", () => {
    expect([...normalizePointCloudPositions(new Float32Array([10, 0, 0, 20, 0, 0]), 5)]).toEqual([
      -5, 0, 0, 5, 0, 0,
    ]);
  });

  it("samples surface colors from mesh materials with a global point cap", () => {
    const scene = new THREE.Group();
    const redMesh = new THREE.Mesh(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]), 3),
      ),
      new THREE.MeshBasicMaterial({ color: "#ff0000" }),
    );
    const blueMesh = new THREE.Mesh(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array([0, 1, 0, 1, 1, 0, 2, 1, 0]), 3),
      ),
      new THREE.MeshBasicMaterial({ color: "#0000ff" }),
    );
    scene.add(redMesh, blueMesh);

    const sample = sampleObjectSurface(scene, 3);

    expect(sample.positions.length / 3).toBeLessThanOrEqual(4);
    expect([...sample.colors.slice(0, 3)]).toEqual([1, 0, 0]);
    expect(sample.colors.length).toBe(sample.positions.length);
    expect(sample.partColors.length).toBe(sample.positions.length);
    expect(sample.partIds.length).toBe(sample.positions.length / 3);
    expect(new Set([...sample.partIds]).size).toBeGreaterThan(1);
    expect(sample.partColors[0]).toBeGreaterThan(sample.partColors[2]);
    expect(sample.partColors[sample.partColors.length - 1]).toBeGreaterThan(sample.partColors[sample.partColors.length - 3]);
    expect([...sample.partColors.slice(0, 3)]).toEqual([...sample.partColors.slice(3, 6)]);
  });

  it("keeps nearby texture colors visibly separated by mesh part", () => {
    const scene = new THREE.Group();
    const sharedMaterial = new THREE.MeshBasicMaterial({ color: "#666058" });
    scene.add(
      new THREE.Mesh(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]), 3),
        ),
        sharedMaterial,
      ),
      new THREE.Mesh(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array([0, 1, 0, 1, 1, 0, 2, 1, 0]), 3),
        ),
        sharedMaterial,
      ),
    );

    const sample = sampleObjectSurface(scene, 6);
    const firstLum = sample.partColors[0] + sample.partColors[1] + sample.partColors[2];
    const secondLum = sample.partColors[9] + sample.partColors[10] + sample.partColors[11];

    expect(Math.abs(secondLum - firstLum)).toBeGreaterThan(0.45);
  });

  it("adds deterministic triangle samples when the requested point budget exceeds vertex count", () => {
    const scene = new THREE.Group();
    scene.add(
      new THREE.Mesh(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array([0, 0, 0, 4, 0, 0, 0, 4, 0]), 3),
        ),
        new THREE.MeshBasicMaterial({ color: "#668866" }),
      ),
    );

    const sample = sampleObjectSurface(scene, 9);

    expect(sample.positions.length / 3).toBeGreaterThan(3);
    expect(sample.colors.length).toBe(sample.positions.length);
    expect(sample.partColors.length).toBe(sample.positions.length);
    expect(sample.partIds.length).toBe(sample.positions.length / 3);
  });

  it("projects graph nodes to an inward point from sampled model shape", () => {
    const surface = new Float32Array([0, 10, 0, 0, -4, 0, 2, 0, 0]);
    const projected = projectNodeIntoAvatarShape(
      {
        id: "identity-a",
        position: { x: 0, y: 7, z: 0 },
      },
      surface,
      0.5,
    );

    expect(Math.hypot(projected.x, projected.y, projected.z)).toBeLessThanOrEqual(5);
  });

  it("uses id-seeded surface positions so collective graph nodes cover the upper avatar volume", () => {
    const surface = new Float32Array([0, 10, 0, 0, -4, 0, 2, 0, 0]);
    const projected = Array.from({ length: 24 }, (_, index) =>
      projectNodeIntoAvatarShape(
        {
          id: `node-${index}`,
          position: { x: 0, y: -7, z: 0 },
        },
        surface,
        0.5,
      ),
    );

    expect(projected.some((node) => node.y > 0)).toBe(true);
    expect(projected.some((node) => node.y < 0)).toBe(true);
  });

  it("can distribute sparse collective graph nodes through the avatar height", () => {
    const surface = new Float32Array([0, 10, 0, 0, 4, 0, 0, -4, 0, 0, -10, 0]);
    const projected = Array.from({ length: 4 }, (_, index) =>
      projectNodeIntoAvatarShape(
        {
          id: `sparse-node-${index}`,
          position: { x: 0, y: -7, z: 0 },
        },
        surface,
        1,
        { index, total: 4 },
      ),
    );

    expect(projected[0].y).toBe(10);
    expect(projected[3].y).toBe(-10);
  });
});
