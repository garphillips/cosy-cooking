// Signature curved-horizon projection: shared vertex-shader displacement applied to ALL world
// materials via onBeforeCompile. The world bends downward with distance from the camera along the
// view axis so it rolls away like a little planet. `curvature` = 0 disables it (Phase 1-5).
import * as THREE from 'three';

export const CURVE = {
  curvature: 0.0,       // set per scene: hub ~0.0045, garden ~0.003, restaurant ~0.0
  startDistance: 6.0,   // metres from camera before bending starts
};
const uCurvature = { value: CURVE.curvature };
const uStart = { value: CURVE.startDistance };

export function setCurve(curvature, startDistance) {
  CURVE.curvature = curvature; CURVE.startDistance = startDistance ?? CURVE.startDistance;
  uCurvature.value = curvature; uStart.value = CURVE.startDistance;
}

const patched = new WeakSet();

/** Patch a material so its vertices bend with distance. Idempotent. */
export function applyCurve(material, { rim = 0 } = {}) {
  if (patched.has(material)) return material;
  patched.add(material);
  material.userData.rim = rim;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCurvature = uCurvature;
    shader.uniforms.uCurveStart = uStart;
    shader.uniforms.uRim = { value: rim };
    // soft rim / fresnel so characters and props pop from the background
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRim;')
      .replace('#include <opaque_fragment>', `
        #ifdef USE_RIM_PLACEHOLDER
        #endif
        {
          vec3 vDir = normalize(vViewPosition);
          float fres = pow(1.0 - clamp(dot(normalize(normal), vDir), 0.0, 1.0), 3.0);
          outgoingLight += fres * uRim * vec3(1.0, 0.95, 0.85) * (0.35 + 0.65 * max(0.0, dot(normal, vec3(0.3, 0.8, 0.5))));
        }
        #include <opaque_fragment>`);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uCurvature;\nuniform float uCurveStart;`)
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_BATCHING
          mvPosition = batchingMatrix * mvPosition;
        #endif
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        {
          float dist = max(0.0, -mvPosition.z - uCurveStart);
          mvPosition.y -= dist * dist * uCurvature;
        }
        gl_Position = projectionMatrix * mvPosition;
      `);
  };
  // uniforms are shared objects so scene-level setCurve() updates every material
  material.customProgramCacheKey = () => 'curve' + (rim ? 'rim' : '');
  return material;
}
