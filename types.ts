import * as THREE from 'three';

export enum AppState {
  FORMED = 'FORMED', // The tree shape
  CHAOS = 'CHAOS',   // Exploded particles
  FOCUSED = 'FOCUSED' // Viewing a photo
}

export enum HandGesture {
  UNKNOWN = 'UNKNOWN',
  CLOSED_FIST = 'Closed_Fist',
  OPEN_PALM = 'Open_Palm',
  PINCH = 'Pinch', // Custom logic for pinch
  POINTING = 'Pointing_Up'
}

export interface ParticleData {
  id: string;
  targetPosition: THREE.Vector3;
  chaosPosition: THREE.Vector3;
  type: 'ornament' | 'foliage' | 'light' | 'photo';
  color: THREE.Color;
  scale: number;
  photoUrl?: string; // Only for photo type
}

export interface HandLandmarkerResult {
  landmarks: Array<Array<{ x: number; y: number; z: number }>>;
  worldLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
  handedness: Array<{ index: number; score: number; categoryName: string; displayName: string }>;
}
