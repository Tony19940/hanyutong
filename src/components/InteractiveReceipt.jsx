import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const SEG_X = 20;
const SEG_Y = 34;
const RECEIPT_WIDTH = 5.4;
const RECEIPT_HEIGHT = 8.8;
const GRAVITY = new THREE.Vector3(0, -0.008, 0);

function createTexture({ user, stats, hskLevel }) {
  const canvas = document.createElement('canvas');
  canvas.width = 2200;
  canvas.height = 3400;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f7f3ea';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const left = 180;
  const right = canvas.width - 180;

  ctx.fillStyle = '#111827';
  ctx.textAlign = 'left';
  ctx.font = '800 132px Manrope, Arial';
  ctx.fillText('Bunson老师', left, 222);
  ctx.fillStyle = 'rgba(17,24,39,0.62)';
  ctx.font = '700 48px Manrope, Arial';
  ctx.fillText('学习成果小票', left, 306);
  ctx.textAlign = 'right';
  ctx.font = '600 42px "Courier New", monospace';
  ctx.fillText(new Date().toLocaleDateString('zh-CN'), right, 294);

  ctx.strokeStyle = 'rgba(17,24,39,0.14)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, 388);
  ctx.lineTo(right, 388);
  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.font = '800 88px Manrope, Arial';
  ctx.textAlign = 'left';
  ctx.fillText(user.username ? `@${user.username}` : user.name, left, 538);
  ctx.fillStyle = 'rgba(17,24,39,0.58)';
  ctx.font = '700 48px Manrope, Arial';
  ctx.fillText(`HSK ${hskLevel} · 学习报告`, left, 612);

  const summaryTop = 736;
  const boxGap = 36;
  const boxWidth = (right - left - boxGap) / 2;
  const boxHeight = 316;
  const summaryBoxes = [
    { x: left, y: summaryTop, label: '今日掌握', value: `${stats.wordsLearned}`, accent: '#0b6a58', unit: '词' },
    { x: left + boxWidth + boxGap, y: summaryTop, label: '连续学习', value: `${stats.streak}`, accent: '#d2aa36', unit: '天' },
    { x: left, y: summaryTop + boxHeight + boxGap, label: '掌握度', value: `${stats.mastery}`, accent: '#2d7a5c', unit: '%' },
    { x: left + boxWidth + boxGap, y: summaryTop + boxHeight + boxGap, label: '学习时长', value: `${stats.totalHours}`, accent: '#c28f2c', unit: 'h' },
  ];

  summaryBoxes.forEach((item) => {
    ctx.fillStyle = '#fffdf7';
    ctx.strokeStyle = 'rgba(17,24,39,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(item.x, item.y, boxWidth, boxHeight, 44);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(17,24,39,0.58)';
    ctx.textAlign = 'left';
    ctx.font = '700 40px Manrope, Arial';
    ctx.fillText(item.label, item.x + 42, item.y + 72);

    ctx.fillStyle = item.accent;
    ctx.font = '800 128px Manrope, Arial';
    ctx.fillText(item.value, item.x + 42, item.y + 202);

    ctx.fillStyle = 'rgba(17,24,39,0.62)';
    ctx.font = '700 46px Manrope, Arial';
    ctx.textAlign = 'right';
    ctx.fillText(item.unit, item.x + boxWidth - 42, item.y + 198);
  });

  const detailRows = [
    ['学习方式', '滑卡背词 + 自动朗读'],
    ['测验节奏', '5 词一关'],
    ['练习重点', '中文发音 / 例句跟读'],
    ['复习入口', '收藏词库 / AI 对话'],
  ];
  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  ctx.font = '800 58px Manrope, Arial';
  ctx.fillText('今日明细', left, 1640);
  ctx.fillStyle = 'rgba(17,24,39,0.54)';
  ctx.font = '600 38px Manrope, Arial';
  ctx.fillText('一张更适合分享和回看的学习结果卡。', left, 1704);

  let y = 1852;
  detailRows.forEach(([label, value]) => {
    ctx.fillStyle = 'rgba(17,24,39,0.54)';
    ctx.textAlign = 'left';
    ctx.font = '700 40px Manrope, Arial';
    ctx.fillText(label, left, y);
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'right';
    ctx.font = '800 46px Manrope, Arial';
    ctx.fillText(value, right, y);
    ctx.strokeStyle = 'rgba(17,24,39,0.12)';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(left, y + 48);
    ctx.lineTo(right, y + 48);
    ctx.stroke();
    y += 186;
  });
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(17,24,39,0.14)';
  ctx.beginPath();
  ctx.moveTo(left, 2818);
  ctx.lineTo(right, 2818);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  ctx.font = '800 58px Manrope, Arial';
  ctx.fillText('继续保持', left, 2960);
  ctx.fillStyle = 'rgba(17,24,39,0.58)';
  ctx.font = '700 40px Manrope, Arial';
  ctx.fillText('每天学一点，口语会更稳。', left, 3036);
  ctx.textAlign = 'right';
  ctx.font = '700 42px "Courier New", monospace';
  ctx.fillText(`ID ${String(user.id || '').slice(-6) || 'HYT'}`, right, 3036);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function InteractiveReceipt({ user, stats, hskLevel }) {
  const mountRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const textureInput = useMemo(() => ({ user, stats, hskLevel }), [user, stats, hskLevel]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: canvasRef.current,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 16);

    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 3, 6);
    const rim = new THREE.DirectionalLight(0xfff2d9, 0.8);
    rim.position.set(-2, -1, 4);
    scene.add(ambient, key, rim);

    const geometry = new THREE.PlaneGeometry(RECEIPT_WIDTH, RECEIPT_HEIGHT, SEG_X, SEG_Y);
    const texture = createTexture(textureInput);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.92,
      metalness: 0.02,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(RECEIPT_WIDTH * 0.88, RECEIPT_HEIGHT * 0.18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.09 })
    );
    shadow.position.set(0, -RECEIPT_HEIGHT * 0.6, -1.2);
    shadow.scale.set(1, 0.22, 1);
    scene.add(shadow);

    const positions = geometry.attributes.position;
    const particles = [];
    const constraints = [];

    const createParticle = (x, y, z) => ({
      position: new THREE.Vector3(x, y, z),
      previous: new THREE.Vector3(x, y, z),
      original: new THREE.Vector3(x, y, z),
      pinned: y > RECEIPT_HEIGHT / 2 - 0.001,
    });

    for (let y = 0; y <= SEG_Y; y += 1) {
      for (let x = 0; x <= SEG_X; x += 1) {
        const i = y * (SEG_X + 1) + x;
        particles[i] = createParticle(positions.getX(i), positions.getY(i), positions.getZ(i));
        if (x < SEG_X) constraints.push([i, i + 1]);
        if (y < SEG_Y) constraints.push([i, i + SEG_X + 1]);
      }
    }

    const restDistanceX = RECEIPT_WIDTH / SEG_X;
    const restDistanceY = RECEIPT_HEIGHT / SEG_Y;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let activeParticle = null;
    let activeDepth = 0;

    const satisfyConstraint = (aIndex, bIndex) => {
      const a = particles[aIndex];
      const b = particles[bIndex];
      const diff = new THREE.Vector3().subVectors(b.position, a.position);
      const distance = diff.length() || 0.0001;
      const rest = Math.abs(a.original.x - b.original.x) > Math.abs(a.original.y - b.original.y) ? restDistanceX : restDistanceY;
      const correction = diff.multiplyScalar((distance - rest) / distance / 2);

      if (!a.pinned) a.position.add(correction);
      if (!b.pinned) b.position.sub(correction);
    };

    const getIntersection = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(mesh)[0];
      return hit || null;
    };

    const handlePointerDown = (event) => {
      const hit = getIntersection(event);
      if (!hit) return;
      const uv = hit.uv;
      const xIndex = Math.round(uv.x * SEG_X);
      const yIndex = Math.round((1 - uv.y) * SEG_Y);
      activeParticle = particles[yIndex * (SEG_X + 1) + xIndex];
      activeDepth = hit.point.z;
      renderer.domElement.style.cursor = 'grabbing';
    };

    const handlePointerMove = (event) => {
      if (!activeParticle) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const vector = new THREE.Vector3(x, y, 0.5).unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const distance = (activeDepth - camera.position.z) / dir.z;
      const point = camera.position.clone().add(dir.multiplyScalar(distance));
      if (!activeParticle.pinned) {
        activeParticle.position.copy(point);
        activeParticle.previous.copy(point);
      }
    };

    const clearActive = () => {
      activeParticle = null;
      renderer.domElement.style.cursor = 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', clearActive);

    let frameId = 0;
    const tick = () => {
      frameId = requestAnimationFrame(tick);

      particles.forEach((particle, index) => {
        if (particle.pinned) {
          particle.position.copy(particle.original);
          particle.previous.copy(particle.original);
          return;
        }

        const velocity = new THREE.Vector3().subVectors(particle.position, particle.previous).multiplyScalar(0.985);
        particle.previous.copy(particle.position);
        particle.position.add(velocity).add(GRAVITY);
        particle.position.z = Math.sin((Date.now() * 0.0018) + index * 0.15) * 0.02;
      });

      for (let i = 0; i < 4; i += 1) {
        constraints.forEach(([a, b]) => satisfyConstraint(a, b));
      }

      particles.forEach((particle, index) => {
        positions.setXYZ(index, particle.position.x, particle.position.y, particle.position.z);
      });
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      shadow.rotation.z = mesh.rotation.z * 0.5;
      renderer.render(scene, camera);

      const captureCanvas = captureCanvasRef.current;
      if (captureCanvas) {
        const ctx = captureCanvas.getContext('2d');
        captureCanvas.width = renderer.domElement.width;
        captureCanvas.height = renderer.domElement.height;
        ctx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
        ctx.drawImage(renderer.domElement, 0, 0);
      }
    };
    tick();

    const handleResize = () => {
      const nextWidth = mount.clientWidth;
      const nextHeight = mount.clientHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', clearActive);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, [textureInput]);

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
    </div>
  );
}
