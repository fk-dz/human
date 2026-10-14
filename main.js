import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SYSTEMS_DATA, ORGANS_DATA, QUIZ_QUESTIONS } from './organsData.js';
import { buildHumanAnatomyScene } from './anatomyBuilder.js';

/**
 * التطبيق التفاعلي الكامل لأطلس جسم الإنسان ثلاثي الأبعاد
 * المطور: FATYAK - مجاني بالكامل وبدون أي API خارجي
 */

class FatyakAnatomyEngine {
  constructor() {
    this.organsMap = new Map();
    ORGANS_DATA.forEach((o) => this.organsMap.set(o.id, o));

    // حالة التطبيق
    this.state = {
      activeSystem: 'all',
      selectedOrganId: 'heart',
      hoveredOrganId: null,
      isolatedOrganId: null,
      focusDimOthers: false,
      labelMode: 'all', // 'all' | 'direct' | 'hover' | 'none'
      visualMode: 'normal', // 'normal' | 'pure' | 'xray'
      explodeAmount: 0.0, // 0 to 1
      shellOpacity: 0.16,
      boneOpacity: 0.26,
      clipHeight: 9.0, // مستوى المقطع العرضي
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

    // انتقال الكاميرا السلس
    this.camAnim = {
      active: false,
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
      startTarget: new THREE.Vector3(),
      endTarget: new THREE.Vector3(),
      progress: 0,
      duration: 0.85
    };

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownPos = new THREE.Vector2();

    this.labelElements = new Map(); // organId -> { tagEl, lineEl, dotEl }
    this.ecgPoints = [];

    this.initScene();
    this.initUI();
    this.create3DLabels();
    this.selectOrgan('heart', false);
    this.animate();
  }

  initScene() {
    this.viewportEl = document.getElementById('viewport-container');
    const width = this.viewportEl.clientWidth || window.innerWidth;
    const height = this.viewportEl.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();

    // كاميرا عالية الدقة
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(0.0, 3.6, 8.8);

    // الريندر مع دعم المقاطع التشريحية والتقاط الصور
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.localClippingEnabled = true;

    this.viewportEl.appendChild(this.renderer.domElement);

    // مستوى المقطع التشريحي المتحرك (Clipping Plane)
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 9.0);

    // التحكم المداري بالكاميرا
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0.0, 3.2, 0.0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 16.5;
    this.controls.maxPolarAngle = Math.PI * 0.92;
    this.controls.update();

    // إضاءة طبية استوديو احترافية ثلاثية الأبعاد
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.15);
    hemiLight.position.set(0, 12, 0);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
    keyLight.position.set(4.5, 8.5, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    fillLight.position.set(-5.5, 4.0, 4.5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 0.95);
    rimLight.position.set(0.0, 5.5, -6.5);
    this.scene.add(rimLight);

    const heartPointLight = new THREE.PointLight(0xef4444, 0.9, 3.5);
    heartPointLight.position.set(0.2, 3.85, 0.65);
    this.scene.add(heartPointLight);
    this.heartPointLight = heartPointLight;

    // بناء جسم الإنسان وكافة أعضائه الداخلية الثلاثية الأبعاد
    this.anatomy = buildHumanAnatomyScene(this.scene, ORGANS_DATA);

    // تطبيق مستوى القص على جميع المواد عند تفعيله
    this.updateClippingPlanes();

    // أحداث الفأرة واللمس وتغيير الحجم
    window.addEventListener('resize', () => this.onResize());
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', (e) => {
      this.pointerDownPos.set(e.clientX, e.clientY);
    });
    dom.addEventListener('pointermove', (e) => this.onPointerMove(e));
    dom.addEventListener('pointerup', (e) => this.onPointerUp(e));
  }

  // =========================================================================
  // إنشاء وإدارة التسميات العربية ثلاثية الأبعاد مع خطوط الإشارة الذكية
  // =========================================================================
  create3DLabels() {
    this.labelsLayer = document.getElementById('labels-3d-layer');
    this.svgLinesLayer = document.getElementById('labels-svg-lines');
    this.labelsLayer.innerHTML = '';
    this.svgLinesLayer.innerHTML = '';

    ORGANS_DATA.forEach((organ) => {
      // خط الإشارة الشعاعي SVG
      const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      lineEl.setAttribute('fill', 'none');
      lineEl.setAttribute('stroke', organ.badgeColor || '#06B6D4');
      lineEl.setAttribute('stroke-width', '1.6');
      lineEl.setAttribute('stroke-opacity', '0.78');
      lineEl.classList.add('organ-leader-line');
      this.svgLinesLayer.appendChild(lineEl);

      // النقطة المضيئة فوق العضو مباشرة
      const dotEl = document.createElement('div');
      dotEl.className = 'organ-anchor-dot';
      dotEl.style.setProperty('--organ-color', organ.badgeColor || '#06B6D4');
      this.labelsLayer.appendChild(dotEl);

      // بطاقة التسمية العربية العائمة
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

      tagEl.addEventListener('mouseenter', () => {
        this.setHoveredOrgan(organ.id);
      });
      tagEl.addEventListener('mouseleave', () => {
        this.setHoveredOrgan(null);
      });

      this.labelsLayer.appendChild(tagEl);
      this.labelElements.set(organ.id, { tagEl, lineEl, dotEl, organ });
    });
  }

  update3DLabels() {
    if (!this.viewportEl) return;
    const width = this.viewportEl.clientWidth;
    const height = this.viewportEl.clientHeight;
    if (width === 0 || height === 0) return;

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

    const tempAnchor = new THREE.Vector3();
    const tempCallout = new THREE.Vector3();

    this.labelElements.forEach((item, organId) => {
      const { tagEl, lineEl, dotEl, organ } = item;
      const grp = this.anatomy.organGroups[organId];

      // التحقق مما إذا كان العضو مرئياً حالياً
      const isVisible = grp && grp.visible;
      const isSelectedOrHovered =
        this.state.selectedOrganId === organId || this.state.hoveredOrganId === organId;

      if (!isVisible || (mode === 'hover' && !isSelectedOrHovered)) {
        tagEl.style.display = 'none';
        lineEl.style.display = 'none';
        dotEl.style.display = 'none';
        return;
      }

      // حساب موقع العضو في الفضاء مع مراعاة تفكيك الأعضاء (Explode)
      tempAnchor.set(...organ.labelPos);
      if (grp) {
        tempAnchor.add(grp.position);
      }

      // التحقق من مستوى القص التشريحي
      if (this.state.clipEnabled && tempAnchor.y > this.state.clipHeight) {
        tagEl.style.display = 'none';
        lineEl.style.display = 'none';
        dotEl.style.display = 'none';
        return;
      }

      const projAnchor = tempAnchor.clone().project(this.camera);
      if (projAnchor.z > 1.0 || projAnchor.z < -1.0) {
        tagEl.style.display = 'none';
        lineEl.style.display = 'none';
        dotEl.style.display = 'none';
        return;
      }

      const ax = (projAnchor.x * 0.5 + 0.5) * width;
      const ay = (-projAnchor.y * 0.5 + 0.5) * height;

      if (mode === 'direct') {
        directItems.push({ item, ax, ay, isSelectedOrHovered });
      } else {
        // حساب اتجاه التسمية (يسار أو يمين الشاشة) لعدم تغطية الأعضاء الداخلية!
        tempCallout.copy(tempAnchor).add(new THREE.Vector3(...organ.labelOffset));
        const projCallout = tempCallout.project(this.camera);
        const cx = (projCallout.x * 0.5 + 0.5) * width;
        const cy = (-projCallout.y * 0.5 + 0.5) * height;

        const isRightSideOfScreen = cx >= width * 0.5;
        const entry = { item, ax, ay, cx, cy, isSelectedOrHovered };
        if (isRightSideOfScreen) rightColumn.push(entry);
        else leftColumn.push(entry);
      }
    });

    // نمط التسميات المباشرة المختصرة فوق العضو
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

    // خوارزمية منع تداخل التسميات العربية وتوزيعها بانسيابية على جانبي الجسم
    const solveColumnSpacing = (list, isRightScreen) => {
      list.sort((a, b) => a.cy - b.cy);
      const minGap = 31;
      const topBound = 76;
      const bottomBound = height - 88;

      // دفع للأسفل لمنع التراكب
      for (let i = 1; i < list.length; i++) {
        if (list[i].cy - list[i - 1].cy < minGap) {
          list[i].cy = list[i - 1].cy + minGap;
        }
      }
      // دفع للأعلى إذا تجاوز الحد السفلي
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

        // تحديد الإحداثي الأفقي للتسمية بحيث تبقى الأعضاء في المنتصف مكشوفة تماماً
        const spreadOffset = Math.min(220, Math.max(125, width * 0.2));
        const targetX = isRightScreen
          ? Math.min(width - 135, Math.max(ax + 55, width * 0.5 + spreadOffset))
          : Math.max(135, Math.min(ax - 55, width * 0.5 - spreadOffset));

        const elbowX = isRightScreen ? targetX - 22 : targetX + 22;

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
        lineEl.setAttribute('stroke-width', isSelectedOrHovered ? '2.8' : '1.4');
        lineEl.setAttribute('stroke-opacity', isSelectedOrHovered ? '1.0' : '0.62');
      });
    };

    solveColumnSpacing(leftColumn, false);
    solveColumnSpacing(rightColumn, true);
  }

  // =========================================================================
  // التفاعل مع المجسمات ثلاثية الأبعاد (اختيار، عزل، تفكيك، أشعة سينية)
  // =========================================================================
  onPointerMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const visibleMeshes = this.anatomy.selectableMeshes.filter((m) => {
      const grp = this.anatomy.organGroups[m.userData.organId];
      // في الوضع العادي نتجنب التقاط القفص الصدري الشفاف أولاً حتى يسهل النقر على الأعضاء الداخلية خلفه
      if (
        this.state.activeSystem !== 'skeletal' &&
        (m.userData.organId === 'ribcage_pelvis' || m.userData.organId === 'spine_skull') &&
        this.state.boneOpacity < 0.45
      ) {
        return false;
      }
      return grp && grp.visible;
    });

    const intersects = this.raycaster.intersectObjects(visibleMeshes, false);
    let hitOrganId = null;
    for (const hit of intersects) {
      if (!this.state.clipEnabled || hit.point.y <= this.state.clipHeight) {
        hitOrganId = hit.object.userData.organId;
        break;
      }
    }

    this.setHoveredOrgan(hitOrganId);
    this.renderer.domElement.style.cursor = hitOrganId ? 'pointer' : 'grab';
  }

  onPointerUp(e) {
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    if (Math.hypot(dx, dy) > 6) return; // كان سحباً لتدوير الكاميرا وليس نقرة

    if (this.state.hoveredOrganId) {
      if (this.state.quizActive) {
        this.handleQuizAttempt(this.state.hoveredOrganId);
      } else {
        this.selectOrgan(this.state.hoveredOrganId, true);
      }
    }
  }

  setHoveredOrgan(organId) {
    if (this.state.hoveredOrganId === organId) return;
    this.state.hoveredOrganId = organId;
    this.refreshOrganMaterials();

    // تحديث شريط المعلومات السريع أسفل المشهد
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

    // إذا كان العضو مخفياً بسبب تصفية جهاز آخر، نظهر جميع الأجهزة أو جهازه
    const grp = this.anatomy.organGroups[organId];
    if (grp && !grp.visible) {
      this.setSystemFilter('all');
    }

    this.refreshOrganMaterials();
    this.renderOrganInspector(organ);
    this.highlightDirectoryItem(organId);

    if (flyCamera && organ.cameraPos && organ.cameraTarget) {
      const explodeOffset = grp ? grp.position : new THREE.Vector3();
      this.flyTo(
        new THREE.Vector3(...organ.cameraPos).add(explodeOffset),
        new THREE.Vector3(...organ.cameraTarget).add(explodeOffset)
      );
    }

    if (this.state.isSpeaking) {
      this.speakSelectedOrgan();
    }
  }

  flyTo(targetCamPos, targetLookAt) {
    this.camAnim.startPos.copy(this.camera.position);
    this.camAnim.endPos.copy(targetCamPos);
    this.camAnim.startTarget.copy(this.controls.target);
    this.camAnim.endTarget.copy(targetLookAt);
    this.camAnim.progress = 0;
    this.camAnim.active = true;
  }

  setCameraPreset(preset) {
    this.state.isolatedOrganId = null;
    this.updateVisibility();
    switch (preset) {
      case 'front':
        this.flyTo(new THREE.Vector3(0.0, 3.6, 8.8), new THREE.Vector3(0.0, 3.2, 0.0));
        break;
      case 'back':
        this.flyTo(new THREE.Vector3(0.0, 3.6, -8.8), new THREE.Vector3(0.0, 3.2, 0.0));
        break;
      case 'right':
        this.flyTo(new THREE.Vector3(-8.2, 3.6, 0.5), new THREE.Vector3(0.0, 3.2, 0.0));
        break;
      case 'left':
        this.flyTo(new THREE.Vector3(8.2, 3.6, 0.5), new THREE.Vector3(0.0, 3.2, 0.0));
        break;
      case 'head_thorax':
        this.flyTo(new THREE.Vector3(0.0, 5.2, 4.4), new THREE.Vector3(0.0, 5.0, 0.0));
        break;
      case 'abdomen':
        this.flyTo(new THREE.Vector3(0.0, 2.0, 4.2), new THREE.Vector3(0.0, 1.9, 0.0));
        break;
    }
  }

  setSystemFilter(systemId) {
    this.state.activeSystem = systemId;
    this.state.isolatedOrganId = null;

    document.querySelectorAll('.system-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.system === systemId);
    });

    this.updateVisibility();
    this.renderOrganDirectory();
  }

  toggleIsolateOrgan(organId) {
    if (this.state.isolatedOrganId === organId) {
      this.state.isolatedOrganId = null;
    } else {
      this.state.isolatedOrganId = organId;
    }
    this.updateVisibility();
    const organ = this.organsMap.get(organId);
    if (organ) this.renderOrganInspector(organ);
  }

  updateVisibility() {
    ORGANS_DATA.forEach((organ) => {
      const grp = this.anatomy.organGroups[organ.id];
      if (!grp) return;

      if (this.state.isolatedOrganId) {
        grp.visible = organ.id === this.state.isolatedOrganId;
      } else if (this.state.activeSystem === 'all') {
        if (this.state.visualMode === 'pure' && organ.system === 'skeletal') {
          grp.visible = false;
        } else {
          grp.visible = true;
        }
      } else {
        grp.visible = organ.system === this.state.activeSystem;
      }
    });

    // غلاف الجسم الخارجي
    if (this.anatomy.bodyShellGroup) {
      this.anatomy.bodyShellGroup.visible =
        !this.state.isolatedOrganId &&
        this.state.visualMode !== 'pure' &&
        this.state.shellOpacity > 0.01;
    }

    this.refreshOrganMaterials();
  }

  refreshOrganMaterials() {
    const isXray = this.state.visualMode === 'xray';

    ORGANS_DATA.forEach((organ) => {
      const grp = this.anatomy.organGroups[organ.id];
      if (!grp) return;

      const isSelected = this.state.selectedOrganId === organ.id;
      const isHovered = this.state.hoveredOrganId === organ.id;
      const isDimmed =
        this.state.focusDimOthers &&
        this.state.selectedOrganId &&
        !isSelected &&
        !isHovered &&
        !this.state.isolatedOrganId;

      grp.userData.materials.forEach((mat) => {
        if (organ.system === 'skeletal') {
          mat.transparent = true;
          mat.opacity = isSelected ? Math.max(0.65, this.state.boneOpacity) : this.state.boneOpacity;
          mat.depthWrite = mat.opacity > 0.75;
        } else if (isXray) {
          mat.transparent = true;
          mat.opacity = isSelected ? 0.92 : 0.48;
          mat.wireframe = false;
          mat.emissive.set(organ.color);
          mat.emissiveIntensity = isSelected ? 0.85 : 0.42;
          mat.depthWrite = false;
        } else {
          mat.wireframe = false;
          if (isDimmed) {
            mat.transparent = true;
            mat.opacity = 0.22;
            mat.depthWrite = false;
          } else {
            mat.transparent = mat.userData.baseTransparent;
            mat.opacity = mat.userData.baseOpacity;
            mat.depthWrite = !mat.transparent || mat.opacity > 0.8;
          }

          if (isSelected) {
            mat.emissive.set(organ.color);
            mat.emissiveIntensity = 0.36;
          } else if (isHovered) {
            mat.emissive.set(organ.color);
            mat.emissiveIntensity = 0.22;
          } else {
            mat.emissive.set('#000000');
            mat.emissiveIntensity = 0.0;
          }
        }
      });
    });
  }

  updateExplodePositions() {
    const factor = this.state.explodeAmount;
    ORGANS_DATA.forEach((organ) => {
      const grp = this.anatomy.organGroups[organ.id];
      if (!grp) return;
      grp.position.copy(grp.userData.explodeVec).multiplyScalar(factor);
    });
  }

  updateClippingPlanes() {
    const planes = this.state.clipEnabled ? [this.clipPlane] : [];
    this.scene.traverse((obj) => {
      if (obj.isMesh && obj.material && obj !== this.anatomy.animatedRefs.floorRing) {
        obj.material.clippingPlanes = planes;
      }
    });
  }

  // =========================================================================
  // بناء واجهة المستخدم العربية الاحترافية (بشعار وهوية المطور FATYAK)
  // =========================================================================
  initUI() {
    // 1. أزرار تصفية الأجهزة الحيوية
    const sysBar = document.getElementById('systems-filter-bar');
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

    // 2. البحث الفوري عن الأعضاء بالعربية أو الإنجليزية
    const searchInput = document.getElementById('organ-search-input');
    searchInput.addEventListener('input', (e) => {
      this.state.searchQuery = e.target.value.trim();
      this.renderOrganDirectory();
    });

    // 3. أشرطة التحكم بالتفكيك والشفافية والمقطع العرضي
    const explodeSlider = document.getElementById('slider-explode');
    const explodeVal = document.getElementById('val-explode');
    explodeSlider.addEventListener('input', (e) => {
      this.state.explodeAmount = parseFloat(e.target.value) / 100;
      explodeVal.textContent = `${e.target.value}%`;
      this.updateExplodePositions();
    });

    const shellSlider = document.getElementById('slider-shell-opacity');
    const shellVal = document.getElementById('val-shell-opacity');
    shellSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      this.state.shellOpacity = val;
      this.anatomy.shellMat.opacity = val;
      this.anatomy.shellWireMat.opacity = val * 0.4;
      shellVal.textContent = `${e.target.value}%`;
      this.updateVisibility();
    });

    const boneSlider = document.getElementById('slider-bone-opacity');
    const boneVal = document.getElementById('val-bone-opacity');
    boneSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      this.state.boneOpacity = val;
      boneVal.textContent = `${e.target.value}%`;
      this.refreshOrganMaterials();
    });

    const clipToggle = document.getElementById('toggle-clip-plane');
    const clipSlider = document.getElementById('slider-clip-height');
    clipToggle.addEventListener('change', (e) => {
      this.state.clipEnabled = e.target.checked;
      clipSlider.disabled = !this.state.clipEnabled;
      this.updateClippingPlanes();
    });
    clipSlider.addEventListener('input', (e) => {
      this.state.clipHeight = parseFloat(e.target.value);
      this.clipPlane.constant = this.state.clipHeight;
    });

    // 4. التحكم بنبض القلب والتنفس
    const bpmSlider = document.getElementById('slider-heart-bpm');
    const bpmVal = document.getElementById('val-heart-bpm');
    bpmSlider.addEventListener('input', (e) => {
      this.state.heartRateBpm = parseInt(e.target.value, 10);
      bpmVal.textContent = `${this.state.heartRateBpm} نبضة/د`;
    });

    // 5. أزرار أوضاع الرؤية والتسميات
    document.querySelectorAll('[data-visual-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.visualMode = btn.dataset.visualMode;
        document.querySelectorAll('[data-visual-mode]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        this.updateVisibility();
      });
    });

    document.querySelectorAll('[data-label-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.labelMode = btn.dataset.labelMode;
        document.querySelectorAll('[data-label-mode]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
      });
    });

    // 6. أزرار زوايا الكاميرا السريعة
    document.querySelectorAll('[data-cam-preset]').forEach((btn) => {
      btn.addEventListener('click', () => this.setCameraPreset(btn.dataset.camPreset));
    });

    // 7. أزرار الأدوات العلوية (دوران تلقائي، تركيز بصري، التقاط صورة، اختبار تفاعلي، نافذة المطور FATYAK)
    document.getElementById('btn-toggle-autorotate').addEventListener('click', (e) => {
      this.state.autoRotate = !this.state.autoRotate;
      e.currentTarget.classList.toggle('active', this.state.autoRotate);
    });

    document.getElementById('btn-toggle-dim').addEventListener('click', (e) => {
      this.state.focusDimOthers = !this.state.focusDimOthers;
      e.currentTarget.classList.toggle('active', this.state.focusDimOthers);
      this.refreshOrganMaterials();
    });

    document.getElementById('btn-toggle-particles').addEventListener('click', (e) => {
      this.state.showParticles = !this.state.showParticles;
      this.anatomy.flowParticlesGroup.visible = this.state.showParticles;
      e.currentTarget.classList.toggle('active', this.state.showParticles);
    });

    document.getElementById('btn-capture-screenshot').addEventListener('click', () => {
      this.exportHighResScreenshot();
    });

    document.getElementById('btn-start-quiz').addEventListener('click', () => {
      this.toggleQuizMode();
    });

    document.getElementById('btn-fatyak-modal').addEventListener('click', () => {
      document.getElementById('fatyak-developer-modal').classList.add('open');
    });
    document.getElementById('btn-close-fatyak-modal').addEventListener('click', () => {
      document.getElementById('fatyak-developer-modal').classList.remove('open');
    });

    this.renderOrganDirectory();
  }

  renderOrganDirectory() {
    const listEl = document.getElementById('organs-directory-list');
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

    document.getElementById('organs-count-badge').textContent = `${filtered.length} عضو`;

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
      el.addEventListener('click', () => {
        this.selectOrgan(el.dataset.organId, true);
      });
      el.addEventListener('mouseenter', () => {
        this.setHoveredOrgan(el.dataset.organId);
      });
      el.addEventListener('mouseleave', () => {
        this.setHoveredOrgan(null);
      });
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

    document.getElementById('btn-speak-organ').addEventListener('click', () => {
      this.speakSelectedOrgan();
    });

    document.getElementById('btn-isolate-organ').addEventListener('click', () => {
      this.toggleIsolateOrgan(organ.id);
    });
  }

  // =========================================================================
  // النطق الصوتي العربي المجاني المدمج في المتصفح (Web Speech API - بدون أي API خارجي)
  // =========================================================================
  speakSelectedOrgan() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const organ = this.organsMap.get(this.state.selectedOrganId);
    if (!organ) return;

    const text = `${organ.nameAr}. ينتمي إلى ${organ.systemAr}. الموقع التشريحي: ${organ.locationAr} الوظيفة الحيوية: ${organ.functionAr}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ar-SA';
    utter.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ar'));
    if (arVoice) utter.voice = arVoice;

    const speakBtn = document.getElementById('btn-speak-organ');
    utter.onstart = () => {
      this.state.isSpeaking = true;
      if (speakBtn) speakBtn.innerHTML = '<span>⏹️</span> إيقاف القراءة الصوتية';
    };
    utter.onend = () => {
      this.state.isSpeaking = false;
      if (speakBtn) speakBtn.innerHTML = '<span>🔊</span> نطق الشرح بالعربية';
    };

    if (this.state.isSpeaking) {
      window.speechSynthesis.cancel();
      this.state.isSpeaking = false;
      if (speakBtn) speakBtn.innerHTML = '<span>🔊</span> نطق الشرح بالعربية';
    } else {
      window.speechSynthesis.speak(utter);
    }
  }

  // =========================================================================
  // اختبار التشريح التفاعلي ثلاثي الأبعاد (Interactive 3D Anatomy Quiz)
  // =========================================================================
  toggleQuizMode() {
    this.state.quizActive = !this.state.quizActive;
    const banner = document.getElementById('quiz-overlay-banner');
    const btn = document.getElementById('btn-start-quiz');

    if (this.state.quizActive) {
      this.state.quizIndex = 0;
      this.state.quizScore = 0;
      this.state.isolatedOrganId = null;
      this.setSystemFilter('all');
      banner.classList.add('active');
      btn.classList.add('active');
      this.renderQuizQuestion();
    } else {
      banner.classList.remove('active');
      btn.classList.remove('active');
    }
  }

  renderQuizQuestion() {
    const q = QUIZ_QUESTIONS[this.state.quizIndex];
    const banner = document.getElementById('quiz-overlay-banner');
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

    document.getElementById('btn-exit-quiz').addEventListener('click', () => {
      this.toggleQuizMode();
    });
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
      feedbackEl.className = 'quiz-feedback success';
      feedbackEl.innerHTML = `✅ إجابة صحيحة ممتازة! هذا هو <strong>${clickedOrgan.nameAr}</strong>.`;

      setTimeout(() => {
        if (!this.state.quizActive) return;
        this.state.quizIndex = (this.state.quizIndex + 1) % QUIZ_QUESTIONS.length;
        this.renderQuizQuestion();
      }, 2100);
    } else {
      feedbackEl.className = 'quiz-feedback error';
      feedbackEl.innerHTML = `❌ اخترت (${clickedOrgan ? clickedOrgan.shortAr : ''}) — حاول مرة أخرى وابحث عن العضو المطلوب!`;
    }
  }

  // =========================================================================
  // تصدير صورة عالية الدقة مع شعار المطور FATYAK والعضو المحدد
  // =========================================================================
  exportHighResScreenshot() {
    this.renderer.render(this.scene, this.camera);
    const glCanvas = this.renderer.domElement;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = glCanvas.width;
    outCanvas.height = glCanvas.height;
    const ctx = outCanvas.getContext('2d');

    // خلفية داكنة طبية احترافية
    const bgGrad = ctx.createRadialGradient(
      outCanvas.width * 0.5,
      outCanvas.height * 0.5,
      50,
      outCanvas.width * 0.5,
      outCanvas.height * 0.5,
      outCanvas.width * 0.7
    );
    bgGrad.addColorStop(0, '#0f223d');
    bgGrad.addColorStop(1, '#040914');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

    ctx.drawImage(glCanvas, 0, 0);

    // ختم شعار المطور FATYAK ومعلومات العضو المحدد
    const organ = this.organsMap.get(this.state.selectedOrganId);
    ctx.fillStyle = 'rgba(7, 15, 32, 0.85)';
    ctx.strokeStyle = '#00F2FE';
    ctx.lineWidth = 2;
    ctx.fillRect(24, outCanvas.height - 96, 520, 72);
    ctx.strokeRect(24, outCanvas.height - 96, 520, 72);

    ctx.fillStyle = '#00F2FE';
    ctx.font = '900 24px "Segoe UI", "Cairo", sans-serif';
    ctx.fillText('FATYAK • 3D HUMAN ANATOMY ATLAS', 42, outCanvas.height - 62);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 18px "Segoe UI", "Cairo", sans-serif';
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

  // =========================================================================
  // راسم تخطيط القلب الكهربائي الحي (Live ECG / EKG Canvas Monitor)
  // =========================================================================
  updateEcgMonitor(elapsed) {
    const canvas = document.getElementById('ecg-live-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const bps = this.state.heartRateBpm / 60;
    const phase = (elapsed * bps) % 1.0;

    // توليد موجة P-QRS-T واقعية لتخطيط القلب الكهربائي
    let ySignal = 0;
    if (phase > 0.1 && phase < 0.2) {
      ySignal = Math.sin(((phase - 0.1) / 0.1) * Math.PI) * 0.22; // موجة P
    } else if (phase >= 0.24 && phase < 0.27) {
      ySignal = -0.25; // موجة Q
    } else if (phase >= 0.27 && phase < 0.32) {
      ySignal = 1.0; // قمة R الانقباضية الحادة
    } else if (phase >= 0.32 && phase < 0.36) {
      ySignal = -0.38; // موجة S
    } else if (phase >= 0.45 && phase < 0.62) {
      ySignal = Math.sin(((phase - 0.45) / 0.17) * Math.PI) * 0.35; // موجة T
    }

    this.ecgPoints.push(h * 0.58 - ySignal * (h * 0.44));
    if (this.ecgPoints.length > w) this.ecgPoints.shift();

    ctx.clearRect(0, 0, w, h);

    // شبكة تخطيط القلب
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // رسم خط التخطيط النابض
    ctx.beginPath();
    for (let i = 0; i < this.ecgPoints.length; i++) {
      if (i === 0) ctx.moveTo(i, this.ecgPoints[i]);
      else ctx.lineTo(i, this.ecgPoints[i]);
    }
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // النقطة المضيئة في مقدمة التخطيط
    if (this.ecgPoints.length > 0) {
      const lx = this.ecgPoints.length - 1;
      const ly = this.ecgPoints[lx];
      ctx.fillStyle = '#00F2FE';
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  onResize() {
    if (!this.viewportEl) return;
    const width = this.viewportEl.clientWidth;
    const height = this.viewportEl.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // =========================================================================
  // حلقة التحريك الفسيولوجي المستمر (نبض القلب، تنفس الرئتين، تدفق الدم والأعصاب)
  // =========================================================================
  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // 1. انتقال الكاميرا السلس عند اختيار عضو
    if (this.camAnim.active) {
      this.camAnim.progress += dt / this.camAnim.duration;
      const t = Math.min(1.0, this.camAnim.progress);
      const ease = 1 - Math.pow(1 - t, 3); // Cubic ease-out

      this.camera.position.lerpVectors(this.camAnim.startPos, this.camAnim.endPos, ease);
      this.controls.target.lerpVectors(this.camAnim.startTarget, this.camAnim.endTarget, ease);

      if (t >= 1.0) this.camAnim.active = false;
    } else if (this.state.autoRotate) {
      this.anatomy.rootGroup.rotation.y += dt * 0.35;
    }

    // 2. محاكاة نبض القلب الحقيقي (Systole & Diastole)
    const { heartGroup, rightLungGroup, leftLungGroup, diaphragmMesh, floorRing } =
      this.anatomy.animatedRefs;

    if (heartGroup && heartGroup.visible) {
      const bps = this.state.heartRateBpm / 60;
      const beatPhase = (elapsed * bps) % 1.0;
      const pulse =
        Math.exp(-Math.pow((beatPhase - 0.18) * 12, 2)) * 0.085 +
        Math.exp(-Math.pow((beatPhase - 0.38) * 14, 2)) * 0.045;
      heartGroup.scale.set(1 + pulse, 1 + pulse * 0.85, 1 + pulse);
      if (this.heartPointLight) {
        this.heartPointLight.intensity = 0.7 + pulse * 8.0;
      }
    }

    // 3. محاكاة تنفس الرئتين وحركة الحجاب الحاجز
    const respHz = this.state.respRateRpm / 60;
    const breath = (Math.sin(elapsed * respHz * Math.PI * 2) + 1) * 0.5; // 0 to 1
    if (rightLungGroup) {
      rightLungGroup.scale.set(1 + breath * 0.048, 1 + breath * 0.035, 1 + breath * 0.055);
    }
    if (leftLungGroup) {
      leftLungGroup.scale.set(1 + breath * 0.048, 1 + breath * 0.035, 1 + breath * 0.055);
    }
    if (diaphragmMesh) {
      diaphragmMesh.position.y = 3.05 - breath * 0.065;
    }

    // 4. تحريك جسيمات الدم الشرياني والوريدي والسيالات العصبية
    if (this.state.showParticles) {
      [
        this.anatomy.animatedRefs.bloodParticles,
        this.anatomy.animatedRefs.venousParticles,
        this.anatomy.animatedRefs.neuralParticles
      ].forEach((ptsMesh) => {
        if (!ptsMesh) return;
        const posAttr = ptsMesh.geometry.attributes.position;
        const meta = ptsMesh.userData.meta;
        for (let i = 0; i < meta.length; i++) {
          meta[i].t = (meta[i].t + dt * meta[i].speed) % 1.0;
          const pt = meta[i].curve.getPointAt(meta[i].t);
          posAttr.setXYZ(i, pt.x, pt.y, pt.z);
        }
        posAttr.needsUpdate = true;
      });
    }

    // 5. دوران هادئ لمنصة شعار المطور FATYAK الأرضية
    if (floorRing) {
      floorRing.rotation.z = elapsed * 0.08;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.update3DLabels();
    this.updateEcgMonitor(elapsed);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.fatyakApp = new FatyakAnatomyEngine();
});
