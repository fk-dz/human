import { SYSTEMS_DATA, ORGANS_DATA, QUIZ_QUESTIONS } from './organsData.js';
import { buildHumanAnatomyModel, sampleCatmullRom3D } from './anatomyBuilder.js';

/**
 * المحرك الثلاثي الأبعاد المتكامل لأطلس جسم الإنسان (FATYAK 3D Anatomy Engine)
 * يعمل بنسبة 100% على جميع المتصفحات والأجهزة بدون الحاجة لـ WebGL2 أو أي API خارجي
 */

// دوال تلوين وإضاءة ثلاثية الأبعاد
function hexToRgb(hex) {
  const clean = (hex || '#38bdf8').replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function shadeRgb(rgb, factor, boost = 0) {
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor + boost)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor + boost)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor + boost)));
  return `rgb(${r},${g},${b})`;
}

class FatyakAnatomyEngine {
  constructor() {
    this.organsMap = new Map();
    ORGANS_DATA.forEach((o) => this.organsMap.set(o.id, o));

    this.state = {
      activeSystem: 'all',
      selectedOrganId: 'heart',
      hoveredOrganId: null,
      isolatedOrganId: null,
      focusDimOthers: false,
      labelMode: 'all', // 'all' | 'direct' | 'hover' | 'none'
      visualMode: 'normal', // 'normal' | 'pure' | 'xray'
      explodeAmount: 0.0,
      shellOpacity: 0.22,
      boneOpacity: 0.28,
      clipHeight: 7.8,
      clipEnabled: false,
      autoRotate: false,
      heartRateBpm: 72,
      respRateRpm: 16,
      showParticles: true,
      searchQuery: '',
      quizActive: false,
      quizIndex: 0,
      quizScore: 0,
      quizAnswered: false,
      isSpeaking: false
    };

    // كاميرا ثلاثية الأبعاد حقيقية (Yaw, Pitch, Zoom, Target 3D)
    this.cam = {
      yaw: 0.0,
      pitch: 0.06,
      zoom: 1.05,
      targetX: 0.0,
      targetY: 3.35,
      targetZ: 0.0,
      animActive: false,
      startYaw: 0,
      endYaw: 0,
      startPitch: 0,
      endPitch: 0,
      startZoom: 1,
      endZoom: 1,
      startTX: 0,
      endTX: 0,
      startTY: 3.35,
      endTY: 3.35,
      startTZ: 0,
      endTZ: 0,
      progress: 0
    };

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.pointerDownX = 0;
    this.pointerDownY = 0;

    this.labelElements = new Map();
    this.projectedScreenHitNodes = [];
    this.ecgPoints = [];
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;

    // بناء النموذج التشريحي ثلاثي الأبعاد
    this.model = buildHumanAnatomyModel(ORGANS_DATA);
    this.initFlowParticles();

    // تهيئة اللوحة الثلاثية الأبعاد وواجهة المستخدم وكافة الأزرار
    this.initCanvasViewport();
    this.initUI();
    this.create3DLabels();
    this.selectOrgan('heart', false);

    // بدء حلقة الرسم الفوري (60 إطاراً/ثانية)
    this.animate();
  }

  initFlowParticles() {
    this.flowParticles = [];
    const addSet = (paths, color, count, speedBase) => {
      paths.forEach((pts) => {
        const sampled = sampleCatmullRom3D(pts, 40);
        for (let i = 0; i < count; i++) {
          this.flowParticles.push({
            sampled,
            t: (i / count + Math.random() * 0.2) % 1.0,
            speed: speedBase * (0.85 + Math.random() * 0.3),
            color
          });
        }
      });
    };
    addSet(this.model.flowPaths.arterial, '#FF2E4C', 7, 0.38);
    addSet(this.model.flowPaths.venous, '#38BDF8', 6, 0.32);
    addSet(this.model.flowPaths.neural, '#FDE047', 6, 0.52);
  }

  initCanvasViewport() {
    this.viewportEl = document.getElementById('viewport-container');
    this.viewportEl.innerHTML = '';

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'anatomy-3d-canvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'grab';
    this.viewportEl.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.onResize();
    window.addEventListener('resize', () => this.onResize());

    // تفاعلات السحب لتدوير الجسم ثلاثي الأبعاد 360 درجة والتكبير والنقر على الأعضاء
    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.pointerDownX = e.clientX;
      this.pointerDownY = e.clientY;
      this.cam.animActive = false;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.cam.yaw += dx * 0.0085;
        this.cam.pitch = Math.max(-1.1, Math.min(1.1, this.cam.pitch + dy * 0.0065));
        return;
      }
      this.handlePointerHover(e);
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.canvas.style.cursor = this.state.hoveredOrganId ? 'pointer' : 'grab';

      const moveDist = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
      if (moveDist < 7 && this.state.hoveredOrganId) {
        if (this.state.quizActive) {
          this.handleQuizAttempt(this.state.hoveredOrganId);
        } else {
          this.selectOrgan(this.state.hoveredOrganId, true);
        }
      }
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.91;
        this.cam.zoom = Math.max(0.55, Math.min(3.4, this.cam.zoom * factor));
      },
      { passive: false }
    );
  }

  onResize() {
    if (!this.viewportEl || !this.canvas) return;
    const rect = this.viewportEl.getBoundingClientRect();
    const w = Math.max(320, rect.width || window.innerWidth - 650);
    const h = Math.max(420, rect.height || window.innerHeight - 70);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.viewW = w;
    this.viewH = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  // تحويل إحداثيات العالم الثلاثي الأبعاد (X, Y, Z) إلى الشاشة مع المنظور والعمق
  project3D(wx, wy, wz) {
    const dx = wx - this.cam.targetX;
    const dy = wy - this.cam.targetY;
    const dz = wz - this.cam.targetZ;

    const cosY = Math.cos(this.cam.yaw);
    const sinY = Math.sin(this.cam.yaw);
    const x1 = dx * cosY + dz * sinY;
    const z1 = -dx * sinY + dz * cosY;

    const cosP = Math.cos(this.cam.pitch);
    const sinP = Math.sin(this.cam.pitch);
    const y2 = dy * cosP - z1 * sinP;
    const z2 = dy * sinP + z1 * cosP;

    const camDist = 9.2;
    const depth = camDist - z2;
    if (depth < 0.4) return null;

    const baseScale = Math.min(this.viewW, this.viewH) * 0.108 * this.cam.zoom;
    const perspective = (camDist / depth) * baseScale;

    return {
      sx: this.viewW * 0.5 + x1 * perspective,
      sy: this.viewH * 0.52 - y2 * perspective,
      scale: perspective,
      zCam: z2,
      depth
    };
  }

  isOrganVisible(organId) {
    const organ = this.organsMap.get(organId);
    if (!organ) return false;
    if (this.state.isolatedOrganId) {
      return organId === this.state.isolatedOrganId;
    }
    if (this.state.visualMode === 'pure' && organ.system === 'skeletal') {
      return false;
    }
    if (this.state.activeSystem !== 'all' && organ.system !== this.state.activeSystem) {
      return false;
    }
    if (organ.system === 'skeletal' && this.state.boneOpacity <= 0.02) {
      return false;
    }
    return true;
  }

  getOrganExplodeOffset(organId) {
    const organ = this.organsMap.get(organId);
    if (!organ || !organ.explodeVec || this.state.explodeAmount <= 0.001) {
      return { x: 0, y: 0, z: 0 };
    }
    const f = this.state.explodeAmount;
    return {
      x: organ.explodeVec[0] * f,
      y: organ.explodeVec[1] * f,
      z: organ.explodeVec[2] * f
    };
  }

  getOrganAnimTransform(animGroup, elapsed) {
    if (animGroup === 'heart') {
      const bps = this.state.heartRateBpm / 60;
      const phase = (elapsed * bps) % 1.0;
      const pulse =
        Math.exp(-Math.pow((phase - 0.18) * 12, 2)) * 0.095 +
        Math.exp(-Math.pow((phase - 0.38) * 14, 2)) * 0.045;
      return { scale: 1 + pulse, dy: 0 };
    }
    if (animGroup === 'lung_r' || animGroup === 'lung_l') {
      const breath = (Math.sin(elapsed * (this.state.respRateRpm / 60) * Math.PI * 2) + 1) * 0.5;
      return { scale: 1 + breath * 0.055, dy: 0 };
    }
    if (animGroup === 'diaphragm') {
      const breath = (Math.sin(elapsed * (this.state.respRateRpm / 60) * Math.PI * 2) + 1) * 0.5;
      return { scale: 1, dy: -breath * 0.07 };
    }
    return { scale: 1, dy: 0 };
  }

  // =========================================================================
  // رسم المشهد الثلاثي الأبعاد الكامل لجسم الإنسان والأعضاء الداخلية (60 FPS)
  // =========================================================================
  render3DScene(elapsed) {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.viewW, this.viewH);

    // 1. رسم هالة الاستوديو الطبي الخلفية وشبكة الإحداثيات الثلاثية الأبعاد
    const bgGrad = ctx.createRadialGradient(
      this.viewW * 0.5,
      this.viewH * 0.46,
      20,
      this.viewW * 0.5,
      this.viewH * 0.5,
      Math.max(this.viewW, this.viewH) * 0.65
    );
    if (this.state.visualMode === 'xray') {
      bgGrad.addColorStop(0, 'rgba(6, 45, 75, 0.55)');
      bgGrad.addColorStop(1, 'rgba(2, 8, 20, 0.95)');
    } else {
      bgGrad.addColorStop(0, 'rgba(14, 38, 72, 0.55)');
      bgGrad.addColorStop(1, 'rgba(3, 8, 20, 0.9)');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    // 2. رسم منصة الهولوغرام الأرضية الثلاثية الأبعاد بشعار المطور FATYAK
    this.draw3DFloorPedestal(ctx, elapsed);

    // 3. رسم الغلاف الخارجي الزجاجي الهولوغرامي لجسم الإنسان (الطبقة الخلفية)
    if (
      !this.state.isolatedOrganId &&
      this.state.visualMode !== 'pure' &&
      this.state.shellOpacity > 0.01
    ) {
      this.draw3DBodyShell(ctx, true);
    }

    // 4. تجميع وإسقاط وترتيب كافة الأعضاء الداخلية الثلاثية الأبعاد حسب العمق (Z-Buffer Sort)
    const renderQueue = [];
    this.projectedScreenHitNodes = [];

    for (let i = 0; i < this.model.primitives.length; i++) {
      const prim = this.model.primitives[i];
      if (!this.isOrganVisible(prim.organId)) continue;

      const exp = this.getOrganExplodeOffset(prim.organId);
      const anim = this.getOrganAnimTransform(prim.animGroup, elapsed);

      const wx = prim.x + exp.x;
      const wy = prim.y + exp.y + anim.dy;
      const wz = prim.z + exp.z;

      // فحص مستوى القص التشريحي (Cross-Section Slicer)
      if (this.state.clipEnabled && wy > this.state.clipHeight) continue;

      const proj = this.project3D(wx, wy, wz);
      if (!proj) continue;

      let nextProj = null;
      if (prim.type === 'tubeNode' && prim.nx !== undefined) {
        nextProj = this.project3D(prim.nx + exp.x, prim.ny + exp.y + anim.dy, prim.nz + exp.z);
      }

      renderQueue.push({
        prim,
        proj,
        nextProj,
        animScale: anim.scale
      });
    }

    // ترتيب من الأبعد إلى الأقرب للكاميرا (Painter's Z-Sort)
    renderQueue.sort((a, b) => a.proj.zCam - b.proj.zCam);

    // 5. رسم كل عنصر حجمي ثلاثي الأبعاد مع الإضاءة والظلال والتفاصيل التشريحية
    const isXray = this.state.visualMode === 'xray';

    for (let i = 0; i < renderQueue.length; i++) {
      const { prim, proj, nextProj, animScale } = renderQueue[i];
      const organId = prim.organId;
      const isSelected = this.state.selectedOrganId === organId;
      const isHovered = this.state.hoveredOrganId === organId;
      const isSkeletal = prim.system === 'skeletal';

      let alpha = isSkeletal ? this.state.boneOpacity : prim.alpha;
      if (
        this.state.focusDimOthers &&
        this.state.selectedOrganId &&
        !isSelected &&
        !isHovered &&
        !this.state.isolatedOrganId
      ) {
        alpha *= 0.22;
      }
      if (isXray && !isSkeletal) {
        alpha = isSelected ? 0.88 : 0.48;
      }
      if (isSelected) {
        alpha = Math.min(1.0, Math.max(alpha, 0.92));
      }

      const rxScreen = Math.max(2.2, prim.rx * proj.scale * animScale);
      const ryScreen = Math.max(2.2, prim.ry * proj.scale * animScale);
      const rAvg = (rxScreen + ryScreen) * 0.5;

      // حفظ العقد القابلة للنقر (مع استبعاد العظام الشفافة في الوضع العادي لسهولة اختيار الأعضاء الداخلية)
      if (!isSkeletal || this.state.activeSystem === 'skeletal' || this.state.boneOpacity > 0.6) {
        this.projectedScreenHitNodes.push({
          organId,
          sx: proj.sx,
          sy: proj.sy,
          r: Math.max(8, rAvg * 1.15),
          zCam: proj.zCam
        });
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      const rgb = hexToRgb(isXray ? '#00F2FE' : prim.color);
      const highlightBoost = isSelected ? 42 : isHovered ? 24 : 0;

      // إذا كان مقطع أنبوب متصل، نرسم وصلة أسطوانية ناعمة أولاً
      if (prim.type === 'tubeNode' && nextProj && !prim.isEndCap) {
        ctx.beginPath();
        ctx.moveTo(proj.sx, proj.sy);
        ctx.lineTo(nextProj.sx, nextProj.sy);
        ctx.strokeStyle = shadeRgb(rgb, 0.92, highlightBoost);
        ctx.lineWidth = rAvg * 1.95;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // تدرج إضاءة كروي ثلاثي الأبعاد (Phong Specular Volume Shading)
      const grad = ctx.createRadialGradient(
        proj.sx - rxScreen * 0.32,
        proj.sy - ryScreen * 0.32,
        rAvg * 0.08,
        proj.sx,
        proj.sy,
        Math.max(rxScreen, ryScreen)
      );

      if (isXray) {
        grad.addColorStop(0, isSelected ? '#FFFFFF' : '#E0F2FE');
        grad.addColorStop(0.45, isSelected ? '#00F2FE' : prim.color);
        grad.addColorStop(1, 'rgba(2, 12, 28, 0.15)');
      } else {
        grad.addColorStop(0, shadeRgb(rgb, 1.35, 55 + highlightBoost));
        grad.addColorStop(0.48, shadeRgb(rgb, 1.0, highlightBoost));
        grad.addColorStop(0.85, shadeRgb(rgb, 0.68, highlightBoost * 0.5));
        grad.addColorStop(1, shadeRgb(rgb, 0.42, 0));
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(proj.sx, proj.sy, rxScreen, ryScreen, 0, 0, Math.PI * 2);
      ctx.fill();

      // حافة مضيئة عند التحديد أو التمرير
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? '#00F2FE' : '#FFFFFF';
        ctx.lineWidth = isSelected ? 1.8 : 1.1;
        ctx.stroke();
      }

      // نقوش تشريحية دقيقة فوق العضو (تلافيف المخ، وريقات المخيخ، حلقات القصبة، القزحية)
      if (prim.pattern === 'gyri' && rAvg > 9) {
        ctx.strokeStyle = 'rgba(110, 28, 52, 0.42)';
        ctx.lineWidth = Math.max(1, rAvg * 0.09);
        ctx.beginPath();
        ctx.arc(proj.sx - rxScreen * 0.15, proj.sy, rxScreen * 0.48, 0.3, 2.5);
        ctx.moveTo(proj.sx + rxScreen * 0.1, proj.sy - ryScreen * 0.35);
        ctx.quadraticCurveTo(proj.sx, proj.sy, proj.sx + rxScreen * 0.35, proj.sy + ryScreen * 0.25);
        ctx.stroke();
      } else if (prim.pattern === 'folia' && rAvg > 7) {
        ctx.strokeStyle = 'rgba(88, 22, 42, 0.48)';
        ctx.lineWidth = 1.1;
        for (let fy = -0.5; fy <= 0.5; fy += 0.32) {
          ctx.beginPath();
          ctx.moveTo(proj.sx - rxScreen * 0.65, proj.sy + ryScreen * fy);
          ctx.lineTo(proj.sx + rxScreen * 0.65, proj.sy + ryScreen * fy);
          ctx.stroke();
        }
      } else if (prim.pattern === 'ring' && rAvg > 4) {
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.65)';
        ctx.lineWidth = Math.max(1.2, rAvg * 0.22);
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, rxScreen * 0.85, 0.15, Math.PI - 0.15);
        ctx.stroke();
      } else if (prim.pattern === 'eye' && rAvg > 4) {
        // قزحية وبؤبؤ العين
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, rAvg * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, rAvg * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 6. رسم الجسيمات المضيئة لتدفق الدم الشرياني والوريدي والسيالات العصبية
    if (this.state.showParticles && !this.state.isolatedOrganId) {
      this.drawFlowParticles(ctx);
    }

    // 7. رسم الغلاف الخارجي الزجاجي الهولوغرامي (الطبقة الأمامية الخفيفة)
    if (
      !this.state.isolatedOrganId &&
      this.state.visualMode !== 'pure' &&
      this.state.shellOpacity > 0.01
    ) {
      this.draw3DBodyShell(ctx, false);
    }

    // 8. رسم خط مؤشر المقطع التشريحي عند تفعيله
    if (this.state.clipEnabled) {
      const clipProj = this.project3D(0, this.state.clipHeight, 0);
      if (clipProj) {
        ctx.save();
        ctx.strokeStyle = '#00F2FE';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(this.viewW * 0.2, clipProj.sy);
        ctx.lineTo(this.viewW * 0.8, clipProj.sy);
        ctx.stroke();
        ctx.fillStyle = '#00F2FE';
        ctx.font = '700 12px "Segoe UI", "Cairo", sans-serif';
        ctx.fillText('🔪 مستوى المقطع العرضي التشريحي', this.viewW * 0.2 + 8, clipProj.sy - 6);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  draw3DBodyShell(ctx, backHalf) {
    ctx.save();
    const opacity = this.state.shellOpacity * (backHalf ? 0.55 : 0.85);
    ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
    ctx.lineWidth = backHalf ? 1.0 : 1.4;

    this.model.shellSegments.forEach((seg) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < seg.length; i++) {
        const pt = seg[i];
        if (this.state.clipEnabled && pt.y > this.state.clipHeight) continue;
        const proj = this.project3D(pt.x, pt.y, pt.z);
        if (!proj) continue;
        if ((backHalf && proj.zCam <= 0) || (!backHalf && proj.zCam > 0)) {
          if (!started) {
            ctx.moveTo(proj.sx, proj.sy);
            started = true;
          } else {
            ctx.lineTo(proj.sx, proj.sy);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    });

    // رسم конتور الجسم والذراعين والساقين الهولوغرامي
    const SilhouettePaths = [
      // الجانب الأيمن للجسم والذراع اليمنى
      [
        [-0.45, 5.8, 0],
        [-0.42, 5.1, 0],
        [-1.32, 4.82, 0],
        [-1.68, 3.6, 0.04],
        [-1.92, 1.85, 0.14],
        [-1.52, 1.85, 0.12],
        [-1.32, 3.4, 0.04],
        [-1.08, 4.2, 0],
        [-0.88, 2.25, 0],
        [-1.02, 0.8, 0],
        [-0.82, -1.2, 0],
        [-0.74, -2.95, 0],
        [-0.32, -2.95, 0],
        [-0.3, -1.1, 0],
        [0.0, 0.25, 0]
      ],
      // الجانب الأيسر للجسم والذراع اليسرى
      [
        [0.45, 5.8, 0],
        [0.42, 5.1, 0],
        [1.32, 4.82, 0],
        [1.68, 3.6, 0.04],
        [1.92, 1.85, 0.14],
        [1.52, 1.85, 0.12],
        [1.32, 3.4, 0.04],
        [1.08, 4.2, 0],
        [0.88, 2.25, 0],
        [1.02, 0.8, 0],
        [0.82, -1.2, 0],
        [0.74, -2.95, 0],
        [0.32, -2.95, 0],
        [0.3, -1.1, 0],
        [0.0, 0.25, 0]
      ]
    ];

    if (!backHalf) {
      ctx.strokeStyle = `rgba(0, 242, 254, ${Math.min(0.65, this.state.shellOpacity * 1.8)})`;
      ctx.lineWidth = 2.0;
      SilhouettePaths.forEach((path) => {
        const sampled = sampleCatmullRom3D(path, 45);
        ctx.beginPath();
        sampled.forEach((pt, idx) => {
          const p = this.project3D(pt.x, pt.y, pt.z);
          if (!p) return;
          if (idx === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        });
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  draw3DFloorPedestal(ctx, elapsed) {
    const radii = [1.2, 2.0, 2.7];
    const baseY = -3.05;

    ctx.save();
    radii.forEach((r, idx) => {
      ctx.beginPath();
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2 + elapsed * (idx % 2 === 0 ? 0.15 : -0.1);
        const p = this.project3D(Math.cos(a) * r, baseY, Math.sin(a) * r);
        if (!p) continue;
        if (i === 0) ctx.moveTo(p.sx, p.sy);
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.strokeStyle =
        idx === 1 ? 'rgba(16, 185, 129, 0.42)' : 'rgba(0, 242, 254, 0.38)';
      ctx.lineWidth = idx === 2 ? 2.2 : 1.3;
      ctx.stroke();
    });

    const frontCenter = this.project3D(0, baseY, 2.55);
    if (frontCenter) {
      ctx.fillStyle = '#00F2FE';
      ctx.font = '800 12px "Segoe UI", "Cairo", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FATYAK • 3D HUMAN ANATOMY ENGINE', frontCenter.sx, frontCenter.sy + 16);
    }
    ctx.restore();
  }

  drawFlowParticles(ctx) {
    ctx.save();
    for (let i = 0; i < this.flowParticles.length; i++) {
      const fp = this.flowParticles[i];
      const idx = Math.min(fp.sampled.length - 1, Math.floor(fp.t * fp.sampled.length));
      const pt = fp.sampled[idx];
      if (!pt || (this.state.clipEnabled && pt.y > this.state.clipHeight)) continue;

      const proj = this.project3D(pt.x, pt.y, pt.z);
      if (!proj) continue;

      const r = Math.max(2.2, 0.045 * proj.scale);
      ctx.fillStyle = fp.color;
      ctx.shadowColor = fp.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(proj.sx, proj.sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  // عرض معاينة ثلاثية الأبعاد مكبرة للعضو المحدد داخل البطاقة الطبية اليسرى!
  // =========================================================================
  renderOrganCloseupPreview(elapsed) {
    const canvas = document.getElementById('organ-closeup-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // خلفية شبكية طبية للمعاينة المكبرة
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.6);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
    grad.addColorStop(1, 'rgba(4, 10, 24, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const organId = this.state.selectedOrganId || 'heart';
    const organ = this.organsMap.get(organId);
    const organPrims = this.model.primitives.filter((p) => p.organId === organId);
    if (organPrims.length === 0) return;

    // حساب مركز وحجم العضو لتوسيطه وتكبيره تلقائياً
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    organPrims.forEach((p) => {
      minX = Math.min(minX, p.x - p.rx);
      maxX = Math.max(maxX, p.x + p.rx);
      minY = Math.min(minY, p.y - p.ry);
      maxY = Math.max(maxY, p.y + p.ry);
      minZ = Math.min(minZ, p.z - p.rz);
      maxZ = Math.max(maxZ, p.z + p.rz);
    });

    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const span = Math.max(0.45, maxX - minX, maxY - minY, maxZ - minZ);
    const scale = (Math.min(w, h) * 0.64) / span;

    const rotY = elapsed * 0.75;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    const anim = this.getOrganAnimTransform(
      organId === 'heart' ? 'heart' : organId.includes('lung') ? 'lung_r' : null,
      elapsed
    );

    const items = organPrims.map((p) => {
      const dx = (p.x - cx) * anim.scale;
      const dy = (p.y - cy) * anim.scale;
      const dz = (p.z - cz) * anim.scale;
      const rx = dx * cosY + dz * sinY;
      const rz = -dx * sinY + dz * cosY;
      return {
        p,
        sx: w * 0.5 + rx * scale,
        sy: h * 0.52 - dy * scale,
        rz,
        rScreenX: Math.max(3, p.rx * scale * anim.scale),
        rScreenY: Math.max(3, p.ry * scale * anim.scale)
      };
    });

    items.sort((a, b) => a.rz - b.rz);

    items.forEach(({ p, sx, sy, rScreenX, rScreenY }) => {
      const rgb = hexToRgb(p.color);
      const rMax = Math.max(rScreenX, rScreenY);
      const g = ctx.createRadialGradient(
        sx - rScreenX * 0.3,
        sy - rScreenY * 0.3,
        rMax * 0.08,
        sx,
        sy,
        rMax
      );
      g.addColorStop(0, shadeRgb(rgb, 1.4, 60));
      g.addColorStop(0.55, shadeRgb(rgb, 1.05, 10));
      g.addColorStop(1, shadeRgb(rgb, 0.45, 0));

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rScreenX, rScreenY, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // شارة اسم العضو داخل المعاينة المكبرة
    if (organ) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
      ctx.fillRect(8, h - 28, w - 16, 22);
      ctx.fillStyle = '#00F2FE';
      ctx.font = '800 11px "Segoe UI", "Cairo", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`🔍 معاينة ثلاثية الأبعاد مكبرة: ${organ.shortAr}`, w - 14, h - 13);
      ctx.fillStyle = '#FDE047';
      ctx.textAlign = 'left';
      ctx.fillText('FATYAK 3D', 14, h - 13);
    }
  }

  // =========================================================================
  // التسميات العربية ثلاثية الأبعاد مع خطوط الإشارة الشعاعية ومنع التراكب
  // =========================================================================
  create3DLabels() {
    this.labelsLayer = document.getElementById('labels-3d-layer');
    this.svgLinesLayer = document.getElementById('labels-svg-lines');
    this.labelsLayer.innerHTML = '';
    this.svgLinesLayer.innerHTML = '';

    ORGANS_DATA.forEach((organ) => {
      const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      lineEl.setAttribute('fill', 'none');
      lineEl.setAttribute('stroke', organ.badgeColor || '#06B6D4');
      lineEl.setAttribute('stroke-width', '1.6');
      lineEl.setAttribute('stroke-opacity', '0.78');
      this.svgLinesLayer.appendChild(lineEl);

      const dotEl = document.createElement('div');
      dotEl.className = 'organ-anchor-dot';
      dotEl.style.setProperty('--organ-color', organ.badgeColor || '#06B6D4');
      this.labelsLayer.appendChild(dotEl);

      const tagEl = document.createElement('button');
      tagEl.type = 'button';
      tagEl.className = 'organ-3d-tag';
      tagEl.dataset.organId = organ.id;
      tagEl.style.setProperty('--organ-color', organ.badgeColor || '#06B6D4');
      tagEl.innerHTML = `
        <span class="tag-dot" style="background:${organ.color}"></span>
        <span class="tag-name-ar">${organ.shortAr}</span>
      `;

      tagEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.state.quizActive) {
          this.handleQuizAttempt(organ.id);
        } else {
          this.selectOrgan(organ.id, true);
        }
      });

      tagEl.addEventListener('mouseenter', () => this.setHoveredOrgan(organ.id));
      tagEl.addEventListener('mouseleave', () => this.setHoveredOrgan(null));

      this.labelsLayer.appendChild(tagEl);
      this.labelElements.set(organ.id, { tagEl, lineEl, dotEl, organ });
    });
  }

  update3DLabels() {
    const width = this.viewW;
    const height = this.viewH;
    if (!width || !height) return;

    this.svgLinesLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const mode = this.state.labelMode;
    if (mode === 'none') {
      this.labelElements.forEach(({ tagEl, lineEl, dotEl }) => {
        tagEl.style.display = 'none';
        lineEl.style.display = 'none';
        dotEl.style.display = 'none';
      });
      return;
    }

    const leftColumn = [];
    const rightColumn = [];
    const directItems = [];

    this.labelElements.forEach((item, organId) => {
      const { tagEl, lineEl, dotEl, organ } = item;
      const visible = this.isOrganVisible(organId);
      const isSelectedOrHovered =
        this.state.selectedOrganId === organId || this.state.hoveredOrganId === organId;

      if (!visible || (mode === 'hover' && !isSelectedOrHovered)) {
        tagEl.style.display = 'none';
        lineEl.style.display = 'none';
        dotEl.style.display = 'none';
        return;
      }

      const exp = this.getOrganExplodeOffset(organId);
      const wx = organ.labelPos[0] + exp.x;
      const wy = organ.labelPos[1] + exp.y;
      const wz = organ.labelPos[2] + exp.z;

      if (this.state.clipEnabled && wy > this.state.clipHeight) {
        tagEl.style.display = 'none';
        lineEl.style.display = 'none';
        dotEl.style.display = 'none';
        return;
      }

      const projAnchor = this.project3D(wx, wy, wz);
      if (!projAnchor) {
        tagEl.style.display = 'none';
        lineEl.style.display = 'none';
        dotEl.style.display = 'none';
        return;
      }

      const ax = projAnchor.sx;
      const ay = projAnchor.sy;

      if (mode === 'direct') {
        directItems.push({ item, ax, ay, isSelectedOrHovered });
      } else {
        const projCallout = this.project3D(
          wx + organ.labelOffset[0],
          wy + organ.labelOffset[1],
          wz + organ.labelOffset[2]
        );
        const cx = projCallout ? projCallout.sx : ax;
        const cy = projCallout ? projCallout.sy : ay;
        const isRightSide = cx >= width * 0.5;
        const entry = { item, ax, ay, cx, cy, isSelectedOrHovered };
        if (isRightSide) rightColumn.push(entry);
        else leftColumn.push(entry);
      }
    });

    if (mode === 'direct') {
      directItems.forEach(({ item, ax, ay, isSelectedOrHovered }) => {
        const { tagEl, lineEl, dotEl, organ } = item;
        lineEl.style.display = 'none';
        dotEl.style.display = 'none';
        tagEl.style.display = 'inline-flex';
        tagEl.style.transform = `translate(-50%, -50%) translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px)`;
        tagEl.classList.toggle('is-active', this.state.selectedOrganId === organ.id);
        tagEl.classList.toggle('is-hovered', this.state.hoveredOrganId === organ.id);
        tagEl.style.zIndex = isSelectedOrHovered ? '35' : '15';
      });
      return;
    }

    const solveColumn = (list, isRightScreen) => {
      list.sort((a, b) => a.cy - b.cy);
      const minGap = 29;
      const topBound = 68;
      const bottomBound = height - 86;

      for (let i = 1; i < list.length; i++) {
        if (list[i].cy - list[i - 1].cy < minGap) {
          list[i].cy = list[i - 1].cy + minGap;
        }
      }
      if (list.length > 0 && list[list.length - 1].cy > bottomBound) {
        list[list.length - 1].cy = bottomBound;
        for (let i = list.length - 2; i >= 0; i--) {
          if (list[i + 1].cy - list[i].cy < minGap) {
            list[i].cy = Math.max(topBound, list[i + 1].cy - minGap);
          }
        }
      }

      list.forEach((entry) => {
        const { item, ax, ay, cy, isSelectedOrHovered } = entry;
        const { tagEl, lineEl, dotEl, organ } = item;

        const spread = Math.min(200, Math.max(105, width * 0.21));
        const targetX = isRightScreen
          ? Math.min(width - 130, Math.max(ax + 45, width * 0.5 + spread))
          : Math.max(130, Math.min(ax - 45, width * 0.5 - spread));
        const elbowX = isRightScreen ? targetX - 18 : targetX + 18;

        dotEl.style.display = 'block';
        dotEl.style.transform = `translate(-50%, -50%) translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px)`;
        dotEl.classList.toggle('is-active', isSelectedOrHovered);

        tagEl.style.display = 'inline-flex';
        tagEl.style.transform = isRightScreen
          ? `translate(0%, -50%) translate(${targetX.toFixed(1)}px, ${cy.toFixed(1)}px)`
          : `translate(-100%, -50%) translate(${targetX.toFixed(1)}px, ${cy.toFixed(1)}px)`;
        tagEl.classList.toggle('is-active', this.state.selectedOrganId === organ.id);
        tagEl.classList.toggle('is-hovered', this.state.hoveredOrganId === organ.id);
        tagEl.style.zIndex = isSelectedOrHovered ? '40' : '18';

        lineEl.style.display = 'block';
        lineEl.setAttribute(
          'points',
          `${ax.toFixed(1)},${ay.toFixed(1)} ${elbowX.toFixed(1)},${cy.toFixed(1)} ${targetX.toFixed(1)},${cy.toFixed(1)}`
        );
        lineEl.setAttribute('stroke-width', isSelectedOrHovered ? '2.6' : '1.4');
        lineEl.setAttribute('stroke-opacity', isSelectedOrHovered ? '1.0' : '0.65');
      });
    };

    solveColumn(leftColumn, false);
    solveColumn(rightColumn, true);
  }

  handlePointerHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hitOrganId = null;
    // فحص العناصر من الأقرب للكاميرا إلى الأبعد
    for (let i = this.projectedScreenHitNodes.length - 1; i >= 0; i--) {
      const node = this.projectedScreenHitNodes[i];
      if (Math.hypot(mx - node.sx, my - node.sy) <= node.r) {
        hitOrganId = node.organId;
        break;
      }
    }

    this.setHoveredOrgan(hitOrganId);
    this.canvas.style.cursor = hitOrganId ? 'pointer' : 'grab';
  }

  setHoveredOrgan(organId) {
    if (this.state.hoveredOrganId === organId) return;
    this.state.hoveredOrganId = organId;

    const hoverBanner = document.getElementById('viewport-hover-pill');
    if (hoverBanner) {
      if (organId) {
        const o = this.organsMap.get(organId);
        hoverBanner.innerHTML = `<span class="dot" style="background:${o.color}"></span> <strong>${o.nameAr}</strong> <span class="en">(${o.nameEn})</span> — انقر للتفاصيل والتركيز`;
        hoverBanner.classList.add('visible');
      } else {
        hoverBanner.classList.remove('visible');
      }
    }
  }

  selectOrgan(organId, flyCamera = true) {
    const organ = this.organsMap.get(organId);
    if (!organ) return;

    this.state.selectedOrganId = organId;

    if (!this.isOrganVisible(organId)) {
      this.state.isolatedOrganId = null;
      this.setSystemFilter('all');
    }

    this.renderOrganInspector(organ);
    this.highlightDirectoryItem(organId);

    if (flyCamera) {
      const exp = this.getOrganExplodeOffset(organId);
      const tx = (organ.cameraTarget ? organ.cameraTarget[0] : organ.labelPos[0]) + exp.x;
      const ty = (organ.cameraTarget ? organ.cameraTarget[1] : organ.labelPos[1]) + exp.y;
      const tz = (organ.cameraTarget ? organ.cameraTarget[2] : organ.labelPos[2]) + exp.z;

      // تحديد زاوية الكاميرا المثالية للعضو (الأعضاء الخلفية كالكليتين والمخيخ والحبل الشوكي تلتف الكاميرا نحوها)
      let targetYaw = 0.0;
      if (
        organ.id === 'cerebellum' ||
        organ.id === 'spinal_cord' ||
        organ.id === 'kidneys' ||
        organ.id === 'adrenals'
      ) {
        targetYaw = Math.PI * 0.85;
      } else if (organ.labelPos[0] < -0.35) {
        targetYaw = -0.25;
      } else if (organ.labelPos[0] > 0.35) {
        targetYaw = 0.25;
      }

      this.animateCameraTo(targetYaw, 0.08, 1.65, tx * 0.5, ty, tz * 0.5);
    }

    if (this.state.isSpeaking) {
      this.speakSelectedOrgan();
    }
  }

  animateCameraTo(yaw, pitch, zoom, tx, ty, tz) {
    this.cam.startYaw = this.cam.yaw;
    this.cam.endYaw = yaw;
    this.cam.startPitch = this.cam.pitch;
    this.cam.endPitch = pitch;
    this.cam.startZoom = this.cam.zoom;
    this.cam.endZoom = zoom;
    this.cam.startTX = this.cam.targetX;
    this.cam.endTX = tx;
    this.cam.startTY = this.cam.targetY;
    this.cam.endTY = ty;
    this.cam.startTZ = this.cam.targetZ;
    this.cam.endTZ = tz;
    this.cam.progress = 0;
    this.cam.animActive = true;
  }

  setCameraPreset(preset) {
    this.state.isolatedOrganId = null;
    document.querySelectorAll('[data-cam-preset]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.camPreset === preset);
    });

    switch (preset) {
      case 'front':
        this.animateCameraTo(0.0, 0.05, 1.05, 0.0, 3.35, 0.0);
        break;
      case 'back':
        this.animateCameraTo(Math.PI, 0.05, 1.08, 0.0, 3.35, 0.0);
        break;
      case 'right':
        this.animateCameraTo(-Math.PI * 0.5, 0.05, 1.12, 0.0, 3.35, 0.0);
        break;
      case 'left':
        this.animateCameraTo(Math.PI * 0.5, 0.05, 1.12, 0.0, 3.35, 0.0);
        break;
      case 'head_thorax':
        this.animateCameraTo(0.0, 0.08, 1.75, 0.0, 5.15, 0.0);
        break;
      case 'abdomen':
        this.animateCameraTo(0.0, 0.06, 1.85, 0.0, 2.05, 0.0);
        break;
    }
  }

  setSystemFilter(systemId) {
    this.state.activeSystem = systemId;
    this.state.isolatedOrganId = null;

    document.querySelectorAll('.system-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.system === systemId);
    });

    this.renderOrganDirectory();
  }

  toggleIsolateOrgan(organId) {
    if (this.state.isolatedOrganId === organId) {
      this.state.isolatedOrganId = null;
      this.setCameraPreset('front');
    } else {
      this.state.isolatedOrganId = organId;
    }
    const organ = this.organsMap.get(organId);
    if (organ) this.renderOrganInspector(organ);
  }

  // =========================================================================
  // تهيئة وربط جميع أزرار وأدوات الواجهة العربية بنسبة 100%
  // =========================================================================
  initUI() {
    // 1. أزرار تصفية الأجهزة الحيوية
    const sysBar = document.getElementById('systems-filter-bar');
    if (sysBar) {
      sysBar.innerHTML = SYSTEMS_DATA.map(
        (sys) => `
        <button type="button" class="system-tab-btn ${sys.id === 'all' ? 'active' : ''}" data-system="${sys.id}" style="--sys-color:${sys.color}">
          <span class="sys-icon">${sys.icon}</span>
          <span class="sys-label">${sys.shortAr}</span>
        </button>
      `
      ).join('');

      sysBar.querySelectorAll('.system-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => this.setSystemFilter(btn.dataset.system));
      });
    }

    // 2. البحث الفوري عن الأعضاء
    const searchInput = document.getElementById('organ-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.trim();
        this.renderOrganDirectory();
      });
    }

    // 3. أشرطة التمرير (تفكيك الأعضاء، شفافية الجسم، شفافية العظام، المقطع العرضي، ونبض القلب)
    const explodeSlider = document.getElementById('slider-explode');
    const explodeVal = document.getElementById('val-explode');
    if (explodeSlider) {
      explodeSlider.addEventListener('input', (e) => {
        this.state.explodeAmount = parseFloat(e.target.value) / 100;
        if (explodeVal) explodeVal.textContent = `${e.target.value}%`;
      });
    }

    const shellSlider = document.getElementById('slider-shell-opacity');
    const shellVal = document.getElementById('val-shell-opacity');
    if (shellSlider) {
      shellSlider.addEventListener('input', (e) => {
        this.state.shellOpacity = parseFloat(e.target.value) / 100;
        if (shellVal) shellVal.textContent = `${e.target.value}%`;
      });
    }

    const boneSlider = document.getElementById('slider-bone-opacity');
    const boneVal = document.getElementById('val-bone-opacity');
    if (boneSlider) {
      boneSlider.addEventListener('input', (e) => {
        this.state.boneOpacity = parseFloat(e.target.value) / 100;
        if (boneVal) boneVal.textContent = `${e.target.value}%`;
      });
    }

    const clipToggle = document.getElementById('toggle-clip-plane');
    const clipSlider = document.getElementById('slider-clip-height');
    if (clipToggle && clipSlider) {
      clipToggle.addEventListener('change', (e) => {
        this.state.clipEnabled = e.target.checked;
        clipSlider.disabled = !this.state.clipEnabled;
      });
      clipSlider.addEventListener('input', (e) => {
        this.state.clipHeight = parseFloat(e.target.value);
      });
    }

    const bpmSlider = document.getElementById('slider-heart-bpm');
    const bpmVal = document.getElementById('val-heart-bpm');
    if (bpmSlider) {
      bpmSlider.addEventListener('input', (e) => {
        this.state.heartRateBpm = parseInt(e.target.value, 10);
        if (bpmVal) bpmVal.textContent = `${this.state.heartRateBpm} نبضة/د`;
      });
    }

    // 4. أزرار نمط الرؤية (الوضع التشريحي الواضح | الأعضاء الداخلية الصافية | الأشعة السينية X-Ray)
    document.querySelectorAll('[data-visual-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.visualMode = btn.dataset.visualMode;
        document.querySelectorAll('[data-visual-mode]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
      });
    });

    // 5. أزرار التسميات العربية (كل الأعضاء مع المؤشرات | مباشر فوق العضو | عند التحديد فقط | إخفاء)
    document.querySelectorAll('[data-label-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.labelMode = btn.dataset.labelMode;
        document.querySelectorAll('[data-label-mode]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
      });
    });

    // 6. أزرار زوايا الكاميرا السريعة في الأسفل
    document.querySelectorAll('[data-cam-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setCameraPreset(btn.dataset.camPreset);
      });
    });

    // 7. أزرار التحكم السفلي والعلوي الإضافية
    const autoRotBtn = document.getElementById('btn-toggle-autorotate');
    if (autoRotBtn) {
      autoRotBtn.addEventListener('click', () => {
        this.state.autoRotate = !this.state.autoRotate;
        autoRotBtn.classList.toggle('active', this.state.autoRotate);
      });
    }

    const dimBtn = document.getElementById('btn-toggle-dim');
    if (dimBtn) {
      dimBtn.addEventListener('click', () => {
        this.state.focusDimOthers = !this.state.focusDimOthers;
        dimBtn.classList.toggle('active', this.state.focusDimOthers);
      });
    }

    const partBtn = document.getElementById('btn-toggle-particles');
    if (partBtn) {
      partBtn.addEventListener('click', () => {
        this.state.showParticles = !this.state.showParticles;
        partBtn.classList.toggle('active', this.state.showParticles);
      });
    }

    const capBtn = document.getElementById('btn-capture-screenshot');
    if (capBtn) {
      capBtn.addEventListener('click', () => this.exportHighResScreenshot());
    }

    const quizBtn = document.getElementById('btn-start-quiz');
    if (quizBtn) {
      quizBtn.addEventListener('click', () => this.toggleQuizMode());
    }

    const modalOpenBtn = document.getElementById('btn-fatyak-modal');
    const modalCloseBtn = document.getElementById('btn-close-fatyak-modal');
    const modalEl = document.getElementById('fatyak-developer-modal');
    if (modalOpenBtn && modalEl) {
      modalOpenBtn.addEventListener('click', () => modalEl.classList.add('open'));
    }
    if (modalCloseBtn && modalEl) {
      modalCloseBtn.addEventListener('click', () => modalEl.classList.remove('open'));
    }

    this.renderOrganDirectory();
  }

  renderOrganDirectory() {
    const listEl = document.getElementById('organs-directory-list');
    if (!listEl) return;
    const q = this.state.searchQuery.toLowerCase();

    const filtered = ORGANS_DATA.filter((o) => {
      const matchSys = this.state.activeSystem === 'all' || o.system === this.state.activeSystem;
      const matchQuery =
        !q ||
        o.nameAr.includes(q) ||
        o.shortAr.includes(q) ||
        o.nameEn.toLowerCase().includes(q) ||
        o.systemAr.includes(q);
      return matchSys && matchQuery;
    });

    const badge = document.getElementById('organs-count-badge');
    if (badge) badge.textContent = `${filtered.length} عضو`;

    listEl.innerHTML = filtered
      .map(
        (o) => `
      <div class="organ-dir-item ${this.state.selectedOrganId === o.id ? 'selected' : ''}" data-organ-id="${o.id}">
        <span class="organ-color-swatch" style="background:${o.color}"></span>
        <div class="organ-dir-text">
          <div class="organ-dir-name-ar">${o.nameAr}</div>
          <div class="organ-dir-meta">
            <span>${o.systemAr}</span> • <span dir="ltr">${o.nameEn}</span>
          </div>
        </div>
        <span class="organ-dir-arrow">←</span>
      </div>
    `
      )
      .join('');

    listEl.querySelectorAll('.organ-dir-item').forEach((el) => {
      el.addEventListener('click', () => this.selectOrgan(el.dataset.organId, true));
      el.addEventListener('mouseenter', () => this.setHoveredOrgan(el.dataset.organId));
      el.addEventListener('mouseleave', () => this.setHoveredOrgan(null));
    });
  }

  highlightDirectoryItem(organId) {
    document.querySelectorAll('.organ-dir-item').forEach((el) => {
      const isMatch = el.dataset.organId === organId;
      el.classList.toggle('selected', isMatch);
      if (isMatch) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  renderOrganInspector(organ) {
    const container = document.getElementById('organ-inspector-content');
    if (!container) return;
    const isIsolated = this.state.isolatedOrganId === organ.id;

    container.innerHTML = `
      <div class="inspector-header" style="--organ-accent:${organ.badgeColor}">
        <div class="inspector-sys-badge">
          <span class="dot" style="background:${organ.color}"></span>
          ${organ.systemAr}
        </div>
        <h2 class="inspector-title-ar">${organ.nameAr}</h2>
        <div class="inspector-title-en" dir="ltr">${organ.nameEn}</div>
      </div>

      <!-- معاينة ثلاثية الأبعاد حية ومكبرة للعضو المحدد (مثل القلب النابض) -->
      <div class="organ-closeup-box">
        <canvas id="organ-closeup-canvas" width="315" height="155"></canvas>
      </div>

      <div class="inspector-actions-row">
        <button type="button" id="btn-speak-organ" class="inspector-action-btn primary">
          <span>🔊</span> نطق الشرح بالعربية
        </button>
        <button type="button" id="btn-isolate-organ" class="inspector-action-btn ${isIsolated ? 'active' : ''}">
          <span>🔍</span> ${isIsolated ? 'إلغاء العزل (عرض الكل)' : 'عزل هذا العضو فقط'}
        </button>
      </div>

      <div class="inspector-specs-grid">
        <div class="spec-card">
          <div class="spec-label">⚖️ الوزن والأبعاد الحيوية</div>
          <div class="spec-value">${organ.weight}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">🩸 التروية الدموية والأعصاب</div>
          <div class="spec-value">${organ.bloodSupplyAr}</div>
        </div>
      </div>

      <div class="inspector-section">
        <h3 class="sec-heading">📍 الموقع التشريحي في الجسم</h3>
        <p class="sec-body">${organ.locationAr}</p>
      </div>

      <div class="inspector-section">
        <h3 class="sec-heading">⚡ الوظيفة الحيوية والفسيولوجية</h3>
        <p class="sec-body">${organ.functionAr}</p>
      </div>

      <div class="inspector-section">
        <h3 class="sec-heading">🔬 الأجزاء والتراكيب التشريحية الفرعية</h3>
        <div class="subparts-chips">
          ${organ.subPartsAr.map((part) => `<span class="subpart-chip">${part}</span>`).join('')}
        </div>
      </div>

      <div class="inspector-fact-box">
        <div class="fact-header">💡 حقيقة طبية مذهلة • FATYAK ATLAS</div>
        <p class="fact-text">${organ.clinicalFactAr}</p>
      </div>
    `;

    const speakBtn = document.getElementById('btn-speak-organ');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => this.speakSelectedOrgan());
    }

    const isoBtn = document.getElementById('btn-isolate-organ');
    if (isoBtn) {
      isoBtn.addEventListener('click', () => this.toggleIsolateOrgan(organ.id));
    }
  }

  speakSelectedOrgan() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const organ = this.organsMap.get(this.state.selectedOrganId);
    if (!organ) return;

    const speakBtn = document.getElementById('btn-speak-organ');
    if (this.state.isSpeaking) {
      this.state.isSpeaking = false;
      if (speakBtn) speakBtn.innerHTML = '<span>🔊</span> نطق الشرح بالعربية';
      return;
    }

    const text = `${organ.nameAr}. ينتمي إلى ${organ.systemAr}. الموقع التشريحي: ${organ.locationAr} الوظيفة الحيوية: ${organ.functionAr}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ar-SA';
    utter.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ar'));
    if (arVoice) utter.voice = arVoice;

    utter.onstart = () => {
      this.state.isSpeaking = true;
      if (speakBtn) speakBtn.innerHTML = '<span>⏹️</span> إيقاف القراءة الصوتية';
    };
    utter.onend = () => {
      this.state.isSpeaking = false;
      if (speakBtn) speakBtn.innerHTML = '<span>🔊</span> نطق الشرح بالعربية';
    };

    window.speechSynthesis.speak(utter);
  }

  toggleQuizMode() {
    this.state.quizActive = !this.state.quizActive;
    const banner = document.getElementById('quiz-overlay-banner');
    const btn = document.getElementById('btn-start-quiz');

    if (this.state.quizActive) {
      this.state.quizIndex = 0;
      this.state.quizScore = 0;
      this.state.isolatedOrganId = null;
      this.setSystemFilter('all');
      if (banner) banner.classList.add('active');
      if (btn) btn.classList.add('active');
      this.renderQuizQuestion();
    } else {
      if (banner) banner.classList.remove('active');
      if (btn) btn.classList.remove('active');
    }
  }

  renderQuizQuestion() {
    const q = QUIZ_QUESTIONS[this.state.quizIndex];
    const banner = document.getElementById('quiz-overlay-banner');
    if (!banner) return;
    this.state.quizAnswered = false;

    banner.innerHTML = `
      <div class="quiz-top-row">
        <span class="quiz-badge">🎯 اختبار FATYAK التشريحي (${this.state.quizIndex + 1} / ${QUIZ_QUESTIONS.length})</span>
        <span class="quiz-score">النتيجة: <strong>${this.state.quizScore}</strong></span>
        <button type="button" id="btn-exit-quiz" class="quiz-close-btn">إغلاق الاختبار ✕</button>
      </div>
      <div class="quiz-question-text">${q.questionAr}</div>
      <div class="quiz-hint-text">💡 تلميح: ${q.hintAr}</div>
      <div id="quiz-feedback-msg" class="quiz-feedback"></div>
    `;

    const exitBtn = document.getElementById('btn-exit-quiz');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => this.toggleQuizMode());
    }
  }

  handleQuizAttempt(clickedOrganId) {
    if (this.state.quizAnswered) return;
    const q = QUIZ_QUESTIONS[this.state.quizIndex];
    const feedbackEl = document.getElementById('quiz-feedback-msg');
    const clickedOrgan = this.organsMap.get(clickedOrganId);

    if (clickedOrganId === q.targetId) {
      this.state.quizScore += 10;
      this.state.quizAnswered = true;
      this.selectOrgan(clickedOrganId, true);
      if (feedbackEl) {
        feedbackEl.className = 'quiz-feedback success';
        feedbackEl.innerHTML = `✅ إجابة صحيحة ممتازة! هذا هو <strong>${clickedOrgan.nameAr}</strong>.`;
      }
      setTimeout(() => {
        if (!this.state.quizActive) return;
        this.state.quizIndex = (this.state.quizIndex + 1) % QUIZ_QUESTIONS.length;
        this.renderQuizQuestion();
      }, 2000);
    } else if (feedbackEl) {
      feedbackEl.className = 'quiz-feedback error';
      feedbackEl.innerHTML = `❌ اخترت (${clickedOrgan ? clickedOrgan.shortAr : ''}) — حاول مرة أخرى وابحث عن العضو المطلوب!`;
    }
  }

  exportHighResScreenshot() {
    if (!this.canvas) return;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = this.canvas.width;
    outCanvas.height = this.canvas.height;
    const ctx = outCanvas.getContext('2d');

    ctx.fillStyle = '#040914';
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    ctx.drawImage(this.canvas, 0, 0);

    const organ = this.organsMap.get(this.state.selectedOrganId);
    ctx.fillStyle = 'rgba(7, 15, 32, 0.9)';
    ctx.strokeStyle = '#00F2FE';
    ctx.lineWidth = 2;
    ctx.fillRect(24, outCanvas.height - 96, 540, 72);
    ctx.strokeRect(24, outCanvas.height - 96, 540, 72);

    ctx.fillStyle = '#00F2FE';
    ctx.font = '900 22px "Segoe UI", "Cairo", sans-serif';
    ctx.fillText('FATYAK • 3D HUMAN ANATOMY ATLAS', 42, outCanvas.height - 62);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 17px "Segoe UI", "Cairo", sans-serif';
    ctx.fillText(
      `العضو المحدد: ${organ ? organ.nameAr : 'كامل الجسم'} | المطور: FATYAK`,
      42,
      outCanvas.height - 34
    );

    const link = document.createElement('a');
    link.download = `FATYAK-3D-Anatomy-${organ ? organ.id : 'body'}.png`;
    link.href = outCanvas.toDataURL('image/png');
    link.click();
  }

  updateEcgMonitor(elapsed) {
    const canvas = document.getElementById('ecg-live-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const bps = this.state.heartRateBpm / 60;
    const phase = (elapsed * bps) % 1.0;

    let ySignal = 0;
    if (phase > 0.1 && phase < 0.2) {
      ySignal = Math.sin(((phase - 0.1) / 0.1) * Math.PI) * 0.22;
    } else if (phase >= 0.24 && phase < 0.27) {
      ySignal = -0.25;
    } else if (phase >= 0.27 && phase < 0.32) {
      ySignal = 1.0;
    } else if (phase >= 0.32 && phase < 0.36) {
      ySignal = -0.38;
    } else if (phase >= 0.45 && phase < 0.62) {
      ySignal = Math.sin(((phase - 0.45) / 0.17) * Math.PI) * 0.35;
    }

    this.ecgPoints.push(h * 0.58 - ySignal * (h * 0.44));
    if (this.ecgPoints.length > w) this.ecgPoints.shift();

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < this.ecgPoints.length; i++) {
      if (i === 0) ctx.moveTo(i, this.ecgPoints[i]);
      else ctx.lineTo(i, this.ecgPoints[i]);
    }
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    if (this.ecgPoints.length > 0) {
      const lx = this.ecgPoints.length - 1;
      const ly = this.ecgPoints[lx];
      ctx.fillStyle = '#00F2FE';
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    const elapsed = (now - this.startTime) / 1000;

    // انتقال الكاميرا السلس
    if (this.cam.animActive) {
      this.cam.progress += dt / 0.65;
      const t = Math.min(1.0, this.cam.progress);
      const ease = 1 - Math.pow(1 - t, 3);
      this.cam.yaw = this.cam.startYaw + (this.cam.endYaw - this.cam.startYaw) * ease;
      this.cam.pitch = this.cam.startPitch + (this.cam.endPitch - this.cam.startPitch) * ease;
      this.cam.zoom = this.cam.startZoom + (this.cam.endZoom - this.cam.startZoom) * ease;
      this.cam.targetX = this.cam.startTX + (this.cam.endTX - this.cam.startTX) * ease;
      this.cam.targetY = this.cam.startTY + (this.cam.endTY - this.cam.startTY) * ease;
      this.cam.targetZ = this.cam.startTZ + (this.cam.endTZ - this.cam.startTZ) * ease;
      if (t >= 1.0) this.cam.animActive = false;
    } else if (this.state.autoRotate && !this.isDragging) {
      this.cam.yaw += dt * 0.48;
    }

    // تحديث جسيمات الدم والأعصاب
    if (this.state.showParticles) {
      for (let i = 0; i < this.flowParticles.length; i++) {
        this.flowParticles[i].t = (this.flowParticles[i].t + dt * this.flowParticles[i].speed) % 1.0;
      }
    }

    this.render3DScene(elapsed);
    this.update3DLabels();
    this.renderOrganCloseupPreview(elapsed);
    this.updateEcgMonitor(elapsed);
  }
}

// تشغيل فوري مضمون سواء تم تحميل الصفحة مسبقاً أو أثناء الحدث
function bootFatyakEngine() {
  if (window.__fatyakBooted) return;
  window.__fatyakBooted = true;
  window.fatyakApp = new FatyakAnatomyEngine();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootFatyakEngine);
} else {
  bootFatyakEngine();
}
