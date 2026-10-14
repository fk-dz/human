/**
 * محرك النحت والعرض الثلاثي الأبعاد الفائق الوضوح لجسم الإنسان والأعضاء الداخلية
 * تطوير وتصميم: FATYAK - 3D Human Anatomy Engine (يعمل 100% على كافة المتصفحات بدون WebGL2 أو API)
 */

// دالة مساعدة لتوليد منحنى ثلاثي الأبعاد ناعم (Catmull-Rom Spline 3D)
export function sampleCatmullRom3D(pts, segments) {
  if (!pts || pts.length === 0) return [];
  if (pts.length === 1) return [{ x: pts[0][0], y: pts[0][1], z: pts[0][2], t: 0 }];

  const result = [];
  const n = pts.length;

  for (let i = 0; i <= segments; i++) {
    const tGlobal = i / segments;
    const scaled = tGlobal * (n - 1);
    const idx = Math.min(n - 2, Math.floor(scaled));
    const t = scaled - idx;

    const p0 = pts[Math.max(0, idx - 1)];
    const p1 = pts[idx];
    const p2 = pts[Math.min(n - 1, idx + 1)];
    const p3 = pts[Math.min(n - 1, idx + 2)];

    const t2 = t * t;
    const t3 = t2 * t;

    const calc = (c0, c1, c2, c3) =>
      0.5 *
      (2 * c1 +
        (-c0 + c2) * t +
        (2 * c0 - 5 * c1 + 4 * c2 - c3) * t2 +
        (-c0 + 3 * c1 - 3 * c2 + c3) * t3);

    result.push({
      x: calc(p0[0], p1[0], p2[0], p3[0]),
      y: calc(p0[1], p1[1], p2[1], p3[1]),
      z: calc(p0[2], p1[2], p2[2], p3[2]),
      t: tGlobal
    });
  }
  return result;
}

// استيفاء نصف القطر على طول الأنبوب ثلاثي الأبعاد
function interpolateRadius(radii, t) {
  if (typeof radii === 'number') return radii;
  if (!Array.isArray(radii) || radii.length === 0) return 0.08;
  if (radii.length === 1) return radii[0];
  const scaled = t * (radii.length - 1);
  const i0 = Math.floor(scaled);
  const i1 = Math.min(radii.length - 1, i0 + 1);
  const f = scaled - i0;
  return radii[i0] * (1 - f) + radii[i1] * f;
}

/**
 * بناء النموذج الثلاثي الأبعاد الكامل لجسم الإنسان وكافة الأعضاء الداخلية (22 عضواً وهيكلاً)
 */
export function buildHumanAnatomyModel(organsData) {
  const primitives = []; // كافة العناصر الحجمية ثلاثية الأبعاد للأعضاء
  const shellSegments = []; // خطوط وحلقات الغلاف الزجاجي الخارجي للجسم
  const flowPaths = {
    arterial: [],
    venous: [],
    neural: []
  };

  const organMeta = {};
  organsData.forEach((o) => {
    organMeta[o.id] = {
      id: o.id,
      system: o.system,
      color: o.color,
      explodeVec: o.explodeVec || [0, 0, 0]
    };
  });

  // إضافة كرة/فص حجمي ثلاثي الأبعاد لعضو معين
  function addLobe(organId, x, y, z, rx, ry, rz, color, opts = {}) {
    primitives.push({
      type: 'lobe',
      organId,
      system: organMeta[organId] ? organMeta[organId].system : 'other',
      x,
      y,
      z,
      rx,
      ry: ry ?? rx,
      rz: rz ?? rx,
      color: color || (organMeta[organId] ? organMeta[organId].color : '#38bdf8'),
      alpha: opts.alpha ?? 1.0,
      pattern: opts.pattern || null, // 'gyri' | 'folia' | 'lung' | 'ring' | 'vessel' | 'bone'
      animGroup: opts.animGroup || null, // 'heart' | 'lung_r' | 'lung_l' | 'diaphragm'
      shine: opts.shine ?? 0.65
    });
  }

  // إضافة أنبوب تشريحي ثلاثي الأبعاد مكون من مقاطع متصلة ناعمة
  function addTube(organId, controlPts, radii, steps, color, opts = {}) {
    const sampled = sampleCatmullRom3D(controlPts, steps);
    for (let i = 0; i < sampled.length; i++) {
      const pt = sampled[i];
      let r = interpolateRadius(radii, pt.t);
      if (opts.haustra) {
        r *= 1.0 + 0.16 * Math.abs(Math.sin(pt.t * Math.PI * 24));
      }
      const nextPt = sampled[Math.min(sampled.length - 1, i + 1)];
      primitives.push({
        type: 'tubeNode',
        organId,
        system: organMeta[organId] ? organMeta[organId].system : 'other',
        x: pt.x,
        y: pt.y,
        z: pt.z,
        nx: nextPt.x,
        ny: nextPt.y,
        nz: nextPt.z,
        rx: r,
        ry: r,
        rz: r,
        color: color || (organMeta[organId] ? organMeta[organId].color : '#38bdf8'),
        alpha: opts.alpha ?? 1.0,
        pattern: opts.rings && i % 2 === 0 ? 'ring' : opts.pattern || null,
        animGroup: opts.animGroup || null,
        shine: opts.shine ?? 0.55,
        isEndCap: i === 0 || i === sampled.length - 1
      });
    }
  }

  // =========================================================================
  // 1. الجهاز العصبي والحواس (المخ، المخيخ، جذع الدماغ، الحبل الشوكي، العينان)
  // =========================================================================

  // أ. المخ (Cerebrum): نصفا الكرة المخية الأيمن والأيسر مع الفصوص والتلافيف
  [-1, 1].forEach((side) => {
    // الفص الجبهي والجداري والقذالي والصدغي لكل نصف كرة مخية
    addLobe('cerebrum', side * 0.24, 7.05, 0.14, 0.28, 0.28, 0.34, '#E8A5B8', {
      pattern: 'gyri',
      shine: 0.75
    });
    addLobe('cerebrum', side * 0.25, 7.08, -0.14, 0.27, 0.27, 0.3, '#E295AB', {
      pattern: 'gyri',
      shine: 0.75
    });
    addLobe('cerebrum', side * 0.31, 6.82, 0.05, 0.22, 0.2, 0.28, '#DF8CA4', {
      pattern: 'gyri',
      shine: 0.7
    });
    addLobe('cerebrum', side * 0.21, 6.88, -0.26, 0.22, 0.22, 0.24, '#D9829B', {
      pattern: 'gyri',
      shine: 0.7
    });
  });
  // الجسم الثفني الرابط بين نصفي الكرة المخية
  addLobe('cerebrum', 0.0, 6.92, 0.02, 0.18, 0.12, 0.24, '#F3C1CF', { shine: 0.6 });

  // ب. المخيخ (Cerebellum)
  [-1, 1].forEach((side) => {
    addLobe('cerebellum', side * 0.2, 6.42, -0.34, 0.21, 0.16, 0.19, '#C96E88', {
      pattern: 'folia',
      shine: 0.65
    });
  });
  addLobe('cerebellum', 0.0, 6.42, -0.35, 0.12, 0.15, 0.16, '#B85D77', { pattern: 'folia' });

  // ج. جذع الدماغ (Brainstem: Midbrain, Pons, Medulla)
  addLobe('brainstem', 0.0, 6.52, -0.05, 0.13, 0.12, 0.13, '#F1B6C8', { shine: 0.7 });
  addLobe('brainstem', 0.0, 6.34, -0.06, 0.16, 0.15, 0.15, '#EAA3B8', { shine: 0.75 }); // الجسر (Pons)
  addTube(
    'brainstem',
    [
      [0.0, 6.24, -0.08],
      [0.0, 6.08, -0.14],
      [0.0, 5.92, -0.18]
    ],
    [0.11, 0.09, 0.075],
    8,
    '#E598B0'
  );

  // د. الحبل الشوكي وشبكة الأعصاب الطرفية (Spinal Cord & Nerves)
  const spinalPath = [
    [0.0, 5.9, -0.19],
    [0.0, 5.2, -0.26],
    [0.0, 4.2, -0.36],
    [0.0, 3.0, -0.34],
    [0.0, 1.85, -0.29],
    [0.0, 0.95, -0.32]
  ];
  addTube('spinal_cord', spinalPath, [0.065, 0.06, 0.058, 0.055, 0.05, 0.035], 38, '#FDE047', {
    shine: 0.9
  });
  flowPaths.neural.push(spinalPath);

  // الضفيرة العضدية وأعصاب الذراعين والأعصاب الوركية للساقين
  [-1, 1].forEach((s) => {
    const armNerve = [
      [0.0, 5.15, -0.26],
      [s * 0.65, 4.92, -0.1],
      [s * 1.32, 4.5, 0.0],
      [s * 1.58, 3.35, 0.05],
      [s * 1.75, 2.1, 0.12]
    ];
    addTube('spinal_cord', armNerve, 0.024, 18, '#FACC15', { shine: 0.85 });
    flowPaths.neural.push(armNerve);

    const legNerve = [
      [0.0, 1.15, -0.31],
      [s * 0.4, 0.65, -0.15],
      [s * 0.52, -0.55, -0.05],
      [s * 0.52, -1.85, -0.02]
    ];
    addTube('spinal_cord', legNerve, 0.026, 18, '#FACC15', { shine: 0.85 });
    flowPaths.neural.push(legNerve);

    // أعصاب الصدر والبطن المتفرعة
    for (let k = 0; k < 5; k++) {
      const ny = 4.4 - k * 0.55;
      addTube(
        'spinal_cord',
        [
          [0.0, ny, -0.34],
          [s * 0.42, ny - 0.08, -0.22],
          [s * 0.76, ny - 0.16, 0.02]
        ],
        0.018,
        7,
        '#FDE047'
      );
    }
  });

  // هـ. العينان والعصب البصري (Eyes & Optic Nerves)
  [-1, 1].forEach((s) => {
    addLobe('eyes', s * 0.26, 6.78, 0.52, 0.115, 0.115, 0.115, '#FFFFFF', {
      pattern: 'eye',
      shine: 0.95
    });
    addTube(
      'eyes',
      [
        [s * 0.25, 6.78, 0.42],
        [s * 0.11, 6.72, 0.2],
        [0.0, 6.68, 0.05]
      ],
      0.026,
      7,
      '#FDE68A'
    );
  });

  // =========================================================================
  // 2. الجهاز التنفسي (الحنجرة، القصبة الهوائية، الرئتان، الحجاب الحاجز)
  // =========================================================================

  // أ. الحنجرة والغضروف الدرقي (Larynx)
  addLobe('larynx', 0.0, 5.62, 0.18, 0.15, 0.14, 0.14, '#7DD3FC', { shine: 0.75 });
  addLobe('larynx', 0.0, 5.46, 0.17, 0.13, 0.09, 0.13, '#38BDF8', { shine: 0.75 });

  // ب. القصبة الهوائية والشجرة القصبية (Trachea & Bronchi)
  addTube(
    'trachea',
    [
      [0.0, 5.38, 0.15],
      [0.0, 4.9, 0.13],
      [0.0, 4.42, 0.09]
    ],
    0.1,
    16,
    '#7DD3FC',
    { rings: true, shine: 0.8 }
  );
  // الشعب الهوائية المتفرعة داخل الرئتين
  [-1, 1].forEach((s) => {
    addTube(
      'trachea',
      [
        [0.0, 4.44, 0.09],
        [s * 0.35, 4.24, 0.08],
        [s * 0.64, 4.1, 0.07]
      ],
      [0.08, 0.065, 0.048],
      10,
      '#38BDF8',
      { rings: true }
    );
    addTube(
      'trachea',
      [
        [s * 0.35, 4.24, 0.08],
        [s * 0.58, 4.55, 0.06]
      ],
      [0.055, 0.036],
      6,
      '#38BDF8'
    );
    addTube(
      'trachea',
      [
        [s * 0.48, 4.16, 0.08],
        [s * 0.72, 3.68, 0.05]
      ],
      [0.055, 0.036],
      6,
      '#38BDF8'
    );
  });

  // ج. الرئة اليمنى (3 فصوص: علوي، أوسط، سفلي)
  addLobe('right_lung', -0.58, 4.58, 0.08, 0.34, 0.36, 0.32, '#F48FB1', {
    pattern: 'lung',
    animGroup: 'lung_r',
    alpha: 0.92
  });
  addLobe('right_lung', -0.66, 4.12, 0.14, 0.42, 0.34, 0.36, '#EC709A', {
    pattern: 'lung',
    animGroup: 'lung_r',
    alpha: 0.92
  });
  addLobe('right_lung', -0.7, 3.66, 0.05, 0.45, 0.36, 0.38, '#E35D8A', {
    pattern: 'lung',
    animGroup: 'lung_r',
    alpha: 0.92
  });

  // د. الرئة اليسرى (فصان: علوي وسفلي مع نحت الثلمة القلبية لإظهار القلب بوضوح!)
  addLobe('left_lung', 0.58, 4.58, 0.08, 0.34, 0.36, 0.32, '#F06292', {
    pattern: 'lung',
    animGroup: 'lung_l',
    alpha: 0.92
  });
  addLobe('left_lung', 0.74, 4.12, 0.08, 0.36, 0.33, 0.34, '#E85285', {
    pattern: 'lung',
    animGroup: 'lung_l',
    alpha: 0.92
  });
  addLobe('left_lung', 0.72, 3.66, 0.04, 0.42, 0.36, 0.36, '#DC4376', {
    pattern: 'lung',
    animGroup: 'lung_l',
    alpha: 0.92
  });

  // هـ. عضلة الحجاب الحاجز القبية (Diaphragm)
  addTube(
    'diaphragm',
    [
      [-0.95, 3.02, 0.12],
      [-0.55, 3.32, 0.18],
      [0.0, 3.24, 0.2],
      [0.55, 3.28, 0.18],
      [0.95, 2.98, 0.12]
    ],
    [0.09, 0.14, 0.13, 0.14, 0.09],
    24,
    '#D97757',
    { animGroup: 'diaphragm', shine: 0.6 }
  );

  // =========================================================================
  // 3. الجهاز الدوري والوعائي (القلب، الشريان الأبهر، الوريد الأجوف، الطحال)
  // =========================================================================

  // أ. القلب النابض (Heart) بتفاصيل الأذينين والبطينين والشرايين التاجية
  addLobe('heart', 0.16, 3.85, 0.28, 0.26, 0.3, 0.25, '#DC2626', {
    animGroup: 'heart',
    pattern: 'vessel',
    shine: 0.92
  }); // البطين الأيسر والأيمن
  addLobe('heart', 0.29, 3.62, 0.35, 0.18, 0.2, 0.18, '#B91C1C', {
    animGroup: 'heart',
    shine: 0.92
  }); // قمة القلب (Apex) المائلة لليسار
  addLobe('heart', -0.03, 4.02, 0.24, 0.16, 0.16, 0.16, '#991B1B', {
    animGroup: 'heart',
    shine: 0.85
  }); // الأذين الأيمن
  addLobe('heart', 0.28, 4.04, 0.18, 0.15, 0.15, 0.15, '#991B1B', {
    animGroup: 'heart',
    shine: 0.85
  }); // الأذين الأيسر
  // الجذع الرئوي والشرايين التاجية على سطح القلب
  addTube(
    'heart',
    [
      [0.08, 4.0, 0.34],
      [0.15, 4.24, 0.26],
      [0.04, 4.32, 0.15]
    ],
    0.062,
    8,
    '#2563EB',
    { animGroup: 'heart' }
  );
  addTube(
    'heart',
    [
      [0.14, 4.02, 0.44],
      [0.2, 3.84, 0.48],
      [0.28, 3.64, 0.44]
    ],
    0.022,
    10,
    '#FF4D6D',
    { animGroup: 'heart', shine: 0.95 }
  );

  // ب. الشريان الأبهر (الأورطي) والشجرة الشريانية (Aorta & Arteries)
  const mainAorta = [
    [0.14, 4.04, 0.24],
    [0.04, 4.38, 0.2],
    [0.16, 4.54, 0.06],
    [0.16, 4.2, -0.14],
    [0.08, 3.35, -0.15],
    [0.04, 2.35, -0.14],
    [0.02, 1.4, -0.12]
  ];
  addTube('aorta', mainAorta, [0.09, 0.1, 0.095, 0.085, 0.08, 0.074, 0.068], 36, '#EF4444', {
    shine: 0.88
  });
  flowPaths.arterial.push(mainAorta);

  // الشرايين السباتية للرأس، وتحت الترقوة للذراعين، والحرقفية الفخذية للساقين
  [-1, 1].forEach((s) => {
    const carotid = [
      [0.08, 4.48, 0.12],
      [s * 0.16, 5.25, 0.04],
      [s * 0.18, 6.25, -0.02]
    ];
    addTube('aorta', carotid, 0.034, 14, '#EF4444');
    flowPaths.arterial.push(carotid);

    const subclavianArm = [
      [0.08, 4.46, 0.1],
      [s * 0.72, 4.76, 0.02],
      [s * 1.42, 4.42, 0.02],
      [s * 1.66, 3.2, 0.08],
      [s * 1.8, 2.0, 0.14]
    ];
    addTube('aorta', subclavianArm, 0.032, 18, '#EF4444');
    flowPaths.arterial.push(subclavianArm);

    const femoralLeg = [
      [0.02, 1.4, -0.12],
      [s * 0.34, 0.78, 0.02],
      [s * 0.48, -0.45, 0.05],
      [s * 0.48, -1.8, 0.03]
    ];
    addTube('aorta', femoralLeg, 0.044, 18, '#EF4444');
    flowPaths.arterial.push(femoralLeg);

    // الشريان الكلوي
    addTube(
      'aorta',
      [
        [0.04, s === -1 ? 2.18 : 2.28, -0.14],
        [s * 0.46, s === -1 ? 2.12 : 2.25, -0.18]
      ],
      0.03,
      6,
      '#EF4444'
    );
  });

  // ج. الوريد الأجوف العلوي والسفلي والأوردة الكبرى (Vena Cava & Veins)
  const svcPath = [
    [-0.18, 4.72, 0.14],
    [-0.16, 4.36, 0.18],
    [-0.08, 4.06, 0.22]
  ];
  addTube('vena_cava', svcPath, 0.08, 12, '#2563EB', { shine: 0.85 });

  const ivcPath = [
    [-0.14, 1.35, -0.12],
    [-0.18, 2.25, -0.12],
    [-0.16, 3.12, -0.06],
    [-0.08, 3.76, 0.14]
  ];
  addTube('vena_cava', ivcPath, 0.084, 24, '#2563EB', { shine: 0.85 });
  flowPaths.venous.push(ivcPath);

  [-1, 1].forEach((s) => {
    const jugular = [
      [s * 0.22, 6.2, 0.0],
      [s * 0.22, 5.2, 0.08],
      [-0.18, 4.7, 0.14]
    ];
    addTube('vena_cava', jugular, 0.035, 14, '#3B82F6');
    flowPaths.venous.push(jugular);

    const iliacVein = [
      [s * 0.54, -1.8, 0.01],
      [s * 0.54, -0.45, 0.03],
      [s * 0.38, 0.75, 0.0],
      [-0.14, 1.35, -0.12]
    ];
    addTube('vena_cava', iliacVein, 0.044, 18, '#2563EB');
    flowPaths.venous.push(iliacVein);
  });

  // د. الطحال (Spleen)
  addLobe('spleen', 0.96, 2.76, -0.06, 0.19, 0.32, 0.22, '#7E22CE', { shine: 0.85 });

  // =========================================================================
  // 4. الجهاز الهضمي (المريء، المعدة، الكبد، المرارة، البنكرياس، الأمعاء، الزائدة)
  // =========================================================================

  // أ. البلعوم والمريء (Esophagus)
  addTube(
    'esophagus',
    [
      [0.0, 5.75, -0.02],
      [0.02, 4.85, -0.04],
      [0.05, 3.85, -0.04],
      [0.18, 3.06, 0.08],
      [0.28, 2.88, 0.16]
    ],
    0.065,
    24,
    '#E07A5F'
  );

  // ب. المعدة (Stomach - شكل حرف J الواقعي)
  addTube(
    'stomach',
    [
      [0.28, 2.88, 0.16], // الفؤاد
      [0.52, 2.98, 0.16], // قاع المعدة (Fundus)
      [0.62, 2.72, 0.24], // جسم المعدة
      [0.54, 2.42, 0.28], // المنحنى الكبير
      [0.32, 2.28, 0.24], // غار البواب
      [0.12, 2.38, 0.18] // البواب
    ],
    [0.095, 0.23, 0.26, 0.22, 0.15, 0.09],
    26,
    '#F4845F',
    { shine: 0.85 }
  );

  // ج. الكبد (Liver) بفصيه الأيمن الكبير والأيسر الممتد
  addLobe('liver', -0.52, 2.88, 0.22, 0.42, 0.36, 0.34, '#9A3412', { shine: 0.9 }); // الفص الأيمن الكبير
  addLobe('liver', -0.22, 2.92, 0.26, 0.32, 0.28, 0.28, '#B45309', { shine: 0.9 }); // وسط الكبد
  addLobe('liver', 0.08, 2.95, 0.24, 0.24, 0.18, 0.2, '#9A3412', { shine: 0.88 }); // الفص الأيسر

  // د. المرارة (الحويصلة الصفراوية الخضراء) والقنوات الصفراوية
  addTube(
    'gallbladder',
    [
      [-0.5, 2.46, 0.38],
      [-0.4, 2.54, 0.3],
      [-0.26, 2.58, 0.2],
      [-0.14, 2.4, 0.14]
    ],
    [0.105, 0.082, 0.04, 0.024],
    14,
    '#10B981',
    { shine: 0.95 }
  );

  // هـ. البنكرياس (Pancreas)
  addTube(
    'pancreas',
    [
      [-0.06, 2.22, 0.1],
      [0.15, 2.34, 0.08],
      [0.46, 2.42, 0.04],
      [0.8, 2.56, -0.02]
    ],
    [0.14, 0.105, 0.095, 0.055],
    18,
    '#FBBF24',
    { pattern: 'gyri', shine: 0.65 }
  );

  // و. الأمعاء الدقيقة (Small Intestine)
  const siPts = [
    [0.1, 2.36, 0.16],
    [-0.18, 2.38, 0.12],
    [-0.22, 2.08, 0.1],
    [0.08, 2.02, 0.18]
  ];
  for (let r = 0; r < 5; r++) {
    const y = 1.94 - r * 0.19;
    const dir = r % 2 === 0 ? 1 : -1;
    for (let s = -2; s <= 2; s++) {
      siPts.push([
        s * dir * 0.21,
        y + Math.cos(s * 1.4 + r) * 0.05,
        0.22 + Math.sin(r * 1.7 + s) * 0.07
      ]);
    }
  }
  siPts.push([-0.58, 1.08, 0.18]);
  addTube('small_intestine', siPts, 0.082, 85, '#F4A261', { shine: 0.8 });

  // ز. الأمعاء الغليظة / القولون والمستقيم (Large Intestine) مع التقببات القولونية
  const colonPts = [
    [-0.72, 0.98, 0.18], // الأعور
    [-0.76, 1.5, 0.16], // القولون الصاعد
    [-0.72, 2.12, 0.16], // الثنية الكبدية
    [-0.3, 2.08, 0.28], // القولون المستعرض الأيمن
    [0.3, 2.12, 0.28], // القولون المستعرض الأيسر
    [0.76, 2.22, 0.14], // الثنية الطحالية
    [0.78, 1.56, 0.14], // القولون النازل
    [0.68, 1.02, 0.14], // القولون السيني
    [0.28, 0.85, 0.1],
    [0.0, 0.72, -0.04], // المستقيم
    [0.0, 0.34, -0.06]
  ];
  addTube(
    'large_intestine',
    colonPts,
    [0.16, 0.145, 0.14, 0.135, 0.135, 0.135, 0.13, 0.125, 0.118, 0.115, 0.085],
    68,
    '#D97757',
    { haustra: true, shine: 0.75 }
  );

  // ح. الزائدة الدودية (Appendix)
  addTube(
    'appendix',
    [
      [-0.72, 0.96, 0.18],
      [-0.82, 0.82, 0.22],
      [-0.78, 0.68, 0.25]
    ],
    0.042,
    8,
    '#EA580C',
    { shine: 0.85 }
  );

  // =========================================================================
  // 5. الجهاز البولي (الكليتان، الحالبان، المثانة البولية)
  // =========================================================================

  // أ. الكلية اليمنى والكلية اليسرى (Kidneys)
  addTube(
    'kidneys',
    [
      [-0.48, 2.28, -0.18],
      [-0.58, 2.12, -0.18],
      [-0.48, 1.96, -0.18]
    ],
    [0.14, 0.17, 0.14],
    10,
    '#9333EA',
    { shine: 0.9 }
  );
  addTube(
    'kidneys',
    [
      [0.48, 2.41, -0.18],
      [0.58, 2.25, -0.18],
      [0.48, 2.09, -0.18]
    ],
    [0.14, 0.17, 0.14],
    10,
    '#9333EA',
    { shine: 0.9 }
  );

  // ب. الحالبان (Ureters)
  [-1, 1].forEach((s) => {
    addTube(
      'ureters',
      [
        [s * 0.44, s === -1 ? 2.08 : 2.2, -0.16],
        [s * 0.36, 1.45, -0.12],
        [s * 0.28, 0.88, 0.06],
        [s * 0.12, 0.62, 0.24]
      ],
      0.028,
      16,
      '#C084FC'
    );
  });

  // ج. المثانة البولية والإحليل (Bladder & Urethra)
  addLobe('bladder', 0.0, 0.58, 0.28, 0.22, 0.2, 0.21, '#A855F7', { shine: 0.88 });
  addTube(
    'bladder',
    [
      [0.0, 0.42, 0.28],
      [0.0, 0.18, 0.26]
    ],
    0.036,
    6,
    '#9333EA'
  );

  // =========================================================================
  // 6. جهاز الغدد الصماء (الغدة الدرقية، الغدة الزعترية، الغدتان الكظريتان)
  // =========================================================================

  // أ. الغدة الدرقية (Thyroid - شكل الفراشة)
  [-1, 1].forEach((s) => {
    addLobe('thyroid', s * 0.13, 5.22, 0.22, 0.085, 0.14, 0.08, '#10B981', { shine: 0.85 });
  });
  addLobe('thyroid', 0.0, 5.18, 0.24, 0.11, 0.055, 0.06, '#059669', { shine: 0.85 });

  // ب. الغدة الزعترية / التيموسية (Thymus)
  [-1, 1].forEach((s) => {
    addLobe('thymus', s * 0.08, 4.56, 0.34, 0.09, 0.16, 0.075, '#34D399', { shine: 0.8 });
  });

  // ج. الغدتان الكظريتان فوق الكليتين (Adrenals)
  addLobe('adrenals', -0.48, 2.44, -0.18, 0.13, 0.1, 0.09, '#F59E0B', { shine: 0.85 });
  addLobe('adrenals', 0.48, 2.57, -0.18, 0.13, 0.1, 0.09, '#F59E0B', { shine: 0.85 });

  // =========================================================================
  // 7. الجهاز الهيكلي العظمي (شبه شفاف لحماية وإبراز الأعضاء الداخلية بوضوح)
  // =========================================================================

  // أ. الجمجمة والعمود الفقري (Skull & Spine)
  addLobe('spine_skull', 0.0, 6.95, -0.02, 0.62, 0.68, 0.68, '#E2E8F0', {
    alpha: 0.26,
    pattern: 'bone'
  });
  addLobe('spine_skull', 0.0, 6.32, 0.16, 0.38, 0.28, 0.36, '#CBD5E1', {
    alpha: 0.26,
    pattern: 'bone'
  });
  // فقرات العمود الفقري
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const vy = 5.85 - t * 4.95;
    const vz = -0.25 - Math.sin(t * Math.PI * 1.6) * 0.12;
    addLobe('spine_skull', 0.0, vy, vz, 0.13 + t * 0.05, 0.09, 0.12, '#E2E8F0', {
      alpha: 0.35
    });
  }

  // ب. القفص الصدري وعظمة القص والترقوة والحوض وعظام الأطراف
  addTube(
    'ribcage_pelvis',
    [
      [0.0, 4.72, 0.52],
      [0.0, 4.18, 0.55],
      [0.0, 3.62, 0.5]
    ],
    0.1,
    10,
    '#E2E8F0',
    { alpha: 0.28 }
  );

  [-1, 1].forEach((s) => {
    // الترقوة
    addTube(
      'ribcage_pelvis',
      [
        [s * 0.12, 4.82, 0.5],
        [s * 0.68, 4.88, 0.32],
        [s * 1.28, 4.8, 0.06]
      ],
      0.045,
      10,
      '#E2E8F0',
      { alpha: 0.32 }
    );

    // الأضلاع المقوسة
    for (let r = 0; r < 8; r++) {
      const ry = 4.72 - r * 0.23;
      const rw = 0.78 + Math.sin((r / 7) * Math.PI) * 0.36;
      addTube(
        'ribcage_pelvis',
        [
          [s * 0.14, ry, -0.32],
          [s * rw * 0.8, ry - 0.04, -0.18],
          [s * rw, ry - 0.1, 0.14],
          [s * (r < 6 ? 0.14 : rw * 0.55), ry - 0.16, r < 6 ? 0.52 : 0.36]
        ],
        0.032,
        12,
        '#CBD5E1',
        { alpha: 0.25 }
      );
    }

    // عظام الحوض
    addTube(
      'ribcage_pelvis',
      [
        [s * 0.18, 0.95, -0.28],
        [s * 0.78, 1.05, 0.04],
        [s * 0.68, 0.52, 0.24],
        [s * 0.12, 0.38, 0.32]
      ],
      0.085,
      14,
      '#CBD5E1',
      { alpha: 0.3 }
    );

    // عظام الذراعين والساقين
    addTube(
      'ribcage_pelvis',
      [
        [s * 1.35, 4.68, 0.02],
        [s * 1.62, 3.3, 0.04],
        [s * 1.8, 1.95, 0.14]
      ],
      0.072,
      16,
      '#CBD5E1',
      { alpha: 0.28 }
    );
    addTube(
      'ribcage_pelvis',
      [
        [s * 0.54, 0.45, 0.0],
        [s * 0.52, -1.25, 0.02],
        [s * 0.52, -2.85, 0.0]
      ],
      0.085,
      18,
      '#CBD5E1',
      { alpha: 0.28 }
    );
  });

  // =========================================================================
  // 8. الغلاف الخارجي الهولوغرامي لجسم الإنسان (Body Contour Rings & Meridians)
  // =========================================================================
  const bodyRings = [
    { y: 7.35, rx: 0.52, rz: 0.58 },
    { y: 6.85, rx: 0.66, rz: 0.72 },
    { y: 6.25, rx: 0.48, rz: 0.54 },
    { y: 5.65, rx: 0.38, rz: 0.38 },
    { y: 5.15, rx: 0.44, rz: 0.4 },
    { y: 4.82, rx: 1.28, rz: 0.56 },
    { y: 4.25, rx: 1.15, rz: 0.64 },
    { y: 3.55, rx: 1.04, rz: 0.6 },
    { y: 2.85, rx: 0.94, rz: 0.56 },
    { y: 2.15, rx: 0.86, rz: 0.52 },
    { y: 1.45, rx: 0.94, rz: 0.56 },
    { y: 0.75, rx: 1.02, rz: 0.6 },
    { y: 0.25, rx: 0.92, rz: 0.54 }
  ];

  bodyRings.forEach((ring) => {
    const pts = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push({
        x: Math.cos(a) * ring.rx,
        y: ring.y,
        z: Math.sin(a) * ring.rz
      });
    }
    shellSegments.push(pts);
  });

  // خطوط طولية لغلاف الجذع والذراعين والساقين
  for (let m = 0; m < 12; m++) {
    const a = (m / 12) * Math.PI * 2;
    const meridian = bodyRings.map((ring) => ({
      x: Math.cos(a) * ring.rx,
      y: ring.y,
      z: Math.sin(a) * ring.rz
    }));
    shellSegments.push(meridian);
  }

  return {
    primitives,
    shellSegments,
    flowPaths,
    organMeta
  };
}
