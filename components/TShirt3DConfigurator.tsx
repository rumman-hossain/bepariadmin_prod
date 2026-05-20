import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, createPortal } from '@react-three/fiber';
import { OrbitControls, Center, Environment, ContactShadows, Decal, useGLTF, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';

interface TShirtModelProps {
    color: string;
    design: string | null;
    customModel?: string | null;
}

function Loader() {
  const { progress } = useProgress()
  return <Html center>{progress.toFixed(1)} % loaded</Html>
}

const GLTFModel: React.FC<{ url: string; color: string; design: string | null }> = ({ url, color, design }) => {
    const { scene } = useGLTF(url);
    const meshRef = useRef<THREE.Mesh>(null);

    // Create texture from base64 string or URL for the design
    const designTexture = useMemo(() => {
        if (!design) return null;
        const loader = new THREE.TextureLoader();
        return loader.load(design);
    }, [design]);

    // Clone the scene to avoid modifying the cached original if used multiple times
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    // Apply color to the first mesh found in the model
    useMemo(() => {
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                    // Clone material to avoid shared state issues
                    mesh.material = (mesh.material as THREE.Material).clone();
                    (mesh.material as THREE.MeshStandardMaterial).color.set(color);
                }
            }
        });
    }, [clonedScene, color]);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
    });

    return (
        <group ref={meshRef as React.Ref<THREE.Group>}> 
            <primitive object={clonedScene} />
            {/* Attempt to place decal on the model - this is tricky without knowing UVs/Geometry 
                We'll try to project it onto the center. 
                For a generic model, we might need a specific target mesh. 
                Here we just add it to the group and hope it hits something or the user adjusts.
                Actually, Decal needs a mesh as a parent or explicit target. 
                Since we are using primitive, we can't easily wrap a specific mesh with Decal 
                unless we find it. 
            */}
             {design && designTexture && (
                <mesh position={[0, 0.2, 0.15]} visible={false}>
                     {/* 
                        Invisible mesh to target the decal? No, Decal needs to be a child of the mesh it projects on.
                        We need to find the main mesh and add the Decal as a child in the scene graph 
                        OR use a different technique.
                        
                        For simplicity in this generic loader:
                        We will traverse and find the first mesh, and render a Decal portal there.
                     */}
                </mesh>
            )}
            {/* 
                Alternative: We render the Decal separately and try to project.
                But Decal must be a child of the mesh.
                Let's try to inject the Decal into the scene graph programmatically.
            */}
            <DecalInjector scene={clonedScene} texture={designTexture} />
        </group>
    );
};

// Helper to inject Decal into the first mesh of the GLTF
const DecalInjector: React.FC<{ scene: THREE.Group; texture: THREE.Texture | null }> = ({ scene, texture }) => {
    if (!texture) return null;

    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((child) => {
        if (!targetMesh && (child as THREE.Mesh).isMesh) {
            targetMesh = child as THREE.Mesh;
        }
    });

    if (!targetMesh) return null;

    return createPortal(
        <Decal 
            position={[0, 0.04, 0.15]} // Generic chest position
            rotation={[0, 0, 0]} 
            scale={0.2} 
            map={texture}
            depthTest={true}
            depthWrite={true}
        />,
        targetMesh
    );
};


const ProceduralTShirt: React.FC<{ color: string; design: string | null }> = ({ color, design }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    // Create texture from base64 string or URL for the design
    const designTexture = useMemo(() => {
        if (!design) return null;
        const loader = new THREE.TextureLoader();
        return loader.load(design);
    }, [design]);

    // Create the T-shirt shape procedurally
    const tshirtGeometry = useMemo(() => {
        const shape = new THREE.Shape();
        
        // Scale factor to normalize coordinates (0-512 -> 0-1 approx)
        const s = 0.01;
        const w = 512;
        const h = 512;
        
        // Helper to flip Y (SVG is top-left, 3D is bottom-left)
        const fy = (y: number) => (h - y) * s;
        const fx = (x: number) => (x - w/2) * s; // Center X
        
        // Path: M170,60 L80,140 L120,200 L170,170 L170,480 L342,480 L342,170 L392,200 L432,140 L342,60 Q256,110 170,60 Z
        shape.moveTo(fx(170), fy(60));
        shape.lineTo(fx(80), fy(140));
        shape.lineTo(fx(120), fy(200));
        shape.lineTo(fx(170), fy(170));
        shape.lineTo(fx(170), fy(480));
        shape.lineTo(fx(342), fy(480));
        shape.lineTo(fx(342), fy(170));
        shape.lineTo(fx(392), fy(200));
        shape.lineTo(fx(432), fy(140));
        shape.lineTo(fx(342), fy(60));
        shape.quadraticCurveTo(fx(256), fy(110), fx(170), fy(60));
        
        const extrudeSettings = {
            depth: 0.4, // Thickness of the shirt
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 8
        };
        
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }, []);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
    });

    return (
        <group>
            <mesh 
                ref={meshRef} 
                geometry={tshirtGeometry} 
                castShadow 
                receiveShadow
                position={[0, 0, 0]}
            >
                <meshStandardMaterial 
                    color={color}
                    roughness={0.6}
                    metalness={0.1}
                />
                
                {/* Design Overlay using Decal */}
                {design && designTexture && (
                    <Decal 
                        position={[0, 0.5, 0.25]} // Adjust position for the extruded shape
                        rotation={[0, 0, 0]} 
                        scale={0.8} 
                        map={designTexture}
                        depthTest={true}
                        depthWrite={true}
                    />
                )}
            </mesh>
        </group>
    );
};

export const TShirt3DConfigurator: React.FC<TShirtModelProps> = ({ color, design, customModel }) => {
    return (
        <div className="w-full h-full min-h-[500px] relative bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
            <Canvas shadows camera={{ position: [0, 0, 4.5], fov: 35 }}>
                <ambientLight intensity={0.6} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={2048} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.2} />
                <Environment preset="city" />
                
                <Suspense fallback={<Loader />}>
                    <Center>
                        {customModel ? (
                            <GLTFModel url={customModel} color={color} design={design} />
                        ) : (
                            <ProceduralTShirt color={color} design={design} />
                        )}
                    </Center>
                </Suspense>
                
                <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={1} />
                <OrbitControls minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} enableZoom={true} />
            </Canvas>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 shadow-sm pointer-events-none">
                Drag to rotate • Scroll to zoom
            </div>
        </div>
    );
};
