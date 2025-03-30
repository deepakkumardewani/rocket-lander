import * as THREE from "three";
import * as CANNON from "cannon-es";

export class Terrain {
  private mesh: THREE.Mesh;
  private body: CANNON.Body;
  private segments: number;

  constructor(width: number = 100, depth: number = 100, segments: number = 32) {
    this.segments = segments;
    const geometry = new THREE.PlaneGeometry(
      width,
      depth,
      segments - 1,
      segments - 1
    );
    const material = new THREE.MeshPhongMaterial({
      color: 0x808080,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    // Rotate to lie flat
    geometry.rotateX(-Math.PI / 2);

    // Create heightmap
    const heightMap = this.generateHeightMap();
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = Math.floor((i / 3) % segments);
      const z = Math.floor(i / 3 / segments);
      vertices[i + 1] = heightMap[z][x];
    }

    geometry.computeVertexNormals();
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;

    // Create physics body
    const shape = new CANNON.Heightfield(heightMap, {
      elementSize: width / (segments - 1),
    });
    this.body = new CANNON.Body({ mass: 0 });
    this.body.addShape(shape);
    this.body.position.set(0, -5, 0);
    this.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
  }

  private generateHeightMap(): number[][] {
    const heightMap: number[][] = [];
    for (let i = 0; i < this.segments; i++) {
      heightMap[i] = [];
      for (let j = 0; j < this.segments; j++) {
        // Simple random height between 0 and 2
        heightMap[i][j] = Math.random() * 2;
      }
    }
    return heightMap;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getBody(): CANNON.Body {
    return this.body;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
