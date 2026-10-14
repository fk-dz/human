import * as THREE from 'three';

/**
 * محرك بناء ونحت جسم الإنسان والأعضاء الداخلية ثلاثية الأبعاد
 * تطوير وتصميم: FATYAK - 3D Human Anatomy Engine
 */

// مولد القوام والأنسجة الحيوية الإجرائية (بدون أي صور خارجية أو API)
function createTissueTextures() {
  const textures = {};

  // 1. نسيج قشرة المخ (التلافيف والأخاديد الدماغية Gyri & Sulci)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e59fb2';
    ctx.fillRect(0, 0, 512, 512);

    // رسم تلافيف عضوية متعرجة
    for (let i = 0; i < 160; i++) {
      ctx.beginPath();
      let x = (i * 37) % 512;
      let y = (i * 53) % 512;
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        const angle = Math.sin(x * 0.025 + i) * Math.PI + Math.cos(y * 0.025) * 1.5;
        const nx = x + Math.cos(angle) * 26;
        const ny = y + Math.sin(angle) * 26;
        const cx = (x + nx) / 2 + Math.sin(i + s) * 12;
        const cy = (y + ny) / 2 + Math.cos(i + s) * 12;
        ctx.quadraticCurveTo(cx, cy, nx, ny);
        x = nx;
        y = ny;
      }
      ctx.strokeStyle = 'rgba(110, 35, 58, 0.55)';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 215, 225, 0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    textures.brain = tex;
  }

  // 2. نسيج المخيخ (الوريقات الأفقية الدقيقة Folia)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d17b91';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 6) {
      ctx.fillStyle = y % 12 === 0 ? 'rgba(90, 28, 46, 0.6)' : 'rgba(250, 195, 210, 0.4)';
      ctx.fillRect(0, y, 256, 3);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    textures.cerebellum = tex;
  }

  // 3. نسيج الأعضاء الداخلية والأوعية الدقيقة (القلب، المعدة، الكبد، الكليتين)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    // خلايا وأنسجة عضوية دقيقة
    for (let i = 0; i < 400; i++) {
      const x = (i * 73) % 512;
      const y = (i * 41) % 512;
      const r = 6 + (i % 18);
      const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.18)');
      grad.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // شعيرات دموية متفرعة
    for (let i = 0; i < 45; i++) {
      ctx.beginPath();
      let vx = (i * 97) % 512;
      let vy = (i * 61) % 512;
      ctx.moveTo(vx, vy);
      for (let step = 0; step < 5; step++) {
        vx += Math.cos(i + step * 1.1) * 28;
        vy += Math.sin(i * 0.7 + step) * 28;
        ctx.lineTo(vx, vy);
      }
      ctx.strokeStyle = 'rgba(210, 210, 210, 0.28)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    textures.visceral = tex;
  }

  // 4. نسيج الفصيصات الرئوية (الرئتين)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f28ca8';
    ctx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 512; y += 32) {
      for (let x = 0; x < 512; x += 32) {
        const ox = x + ((y / 32) % 2) * 16;
        ctx.strokeStyle = 'rgba(155, 50, 82, 0.32)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ox, y, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    textures.lung = tex;
  }

  // 5. نسيج حلقات القصبة الهوائية الغضروفية
  {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < 512; y += 24) {
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(0, y, 128, 15);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, y + 15, 128, 9);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    textures.trachea = tex;
  }

  // 6. منصة الهولوغرام الأرضية بشعار المطور FATYAK
  {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 1024);

    const cx = 512;
    const cy = 512;

    // دوائر تقنية متحدة المركز
    const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 490);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.24)');
    grad.addColorStop(0.55, 'rgba(16, 185, 129, 0.08)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 490, 0, Math.PI * 2);
    ctx.fill();

    const radii = [160, 260, 350, 420, 465];
    radii.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(0, 242, 254, 0.55)' : 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = idx === 3 ? 4 : 2;
      if (idx === 1 || idx === 4) ctx.setLineDash([14, 10]);
      else ctx.setLineDash([]);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // خطوط البوصلة التشريحية
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      const r1 = a % 45 === 0 ? 160 : 350;
      const r2 = 465;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
      ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
      ctx.strokeStyle = a % 45 === 0 ? 'rgba(0, 242, 254, 0.45)' : 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = a % 45 === 0 ? 2.5 : 1;
      ctx.stroke();
    }

    // نصوص الاتجاهات التشريحية وحقوق المطور FATYAK
    ctx.save();
    ctx.font = '900 34px "Segoe UI", "Cairo", sans-serif';
    ctx.fillStyle = '#00F2FE';
    ctx.textAlign = 'center';
    ctx.fillText('FATYAK • 3D HUMAN ANATOMY ENGINE', cx, 920);
    ctx.font = '700 26px "Segoe UI", "Cairo", sans-serif';
    ctx.fillStyle = '#FDE047';
    ctx.fillText('الأطلس التفاعلي ثلاثي الأبعاد لجسم الإنسان • المطور: FATYAK', cx, 962);

    ctx.font = '700 22px "Segoe UI", "Cairo", sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.fillText('الأمام (Anterior)', cx, 125);
    ctx.fillText('اليسار التشريحي (Left)', 895, cy + 8);
    ctx.fillText('اليمين التشريحي (Right)', 130, cy + 8);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    textures.floorLogo = tex;
  }

  return textures;
}

// دالة مساعدة لإنشاء مادة حيوية واقعية لكل عضو
function makeOrganMaterial(colorHex, textures, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: opts.roughness ?? 0.34,
    metalness: opts.metalness ?? 0.04,
    clearcoat: opts.clearcoat ?? 0.82,
    clearcoatRoughness: opts.clearcoatRoughness ?? 0.2,
    reflectivity: 0.7,
    bumpMap: opts.bumpMap || textures.visceral,
    bumpScale: opts.bumpScale ?? 0.025,
    map: opts.map || null,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
    side: opts.side ?? THREE.FrontSide,
    emissive: new THREE.Color(opts.emissive || '#000000'),
    emissiveIntensity: opts.emissiveIntensity ?? 0.0
  });
}

// دالة مساعدة لإنشاء أنبوب متغير السماكة (للأمعاء الغليظة، المعدة، المرارة، الأوعية)
function createVariableTubeGeometry(points, radii, tubularSegments = 80, radialSegments = 20) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geom = new THREE.TubeGeometry(curve, tubularSegments, 1, radialSegments, false);
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();
  const center = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, center);

    // استيفاء نصف القطر عند النقطة t
    const rIdx = t * (radii.length - 1);
    const i0 = Math.floor(rIdx);
    const i1 = Math.min(radii.length - 1, i0 + 1);
    const frac = rIdx - i0;
    let r = radii[i0] * (1 - frac) + radii[i1] * frac;

    if (typeof optsRadiusMod === 'function') {
      r *= optsRadiusMod(t);
    }

    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j;
      v.fromBufferAttribute(pos, idx);
      v.sub(center).multiplyScalar(r).add(center);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geom.computeVertexNormals();
  return geom;
}

let optsRadiusMod = null;

export function buildHumanAnatomyScene(scene, organsData) {
  const textures = createTissueTextures();
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const organGroups = {}; // organId -> THREE.Group
  const selectableMeshes = []; // كافة المجسمات القابلة للنقر والتحديد
  const animatedRefs = {
    heartGroup: null,
    rightLungGroup: null,
    leftLungGroup: null,
    diaphragmMesh: null,
    bloodParticles: null,
    venousParticles: null,
    neuralParticles: null,
    floorRing: null
  };

  // تهيئة مجموعات كل عضو من قاعدة البيانات
  organsData.forEach((organ) => {
    const grp = new THREE.Group();
    grp.name = organ.id;
    grp.userData = {
      organId: organ.id,
      system: organ.system,
      basePosition: new THREE.Vector3(0, 0, 0),
      explodeVec: new THREE.Vector3(...(organ.explodeVec || [0, 0, 0])),
      materials: []
    };
    organGroups[organ.id] = grp;
    rootGroup.add(grp);
  });

  function registerOrganMesh(organId, mesh) {
    const grp = organGroups[organId];
    if (!grp) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.organId = organId;
    if (mesh.material && !grp.userData.materials.includes(mesh.material)) {
      mesh.material.userData = {
        baseColor: mesh.material.color.clone(),
        baseOpacity: mesh.material.opacity,
        baseTransparent: mesh.material.transparent
      };
      grp.userData.materials.push(mesh.material);
    }
    grp.add(mesh);
    selectableMeshes.push(mesh);
  }

  // =========================================================================
  // 1. نحت الجهاز العصبي والحواس (المخ، المخيخ، جذع الدماغ، الحبل الشوكي، العينان)
  // =========================================================================

  // --- أ. المخ (Cerebrum): نصفا الكرة المخية الأيمن والأيسر مع التلافيف ---
  {
    const brainMat = makeOrganMaterial('#E8A5B8', textures, {
      map: textures.brain,
      bumpMap: textures.brain,
      bumpScale: 0.065,
      roughness: 0.38,
      clearcoat: 0.78
    });

    [-1, 1].forEach((side) => {
      const hemiGeom = new THREE.SphereGeometry(0.49, 48, 36);
      const pos = hemiGeom.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // تسطيح السطح الإنسي المقابل للشق الطولي بين نصفي المخ
        if (side === -1 && v.x > 0) v.x *= 0.22;
        if (side === 1 && v.x < 0) v.x *= 0.22;
        // إطالة أمامية خلفية للفص الجبهي والقذالي
        v.z *= 1.24;
        v.y *= 0.92;
        // نحت الفص الصدغي في الأسفل والجانب
        if (v.y < -0.05 && v.z > -0.15) {
          v.x += side * 0.06;
          v.y -= 0.05 * Math.exp(-Math.abs(v.z - 0.1) * 4);
        }
        // تموجات التلافيف السطحية الثلاثية الأبعاد
        const gyri =
          Math.sin(v.x * 18 + v.y * 14) *
          Math.cos(v.z * 16 - v.y * 12) *
          0.022;
        v.addScaledVector(v.clone().normalize(), gyri);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      hemiGeom.computeVertexNormals();
      const hemiMesh = new THREE.Mesh(hemiGeom, brainMat);
      hemiMesh.position.set(side * 0.23, 6.95, 0.02);
      registerOrganMesh('cerebrum', hemiMesh);
    });

    // الجسم الثفني (Corpus Callosum) الرابط بين نصفي المخ
    const ccGeom = new THREE.TorusGeometry(0.22, 0.07, 16, 32, Math.PI);
    const ccMesh = new THREE.Mesh(ccGeom, brainMat);
    ccMesh.rotation.y = Math.PI / 2;
    ccMesh.position.set(0, 6.82, 0.02);
    registerOrganMesh('cerebrum', ccMesh);
  }

  // --- ب. المخيخ (Cerebellum) ---
  {
    const cerebMat = makeOrganMaterial('#D4849A', textures, {
      map: textures.cerebellum,
      bumpMap: textures.cerebellum,
      bumpScale: 0.05,
      roughness: 0.42
    });
    [-1, 1].forEach((side) => {
      const cGeom = new THREE.SphereGeometry(0.23, 32, 24);
      cGeom.scale(1.1, 0.78, 0.92);
      const cMesh = new THREE.Mesh(cGeom, cerebMat);
      cMesh.position.set(side * 0.19, 6.36, -0.34);
      registerOrganMesh('cerebellum', cMesh);
    });
    // الدودة المخيخية الوسطى (Vermis)
    const vermisGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.32, 20);
    vermisGeom.rotateX(Math.PI / 4);
    const vermisMesh = new THREE.Mesh(vermisGeom, cerebMat);
    vermisMesh.position.set(0, 6.36, -0.34);
    registerOrganMesh('cerebellum', vermisMesh);
  }

  // --- ج. جذع الدماغ (Brainstem: Midbrain, Pons, Medulla) ---
  {
    const stemMat = makeOrganMaterial('#F1B6C8', textures, {
      roughness: 0.35,
      clearcoat: 0.75
    });
    // الجسر (Pons) المنتفخ
    const ponsGeom = new THREE.SphereGeometry(0.16, 28, 24);
    ponsGeom.scale(1.12, 0.95, 1.05);
    const ponsMesh = new THREE.Mesh(ponsGeom, stemMat);
    ponsMesh.position.set(0, 6.32, -0.06);
    registerOrganMesh('brainstem', ponsMesh);

    // النخاع المستطيل (Medulla Oblongata)
    const medGeom = new THREE.CylinderGeometry(0.11, 0.075, 0.38, 24);
    const medMesh = new THREE.Mesh(medGeom, stemMat);
    medMesh.position.set(0, 6.02, -0.14);
    medMesh.rotation.x = 0.22;
    registerOrganMesh('brainstem', medMesh);
  }

  // --- د. الحبل الشوكي وشبكة الأعصاب الطرفية (Spinal Cord & Nerves) ---
  {
    const nerveMat = makeOrganMaterial('#FDE047', textures, {
      roughness: 0.3,
      emissive: '#F59E0B',
      emissiveIntensity: 0.25
    });

    // الحبل الشوكي الرئيسي الممتد داخل القناة الفقرية
    const cordPts = [
      new THREE.Vector3(0, 5.88, -0.2),
      new THREE.Vector3(0, 5.25, -0.28),
      new THREE.Vector3(0, 4.2, -0.42),
      new THREE.Vector3(0, 3.0, -0.38),
      new THREE.Vector3(0, 1.85, -0.32),
      new THREE.Vector3(0, 1.05, -0.36)
    ];
    const cordCurve = new THREE.CatmullRomCurve3(cordPts);
    const cordGeom = new THREE.TubeGeometry(cordCurve, 64, 0.055, 16, false);
    registerOrganMesh('spinal_cord', new THREE.Mesh(cordGeom, nerveMat));

    // جذور الأعصاب الشوكية والضفيرة العضدية والأعصاب الوركية
    const nerveBranches = [
      // الضفيرة العضدية وأعصاب الذراعين
      [
        new THREE.Vector3(0, 5.1, -0.28),
        new THREE.Vector3(-0.65, 4.9, -0.1),
        new THREE.Vector3(-1.35, 4.5, 0.0),
        new THREE.Vector3(-1.62, 3.4, 0.05),
        new THREE.Vector3(-1.78, 2.2, 0.12)
      ],
      [
        new THREE.Vector3(0, 5.1, -0.28),
        new THREE.Vector3(0.65, 4.9, -0.1),
        new THREE.Vector3(1.35, 4.5, 0.0),
        new THREE.Vector3(1.62, 3.4, 0.05),
        new THREE.Vector3(1.78, 2.2, 0.12)
      ],
      // الأعصاب الوركية والفخذية للساقين
      [
        new THREE.Vector3(0, 1.15, -0.34),
        new THREE.Vector3(-0.42, 0.65, -0.18),
        new THREE.Vector3(-0.55, -0.5, -0.08),
        new THREE.Vector3(-0.55, -1.7, -0.05)
      ],
      [
        new THREE.Vector3(0, 1.15, -0.34),
        new THREE.Vector3(0.42, 0.65, -0.18),
        new THREE.Vector3(0.55, -0.5, -0.08),
        new THREE.Vector3(0.55, -1.7, -0.05)
      ]
    ];

    // أعصاب وربية بين الأضلاع
    for (let i = 0; i < 8; i++) {
      const y = 4.65 - i * 0.35;
      [-1, 1].forEach((s) => {
        nerveBranches.push([
          new THREE.Vector3(0, y, -0.36),
          new THREE.Vector3(s * 0.45, y - 0.08, -0.25),
          new THREE.Vector3(s * 0.78, y - 0.18, 0.05)
        ]);
      });
    }

    nerveBranches.forEach((pts) => {
      const c = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(c, 28, 0.02, 10, false);
      registerOrganMesh('spinal_cord', new THREE.Mesh(g, nerveMat));
    });
  }

  // --- هـ. العينان والعصب البصري (Eyes & Optic Nerves) ---
  {
    const scleraMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.12,
      clearcoat: 1.0
    });
    const irisMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      roughness: 0.2,
      clearcoat: 1.0
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x020617 });
    const opticMat = makeOrganMaterial('#FDE68A', textures, { roughness: 0.3 });

    [-1, 1].forEach((side) => {
      const ex = side * 0.27;
      const ey = 6.78;
      const ez = 0.54;

      const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.115, 28, 24), scleraMat);
      eyeBall.position.set(ex, ey, ez);
      registerOrganMesh('eyes', eyeBall);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 16), irisMat);
      iris.scale.set(1, 1, 0.35);
      iris.position.set(ex, ey, ez + 0.1);
      registerOrganMesh('eyes', iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), pupilMat);
      pupil.scale.set(1, 1, 0.3);
      pupil.position.set(ex, ey, ez + 0.115);
      registerOrganMesh('eyes', pupil);

      // العصب البصري المتجه للتصالب البصري
      const optCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ex, ey, ez - 0.08),
        new THREE.Vector3(side * 0.12, 6.72, 0.25),
        new THREE.Vector3(0, 6.68, 0.08)
      ]);
      const optGeom = new THREE.TubeGeometry(optCurve, 18, 0.024, 10, false);
      registerOrganMesh('eyes', new THREE.Mesh(optGeom, opticMat));
    });
  }

  // =========================================================================
  // 2. نحت الجهاز التنفسي (الحنجرة، القصبة الهوائية، الرئتان، الحجاب الحاجز)
  // =========================================================================

  // --- أ. الحنجرة والغضروف الدرقي (Larynx) ---
  {
    const larynxMat = makeOrganMaterial('#7DD3FC', textures, {
      roughness: 0.32,
      clearcoat: 0.65
    });
    // الغضروف الدرقي (تفاحة آدم)
    const shieldGeom = new THREE.CylinderGeometry(0.16, 0.13, 0.26, 24);
    shieldGeom.scale(1.0, 1.0, 0.92);
    const shieldMesh = new THREE.Mesh(shieldGeom, larynxMat);
    shieldMesh.position.set(0, 5.56, 0.16);
    registerOrganMesh('larynx', shieldMesh);

    // لسان المزمار والغضروف الحلقي
    const cricoidGeom = new THREE.TorusGeometry(0.125, 0.032, 14, 28);
    cricoidGeom.rotateX(Math.PI / 2);
    const cricoidMesh = new THREE.Mesh(cricoidGeom, larynxMat);
    cricoidMesh.position.set(0, 5.4, 0.15);
    registerOrganMesh('larynx', cricoidMesh);
  }

  // --- ب. القصبة الهوائية والشجرة القصبية (Trachea & Bronchi) ---
  {
    const tracheaMat = makeOrganMaterial('#BAE6FD', textures, {
      map: textures.trachea,
      bumpMap: textures.trachea,
      bumpScale: 0.04,
      roughness: 0.3
    });

    const trCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 5.36, 0.14),
      new THREE.Vector3(0, 4.9, 0.12),
      new THREE.Vector3(0, 4.42, 0.08)
    ]);
    const trGeom = new THREE.TubeGeometry(trCurve, 36, 0.105, 24, false);
    registerOrganMesh('trachea', new THREE.Mesh(trGeom, tracheaMat));

    // تفرع الشعب الهوائية اليمنى واليسرى داخل الرئتين
    const bronchiPaths = [
      // الشعبة الرئيسية اليمنى وتفرعاتها الثلاثة
      [new THREE.Vector3(0, 4.44, 0.08), new THREE.Vector3(-0.38, 4.22, 0.08), new THREE.Vector3(-0.68, 4.1, 0.08)],
      [new THREE.Vector3(-0.38, 4.22, 0.08), new THREE.Vector3(-0.62, 4.55, 0.06)],
      [new THREE.Vector3(-0.52, 4.15, 0.08), new THREE.Vector3(-0.78, 3.68, 0.05)],
      // الشعبة الرئيسية اليسرى وتفرعاها
      [new THREE.Vector3(0, 4.44, 0.08), new THREE.Vector3(0.42, 4.18, 0.08), new THREE.Vector3(0.72, 4.05, 0.08)],
      [new THREE.Vector3(0.42, 4.18, 0.08), new THREE.Vector3(0.65, 4.52, 0.06)],
      [new THREE.Vector3(0.55, 4.1, 0.08), new THREE.Vector3(0.78, 3.65, 0.05)]
    ];

    bronchiPaths.forEach((pts, idx) => {
      const c = new THREE.CatmullRomCurve3(pts);
      const r = idx === 0 || idx === 3 ? 0.072 : 0.045;
      const g = new THREE.TubeGeometry(c, 24, r, 16, false);
      registerOrganMesh('trachea', new THREE.Mesh(g, tracheaMat));
    });
  }

  // --- ج. الرئة اليمنى (3 فصوص) والرئة اليسرى (فصان مع الثلمة القلبية) ---
  function createSculptedLungGeometry(side) {
    // side = -1 للرئة اليمنى التشريحية، side = +1 للرئة اليسرى التشريحية
    const geom = new THREE.SphereGeometry(0.62, 52, 44);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // استطالة عمودية لشكل الرئة المخروطي
      v.y *= 1.48;
      v.x *= 0.78;
      v.z *= 0.92;

      // تضييق قمة الرئة (Apex) في الأعلى وتوسيع القاعدة في الأسفل
      const heightFactor = (v.y + 0.92) / 1.84; // 0 في الأسفل، 1 في الأعلى
      const taper = 1.15 - 0.48 * Math.pow(Math.max(0, heightFactor), 1.3);
      v.x *= taper;
      v.z *= taper;

      // تقعير قاعدة الرئة السفلية لتستقر فوق قبة الحجاب الحاجز
      if (v.y < -0.55) {
        const distFromCenter = Math.sqrt(v.x * v.x + v.z * v.z);
        v.y += Math.max(0, 0.24 - distFromCenter * 0.35);
      }

      // تسطيح السطح الإنسي المنصفي المقابل للقلب
      if (side === -1 && v.x > 0.05) {
        v.x *= 0.42;
      }
      if (side === 1 && v.x < -0.05) {
        v.x *= 0.42;
        // نحت الثلمة القلبية (Cardiac Notch) بوضوح في الرئة اليسرى لاحتضان القلب!
        if (v.y < 0.15 && v.y > -0.65 && v.z > -0.1) {
          const notchDepth = Math.cos(((v.y + 0.25) / 0.45) * (Math.PI / 2));
          if (notchDepth > 0) {
            v.x += 0.22 * notchDepth;
          }
        }
      }

      // نحت الشقوق التشريحية الفاصلة بين فصوص الرئة (Oblique & Horizontal Fissures)
      const obliquePlane = v.y - v.z * 0.65 + 0.12;
      if (Math.abs(obliquePlane) < 0.055) {
        const groove = 1 - (0.055 - Math.abs(obliquePlane)) * 1.4;
        v.x *= groove;
        v.z *= groove;
      }
      if (side === -1 && v.z > 0) {
        // الشق الأفقي للرئة اليمنى (يفصل الفص العلوي عن الأوسط)
        const horizPlane = v.y - 0.18;
        if (Math.abs(horizPlane) < 0.045) {
          const groove = 1 - (0.045 - Math.abs(horizPlane)) * 1.3;
          v.x *= groove;
          v.z *= groove;
        }
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geom.computeVertexNormals();
    return geom;
  }

  {
    const rightLungMat = makeOrganMaterial('#F48FB1', textures, {
      map: textures.lung,
      bumpMap: textures.lung,
      bumpScale: 0.03,
      roughness: 0.38,
      clearcoat: 0.72,
      transparent: true,
      opacity: 0.92
    });
    const rightLungMesh = new THREE.Mesh(createSculptedLungGeometry(-1), rightLungMat);
    rightLungMesh.position.set(-0.68, 4.18, 0.06);
    registerOrganMesh('right_lung', rightLungMesh);
    animatedRefs.rightLungGroup = organGroups['right_lung'];

    const leftLungMat = makeOrganMaterial('#F06292', textures, {
      map: textures.lung,
      bumpMap: textures.lung,
      bumpScale: 0.03,
      roughness: 0.38,
      clearcoat: 0.72,
      transparent: true,
      opacity: 0.92
    });
    const leftLungMesh = new THREE.Mesh(createSculptedLungGeometry(1), leftLungMat);
    leftLungMesh.position.set(0.68, 4.18, 0.06);
    registerOrganMesh('left_lung', leftLungMesh);
    animatedRefs.leftLungGroup = organGroups['left_lung'];
  }

  // --- د. عضلة الحجاب الحاجز (Diaphragm) ---
  {
    const diaphMat = makeOrganMaterial('#D97757', textures, {
      roughness: 0.42,
      clearcoat: 0.65,
      side: THREE.DoubleSide
    });
    const dGeom = new THREE.SphereGeometry(1.12, 44, 28, 0, Math.PI * 2, 0, Math.PI * 0.44);
    const pos = dGeom.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.y *= 0.42;
      v.z *= 0.68;
      // القبة اليمنى أعلى قليلاً من اليسرى لوجود الكبد تحتها
      if (v.x < 0) v.y += 0.05;
      // انخفاض خفيف في المنتصف (المركز الوتري تحت القلب)
      const centerDip = Math.exp(-v.x * v.x * 4) * 0.08;
      v.y -= centerDip;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    dGeom.computeVertexNormals();
    const dMesh = new THREE.Mesh(dGeom, diaphMat);
    dMesh.position.set(0, 3.05, 0.04);
    registerOrganMesh('diaphragm', dMesh);
    animatedRefs.diaphragmMesh = dMesh;
  }

  // =========================================================================
  // 3. نحت الجهاز الدوري والوعائي (القلب، الأبهر، الوريد الأجوف، الطحال)
  // =========================================================================

  // --- أ. القلب النابض (Heart) مع البطينين والأذينين والشرايين التاجية ---
  {
    const heartMat = makeOrganMaterial('#DC2626', textures, {
      roughness: 0.25,
      clearcoat: 0.95,
      clearcoatRoughness: 0.12,
      bumpScale: 0.035
    });
    const atriumMat = makeOrganMaterial('#B91C1C', textures, {
      roughness: 0.28,
      clearcoat: 0.9
    });
    const coronaryArtMat = makeOrganMaterial('#EF4444', textures, {
      roughness: 0.2,
      emissive: '#7F1D1D',
      emissiveIntensity: 0.25
    });
    const coronaryVeinMat = makeOrganMaterial('#1D4ED8', textures, {
      roughness: 0.25
    });

    // كتلة البطينين المخروطية المائلة نحو اليسار والأمام (Apex)
    const ventGeom = new THREE.SphereGeometry(0.34, 40, 32);
    const pos = ventGeom.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.y *= 1.32;
      v.x *= 0.92;
      v.z *= 0.85;
      // تدبيب قمة القلب السفلية (Apex of Heart) نحو اليسار والأمام
      if (v.y < 0) {
        const factor = Math.abs(v.y) / 0.45;
        v.x *= 1 - factor * 0.48;
        v.z *= 1 - factor * 0.42;
        v.x += factor * 0.14;
        v.z += factor * 0.09;
      }
      // تلم بين البطينين الأمامي (Interventricular Sulcus)
      if (Math.abs(v.x - 0.04 + v.y * 0.18) < 0.035 && v.z > 0) {
        v.z -= 0.022;
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    ventGeom.computeVertexNormals();
    const ventMesh = new THREE.Mesh(ventGeom, heartMat);
    ventMesh.position.set(0.18, 3.82, 0.24);
    ventMesh.rotation.z = 0.28;
    ventMesh.rotation.x = 0.15;
    registerOrganMesh('heart', ventMesh);

    // الأذين الأيمن والأذين الأيسر
    const rightAtrium = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 20), atriumMat);
    rightAtrium.position.set(-0.04, 4.02, 0.22);
    registerOrganMesh('heart', rightAtrium);

    const leftAtrium = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 20), atriumMat);
    leftAtrium.position.set(0.28, 4.05, 0.14);
    registerOrganMesh('heart', leftAtrium);

    // الجذع الرئوي المنبثق من البطين الأيمن
    const pulmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 3.98, 0.34),
      new THREE.Vector3(0.16, 4.22, 0.26),
      new THREE.Vector3(0.05, 4.32, 0.14)
    ]);
    registerOrganMesh(
      'heart',
      new THREE.Mesh(new THREE.TubeGeometry(pulmCurve, 20, 0.068, 16, false), coronaryVeinMat)
    );

    // الشريان التاجي الأمامي النازل (LAD) والمنعطف على سطح القلب
    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.16, 4.02, 0.42),
      new THREE.Vector3(0.2, 3.85, 0.48),
      new THREE.Vector3(0.26, 3.66, 0.44),
      new THREE.Vector3(0.32, 3.52, 0.36)
    ]);
    registerOrganMesh(
      'heart',
      new THREE.Mesh(new THREE.TubeGeometry(ladCurve, 24, 0.018, 10, false), coronaryArtMat)
    );

    const rcaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, 4.0, 0.4),
      new THREE.Vector3(0.02, 3.82, 0.43),
      new THREE.Vector3(0.08, 3.65, 0.38)
    ]);
    registerOrganMesh(
      'heart',
      new THREE.Mesh(new THREE.TubeGeometry(rcaCurve, 20, 0.016, 10, false), coronaryArtMat)
    );

    animatedRefs.heartGroup = organGroups['heart'];
  }

  // --- ب. الشريان الأبهر (الأورطي) والشجرة الشريانية (Aorta & Arteries) ---
  {
    const aortaMat = makeOrganMaterial('#EF4444', textures, {
      roughness: 0.25,
      clearcoat: 0.88
    });

    // الأبهر الصاعد + قوس الأبهر + الأبهر الصدري والبطني
    const mainAortaPts = [
      new THREE.Vector3(0.14, 4.02, 0.25),
      new THREE.Vector3(0.04, 4.35, 0.22),
      new THREE.Vector3(0.16, 4.52, 0.06),
      new THREE.Vector3(0.18, 4.25, -0.14),
      new THREE.Vector3(0.1, 3.45, -0.16),
      new THREE.Vector3(0.04, 2.45, -0.14),
      new THREE.Vector3(0.02, 1.42, -0.12)
    ];
    const aortaRadii = [0.095, 0.105, 0.098, 0.088, 0.082, 0.075, 0.068];
    registerOrganMesh(
      'aorta',
      new THREE.Mesh(createVariableTubeGeometry(mainAortaPts, aortaRadii, 64, 20), aortaMat)
    );

    // تفرعات الشريان الأبهر (السباتيان، تحت الترقوة، الكلويان، الحرقفيان والفخذيان)
    const arteryBranches = [
      // الشريان السباتي الأيمن والأيسر إلى الرأس والدماغ
      {
        pts: [
          new THREE.Vector3(0.04, 4.48, 0.14),
          new THREE.Vector3(-0.18, 5.2, 0.05),
          new THREE.Vector3(-0.18, 6.2, -0.02)
        ],
        r: 0.036
      },
      {
        pts: [
          new THREE.Vector3(0.14, 4.5, 0.08),
          new THREE.Vector3(0.18, 5.2, 0.05),
          new THREE.Vector3(0.18, 6.2, -0.02)
        ],
        r: 0.036
      },
      // شريان تحت الترقوة والعضدي للذراعين
      {
        pts: [
          new THREE.Vector3(0.02, 4.46, 0.14),
          new THREE.Vector3(-0.75, 4.78, 0.02),
          new THREE.Vector3(-1.45, 4.45, 0.02),
          new THREE.Vector3(-1.68, 3.2, 0.08),
          new THREE.Vector3(-1.82, 2.0, 0.14)
        ],
        r: 0.032
      },
      {
        pts: [
          new THREE.Vector3(0.18, 4.46, 0.04),
          new THREE.Vector3(0.75, 4.78, 0.02),
          new THREE.Vector3(1.45, 4.45, 0.02),
          new THREE.Vector3(1.68, 3.2, 0.08),
          new THREE.Vector3(1.82, 2.0, 0.14)
        ],
        r: 0.032
      },
      // الشريانان الكلويان
      {
        pts: [new THREE.Vector3(0.04, 2.22, -0.14), new THREE.Vector3(-0.45, 2.15, -0.2)],
        r: 0.032
      },
      {
        pts: [new THREE.Vector3(0.04, 2.28, -0.14), new THREE.Vector3(0.45, 2.26, -0.2)],
        r: 0.032
      },
      // الشريانان الحرقفيان والفخذيان للساقين
      {
        pts: [
          new THREE.Vector3(0.02, 1.42, -0.12),
          new THREE.Vector3(-0.35, 0.78, 0.02),
          new THREE.Vector3(-0.5, -0.45, 0.06),
          new THREE.Vector3(-0.5, -1.8, 0.04)
        ],
        r: 0.048
      },
      {
        pts: [
          new THREE.Vector3(0.02, 1.42, -0.12),
          new THREE.Vector3(0.35, 0.78, 0.02),
          new THREE.Vector3(0.5, -0.45, 0.06),
          new THREE.Vector3(0.5, -1.8, 0.04)
        ],
        r: 0.048
      }
    ];

    arteryBranches.forEach((b) => {
      const c = new THREE.CatmullRomCurve3(b.pts);
      registerOrganMesh('aorta', new THREE.Mesh(new THREE.TubeGeometry(c, 32, b.r, 14, false), aortaMat));
    });
  }

  // --- ج. الوريد الأجوف العلوي والسفلي والأوردة الكبرى (Vena Cava & Veins) ---
  {
    const veinMat = makeOrganMaterial('#2563EB', textures, {
      roughness: 0.28,
      clearcoat: 0.85
    });

    // الوريد الأجوف العلوي (SVC)
    const svcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, 4.68, 0.14),
      new THREE.Vector3(-0.16, 4.35, 0.18),
      new THREE.Vector3(-0.08, 4.08, 0.22)
    ]);
    registerOrganMesh(
      'vena_cava',
      new THREE.Mesh(new THREE.TubeGeometry(svcCurve, 24, 0.082, 18, false), veinMat)
    );

    // الوريد الأجوف السفلي (IVC)
    const ivcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 3.72, 0.12),
      new THREE.Vector3(-0.16, 3.1, -0.06),
      new THREE.Vector3(-0.18, 2.25, -0.12),
      new THREE.Vector3(-0.14, 1.35, -0.12)
    ]);
    registerOrganMesh(
      'vena_cava',
      new THREE.Mesh(new THREE.TubeGeometry(ivcCurve, 44, 0.086, 18, false), veinMat)
    );

    // الأوردة الوداجية، تحت الترقوة، الكلوية، والفخذية
    const veinBranches = [
      {
        pts: [
          new THREE.Vector3(-0.18, 4.66, 0.14),
          new THREE.Vector3(-0.24, 5.3, 0.08),
          new THREE.Vector3(-0.24, 6.18, 0.0)
        ],
        r: 0.038
      },
      {
        pts: [
          new THREE.Vector3(-0.18, 4.66, 0.14),
          new THREE.Vector3(0.24, 5.05, 0.1),
          new THREE.Vector3(0.24, 6.18, 0.0)
        ],
        r: 0.038
      },
      {
        pts: [new THREE.Vector3(-0.18, 2.15, -0.12), new THREE.Vector3(-0.46, 2.12, -0.18)],
        r: 0.035
      },
      {
        pts: [new THREE.Vector3(-0.18, 2.22, -0.12), new THREE.Vector3(0.46, 2.24, -0.18)],
        r: 0.035
      },
      {
        pts: [
          new THREE.Vector3(-0.14, 1.35, -0.12),
          new THREE.Vector3(-0.42, 0.75, 0.0),
          new THREE.Vector3(-0.56, -0.45, 0.04),
          new THREE.Vector3(-0.56, -1.8, 0.02)
        ],
        r: 0.048
      },
      {
        pts: [
          new THREE.Vector3(-0.14, 1.35, -0.12),
          new THREE.Vector3(0.28, 0.75, 0.0),
          new THREE.Vector3(0.44, -0.45, 0.04),
          new THREE.Vector3(0.44, -1.8, 0.02)
        ],
        r: 0.048
      }
    ];

    veinBranches.forEach((b) => {
      const c = new THREE.CatmullRomCurve3(b.pts);
      registerOrganMesh('vena_cava', new THREE.Mesh(new THREE.TubeGeometry(c, 28, b.r, 14, false), veinMat));
    });
  }

  // --- د. الطحال (Spleen) ---
  {
    const spleenMat = makeOrganMaterial('#6B21A8', textures, {
      roughness: 0.28,
      clearcoat: 0.9
    });
    const spGeom = new THREE.SphereGeometry(0.26, 32, 24);
    spGeom.scale(0.68, 1.35, 0.95);
    const spMesh = new THREE.Mesh(spGeom, spleenMat);
    spMesh.position.set(0.96, 2.75, -0.08);
    spMesh.rotation.z = -0.35;
    spMesh.rotation.y = 0.3;
    registerOrganMesh('spleen', spMesh);
  }

  // =========================================================================
  // 4. نحت الجهاز الهضمي (المريء، المعدة، الكبد، المرارة، البنكرياس، الأمعاء، الزائدة)
  // =========================================================================

  // --- أ. المريء (Esophagus) ---
  {
    const esoMat = makeOrganMaterial('#E07A5F', textures, {
      roughness: 0.38,
      clearcoat: 0.7
    });
    const esoCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 5.75, -0.02),
      new THREE.Vector3(0.02, 4.85, -0.04),
      new THREE.Vector3(0.05, 3.85, -0.04),
      new THREE.Vector3(0.18, 3.05, 0.08),
      new THREE.Vector3(0.26, 2.88, 0.16)
    ]);
    registerOrganMesh(
      'esophagus',
      new THREE.Mesh(new THREE.TubeGeometry(esoCurve, 44, 0.068, 18, false), esoMat)
    );
  }

  // --- ب. المعدة (Stomach) بشكل حرف J الواقعي ---
  {
    const stomachMat = makeOrganMaterial('#F4845F', textures, {
      roughness: 0.3,
      clearcoat: 0.88,
      bumpScale: 0.03
    });

    const stPts = [
      new THREE.Vector3(0.26, 2.88, 0.16), // الفؤاد (Cardia)
      new THREE.Vector3(0.52, 2.98, 0.14), // قاع المعدة (Fundus) المرتفع
      new THREE.Vector3(0.62, 2.72, 0.24), // جسم المعدة العلوي
      new THREE.Vector3(0.54, 2.42, 0.28), // المنحنى الكبير السفلي
      new THREE.Vector3(0.32, 2.28, 0.24), // غار البواب (Antrum)
      new THREE.Vector3(0.12, 2.38, 0.18) // المصرة البوابية (Pylorus)
    ];
    const stRadii = [0.09, 0.24, 0.27, 0.23, 0.15, 0.085];
    const stGeom = createVariableTubeGeometry(stPts, stRadii, 64, 28);
    registerOrganMesh('stomach', new THREE.Mesh(stGeom, stomachMat));
  }

  // --- ج. الكبد (Liver) بفصيه الأيمن الكبير والأيسر ---
  {
    const liverMat = makeOrganMaterial('#9A3412', textures, {
      roughness: 0.24,
      clearcoat: 0.94,
      clearcoatRoughness: 0.14,
      bumpScale: 0.02
    });

    // نحت الكبد المثلثي الانسيابي تحت القبة اليمنى للحجاب الحاجز
    const livGeom = new THREE.SphereGeometry(0.58, 48, 36);
    const pos = livGeom.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.x *= 1.48;
      v.y *= 0.78;
      v.z *= 0.82;

      // جعل الجانب الأيسر للكبد (+x) يضيق تدريجياً مثل الوتد ليمتد فوق المعدة
      if (v.x > -0.1) {
        const t = (v.x + 0.1) / 0.95;
        v.y *= Math.max(0.18, 1 - t * 0.72);
        v.z *= Math.max(0.25, 1 - t * 0.52);
        v.y += t * 0.12;
      }
      // تقعير السطح السفلي الحشوي للكبد
      if (v.y < 0) {
        v.y *= 0.65;
      }
      // أخدود الرباط المنجلي الفاصل بين الفص الأيمن والفص الأيسر
      if (Math.abs(v.x - 0.08) < 0.045 && v.z > 0) {
        v.z -= 0.035;
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    livGeom.computeVertexNormals();
    const livMesh = new THREE.Mesh(livGeom, liverMat);
    livMesh.position.set(-0.34, 2.86, 0.22);
    livMesh.rotation.z = 0.12;
    registerOrganMesh('liver', livMesh);
  }

  // --- د. المرارة (الحويصلة الصفراوية) والقناة الصفراوية (Gallbladder) ---
  {
    const gbMat = makeOrganMaterial('#10B981', textures, {
      roughness: 0.2,
      clearcoat: 0.95,
      emissive: '#065F46',
      emissiveIntensity: 0.2
    });

    const gbPts = [
      new THREE.Vector3(-0.52, 2.46, 0.38), // قاع المرارة الكمثري
      new THREE.Vector3(-0.42, 2.54, 0.3), // جسم المرارة
      new THREE.Vector3(-0.28, 2.6, 0.2), // عنق المرارة
      new THREE.Vector3(-0.14, 2.42, 0.12) // القناة الصفراوية الجامعة نحو الإثنا عشر
    ];
    const gbRadii = [0.105, 0.085, 0.038, 0.022];
    registerOrganMesh(
      'gallbladder',
      new THREE.Mesh(createVariableTubeGeometry(gbPts, gbRadii, 36, 20), gbMat)
    );
  }

  // --- هـ. البنكرياس (Pancreas) برأسه وجسمه وذيله ---
  {
    const pancMat = makeOrganMaterial('#FBBF24', textures, {
      roughness: 0.42,
      clearcoat: 0.65,
      bumpScale: 0.045
    });

    const pancPts = [
      new THREE.Vector3(-0.08, 2.22, 0.08), // رأس البنكرياس في قوس الإثنا عشر
      new THREE.Vector3(0.12, 2.34, 0.06), // عنق البنكرياس
      new THREE.Vector3(0.45, 2.42, 0.02), // جسم البنكرياس
      new THREE.Vector3(0.82, 2.56, -0.05) // ذيل البنكرياس المتجه نحو الطحال
    ];
    const pancRadii = [0.145, 0.105, 0.095, 0.052];
    registerOrganMesh(
      'pancreas',
      new THREE.Mesh(createVariableTubeGeometry(pancPts, pancRadii, 44, 20), pancMat)
    );
  }

  // --- و. الأمعاء الدقيقة (الإثنا عشر، الصائم، اللفائفي - Small Intestine) ---
  {
    const siMat = makeOrganMaterial('#F4A261', textures, {
      roughness: 0.32,
      clearcoat: 0.85,
      bumpScale: 0.025
    });

    // توليد التلافيف المعوية المتصلة داخل تجويف البطن
    const siPts = [
      // قوس الإثنا عشر (Duodenum C-loop)
      new THREE.Vector3(0.1, 2.36, 0.16),
      new THREE.Vector3(-0.18, 2.38, 0.12),
      new THREE.Vector3(-0.22, 2.08, 0.08),
      new THREE.Vector3(0.08, 2.02, 0.16)
    ];

    // حلقات الصائم واللفائفي الملتفة بانتظام تشريحي
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const y = 1.96 - r * 0.165;
      const dir = r % 2 === 0 ? 1 : -1;
      for (let step = -2; step <= 2; step++) {
        const x = step * dir * 0.21;
        const z = 0.22 + Math.sin(r * 1.7 + step * 1.3) * 0.08;
        const yWave = y + Math.cos(step * 1.5 + r) * 0.055;
        siPts.push(new THREE.Vector3(x, yWave, z));
      }
    }
    // الاتصال النهائي بالأعور في الربع السفلي الأيمن
    siPts.push(new THREE.Vector3(-0.58, 1.08, 0.18));

    const siCurve = new THREE.CatmullRomCurve3(siPts);
    const siGeom = new THREE.TubeGeometry(siCurve, 220, 0.078, 16, false);
    registerOrganMesh('small_intestine', new THREE.Mesh(siGeom, siMat));
  }

  // --- ز. الأمعاء الغليظة (القولون والمستقيم - Large Intestine) مع التقببات القولونية (Haustra) ---
  {
    const colonMat = makeOrganMaterial('#D97757', textures, {
      roughness: 0.36,
      clearcoat: 0.8,
      bumpScale: 0.035
    });

    const colonPts = [
      new THREE.Vector3(-0.72, 0.98, 0.18), // الأعور (Cecum) في أسفل اليمين
      new THREE.Vector3(-0.76, 1.48, 0.16), // القولون الصاعد
      new THREE.Vector3(-0.72, 2.12, 0.16), // الثنية الكبدية اليمنى
      new THREE.Vector3(-0.32, 2.08, 0.28), // القولون المستعرض
      new THREE.Vector3(0.28, 2.12, 0.28), // القولون المستعرض الأيسر
      new THREE.Vector3(0.76, 2.24, 0.14), // الثنية الطحالية اليسرى
      new THREE.Vector3(0.78, 1.58, 0.14), // القولون النازل
      new THREE.Vector3(0.68, 1.02, 0.14), // بداية القولون السيني
      new THREE.Vector3(0.28, 0.85, 0.1), // انعطاف القولون السيني
      new THREE.Vector3(0.0, 0.72, -0.05), // المستقيم العلوي
      new THREE.Vector3(0.0, 0.32, -0.08) // المستقيم والقناة الشرجية
    ];
    const colonRadii = [0.165, 0.145, 0.14, 0.138, 0.138, 0.135, 0.13, 0.125, 0.118, 0.12, 0.085];

    // تفعيل التقببات القولونية (Haustra) على طول القولون
    optsRadiusMod = (t) => 1.0 + 0.16 * Math.abs(Math.sin(t * Math.PI * 28));
    const colonGeom = createVariableTubeGeometry(colonPts, colonRadii, 160, 22);
    optsRadiusMod = null;

    registerOrganMesh('large_intestine', new THREE.Mesh(colonGeom, colonMat));
  }

  // --- ح. الزائدة الدودية (Vermiform Appendix) ---
  {
    const appMat = makeOrganMaterial('#EA580C', textures, {
      roughness: 0.3,
      clearcoat: 0.85
    });
    const appCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72, 0.96, 0.18),
      new THREE.Vector3(-0.82, 0.82, 0.22),
      new THREE.Vector3(-0.78, 0.68, 0.25)
    ]);
    registerOrganMesh(
      'appendix',
      new THREE.Mesh(new THREE.TubeGeometry(appCurve, 20, 0.036, 14, false), appMat)
    );
  }

  // =========================================================================
  // 5. نحت الجهاز البولي (الكليتان، الحالبان، المثانة البولية)
  // =========================================================================

  // --- أ. الكليتان اليمنى واليسرى (Kidneys) بشكل حبة الفاصولياء الواقعي ---
  function createBeanKidneyGeometry(side) {
    const geom = new THREE.SphereGeometry(0.24, 36, 28);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.y *= 1.45;
      v.x *= 0.85;
      v.z *= 0.62;
      // انحناء حبة الفاصولياء وتقعير سرة الكلية (Renal Hilum) نحو الداخل
      const bend = Math.cos((v.y / 0.36) * (Math.PI / 2));
      if (side === -1 && v.x > -0.02) {
        v.x -= bend * 0.085;
      } else if (side === 1 && v.x < 0.02) {
        v.x += bend * 0.085;
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geom.computeVertexNormals();
    return geom;
  }

  {
    const kidneyMat = makeOrganMaterial('#9333EA', textures, {
      roughness: 0.26,
      clearcoat: 0.92
    });

    // الكلية اليمنى (أخفض قليلاً لوجود الكبد)
    const rKidney = new THREE.Mesh(createBeanKidneyGeometry(-1), kidneyMat);
    rKidney.position.set(-0.52, 2.12, -0.2);
    rKidney.rotation.z = -0.15;
    registerOrganMesh('kidneys', rKidney);

    // الكلية اليسرى (أعلى قليلاً)
    const lKidney = new THREE.Mesh(createBeanKidneyGeometry(1), kidneyMat);
    lKidney.position.set(0.52, 2.25, -0.2);
    lKidney.rotation.z = 0.15;
    registerOrganMesh('kidneys', lKidney);
  }

  // --- ب. الحالبان الأيمن والأيسر (Ureters) ---
  {
    const ureterMat = makeOrganMaterial('#C084FC', textures, {
      roughness: 0.32,
      clearcoat: 0.8
    });

    const rUreter = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.44, 2.08, -0.18),
      new THREE.Vector3(-0.36, 1.45, -0.14),
      new THREE.Vector3(-0.28, 0.88, 0.05),
      new THREE.Vector3(-0.12, 0.62, 0.24)
    ]);
    registerOrganMesh(
      'ureters',
      new THREE.Mesh(new THREE.TubeGeometry(rUreter, 36, 0.024, 12, false), ureterMat)
    );

    const lUreter = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.44, 2.2, -0.18),
      new THREE.Vector3(0.36, 1.48, -0.14),
      new THREE.Vector3(0.28, 0.88, 0.05),
      new THREE.Vector3(0.12, 0.62, 0.24)
    ]);
    registerOrganMesh(
      'ureters',
      new THREE.Mesh(new THREE.TubeGeometry(lUreter, 36, 0.024, 12, false), ureterMat)
    );
  }

  // --- ج. المثانة البولية والإحليل (Urinary Bladder & Urethra) ---
  {
    const bladderMat = makeOrganMaterial('#A855F7', textures, {
      roughness: 0.28,
      clearcoat: 0.88
    });
    const blGeom = new THREE.SphereGeometry(0.22, 32, 24);
    blGeom.scale(1.05, 0.92, 1.0);
    const blMesh = new THREE.Mesh(blGeom, bladderMat);
    blMesh.position.set(0, 0.58, 0.28);
    registerOrganMesh('bladder', blMesh);

    const urethraCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.42, 0.28),
      new THREE.Vector3(0, 0.18, 0.26)
    ]);
    registerOrganMesh(
      'bladder',
      new THREE.Mesh(new THREE.TubeGeometry(urethraCurve, 14, 0.032, 12, false), bladderMat)
    );
  }

  // =========================================================================
  // 6. نحت جهاز الغدد الصماء (الغدة الدرقية، الغدة الزعترية، الغدتان الكظريتان)
  // =========================================================================

  // --- أ. الغدة الدرقية (Thyroid Gland - شكل الفراشة) ---
  {
    const thyroidMat = makeOrganMaterial('#10B981', textures, {
      roughness: 0.3,
      clearcoat: 0.85,
      emissive: '#047857',
      emissiveIntensity: 0.18
    });

    [-1, 1].forEach((side) => {
      const lobeGeom = new THREE.SphereGeometry(0.095, 24, 20);
      lobeGeom.scale(0.75, 1.55, 0.72);
      const lobeMesh = new THREE.Mesh(lobeGeom, thyroidMat);
      lobeMesh.position.set(side * 0.125, 5.22, 0.22);
      lobeMesh.rotation.z = side * -0.18;
      registerOrganMesh('thyroid', lobeMesh);
    });

    const isthmusGeom = new THREE.BoxGeometry(0.22, 0.09, 0.07);
    const isthmusMesh = new THREE.Mesh(isthmusGeom, thyroidMat);
    isthmusMesh.position.set(0, 5.18, 0.25);
    registerOrganMesh('thyroid', isthmusMesh);
  }

  // --- ب. الغدة الزعترية / التيموسية (Thymus Gland) ---
  {
    const thymusMat = makeOrganMaterial('#34D399', textures, {
      roughness: 0.34,
      clearcoat: 0.8
    });
    [-1, 1].forEach((side) => {
      const thGeom = new THREE.SphereGeometry(0.11, 24, 20);
      thGeom.scale(0.75, 1.55, 0.58);
      const thMesh = new THREE.Mesh(thGeom, thymusMat);
      thMesh.position.set(side * 0.075, 4.55, 0.34);
      thMesh.rotation.z = side * 0.12;
      registerOrganMesh('thymus', thMesh);
    });
  }

  // --- ج. الغدتان الكظريتان فوق الكليتين (Adrenal Glands) ---
  {
    const adrenalMat = makeOrganMaterial('#F59E0B', textures, {
      roughness: 0.32,
      clearcoat: 0.82,
      emissive: '#B45309',
      emissiveIntensity: 0.2
    });

    // الكظرية اليمنى (هرمية)
    const rAdGeom = new THREE.ConeGeometry(0.14, 0.18, 18);
    rAdGeom.scale(1.1, 1.0, 0.65);
    const rAdMesh = new THREE.Mesh(rAdGeom, adrenalMat);
    rAdMesh.position.set(-0.48, 2.48, -0.2);
    rAdMesh.rotation.z = 0.2;
    registerOrganMesh('adrenals', rAdMesh);

    // الكظرية اليسرى (هلالية)
    const lAdGeom = new THREE.ConeGeometry(0.14, 0.18, 18);
    lAdGeom.scale(1.1, 1.0, 0.65);
    const lAdMesh = new THREE.Mesh(lAdGeom, adrenalMat);
    lAdMesh.position.set(0.48, 2.6, -0.2);
    lAdMesh.rotation.z = -0.2;
    registerOrganMesh('adrenals', lAdMesh);
  }

  // =========================================================================
  // 7. نحت الجهاز الهيكلي العظمي (شبه شفاف لإظهار الأعضاء الداخلية بوضوح تام!)
  // =========================================================================
  const boneMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#E2E8F0'),
    roughness: 0.35,
    metalness: 0.05,
    clearcoat: 0.6,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });

  // --- أ. الجمجمة والعمود الفقري (Skull & Vertebral Column) ---
  {
    // قحف الجمجمة الشفاف الواقي للدماغ
    const craniumGeom = new THREE.SphereGeometry(0.68, 36, 28);
    craniumGeom.scale(0.92, 1.08, 1.12);
    const craniumMesh = new THREE.Mesh(craniumGeom, boneMat);
    craniumMesh.position.set(0, 6.92, -0.02);
    registerOrganMesh('spine_skull', craniumMesh);

    // الفك السفلي وعظام الوجه
    const jawGeom = new THREE.CylinderGeometry(0.42, 0.32, 0.48, 24, 1, false);
    jawGeom.scale(0.95, 1.0, 0.95);
    const jawMesh = new THREE.Mesh(jawGeom, boneMat);
    jawMesh.position.set(0, 6.26, 0.16);
    registerOrganMesh('spine_skull', jawMesh);

    // فقرات العمود الفقري (24 فقرة + العجز)
    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      const y = 5.85 - t * 4.85;
      const z = -0.24 - Math.sin(t * Math.PI * 1.6) * 0.14;
      const radius = 0.11 + t * 0.065;

      const vGeom = new THREE.CylinderGeometry(radius, radius * 1.04, 0.14, 18);
      const vMesh = new THREE.Mesh(vGeom, boneMat);
      vMesh.position.set(0, y, z);
      registerOrganMesh('spine_skull', vMesh);

      // النتوء الشوكي الخلفي للفقرة
      const spGeom = new THREE.BoxGeometry(0.05, 0.09, 0.18);
      const spMesh = new THREE.Mesh(spGeom, boneMat);
      spMesh.position.set(0, y - 0.02, z - radius - 0.05);
      registerOrganMesh('spine_skull', spMesh);
    }

    // عظمة العجز (Sacrum)
    const sacrumGeom = new THREE.ConeGeometry(0.26, 0.55, 18);
    sacrumGeom.scale(1.15, 1.0, 0.55);
    sacrumGeom.rotateX(Math.PI);
    const sacrumMesh = new THREE.Mesh(sacrumGeom, boneMat);
    sacrumMesh.position.set(0, 0.72, -0.34);
    registerOrganMesh('spine_skull', sacrumMesh);
  }

  // --- ب. القفص الصدري، القص، الترقوة، الحوض، وعظام الأطراف ---
  {
    const ribMat = boneMat.clone();

    // عظمة القص (Sternum)
    const sternumGeom = new THREE.BoxGeometry(0.22, 1.18, 0.075);
    const sternumMesh = new THREE.Mesh(sternumGeom, ribMat);
    sternumMesh.position.set(0, 4.18, 0.56);
    sternumMesh.rotation.x = -0.08;
    registerOrganMesh('ribcage_pelvis', sternumMesh);

    // عظمتا الترقوة (Clavicles)
    [-1, 1].forEach((side) => {
      const clavCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.12, 4.82, 0.52),
        new THREE.Vector3(side * 0.65, 4.88, 0.35),
        new THREE.Vector3(side * 1.28, 4.82, 0.08)
      ]);
      registerOrganMesh(
        'ribcage_pelvis',
        new THREE.Mesh(new THREE.TubeGeometry(clavCurve, 20, 0.042, 12, false), ribMat)
      );
    });

    // 10 أزواج من الأضلاع المنحنية حول الرئتين والقلب
    for (let r = 0; r < 10; r++) {
      const yBack = 4.78 - r * 0.195;
      const yFront = yBack - 0.16;
      const width = 0.78 + Math.sin((r / 9) * Math.PI) * 0.38;
      const depthFront = r < 7 ? 0.55 : 0.42 - (r - 7) * 0.12;

      [-1, 1].forEach((side) => {
        const ribPts = [
          new THREE.Vector3(side * 0.14, yBack, -0.32),
          new THREE.Vector3(side * (width * 0.75), yBack - 0.04, -0.22),
          new THREE.Vector3(side * width, (yBack + yFront) / 2, 0.12),
          new THREE.Vector3(
            side * (r < 7 ? 0.14 : width * 0.52),
            yFront,
            depthFront
          )
        ];
        const ribCurve = new THREE.CatmullRomCurve3(ribPts);
        registerOrganMesh(
          'ribcage_pelvis',
          new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 28, 0.032, 10, false), ribMat)
        );
      });
    }

    // الحزام الحوضي (Pelvic Girdle)
    [-1, 1].forEach((side) => {
      const iliumGeom = new THREE.TorusGeometry(0.45, 0.11, 16, 28, Math.PI * 1.15);
      iliumGeom.scale(1.0, 1.1, 0.65);
      const iliumMesh = new THREE.Mesh(iliumGeom, ribMat);
      iliumMesh.position.set(side * 0.46, 0.78, -0.02);
      iliumMesh.rotation.z = side * 0.55;
      iliumMesh.rotation.y = side * -0.45;
      registerOrganMesh('ribcage_pelvis', iliumMesh);
    });

    // عظام العضد والساعد والفخذ والساق
    const limbBones = [
      // العضد والساعد الأيمن والأيسر
      [new THREE.Vector3(-1.38, 4.68, 0.02), new THREE.Vector3(-1.65, 3.3, 0.04)],
      [new THREE.Vector3(-1.65, 3.22, 0.04), new THREE.Vector3(-1.82, 1.95, 0.14)],
      [new THREE.Vector3(1.38, 4.68, 0.02), new THREE.Vector3(1.65, 3.3, 0.04)],
      [new THREE.Vector3(1.65, 3.22, 0.04), new THREE.Vector3(1.82, 1.95, 0.14)],
      // عظمة الفخذ والساق اليمنى واليسرى
      [new THREE.Vector3(-0.56, 0.45, 0.0), new THREE.Vector3(-0.52, -1.25, 0.02)],
      [new THREE.Vector3(-0.52, -1.35, 0.02), new THREE.Vector3(-0.52, -2.85, 0.0)],
      [new THREE.Vector3(0.56, 0.45, 0.0), new THREE.Vector3(0.52, -1.25, 0.02)],
      [new THREE.Vector3(0.52, -1.35, 0.02), new THREE.Vector3(0.52, -2.85, 0.0)]
    ];

    limbBones.forEach((pts) => {
      const c = new THREE.CatmullRomCurve3(pts);
      registerOrganMesh(
        'ribcage_pelvis',
        new THREE.Mesh(new THREE.TubeGeometry(c, 18, 0.075, 14, false), ribMat)
      );
    });
  }

  // =========================================================================
  // 8. الغلاف الخارجي الزجاجي الهولوغرامي لجسم الإنسان (Body Contour Shell)
  // =========================================================================
  const bodyShellGroup = new THREE.Group();
  rootGroup.add(bodyShellGroup);

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#38BDF8'),
    roughness: 0.18,
    metalness: 0.08,
    clearcoat: 1.0,
    transmission: 0.0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color('#0284C7'),
    emissiveIntensity: 0.12
  });

  const shellWireMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#00F2FE'),
    wireframe: true,
    transparent: true,
    opacity: 0.06,
    depthWrite: false
  });

  function addShellPart(geom, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
    const m1 = new THREE.Mesh(geom, shellMat);
    m1.position.set(...pos);
    m1.rotation.set(...rot);
    m1.scale.set(...scale);
    bodyShellGroup.add(m1);

    const m2 = new THREE.Mesh(geom, shellWireMat);
    m2.position.set(...pos);
    m2.rotation.set(...rot);
    m2.scale.set(...scale);
    bodyShellGroup.add(m2);
  }

  {
    // الجذع الكامل المنحوت (العنق + الصدر + الخصر + البطن + الحوض)
    const torsoProfile = [
      new THREE.Vector2(0.01, 0.05), // قاعدة الحوض
      new THREE.Vector2(0.88, 0.35), // الوركان
      new THREE.Vector2(0.98, 0.85), // الحوض العلوي
      new THREE.Vector2(0.86, 1.55), // البطن السفلي
      new THREE.Vector2(0.82, 2.25), // الخصر
      new THREE.Vector2(0.96, 3.15), // القفص الصدري السفلي
      new THREE.Vector2(1.16, 4.15), // الصدر العلوي
      new THREE.Vector2(1.26, 4.78), // الكتفان
      new THREE.Vector2(0.45, 5.05), // قاعدة العنق
      new THREE.Vector2(0.38, 5.85), // أعلى العنق
      new THREE.Vector2(0.01, 5.95)
    ];
    const torsoLathe = new THREE.LatheGeometry(torsoProfile, 48);
    torsoLathe.scale(1.06, 1.0, 0.68);
    addShellPart(torsoLathe, [0, 0.0, 0.04]);

    // الرأس والوجه الخارجي
    const headGeom = new THREE.SphereGeometry(0.76, 36, 32);
    addShellPart(headGeom, [0, 6.72, 0.04], [0, 0, 0], [0.88, 1.15, 0.98]);

    // الذراعان واليدان والساقان
    const shellLimbs = [
      // الذراع اليمنى واليسرى
      {
        pts: [
          new THREE.Vector3(-1.26, 4.68, 0.02),
          new THREE.Vector3(-1.58, 3.85, 0.02),
          new THREE.Vector3(-1.72, 2.85, 0.06),
          new THREE.Vector3(-1.86, 1.75, 0.16)
        ],
        radii: [0.34, 0.28, 0.24, 0.18]
      },
      {
        pts: [
          new THREE.Vector3(1.26, 4.68, 0.02),
          new THREE.Vector3(1.58, 3.85, 0.02),
          new THREE.Vector3(1.72, 2.85, 0.06),
          new THREE.Vector3(1.86, 1.75, 0.16)
        ],
        radii: [0.34, 0.28, 0.24, 0.18]
      },
      // الساق اليمنى واليسرى
      {
        pts: [
          new THREE.Vector3(-0.55, 0.35, 0.02),
          new THREE.Vector3(-0.54, -0.95, 0.04),
          new THREE.Vector3(-0.52, -2.1, 0.0),
          new THREE.Vector3(-0.52, -3.1, 0.02)
        ],
        radii: [0.44, 0.34, 0.26, 0.19]
      },
      {
        pts: [
          new THREE.Vector3(0.55, 0.35, 0.02),
          new THREE.Vector3(0.54, -0.95, 0.04),
          new THREE.Vector3(0.52, -2.1, 0.0),
          new THREE.Vector3(0.52, -3.1, 0.02)
        ],
        radii: [0.44, 0.34, 0.26, 0.19]
      }
    ];

    shellLimbs.forEach((limb) => {
      const g = createVariableTubeGeometry(limb.pts, limb.radii, 36, 20);
      addShellPart(g, [0, 0, 0]);
    });
  }

  // =========================================================================
  // 9. الجسيمات الحيوية المتحركة (تدفق الدم الشرياني والوريدي والسيالات العصبية)
  // =========================================================================
  const flowParticlesGroup = new THREE.Group();
  rootGroup.add(flowParticlesGroup);

  function createFlowParticleSystem(colorHex, count, paths) {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const meta = [];

    for (let i = 0; i < count; i++) {
      const curve = new THREE.CatmullRomCurve3(paths[i % paths.length]);
      const t = Math.random();
      const speed = 0.22 + Math.random() * 0.25;
      const pt = curve.getPointAt(t);
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;
      meta.push({ curve, t, speed });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(colorHex),
      size: 0.085,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ptsMesh = new THREE.Points(geom, mat);
    ptsMesh.userData.meta = meta;
    flowParticlesGroup.add(ptsMesh);
    return ptsMesh;
  }

  animatedRefs.bloodParticles = createFlowParticleSystem('#FF2E4C', 90, [
    [
      new THREE.Vector3(0.14, 4.02, 0.25),
      new THREE.Vector3(0.12, 4.5, 0.08),
      new THREE.Vector3(0.08, 3.2, -0.15),
      new THREE.Vector3(0.02, 1.42, -0.12),
      new THREE.Vector3(-0.5, -1.6, 0.04)
    ],
    [
      new THREE.Vector3(0.14, 4.02, 0.25),
      new THREE.Vector3(0.12, 4.5, 0.08),
      new THREE.Vector3(0.18, 6.2, -0.02),
      new THREE.Vector3(0.22, 6.95, 0.05)
    ],
    [
      new THREE.Vector3(0.14, 4.02, 0.25),
      new THREE.Vector3(-0.75, 4.78, 0.02),
      new THREE.Vector3(-1.78, 2.1, 0.12)
    ]
  ]);

  animatedRefs.venousParticles = createFlowParticleSystem('#38BDF8', 70, [
    [
      new THREE.Vector3(-0.52, -1.6, 0.02),
      new THREE.Vector3(-0.14, 1.35, -0.12),
      new THREE.Vector3(-0.16, 3.1, -0.06),
      new THREE.Vector3(-0.08, 3.95, 0.2)
    ],
    [
      new THREE.Vector3(-0.22, 6.75, 0.0),
      new THREE.Vector3(-0.2, 5.2, 0.08),
      new THREE.Vector3(-0.1, 4.05, 0.22)
    ]
  ]);

  animatedRefs.neuralParticles = createFlowParticleSystem('#FDE047', 75, [
    [
      new THREE.Vector3(0, 6.95, 0.02),
      new THREE.Vector3(0, 5.88, -0.2),
      new THREE.Vector3(0, 3.5, -0.4),
      new THREE.Vector3(0, 1.1, -0.34),
      new THREE.Vector3(0.55, -1.6, -0.05)
    ],
    [
      new THREE.Vector3(0, 6.95, 0.02),
      new THREE.Vector3(0, 5.1, -0.28),
      new THREE.Vector3(1.62, 3.4, 0.05),
      new THREE.Vector3(1.78, 2.2, 0.12)
    ]
  ]);

  // =========================================================================
  // 10. منصة الهولوغرام الأرضية بشعار FATYAK
  // =========================================================================
  {
    const floorGeom = new THREE.PlaneGeometry(6.8, 6.8);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshBasicMaterial({
      map: textures.floorLogo,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.position.set(0, -3.22, 0);
    rootGroup.add(floorMesh);
    animatedRefs.floorRing = floorMesh;
  }

  return {
    rootGroup,
    organGroups,
    selectableMeshes,
    bodyShellGroup,
    shellMat,
    shellWireMat,
    boneMat,
    flowParticlesGroup,
    animatedRefs
  };
}
