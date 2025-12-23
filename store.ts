import { create } from 'zustand';
import { AppState, HandGesture } from './types';
import * as THREE from 'three';

interface AppStore {
  // Logic State
  appState: AppState;
  setAppState: (state: AppState) => void;
  
  // Hand State
  gesture: HandGesture;
  setGesture: (gesture: HandGesture) => void;
  handPosition: { x: number; y: number }; // Normalized 0-1
  setHandPosition: (pos: { x: number; y: number }) => void;
  
  // Scene Data
  photos: string[];
  addPhoto: (url: string) => void;
  clearPhotos: () => void;
  selectedPhotoIndex: number | null;
  setSelectedPhotoIndex: (index: number | null) => void;

  // Camera Rotation Target (influenced by hand)
  rotationY: number;
  setRotationY: (rad: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  appState: AppState.FORMED,
  setAppState: (appState) => set({ appState }),

  gesture: HandGesture.UNKNOWN,
  setGesture: (gesture) => set({ gesture }),
  
  handPosition: { x: 0.5, y: 0.5 },
  setHandPosition: (handPosition) => set({ handPosition }),

  photos: [],
  addPhoto: (url) => set((state) => ({ photos: [...state.photos, url] })),
  clearPhotos: () => set({ photos: [] }),
  
  selectedPhotoIndex: null,
  setSelectedPhotoIndex: (index) => set({ selectedPhotoIndex: index }),

  rotationY: 0,
  setRotationY: (rotationY) => set({ rotationY }),
}));