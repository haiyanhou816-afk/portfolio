import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Color,
  GLSL3,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import "./PixelSnow.css";

const vertexShader = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision mediump float;
out vec4 fragColor;
uniform float uTime; uniform vec2 uResolution; uniform float uFlakeSize;
uniform float uMinFlakeSize; uniform float uPixelResolution; uniform float uSpeed;
uniform float uDepthFade; uniform float uFarPlane; uniform vec3 uColor;
uniform float uBrightness; uniform float uGamma; uniform float uDensity;
uniform float uVariant; uniform float uDirection;
uniform float uPixelSize; uniform float uWind; uniform float uSway;
uniform float uGlow; uniform float uFade; uniform vec2 uMouse;
uniform float uMouseInfluence;
#define PI 3.14159265
#define PI_OVER_6 0.5235988
#define PI_OVER_3 1.0471976
#define M1 1597334677U
#define M2 3812015801U
#define M3 3299493293U
#define F0 2.3283064e-10
#define hash(n) (n * (n ^ (n >> 15)))
#define coord3(p) (uvec3(p).x * M1 ^ uvec3(p).y * M2 ^ uvec3(p).z * M3)
const vec3 camK = vec3(0.57735027);
const vec3 camI = vec3(0.70710678, 0.0, -0.70710678);
const vec3 camJ = vec3(-0.40824829, 0.81649658, -0.40824829);
const vec2 b1d = vec2(0.574, 0.819);

vec3 hash3(uint n) {
  uvec3 hashed = hash(n) * uvec3(1U, 511U, 262143U);
  return vec3(hashed) * F0;
}

float snowflakeDist(vec2 p) {
  float r = length(p);
  float a = atan(p.y, p.x);
  a = abs(mod(a + PI_OVER_6, PI_OVER_3) - PI_OVER_6);
  vec2 q = r * vec2(cos(a), sin(a));
  float dMain = max(abs(q.y), max(-q.x, q.x - 1.0));
  float b1t = clamp(dot(q - vec2(0.4, 0.0), b1d), 0.0, 0.4);
  float dB1 = length(q - vec2(0.4, 0.0) - b1t * b1d);
  float b2t = clamp(dot(q - vec2(0.7, 0.0), b1d), 0.0, 0.25);
  float dB2 = length(q - vec2(0.7, 0.0) - b2t * b1d);
  return min(dMain, min(dB1, dB2)) * 10.0;
}

void main() {
  float invPixelRes = 1.0 / uPixelResolution;
  /* uPixelSize > 0 时按“像素块边长”量化，否则沿用 uPixelResolution 的旧算法 */
  float pixelSize = uPixelSize > 0.5
    ? max(1.0, floor(uPixelSize))
    : max(1.0, floor(0.5 + uResolution.x * invPixelRes));
  float invPixelSize = 1.0 / pixelSize;
  vec2 fragCoord = floor(gl_FragCoord.xy * invPixelSize);
  vec2 res = uResolution * invPixelSize;
  float invResX = 1.0 / res.x;
  vec3 ray = normalize(vec3((fragCoord - res * 0.5) * invResX, 1.0));
  ray = ray.x * camI + ray.y * camJ + ray.z * camK;

  float timeSpeed = uTime * uSpeed;
  float windX = cos(uDirection) * 0.4;
  float windY = sin(uDirection) * 0.4;
  vec3 camPos = (windX * camI + windY * camJ + 0.1 * camK) * timeSpeed;
  /* 横向风：随时间持续平移 */
  camPos += uWind * timeSpeed * camJ;
  /* 鼠标视差：整体沿鼠标方向轻微偏移 */
  vec2 mouseOffset = (uMouse - vec2(0.5)) * uMouseInfluence;
  camPos += camI * (mouseOffset.x * 0.55) + camJ * mouseOffset.y;
  vec3 pos = camPos;
  vec3 absRay = max(abs(ray), vec3(0.001));
  vec3 strides = 1.0 / absRay;
  vec3 raySign = step(ray, vec3(0.0));
  vec3 phase = fract(pos) * strides;
  phase = mix(strides - phase, phase, raySign);
  float rayDotCamK = dot(ray, camK);
  float invRayDotCamK = 1.0 / rayDotCamK;
  float invDepthFade = 1.0 / uDepthFade;
  float halfInvResX = 0.5 * invResX;
  vec3 timeAnim = timeSpeed * 0.1 * vec3(7.0, 8.0, 5.0);
  float t = 0.0;

  for (int i = 0; i < 128; i++) {
    if (t >= uFarPlane) break;
    vec3 fpos = floor(pos);
    uint cellCoord = coord3(fpos);
    float cellHash = hash3(cellCoord).x;

    if (cellHash < uDensity) {
      vec3 h = hash3(cellCoord);
      vec3 sinArg1 = fpos.yzx * 0.073;
      vec3 sinArg2 = fpos.zxy * 0.27;
      vec3 flakePos = 0.5 - 0.5 * cos(4.0 * sin(sinArg1) + 4.0 * sin(sinArg2) + 2.0 * h + timeAnim);
      flakePos = flakePos * 0.8 + 0.1 + fpos;
      float toIntersection = dot(flakePos - pos, camK) * invRayDotCamK;

      if (toIntersection > 0.0) {
        vec3 testPos = pos + ray * toIntersection - flakePos;
        float testX = dot(testPos, camI);
        float testY = dot(testPos, camJ);
        /* 随风轻摆：按位置与时间做横向正弦偏移 */
        testX += uSway * 0.06 * sin(uTime * 0.9 + flakePos.y * 4.5 + flakePos.z * 2.3);
        vec2 testUV = abs(vec2(testX, testY));
        float depth = dot(flakePos - camPos, camK);
        float calculatedFlakeSize = max(uFlakeSize, uMinFlakeSize * depth * halfInvResX);
        float dist;
        if (uVariant < 0.5) dist = max(testUV.x, testUV.y);
        else if (uVariant < 1.5) dist = length(testUV);
        else dist = snowflakeDist(vec2(testX, testY) / calculatedFlakeSize) * calculatedFlakeSize;

        /* uGlow 给雪花加一圈柔光，避免只有硬边方块 */
        float glowRadius = calculatedFlakeSize * (1.0 + uGlow * 3.5);
        float hitRadius = max(calculatedFlakeSize, glowRadius);

        if (dist < hitRadius) {
          float core = 1.0 - smoothstep(calculatedFlakeSize * 0.55, calculatedFlakeSize, dist);
          float halo = 1.0 - clamp(
            (dist - calculatedFlakeSize) / max(glowRadius - calculatedFlakeSize, 1e-4), 0.0, 1.0);
          halo = halo * halo * uGlow;
          float shape = clamp(max(core, halo), 0.0, 1.0);
          float flakeSizeRatio = uFlakeSize / calculatedFlakeSize;
          float intensity = exp2(-(t + toIntersection) * invDepthFade) *
            min(1.0, flakeSizeRatio * flakeSizeRatio) * uBrightness * uFade * shape;
          fragColor = vec4(uColor * pow(vec3(intensity), vec3(uGamma)), 1.0);
          return;
        }
      }
    }

    float nextStep = min(min(phase.x, phase.y), phase.z);
    vec3 sel = step(phase, vec3(nextStep));
    phase = phase - nextStep + strides * sel;
    t += nextStep;
    pos = mix(pos + ray * nextStep, floor(pos + ray * nextStep + 0.5), sel);
  }
  fragColor = vec4(0.0);
}
`;

export default function PixelSnow({
  color = "#ffffff",
  flakeSize = 0.01,
  minFlakeSize = 1.25,
  pixelResolution = 200,
  speed = 1.25,
  depthFade = 8,
  farPlane = 20,
  brightness = 1,
  gamma = 0.4545,
  density = 0.3,
  variant = "square",
  direction = 125,
  /* 以下为像素块风格参数：pixelSize 为像素块边长(px)，
     flakeSize 单位为“块”（1 = 一块大小），配合 pixelSize 使用 */
  pixelSize = 0,
  wind = 0,
  sway = 0,
  glow = 0,
  fade = 1,
  mouseInteraction = false,
  className = "",
  style = {},
}) {
  const containerRef = useRef(null);
  const animationRef = useRef(0);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);
  const visibleRef = useRef(true);
  const resizeTimeoutRef = useRef(null);

  /* 指定 pixelSize 时，瓦片尺寸按“块”换算成世界单位：
     1 块 ≈ pixelSize 像素；10 是标定系数，让近处雪花约 4 倍块宽 */
  const flakeSizeRef = useRef(() => 0.01);
  flakeSizeRef.current = (width) =>
    pixelSize > 0 ? (flakeSize * pixelSize * 10) / Math.max(width, 1) : flakeSize;

  const variantValue = useMemo(
    () => (variant === "round" ? 1 : variant === "snowflake" ? 2 : 0),
    [variant],
  );
  const colorVector = useMemo(() => {
    const parsedColor = new Color(color);
    return new Vector3(parsedColor.r, parsedColor.g, parsedColor.b);
  }, [color]);

  const handleResize = useCallback(() => {
    window.clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = window.setTimeout(() => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      const material = materialRef.current;
      if (!container || !renderer || !material) return;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      renderer.setSize(width, height);
      material.uniforms.uResolution.value.set(width, height);
      material.uniforms.uFlakeSize.value = flakeSizeRef.current(width);
    }, 100);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      glslVersion: GLSL3,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vector2(container.offsetWidth, container.offsetHeight) },
        uFlakeSize: { value: flakeSizeRef.current(container.offsetWidth) },
        uMinFlakeSize: { value: minFlakeSize },
        uPixelResolution: { value: pixelResolution },
        uSpeed: { value: speed },
        uDepthFade: { value: depthFade },
        uFarPlane: { value: farPlane },
        uColor: { value: colorVector.clone() },
        uBrightness: { value: brightness },
        uGamma: { value: gamma },
        uDensity: { value: density },
        uVariant: { value: variantValue },
        uDirection: { value: (direction * Math.PI) / 180 },
        uPixelSize: { value: pixelSize },
        uWind: { value: wind },
        uSway: { value: sway },
        uGlow: { value: glow },
        uFade: { value: fade },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uMouseInfluence: { value: mouseInteraction ? 0.35 : 0 },
      },
    });
    materialRef.current = material;
    const geometry = new PlaneGeometry(2, 2);
    scene.add(new Mesh(geometry, material));
    window.addEventListener("resize", handleResize);

    const startedAt = performance.now();
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      if (!visibleRef.current || document.hidden) return;
      material.uniforms.uTime.value = (performance.now() - startedAt) * 0.001;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      window.clearTimeout(resizeTimeoutRef.current);
      renderer.domElement.remove();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      rendererRef.current = null;
      materialRef.current = null;
    };
  }, [handleResize]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uFlakeSize.value = flakeSizeRef.current(containerRef.current?.offsetWidth || 1);
    material.uniforms.uMinFlakeSize.value = minFlakeSize;
    material.uniforms.uPixelResolution.value = pixelResolution;
    material.uniforms.uSpeed.value = speed;
    material.uniforms.uDepthFade.value = depthFade;
    material.uniforms.uFarPlane.value = farPlane;
    material.uniforms.uBrightness.value = brightness;
    material.uniforms.uGamma.value = gamma;
    material.uniforms.uDensity.value = density;
    material.uniforms.uVariant.value = variantValue;
    material.uniforms.uDirection.value = (direction * Math.PI) / 180;
    material.uniforms.uColor.value.copy(colorVector);
    material.uniforms.uPixelSize.value = pixelSize;
    material.uniforms.uWind.value = wind;
    material.uniforms.uSway.value = sway;
    material.uniforms.uGlow.value = glow;
    material.uniforms.uFade.value = fade;
    material.uniforms.uMouseInfluence.value = mouseInteraction ? 0.35 : 0;
  }, [flakeSize, minFlakeSize, pixelResolution, speed, depthFade, farPlane, brightness, gamma, density, variantValue, direction, colorVector, pixelSize, wind, sway, glow, fade, mouseInteraction]);

  /* 鼠标视差：跟随指针位置轻微偏移整片雪 */
  useEffect(() => {
    if (!mouseInteraction) return undefined;
    const handleMove = (event) => {
      const material = materialRef.current;
      if (!material) return;
      material.uniforms.uMouse.value.set(
        event.clientX / Math.max(window.innerWidth, 1),
        event.clientY / Math.max(window.innerHeight, 1)
      );
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [mouseInteraction]);

  return <div ref={containerRef} className={`pixel-snow-container ${className}`} style={style} />;
}
