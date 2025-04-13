import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import WindParticleSystem from "./WindParticleSystem.js";
import IslandGenerator from "./IslandGenerator.js";
import Advertisement from "./Advertisement.js";
import PerlinNoise from "./PerlinNoise.js";
import Yacht from "./Yacht.js";
import Cloud from "./Cloud.js";
import { Blimp } from "./Blimp.js";
import Ocean from "./Water.js";
import Portal from "./Portal.js";
import Birds from "./Birds.js";

/**
 * World class representing the 3D environment
 *
 * Island-Sponsor Coupling:
 * The world uses a tightly coupled approach for islands and sponsors. Each island definition can
 * include an optional "sponsor" field that links it to a sponsor configuration. This approach makes
 * the relationship explicit in the data structure and simplifies island creation and management.
 *
 * Format:
 * {
 *   x: number,           // x position of the island
 *   z: number,           // z position of the island
 *   size: number,        // size multiplier for the island
 *   trees: number,       // number of trees to place on the island
 *   sponsor: string      // optional: company name of the sponsor
 * }
 *
 * Uses Three.js Water shader for realistic ocean rendering:
 * - Requires textures/waternormals.jpg for the water normal map
 * - Dynamically animates water surface with time-based distortion
 * - Includes sky with atmospheric scattering and sun position control
 * - Water reacts to sun position with appropriate reflections
 */
class World {
  static showGrid = true; // Static boolean to control grid visibility

  constructor(scene, camera = null) {
    this.scene = scene;
    this.camera = camera;
    this.water = null;
    this.sky = null;
    this.sun = new THREE.Vector3(100, 100, 50);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Set default wind direction to 220 degrees (from southwest)
    const windAngle = (220 * Math.PI) / 180;
    this.windDirection = new THREE.Vector3(
      Math.sin(windAngle),
      0,
      Math.cos(windAngle)
    ).normalize();

    this.windSpeed = 5.0;
    this.windVisibilityRadius = 800;

    // Initialize components
    this.windSystem = null;
    this.islandGenerator = null;
    this.advertisementSystem = new Advertisement(this.scene);
    this.yacht = null;
    this.yachts = [];
    this.blimp = null;

    // Add clouds array
    this.clouds = [];

    // Add portal reference
    this.portals = [];

    // Add birds reference
    this.birds = null;

    // Initialize the world
    this.init();
  }

  init() {
    this.createLighting();
    this.createSea();
    this.createSky();
    this.createIslands();
    this.createWindParticles();
    this.createYacht();
    this.createClouds();
    this.createBlimp();
    this.createPortals();
    this.createBirds();
  }

  createLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.copy(this.sun);
    this.scene.add(directionalLight);

    // Add a point light that will enhance the shiny effect on buoy spheres
    const pointLight = new THREE.PointLight(0xffffff, 1, 500);
    pointLight.position.set(0, 100, 0);
    this.scene.add(pointLight);
  }

  createSea() {
    this.water = new Ocean(this.scene, this.sun);
    this.water.create();

    if (World.showGrid) {
      this._createGrid(new THREE.PlaneGeometry(10000, 10000));
    }
  }

  _createGrid(waterGeometry) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    const gridTexture = new THREE.CanvasTexture(canvas);
    gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(200, 200);

    const gridMaterial = new THREE.MeshBasicMaterial({
      map: gridTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    const gridMesh = new THREE.Mesh(waterGeometry, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = 0.2;
    gridMesh.renderOrder = 1;
    this.scene.add(gridMesh);
  }

  createSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    const skyUniforms = this.sky.material.uniforms;
    skyUniforms["turbidity"].value = 5;
    skyUniforms["rayleigh"].value = 1.5;
    skyUniforms["mieCoefficient"].value = 0.01;
    skyUniforms["mieDirectionalG"].value = 0.3;

    this.updateSunPosition({
      elevation: 4,
      azimuth: 90,
    });
  }

  /**
   * Create all islands in the world with integrated sponsor information
   */
  createIslands() {
    this.islandGenerator = new IslandGenerator(this.scene);

    // Load both island definitions and sponsor configs
    Promise.all([
      fetch("/js/data/islandDefinitions.json").then((res) => res.json()),
      fetch("/js/data/signConfigs.json").then((res) => res.json()),
    ])
      .then(([islandDefinitions, sponsorConfigs]) => {
        // Store sponsor configs in memory for later use
        this.sponsorConfigs = sponsorConfigs;

        // Create all islands with the loaded data
        this.createAllIslandsWithSponsors(islandDefinitions, sponsorConfigs);
      })
      .catch((error) => {
        console.error("Error loading island data:", error);
        // Fallback to empty data
        this.sponsorConfigs = {};
        this.createAllIslandsWithSponsors([], {});
      });
  }

  /**
   * Create all islands with integrated sponsor information
   * @param {Array} islandDefinitions - Array of island category objects from JSON
   * @param {Object} sponsorConfigs - Dictionary of sponsor configurations
   */
  createAllIslandsWithSponsors(islandDefinitions, sponsorConfigs) {
    // Process each category of islands
    islandDefinitions.forEach((category) => {
      console.log(`Creating islands in category: ${category.category}`);

      // Process each island in the category
      category.islands.forEach((islandDef) => {
        this.createIslandWithOptionalSponsor(islandDef, sponsorConfigs);
      });
    });
  }

  /**
   * Create a single island with optional sponsor
   * @param {Object} islandDef - Island definition including potential sponsor
   * @param {Object} sponsorConfigs - Dictionary of sponsor configurations
   * @returns {Object} Object containing the created island and sign (if sponsored)
   */
  createIslandWithOptionalSponsor(islandDef, sponsorConfigs) {
    const position = { x: islandDef.x, z: islandDef.z };
    const size = islandDef.size || 1.0;
    const treeCount = islandDef.trees || 10;

    // Create the island geometry
    const geometry = new THREE.PlaneGeometry(200 * size, 200 * size, 50, 50);
    const island = this.islandGenerator.generateCustomIsland(
      position,
      geometry,
      treeCount
    );

    let sign = null;

    // Check if this island has a sponsor
    if (islandDef.sponsor && sponsorConfigs[islandDef.sponsor]) {
      const companyName = islandDef.sponsor;
      const sponsorConfig = sponsorConfigs[companyName];

      // Mark the island as sponsored
      island.userData.sponsored = true;
      island.userData.companyName = companyName;

      // Ensure we have an advertisementSystem instance
      if (this.advertisementSystem) {
        // Create config with position for sign creation
        const signConfig = { ...sponsorConfig, position };

        // Create a sign for the sponsor
        sign = this.advertisementSystem.createSignForCompany(companyName, {
          [companyName]: signConfig,
        });

        // Link the sign to the island
        if (sign) {
          sign.userData.islandRef = island.uuid;
          island.userData.signRef = sign.uuid;
        }
      }
    } else {
      // Mark as non-sponsored
      island.userData.sponsored = false;
    }

    return { island, sign };
  }

  createWindParticles() {
    if (this.camera) {
      this.windSystem = new WindParticleSystem(
        this.scene,
        this.camera,
        this.windDirection,
        this.windSpeed,
        this.windVisibilityRadius
      );
    }
  }

  createYacht() {
    // Create yachts with parameters loaded from yachtDefinitions.json
    fetch("/js/data/yachtDefinitions.json")
      .then((response) => response.json())
      .then((yachtConfigs) => {
        // Create all defined yachts
        yachtConfigs.forEach((config) => {
          const yacht = new Yacht(this.scene, config.id);
          this.yachts.push(yacht);

          // Keep reference to first yacht for backward compatibility
          if (config.id === "softgen") {
            this.yacht = yacht;
          }
        });

        console.log(`Created ${this.yachts.length} yachts`);
      })
      .catch((error) => {
        console.error("Error creating yachts:", error);
        // Fallback to creating just the original yacht
        this.yacht = new Yacht(this.scene, "softgen");
        this.yachts = [this.yacht];
      });

    // Orbit path indicators are only shown in the HTML map, not in 3D
    // this.addYachtOrbitHelper();
  }

  /**
   * Add a visible orbit path to help locate the yacht
   * Note: This method is no longer called as orbit indicators are only shown in the HTML map
   */
  addYachtOrbitHelper() {
    // This method is kept for reference but no longer called
    // Orbit indicators are only shown in the HTML map, not in 3D

    // Fetch yacht configurations to get the orbit radius
    fetch("/js/data/yachtDefinitions.json")
      .then((response) => response.json())
      .then((yachtConfigs) => {
        const config = yachtConfigs.find((y) => y.id === "softgen");
        if (!config) return;

        const radius = config.radius || 700;
        const centerX = config.centerX || 0;
        const centerZ = config.centerZ || 0;

        // Create a circle geometry for the orbit path
        const orbitGeometry = new THREE.BufferGeometry();
        const segments = 64;
        const points = [];

        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = centerX + Math.sin(angle) * radius;
          const z = centerZ + Math.cos(angle) * radius;
          points.push(new THREE.Vector3(x, 1, z)); // Slightly above water
        }

        orbitGeometry.setFromPoints(points);

        // Create orbit path material (dashed line)
        const orbitMaterial = new THREE.LineDashedMaterial({
          color: 0xff0000,
          linewidth: 3,
          scale: 1,
          dashSize: 10,
          gapSize: 5,
        });

        // Create the orbit path line
        const orbitPath = new THREE.Line(orbitGeometry, orbitMaterial);
        orbitPath.computeLineDistances(); // Required for dashed lines

        // Add to scene
        this.scene.add(orbitPath);

        // Add markers at every 90 degrees to help locate the yacht
        const markerGeometry = new THREE.SphereGeometry(15, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
          const x = centerX + Math.sin(angle) * radius;
          const z = centerZ + Math.cos(angle) * radius;
          const marker = new THREE.Mesh(markerGeometry, markerMaterial);
          marker.position.set(x, 15, z); // Position above water
          this.scene.add(marker);
        }
      })
      .catch((error) => {
        console.error("Error creating yacht orbit helper:", error);
      });
  }

  setCamera(camera) {
    this.camera = camera;

    if (this.camera) {
      this.camera.layers.enableAll();
    }

    if (!this.windSystem) {
      this.createWindParticles();
    }

    // Update camera reference in scene for advertisement system
    this.scene.camera = camera;
  }

  setWind(direction, speed) {
    this.windDirection = direction.clone().normalize();
    this.windSpeed = Math.max(0, speed);

    if (this.windSystem) {
      this.windSystem.setWind(this.windDirection, this.windSpeed);
    }
  }

  getWindDirection() {
    return this.windDirection.clone();
  }

  getWindSpeed() {
    return this.windSpeed;
  }

  getWindDirectionName() {
    const dir = this.windDirection;
    let angle = (Math.atan2(dir.x, dir.z) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    if (angle >= 337.5 || angle < 22.5) return "South";
    if (angle >= 22.5 && angle < 67.5) return "Southwest";
    if (angle >= 67.5 && angle < 112.5) return "West";
    if (angle >= 112.5 && angle < 157.5) return "Northwest";
    if (angle >= 157.5 && angle < 202.5) return "North";
    if (angle >= 202.5 && angle < 247.5) return "Northeast";
    if (angle >= 247.5 && angle < 292.5) return "East";
    return "Southeast";
  }

  update(deltaTime) {
    if (this.water) {
      this.water.update(deltaTime);
    }

    if (this.windSystem) {
      this.windSystem.update(deltaTime);
    }

    // Update advertisements
    if (this.advertisementSystem) {
      // this.advertisementSystem.update(deltaTime);
    }

    // Update all yachts
    if (this.yachts.length > 0) {
      this.yachts.forEach((yacht) => yacht.update(deltaTime));
    } else if (this.yacht) {
      // Backward compatibility
      this.yacht.update(deltaTime);
    }

    // Update clouds
    this.clouds.forEach((cloud) => {
      cloud.update(this.windDirection, deltaTime);
    });

    // Update blimp if it exists
    if (this.blimp) {
      this.blimp.update();
    }

    // Update portals
    this.portals.forEach((portal) => {
      portal.update(deltaTime);
    });

    // Update birds
    if (this.birds) {
      this.birds.update(deltaTime);
    }
  }

  setSeaParameters(params = {}) {
    if (this.water) {
      this.water.setParameters(params);
    }
  }

  updateSunPosition(params = {}) {
    const elevation = params.elevation || 45;
    const azimuth = params.azimuth || 180;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    this.sun.setFromSphericalCoords(1000, phi, theta);

    if (this.sky) {
      this.sky.material.uniforms["sunPosition"].value.copy(this.sun);
    }

    if (this.water && this.water.water) {
      this.water.water.material.uniforms["sunDirection"].value
        .copy(this.sun)
        .normalize();
    }
  }

  setWindVisibilityRadius(radius) {
    this.windVisibilityRadius = Math.max(50, radius);
    if (this.windSystem) {
      this.windSystem.setVisibilityRadius(radius);
    }
  }

  getWindVisibilityRadius() {
    return this.windVisibilityRadius;
  }

  createClouds() {
    // Create clouds using the static method from Cloud class
    this.clouds = Cloud.createClouds(this.scene, 1500, 12);
  }

  createBlimp() {
    this.blimp = new Blimp(this.scene);
  }

  /**
   * Create portals at specified locations
   */
  createPortals() {
    // Use static method to create portals from JSON
    Portal.createPortalsFromJSON(this.scene, this)
      .then((portals) => {
        this.portals = portals;
      })
      .catch((error) => {
        console.error(
          "Error creating portals from JSON. No portals will be created:",
          error
        );
        // No fallback to hardcoded locations - portals array remains empty
        this.portals = [];
      });
  }

  createBirds() {
    // Create birds using the factory method
    // Birds will fly in the wind direction
    this.birds = Birds.createBirds(this.scene, 3, this.windDirection);
  }

  dispose() {
    // Remove all world elements

    // Remove islands if any
    if (this.islandGenerator) {
      this.islandGenerator.dispose();
    }

    // Remove wind system if any
    if (this.windSystem) {
      this.windSystem.dispose();
    }

    // Remove advertisement system
    if (this.advertisementSystem) {
      this.advertisementSystem.dispose();
    }

    // Remove yacht if any
    if (this.yacht) {
      this.yacht.dispose();
    }

    // Remove all yachts if any
    this.yachts.forEach((yacht) => yacht.dispose());
    this.yachts = [];

    // Remove blimp if any
    if (this.blimp) {
      this.blimp.dispose();
    }

    // Remove clouds
    this.clouds.forEach((cloud) => cloud.dispose());
    this.clouds = [];

    // Dispose of portals
    this.portals.forEach((portal) => {
      portal.dispose();
    });
    this.portals = [];

    // Dispose of birds
    if (this.birds) {
      this.birds.dispose();
    }
  }
}

export default World;
