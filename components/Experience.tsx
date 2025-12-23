import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { TreeSystem } from './TreeSystem';
import { useAppStore } from '../store';
import { AppState } from '../types';

const Experience: React.FC = () => {
  const { appState } = useAppStore();

  return (
    <Canvas
      className="w-full h-full"
      gl={{ antialias: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 35]} fov={50} />
      
      {/* Controls: Disabled/restricted based on state */}
      <OrbitControls 
        enableZoom={true} 
        enablePan={false} 
        autoRotate={appState === AppState.FORMED}
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 3}
      />

      {/* Lighting: Grand Luxury */}
      <ambientLight intensity={0.2} color="#023020" />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
      <pointLight position={[-10, -10, 10]} intensity={1} color="#C41E3A" />
      <spotLight 
        position={[0, 50, 0]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#FFF" 
        castShadow 
      />

      {/* Environment for reflections on ornaments */}
      <Environment preset="city" />

      {/* Content */}
      <TreeSystem />

      {/* Post Processing for the "Trump" Glow */}
      <EffectComposer disableNormalPass>
        <Bloom 
            luminanceThreshold={0.8} // Only very bright things glow
            mipmapBlur 
            intensity={1.5} 
            radius={0.4}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
        <Noise opacity={0.05} />
      </EffectComposer>
    </Canvas>
  );
};

export default Experience;
