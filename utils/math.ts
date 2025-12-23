import * as THREE from 'three';

// Generate a random point inside a sphere
export const randomInSphere = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
};

// Generate a random point on a cone surface (Tree shape)
export const randomOnCone = (height: number, bottomRadius: number): THREE.Vector3 => {
  const y = Math.random() * height; // 0 to height
  // Invert Y so 0 is bottom
  const relativeY = y / height; // 0 to 1
  const currentRadius = bottomRadius * (1 - relativeY);
  
  const angle = Math.random() * Math.PI * 2;
  const x = Math.cos(angle) * currentRadius;
  const z = Math.sin(angle) * currentRadius;
  
  // Center the tree vertically
  return new THREE.Vector3(x, y - height / 2, z);
};

// Colors palette
export const PALETTE = {
  GOLD: new THREE.Color('#FFD700'),
  ROSE_GOLD: new THREE.Color('#B76E79'),
  EMERALD: new THREE.Color('#50C878'),
  DARK_GREEN: new THREE.Color('#023020'),
  RED: new THREE.Color('#C41E3A'),
  WHITE: new THREE.Color('#FFFFFF')
};
