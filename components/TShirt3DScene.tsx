import React, { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Decal, OrbitControls, Environment, ContactShadows, Center, Html, useProgress, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface TShirt3DSceneProps {
    color: string;
    design: string | null;
}

function Loader() {
  const { progress } = useProgress()
  return <Html center>{progress.toFixed(1)} % loaded</Html>
}

const TShirtModel: React.FC<TShirt3DSceneProps> = ({ color, design }) => {
    // Using a reliable CDN for the model
    const { nodes, materials } = useGLTF('https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@456060a26bbeb8fdf7d32ff487a1d9d95f732306/shirt/shirt_baked_collapsed.glb');
    const meshRef = useRef<THREE.Mesh>(null);
    // Load design texture if provided
    const fallbackTexture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const texture = useTexture(design || fallbackTexture);
    
    const clonedTexture = useMemo(() => {
        if (!texture) return null;
        const clone = texture.clone();
        if (design) {
            clone.colorSpace = THREE.SRGBColorSpace;
            clone.needsUpdate = true;
        }
        return clone;
    }, [texture, design]);

    // Apply color to material
    useFrame(() => {
        // Update material color smoothly
        if (materials.lambert1) {
             // @ts-expect-error - GLTF types are not fully typed
            materials.lambert1.color.lerp(new THREE.Color(color), 0.1);
        }
    });

    return (
        <group dispose={null}>
            <mesh
                ref={meshRef}
                castShadow
                receiveShadow
                // @ts-expect-error - GLTF types are not fully typed
                geometry={nodes.T_Shirt_male.geometry}
                // @ts-expect-error - GLTF types are not fully typed
                material={materials.lambert1}
                rotation={[0, 0, 0]} // Reset rotation for this specific model if needed, or adjust
                scale={1}
            >
                {/* Apply base material properties */}
                <meshStandardMaterial 
                    color={color} 
                    roughness={0.8} 
                    metalness={0.1}
                />

                {/* Apply Design Decal */}
                {design && (
                    <Decal 
                        position={[0, 0.04, 0.15]} // Adjust position to be on chest
                        rotation={[0, 0, 0]} 
                        scale={0.15} 
                        map={clonedTexture}
                        depthTest={true} // Ensure it renders on top
                        polygonOffset={true}
                        polygonOffsetFactor={-1} // Push slightly forward to avoid z-fighting
                    />
                )}
            </mesh>
        </group>
    );
};

export const TShirt3DScene: React.FC<TShirt3DSceneProps> = ({ color, design }) => {
    return (
        <div className="w-full h-full min-h-[500px] relative">
            <Canvas
                shadows
                camera={{ position: [0, 0, 0.8], fov: 45 }}
                gl={{ preserveDrawingBuffer: true }}
                className="w-full h-full rounded-2xl"
            >
                <ambientLight intensity={0.7} />
                <spotLight intensity={0.5} angle={0.1} penumbra={1} position={[10, 15, 10]} castShadow />
                
                <Suspense fallback={<Loader />}>
                    <Center>
                        <TShirtModel color={color} design={design} />
                    </Center>
                    <Environment preset="city" />
                </Suspense>

                <ContactShadows position={[0, -0.4, 0]} opacity={0.4} scale={10} blur={2} far={4} />
                <OrbitControls 
                    minPolarAngle={Math.PI / 2.5} 
                    maxPolarAngle={Math.PI / 2} 
                    enableZoom={true} 
                    enablePan={false}
                    minDistance={0.5}
                    maxDistance={1.5}
                />
            </Canvas>
            
            <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-sm pointer-events-none">
                Drag to rotate • Scroll to zoom
            </div>
        </div>
    );
};
