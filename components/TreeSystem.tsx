import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { AppState, HandGesture } from '../types';
import { randomInSphere, randomOnCone, PALETTE } from '../utils/math';
import { Image, Instance, Instances } from '@react-three/drei';

const COUNT_FOLIAGE = 3000;
const COUNT_ORNAMENTS = 150;
const COUNT_GREEN_PARTICLES = 600;

// Shader for magic gold dust/foliage
const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(PALETTE.EMERALD) },
    uGold: { value: new THREE.Color(PALETTE.GOLD) }
  },
  vertexShader: `
    uniform float uTime;
    attribute vec3 aTargetPos;
    attribute vec3 aChaosPos;
    attribute float aMixFactor; // Per-particle lerp state
    attribute float aSize;
    
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec3 pos = mix(aChaosPos, aTargetPos, aMixFactor);
      
      // Add subtle wind movement
      pos.x += sin(uTime * 2.0 + pos.y) * 0.1 * (1.0 - aMixFactor);
      pos.y += cos(uTime * 1.5 + pos.x) * 0.1 * (1.0 - aMixFactor);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = aSize * (300.0 / -mvPosition.z);
      
      vAlpha = 0.6 + 0.4 * sin(uTime + pos.x * 10.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uGold;
    varying float vAlpha;

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      // Sparkle center
      vec3 finalColor = mix(uColor, uGold, smoothstep(0.0, 0.2, dist));
      
      gl_FragColor = vec4(finalColor, vAlpha);
    }
  `
};

export const TreeSystem: React.FC = () => {
  const { appState, rotationY, photos, selectedPhotoIndex, setSelectedPhotoIndex, gesture } = useAppStore();
  
  // -- REFS --
  const foliageGeoRef = useRef<THREE.BufferGeometry>(null);
  const foliageMatRef = useRef<THREE.ShaderMaterial>(null);
  const ornamentGroupRef = useRef<THREE.Group>(null);
  const photoRefs = useRef<(THREE.Group | null)[]>([]);

  // -- STAR SHAPE GENERATION --
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.4;
    
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.05,
    bevelSegments: 2
  }), []);
  
  // -- DATA GENERATION --
  const foliageData = useMemo(() => {
    const targetPositions = [];
    const chaosPositions = [];
    const sizes = [];
    const mixFactors = []; 

    for (let i = 0; i < COUNT_FOLIAGE; i++) {
      const target = randomOnCone(20, 8);
      const chaos = randomInSphere(15);
      
      targetPositions.push(target.x, target.y, target.z);
      chaosPositions.push(chaos.x, chaos.y, chaos.z);
      sizes.push(Math.random() * 0.2 + 0.1);
      mixFactors.push(0);
    }
    
    return {
      target: new Float32Array(targetPositions),
      chaos: new Float32Array(chaosPositions),
      size: new Float32Array(sizes),
      mix: new Float32Array(mixFactors)
    };
  }, []);

  const ornamentData = useMemo(() => {
    const mainOrnaments = new Array(COUNT_ORNAMENTS).fill(0).map((_, i) => {
      const target = randomOnCone(18, 9);
      const chaos = randomInSphere(20);
      const type = Math.random() > 0.5 ? 'ball' : 'box';
      const color = Math.random() > 0.3 ? PALETTE.GOLD : PALETTE.RED;
      return { 
        id: `main-${i}`, 
        target, 
        chaos, 
        type, 
        color, 
        currentPos: chaos.clone(),
        mix: 0 
      };
    });

    const greenParticles = new Array(COUNT_GREEN_PARTICLES).fill(0).map((_, i) => {
        const target = randomOnCone(18, 8.5);
        const chaos = randomInSphere(20);
        return {
            id: `green-${i}`,
            target,
            chaos,
            type: 'green_ball',
            color: PALETTE.EMERALD,
            currentPos: chaos.clone(),
            mix: 0
        };
    });

    return [...mainOrnaments, ...greenParticles];
  }, []);

  // -- MAIN LOGIC LOOP --
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    // 1. Logic: Selection Controller (Runs on Frame to catch gesture changes)
    // If Pinching AND nothing selected yet, find closest to Tree Center (0,0,0)
    if (appState === AppState.CHAOS && gesture === HandGesture.PINCH && selectedPhotoIndex === null && photos.length > 0) {
        let minDistance = Infinity;
        let closestIndex = -1;
        const origin = new THREE.Vector3(0, 0, 0);

        photos.forEach((_, i) => {
            const group = photoRefs.current[i];
            if (group) {
                // We use world position
                const dist = group.position.distanceTo(origin);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIndex = i;
                }
            }
        });

        if (closestIndex !== -1) {
            setSelectedPhotoIndex(closestIndex);
        }
    } 
    // Logic: Deselection
    // If NOT Pinching AND something is selected, release it.
    else if (gesture !== HandGesture.PINCH && selectedPhotoIndex !== null) {
        setSelectedPhotoIndex(null);
    }

    // 2. Update Global Rotation
    if (ornamentGroupRef.current) {
        if (appState === AppState.CHAOS) {
            // Only rotate if no photo is selected
            if (selectedPhotoIndex === null) {
                ornamentGroupRef.current.rotation.y = THREE.MathUtils.lerp(ornamentGroupRef.current.rotation.y, rotationY, delta * 2);
            }
        } else {
            ornamentGroupRef.current.rotation.y += delta * 0.1;
        }
    }

    // 3. Update Foliage
    if (foliageMatRef.current) {
      foliageMatRef.current.uniforms.uTime.value = time;
    }

    if (foliageGeoRef.current) {
      const mixAttr = foliageGeoRef.current.attributes.aMixFactor;
      const targetVal = appState === AppState.FORMED ? 1 : 0;
      for (let i = 0; i < COUNT_FOLIAGE; i++) {
         const current = mixAttr.getX(i);
         const diff = targetVal - current;
         const speed = 2.0 + (i % 10) * 0.1; 
         mixAttr.setX(i, current + diff * delta * speed);
      }
      mixAttr.needsUpdate = true;
    }
  });

  return (
    <group ref={ornamentGroupRef}>
      {/* 1. FOLIAGE PARTICLES */}
      <points>
        <bufferGeometry ref={foliageGeoRef}>
          <bufferAttribute attach="attributes-aTargetPos" count={COUNT_FOLIAGE} array={foliageData.target} itemSize={3} />
          <bufferAttribute attach="attributes-aChaosPos" count={COUNT_FOLIAGE} array={foliageData.chaos} itemSize={3} />
          <bufferAttribute attach="attributes-aSize" count={COUNT_FOLIAGE} array={foliageData.size} itemSize={1} />
          <bufferAttribute attach="attributes-aMixFactor" count={COUNT_FOLIAGE} array={foliageData.mix} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial ref={foliageMatRef} args={[FoliageShaderMaterial]} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* 2. ORNAMENTS */}
      <Instances range={COUNT_ORNAMENTS}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={PALETTE.RED} roughness={0.1} metalness={0.9} />
        {ornamentData.filter(o => o.type === 'ball').map((o, i) => (
             <OrnamentInstance key={o.id} data={o} index={i} />
        ))}
      </Instances>

      <Instances range={COUNT_ORNAMENTS}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={PALETTE.GOLD} roughness={0.2} metalness={1} />
        {ornamentData.filter(o => o.type === 'box').map((o, i) => (
             <OrnamentInstance key={o.id} data={o} index={i} />
        ))}
      </Instances>

      <Instances range={COUNT_GREEN_PARTICLES}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshStandardMaterial color={PALETTE.EMERALD} roughness={0.5} metalness={0.5} />
        {ornamentData.filter(o => o.type === 'green_ball').map((o, i) => (
             <OrnamentInstance key={o.id} data={o} index={i} />
        ))}
      </Instances>

      {/* 4. PHOTOS */}
      {photos.map((url, i) => (
        <PhotoInstance 
            key={url + i} 
            url={url} 
            index={i} 
            registerRef={(el) => photoRefs.current[i] = el}
        />
      ))}
      
      {/* 5. TOP STAR */}
      <mesh position={[0, 10.5, 0]}>
         <extrudeGeometry args={[starShape, extrudeSettings]} />
         <meshStandardMaterial color={PALETTE.GOLD} emissive={PALETTE.GOLD} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
};

// -- HELPERS --

const OrnamentInstance = ({ data, index }: { data: any, index: number }) => {
    const ref = useRef<any>(null);
    const { appState } = useAppStore();
    
    useFrame((state, delta) => {
        if (!ref.current) return;
        const targetMix = appState === AppState.FORMED ? 1 : 0;
        data.mix = THREE.MathUtils.lerp(data.mix, targetMix, delta * (1 + index % 3)); 
        const pos = new THREE.Vector3().lerpVectors(data.chaos, data.target, data.mix);
        ref.current.position.copy(pos);
        ref.current.rotation.x += delta;
        ref.current.rotation.y += delta;
        const s = THREE.MathUtils.lerp(0.1, 1, data.mix); 
        const scale = appState === AppState.CHAOS ? 1 : s;
        ref.current.scale.setScalar(scale);
    });
    return <Instance ref={ref} />;
};

const PhotoInstance = ({ url, index, registerRef }: { url: string, index: number, registerRef: (el: THREE.Group | null) => void }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { appState, selectedPhotoIndex } = useAppStore();
    const { camera } = useThree();
    
    const treePos = useMemo(() => randomOnCone(18, 9), []);
    const chaosPos = useMemo(() => randomInSphere(12), []);
    
    // Register the ref for the parent to see
    React.useLayoutEffect(() => {
        registerRef(groupRef.current);
        return () => registerRef(null);
    }, [registerRef]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        
        const isSelected = selectedPhotoIndex === index;

        // --- TARGET CALCULATIONS ---
        let targetPos = new THREE.Vector3();
        let targetScale = 1;

        if (isSelected) {
            // Lock to camera center regardless of rotation
            const direction = new THREE.Vector3();
            state.camera.getWorldDirection(direction);
            
            // Place it 15 units in front of the camera
            const dist = 15;
            targetPos.copy(state.camera.position).add(direction.multiplyScalar(dist));
            
            // Calculate scale to fill ~1/3 of viewport at this distance
            const vFov = THREE.MathUtils.degToRad((state.camera as THREE.PerspectiveCamera).fov);
            const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
            const visibleWidth = visibleHeight * (state.camera as THREE.PerspectiveCamera).aspect;
            
            // Base width of the polaroid mesh is ~1.4
            targetScale = (visibleWidth / 2.8) / 1.4; 
        } else if (appState === AppState.FORMED) {
            targetPos.copy(treePos);
            targetScale = 1.0;
        } else {
            targetPos.copy(chaosPos);
            targetScale = 1.5;
        }

        // --- MOVEMENT ---
        // Faster lerp for selection to feel responsive
        const speed = isSelected ? 8 : 3;
        groupRef.current.position.lerp(targetPos, delta * speed);
        
        const currentScale = groupRef.current.scale.x;
        const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * speed);
        groupRef.current.scale.setScalar(nextScale);
        
        // --- ROTATION ---
        if (isSelected) {
            // Face the camera exactly
            groupRef.current.lookAt(camera.position);
            // Ensure no roll relative to camera up
            // (Standard lookAt handles this, but let's be sure it's upright relative to cam)
            groupRef.current.quaternion.copy(camera.quaternion);
        } else if (appState === AppState.CHAOS) {
            // General look at camera with wobble
            groupRef.current.lookAt(camera.position);
            groupRef.current.rotateZ(Math.sin(state.clock.elapsedTime + index) * 0.1);
        } else {
            // Face outward from tree center (y-axis)
            groupRef.current.lookAt(targetPos.x * 2, targetPos.y, targetPos.z * 2);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Polaroid Frame Background */}
            <mesh position={[0, -0.15, -0.05]}> 
                <boxGeometry args={[1.4, 1.6, 0.02]} />
                <meshStandardMaterial color="#f8f8f8" roughness={0.8} />
            </mesh>

            {/* Photo Image */}
            <Image 
                url={url} 
                scale={[1.2, 0.9]} 
                position={[0, 0.1, 0.02]} 
                transparent={false} 
                opacity={1}
                side={THREE.DoubleSide}
            />
        </group>
    );
};