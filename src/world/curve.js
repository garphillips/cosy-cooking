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
// Soft-toon character shading (shared uniforms so a settings toggle flips every character at once)
export const TOON_UNIFORMS = {
  uToonMix: { value: 1.0 },      // 0 = classic PBR falloff, 1 = wrapped soft two-tone
  uToonShadow: { value: 0.3 },   // brightness of the shadow side
  uToonEdge: { value: 0.52 },    // where the terminator sits (0..1 of wrapped N·L)
  uToonSoft: { value: 0.18 },    // half-width of the soft terminator
  uToonWarm: { value: new THREE.Vector3(1.0, 0.96, 0.9) },
  uToonCool: { value: new THREE.Vector3(0.86, 0.9, 1.0) },
};
export const OUTLINE_UNIFORMS = { uOutline: { value: 0.026 } };

export function setCurve(curvature, startDistance) {
  CURVE.curvature = curvature; CURVE.startDistance = startDistance ?? CURVE.startDistance;
  uCurvature.value = curvature; uStart.value = CURVE.startDistance;
}

const patched = new WeakSet();

/** Patch a material so its vertices bend with distance. Idempotent. */
export function applyCurve(material, { rim = 0, toon = false, outline = false } = {}) {
  if (patched.has(material)) return material;
  patched.add(material);
  material.userData.rim = rim; material.userData.toon = toon;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCurvature = uCurvature;
    shader.uniforms.uCurveStart = uStart;
    shader.uniforms.uRim = { value: rim };
    if (outline) {
      Object.assign(shader.uniforms, OUTLINE_UNIFORMS);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uOutline;')
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normalize( normal ) * uOutline;');
    }
    if (toon) {
      Object.assign(shader.uniforms, TOON_UNIFORMS);
      // Wrapped, softened N·L for the DIFFUSE term only. Specular keeps the classic saturate(N·L)
      // so lights behind a surface never reach the GGX term (that blows up at silhouettes).
      const chunk = THREE.ShaderChunk.lights_physical_pars_fragment
        .replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\tvec3 irradiance = dotNL * directLight.color;',
          `float rawNL = dot( geometryNormal, directLight.direction );
\tfloat dotNL = saturate( rawNL );
\tvec3 irradiance = dotNL * directLight.color;
\tfloat wrapped = rawNL * 0.5 + 0.5;
\tfloat toonNL = mix( uToonShadow, 1.0, smoothstep( uToonEdge - uToonSoft, uToonEdge + uToonSoft, wrapped ) );
\tvec3 toonTint = mix( vec3( 1.0 ), mix( uToonCool, uToonWarm, toonNL ), uToonMix );
\tvec3 toonIrradiance = mix( dotNL, toonNL, uToonMix ) * directLight.color * toonTint;`)
        .replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );', 'reflectedLight.directDiffuse += toonIrradiance * BRDF_Lambert( material.diffuseContribution );');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uToonMix; uniform float uToonShadow; uniform float uToonEdge; uniform float uToonSoft; uniform vec3 uToonWarm; uniform vec3 uToonCool;')
        .replace('#include <lights_physical_pars_fragment>', chunk);
    }
    // soft rim / fresnel so characters and props pop from the background (lit materials only)
    const lit = material.isMeshStandardMaterial || material.isMeshPhysicalMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial || material.isMeshToonMaterial;
    if (lit && rim > 0) shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRim;')
      .replace('#include <opaque_fragment>', `
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
  material.customProgramCacheKey = () => 'curve' + (rim ? 'rim' + rim : '') + (toon ? 'toon' : '') + (outline ? 'outline' : '');
  return material;
}
