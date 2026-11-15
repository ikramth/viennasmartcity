/* ============================================================
   ATLAS & OBSERVATOIRE DES VILLES INTELLIGENTES
   Portal controller — cover/hub routing, corpus rendering,
   bilingual FR/AR, submissions, local persistence, optional cloud.
   No build step required.
   ============================================================ */
(function () {
  "use strict";

  var LS_CORPUS = "atlas.corpus.v1";
  var LS_LANG = "atlas.lang";
  var LS_CODE = "atlas.code";
  var LS_VIEW = "atlas.view";
  var LOCAL_FILE_MAX = 1.6 * 1024 * 1024; // localStorage quota safety
  var MAX_FILE = 20 * 1024 * 1024;

  /* Cohort gate. In cloud mode the server validates ATLAS_CLASS_CODE
     (see api/projects.js and api/upload.js). This local constant is the
     fallback gate used when the portal runs in localStorage mode, and is
     also the default value documented in .env.example. */
  var LOCAL_CLASS_CODE = "M1-MEDEA-2026";

  var PAGE_SIZE = 12;
  var PAGE_SIZES = [9, 12, 24];

  /* Upload allow-list: extension → accepted MIME types. */
  var FILE_TYPES = {
    pdf: ["application/pdf"],
    pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"]
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Seed corpus ---------- */
  var SEED = [
    {
      id: "etude-vienne",
      title: "Vienne — le laboratoire européen de la ville intelligente",
      titleAr: "فيينا — مختبر أوروبي للمدينة الذكية",
      city: "Vienne",
      cityAr: "فيينا",
      country: "Autriche",
      countryAr: "النمسا",
      authors: "Étude fondatrice · M1 Smart Cities",
      authorsAr: "دراسة مؤسِّسة · ماستر 1 المدن الذكية",
      category: "international",
      module: "SCF & OUPTI",
      summary:
        "Étude intégrée de la trajectoire viennoise : mobilité multimodale et Smart City Wien Framework, économie circulaire et gestion des déchets, gouvernance ouverte et budget participatif, logement social et quartiers innovants (Seestadt Aspern), avec lecture des indicateurs ISO 37120 / 37122.",
      summaryAr:
        "دراسة متكاملة لتجربة فيينا: النقل المتعدد الوسائط وإطار فيينا للمدن الذكية، الاقتصاد الدائري وتدبير النفايات، الحوكمة المفتوحة والميزانية التشاركية، السكن الاجتماعي والأحياء المبتكرة (زيشتادت أسبيرن)، مع قراءة مؤشرات ISO 37120 / 37122.",
      keywords: ["Mobilité", "Énergie", "Gouvernance", "ISO 37120"],
      keywordsAr: ["التنقل", "الطاقة", "الحوكمة", "ISO 37120"],
      link: "vienna.html",
      featured: true,
      source: "seed",
      createdAt: "2026-09-20T09:00:00.000Z"
    },
    {
      id: "etude-ksar-boughezoul",
      title: "Ksar El Boukhari & Ville nouvelle de Boughezoul",
      titleAr: "قصر البخاري والمدينة الجديدة بوغزول",
      city: "Ksar El Boukhari / Boughezoul",
      cityAr: "قصر البخاري / بوغزول",
      country: "Algérie",
      countryAr: "الجزائر",
      authors: "Étude fondatrice · M1 Smart Cities",
      authorsAr: "دراسة مؤسِّسة · ماستر 1 المدن الذكية",
      category: "algeria",
      module: "OUPTI",
      summary:
        "Diagnostic territorial comparé : armature urbaine, PDAU et instruments de planification, lecture cartographique du tracé de la RN 1, mobilité et perspectives de la ville nouvelle de Boughezoul. Une mise en relation entre héritage territorial et projet urbain intelligent.",
      summaryAr:
        "تشخيص ترابي مقارن: الهيكل الحضري، مخطط PDAU وأدوات التخطيط، قراءة خرائطية لمسار الطريق الوطني رقم 1، التنقل وآفاق المدينة الجديدة بوغزول، مع الربط بين الموروث الترابي والمشروع الحضري الذكي.",
      keywords: ["PDAU", "SIG/GIS", "Planification", "Transport"],
      keywordsAr: ["PDAU", "نظم المعلومات الجغرافية", "التخطيط", "النقل"],
      link: "keb/index.html",
      featured: true,
      source: "seed",
      createdAt: "2026-10-02T09:00:00.000Z"
    }
  ];

  /* ---------- UI strings ---------- */
  var T = {
    fr: {
      read: "Lire l’étude",
      openStudy: "Ouvrir l’étude",
      download: "Télécharger le fichier",
      delete: "Retirer du corpus",
      deleteConfirm: "Retirer cette recherche du corpus local ? Cette action est irréversible.",
      copyLink: "Copier le lien",
      linkCopied: "Lien de l’étude copié.",
      sqlCopied: "Schéma SQL copié.",
      copyFailed: "Impossible de copier automatiquement.",
      localMode: "Mode local",
      cloudMode: "Synchronisé",
      checking: "Vérification…",
      works: "travaux",
      worksOne: "travail",
      allDomains: "Tous les domaines",
      intl: "Villes internationales",
      dz: "Villes algériennes",
      scf: "Frameworks",
      oupti: "Planification",
      publishedLocal: "Recherche publiée sur cet appareil.",
      publishedCloud: "Recherche publiée dans le corpus partagé.",
      savedFallback: "Cloud indisponible — recherche conservée localement.",
      errTitle: "Le titre du projet est obligatoire.",
      errCountry: "Le pays est obligatoire.",
      errAuthors: "Le nom de l’étudiant(e) est obligatoire.",
      errModule: "Choisissez un module (SCF, OUPTI ou transversal).",
      errFile: "Joignez un fichier ou ajoutez un lien de présentation.",
      errLink: "Le lien doit commencer par http:// ou https://.",
      errBigFile: "Fichier trop volumineux (20 Mo maximum).",
      errLocalFile: "En mode local, un fichier de plus de 1,6 Mo ne peut pas être conservé. Ajoutez plutôt un lien.",
      errCloud: "La publication a échoué. Réessayez ou ajoutez un lien.",
      errCode: "Code de cohorte incorrect.",
      errGeneric: "Une erreur est survenue. Réessayez.",
      cloudTesting: "Test de la connexion au stockage…",
      cloudLocalToast: "Aucun stockage cloud détecté : le portail reste en mode local.",
      cloudOkToast: "Stockage cloud connecté.",
      cloudNoteLocal: "Mode local — la recherche restera sur cet appareil.",
      cloudNoteCloud: "Connecté — la recherche sera visible par toute la promotion.",
      uploading: "Envoi du fichier…",
      saving: "Publication de la recherche…",
      done: "Terminé",
      noProjects: "Aucun travail pour le moment.",
      untitled: "Sans titre",
      today: "aujourd’hui",
      viewGrid: "Grille",
      viewIndex: "Index",
      indexCaption: "Index du corpus",
      colNo: "N°",
      colWork: "Travail",
      colModule: "Module",
      colAuthor: "Auteur",
      colDate: "Date",
      prev: "Précédent",
      next: "Suivant",
      page: "Page",
      of: "sur",
      perPage: "Par page",
      errFileType: "Format non autorisé. Utilisez un fichier PDF, PPTX, PNG ou JPG.",
      codeShow: "Afficher le code",
      codeHide: "Masquer le code"
    },
    ar: {
      read: "اقرأ الدراسة",
      openStudy: "افتح الدراسة",
      download: "تحميل الملف",
      delete: "حذف من الفهرس",
      deleteConfirm: "هل تريد حذف هذا البحث من الفهرس المحلي؟ لا يمكن التراجع عن هذا الإجراء.",
      copyLink: "نسخ الرابط",
      linkCopied: "تم نسخ رابط الدراسة.",
      sqlCopied: "تم نسخ مخطط SQL.",
      copyFailed: "تعذّر النسخ تلقائياً.",
      localMode: "وضع محلي",
      cloudMode: "متزامن",
      checking: "جارٍ التحقق…",
      works: "بحوث",
      worksOne: "بحث",
      allDomains: "كل المجالات",
      intl: "مدن عالمية",
      dz: "مدن جزائرية",
      scf: "الأطر",
      oupti: "التخطيط",
      publishedLocal: "تم نشر البحث على هذا الجهاز.",
      publishedCloud: "تم نشر البحث في الفهرس المشترك.",
      savedFallback: "السحابة غير متاحة — تم حفظ البحث محلياً.",
      errTitle: "عنوان المشروع مطلوب.",
      errCountry: "الدولة مطلوبة.",
      errAuthors: "اسم الطالب(ة) مطلوب.",
      errModule: "اختر وحدة (SCF أو OUPTI أو عابرة).",
      errFile: "أرفق ملفاً أو أضف رابط العرض.",
      errLink: "يجب أن يبدأ الرابط بـ http:// أو https://.",
      errBigFile: "الملف كبير جداً (20 ميغابايت كحد أقصى).",
      errLocalFile: "في الوضع المحلي، لا يمكن حفظ ملف يتجاوز 1.6 ميغابايت. أضف رابطاً بدلاً من ذلك.",
      errCloud: "فشل النشر. أعد المحاولة أو أضف رابطاً.",
      errCode: "رمز الفوج غير صحيح.",
      errGeneric: "حدث خطأ. أعد المحاولة.",
      cloudTesting: "جارٍ اختبار الاتصال بالتخزين…",
      cloudLocalToast: "لم يُكتشف تخزين سحابي: تبقى البوابة في الوضع المحلي.",
      cloudOkToast: "تم الاتصال بالتخزين السحابي.",
      cloudNoteLocal: "وضع محلي — سيبقى البحث على هذا الجهاز.",
      cloudNoteCloud: "متصل — سيكون البحث مرئياً لكل الفوج.",
      uploading: "جارٍ إرسال الملف…",
      saving: "جارٍ نشر البحث…",
      done: "تم",
      noProjects: "لا توجد أعمال حالياً.",
      untitled: "بدون عنوان",
      today: "اليوم",
      viewGrid: "شبكة",
      viewIndex: "فهرس",
      indexCaption: "فهرس البحوث",
      colNo: "رقم",
      colWork: "البحث",
      colModule: "الوحدة",
      colAuthor: "الطالب(ة)",
      colDate: "التاريخ",
      prev: "السابق",
      next: "التالي",
      page: "صفحة",
      of: "من",
      perPage: "لكل صفحة",
      errFileType: "صيغة غير مسموحة. استخدم ملف PDF أو PPTX أو PNG أو JPG.",
      codeShow: "إظهار الرمز",
      codeHide: "إخفاء الرمز"
    }
  };

  var PLACEHOLDERS = {
    fr: {
      searchInput: "Rechercher une ville, un auteur, un mot-clé…",
      "f-title": "Barcelone — Superblocks / الجزائر — التنقل الحضري",
      "f-city": "Barcelone",
      "f-country": "Espagne / الجزائر",
      "f-authors": "Prénom Nom",
      "f-summary": "Problématique, méthode, données mobilisées, résultats principaux…",
      "f-keywords": "IoT, SIG/GIS, Transport, Énergie, PDAU",
      "f-link": "https://…",
      "f-code": "Code de cohorte M1"
    },
    ar: {
      searchInput: "ابحث عن مدينة، مؤلف، كلمة مفتاحية…",
      "f-title": "برشلونة — السوبر بلوك / الجزائر — التنقل الحضري",
      "f-city": "برشلونة",
      "f-country": "إسبانيا / الجزائر",
      "f-authors": "الاسم واللقب",
      "f-summary": "الإشكالية، المنهج، المعطيات المستعملة، أهم النتائج…",
      "f-keywords": "IoT، نظم المعلومات الجغرافية، النقل، الطاقة، PDAU",
      "f-link": "https://…",
      "f-code": "رمز فوج ماستر 1"
    }
  };

  /* ---------- State ---------- */
  var state = {
    lang: "fr",
    view: "cover",
    filter: "all",
    sort: "curated",
    query: "",
    viewMode: "grid",
    page: 1,
    pageSize: PAGE_SIZE,
    local: [],
    remote: [],
    cloud: { mode: "local", db: "none", files: false, provider: "localStorage", requireCode: false },
    selected: null,
    file: null,
    busy: false,
    lastFocus: null,
    newId: null
  };

  var els = {};

  /* ---------- Helpers ---------- */
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function norm(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function t(key) {
    return (T[state.lang] && T[state.lang][key]) || T.fr[key] || key;
  }

  function uid() {
    if (window.crypto && window.crypto.randomUUID) return "r-" + window.crypto.randomUUID();
    return "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function icons(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#ic-' + name + '"/></svg>';
  }

  function fileExt(name) {
    var m = /\.([a-z0-9]+)$/i.exec(String(name || "").trim());
    return m ? m[1].toLowerCase() : "";
  }

  function fileTypeAllowed(file) {
    if (!file) return false;
    var ext = fileExt(file.name);
    var mimes = FILE_TYPES[ext];
    if (!mimes) return false;
    var type = String(file.type || "").toLowerCase();
    if (!type || type === "application/octet-stream") return true; // rely on extension
    return mimes.indexOf(type) !== -1;
  }

  function displayFileName(name) {
    var base = String(name || "").split(/[\\/]/).pop() || "fichier";
    return base.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 160);
  }

  function fileUuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function gateRequired() {
    // Only an explicitly open cloud portal disables the gate.
    return !(state.cloud.mode === "cloud" && !state.cloud.requireCode);
  }

  function savedView() {
    try {
      var v = window.localStorage.getItem(LS_VIEW);
      return v === "index" ? "index" : "grid";
    } catch (_) {
      return "grid";
    }
  }

  function formatDate(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(state.lang === "ar" ? "ar-DZ" : "fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }).format(d);
    } catch (_) {
      return d.toISOString().slice(0, 10);
    }
  }

  function formatSize(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function categoryLabel(cat) {
    return cat === "algeria" ? t("dz") : t("intl");
  }

  function moduleClass(mod) {
    if (mod === "SCF") return "tag--scf";
    if (mod === "OUPTI") return "tag--oupti";
    return "tag--both";
  }

  function visualKey(p) {
    if (p.module === "SCF & OUPTI") return "trans";
    if (p.module === "SCF") return "scf";
    if (p.module === "OUPTI") return p.category === "algeria" ? "dz" : "oupti";
    return p.category === "algeria" ? "dz" : "intl";
  }

  function localize(p) {
    var ar = state.lang === "ar";
    return {
      id: p.id,
      title: (ar && p.titleAr) || p.title || t("untitled"),
      city: (ar && p.cityAr) || p.city || "",
      country: (ar && p.countryAr) || p.country || "",
      authors: (ar && p.authorsAr) || p.authors || "",
      category: p.category || "international",
      module: p.module || "SCF & OUPTI",
      summary: (ar && p.summaryAr) || p.summary || "",
      keywords: (ar && Array.isArray(p.keywordsAr) && p.keywordsAr.length ? p.keywordsAr : p.keywords) || [],
      link: p.link || "",
      fileUrl: p.fileUrl || "",
      fileName: p.fileName || "",
      featured: !!p.featured,
      source: p.source || "cloud",
      createdAt: p.createdAt || ""
    };
  }

  function allProjects() {
    var seen = {};
    var out = [];
    var push = function (p) {
      if (!p || !p.id || seen[p.id]) return;
      seen[p.id] = true;
      out.push(p);
    };
    state.local.forEach(push);
    state.remote.forEach(push);
    SEED.forEach(push);
    return out;
  }

  function visibleProjects() {
    var q = norm(state.query);
    var list = allProjects().filter(function (p) {
      var okFilter =
        state.filter === "all" ||
        (state.filter === "international" && p.category === "international") ||
        (state.filter === "algeria" && p.category === "algeria") ||
        (state.filter === "scf" && String(p.module).indexOf("SCF") !== -1) ||
        (state.filter === "oupti" && String(p.module).indexOf("OUPTI") !== -1);
      if (!okFilter) return false;
      if (!q) return true;
      var hay = norm(
        [p.title, p.titleAr, p.city, p.cityAr, p.country, p.countryAr, p.authors,
          p.authorsAr, p.summary, p.summaryAr, (p.keywords || []).join(" "),
          (p.keywordsAr || []).join(" ")].join(" ")
      );
      return hay.indexOf(q) !== -1;
    });

    list.sort(function (a, b) {
      if (state.sort === "az") {
        return String(localize(a).title).localeCompare(String(localize(b).title), state.lang === "ar" ? "ar" : "fr");
      }
      if (state.sort === "recent") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      var fa = a.featured ? 1 : 0;
      var fb = b.featured ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return list;
  }

  /* ---------- Storage ---------- */
  function loadLocal() {
    try {
      var raw = window.localStorage.getItem(LS_CORPUS);
      var parsed = raw ? JSON.parse(raw) : [];
      state.local = Array.isArray(parsed) ? parsed.filter(function (p) { return p && p.id; }) : [];
    } catch (_) {
      state.local = [];
    }
  }

  function saveLocal() {
    try {
      window.localStorage.setItem(LS_CORPUS, JSON.stringify(state.local));
      return true;
    } catch (err) {
      return false;
    }
  }

  function savedCode() {
    try { return window.localStorage.getItem(LS_CODE) || ""; } catch (_) { return ""; }
  }

  /* ---------- Language ---------- */
  function applyLang(lang, persist) {
    state.lang = lang === "ar" ? "ar" : "fr";
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";

    $$("[data-fr]").forEach(function (el) {
      var value = el.getAttribute("data-" + state.lang);
      if (!value) return;
      if (el.classList.contains("cover-title__main")) {
        el.innerHTML = state.lang === "ar"
          ? value
          : "Atlas &amp; Observatoire<br class=\"br-desk\" /> des Villes Intelligentes";
      } else {
        el.textContent = value;
      }
    });

    $$("[data-set-lang]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-set-lang") === state.lang ? "true" : "false");
    });

    var ph = PLACEHOLDERS[state.lang];
    Object.keys(ph).forEach(function (id) {
      var field = document.getElementById(id);
      if (field && "placeholder" in field) field.setAttribute("placeholder", ph[id]);
    });
    if (els.search) {
      els.search.setAttribute("aria-label", state.lang === "ar" ? "ابحث في الفهرس" : "Rechercher un travail");
    }
    if (els.codeToggle) {
      var showingCode = els.codeInput && els.codeInput.type === "text";
      els.codeToggle.setAttribute("aria-label", showingCode ? t("codeHide") : t("codeShow"));
    }

    if (persist !== false) {
      try { window.localStorage.setItem(LS_LANG, state.lang); } catch (_) { /* private mode */ }
    }

    updateCloudUI();
    renderCorpus();
  }

  function setBilingual(el, fr, ar) {
    if (!el) return;
    el.setAttribute("data-fr", fr);
    el.setAttribute("data-ar", ar);
    el.textContent = state.lang === "ar" ? ar : fr;
  }

  /* ---------- Corpus rendering ---------- */
  function renderCorpus() {
    if (!els.grid) return;
    var list = visibleProjects();
    var total = allProjects().length;
    var featured = allProjects().filter(function (p) { return p.featured; }).length;

    if (els.coverCount) els.coverCount.textContent = pad(featured);
    if (els.statFeatured) els.statFeatured.textContent = pad(featured);
    if (els.statTotal) els.statTotal.textContent = pad(total);
    if (els.corpusCount) els.corpusCount.textContent = pad(list.length);

    $$("[data-count]").forEach(function (el) {
      var key = el.getAttribute("data-count");
      var count = allProjects().filter(function (p) {
        if (key === "all") return true;
        if (key === "international") return p.category === "international";
        if (key === "algeria") return p.category === "algeria";
        if (key === "scf") return String(p.module).indexOf("SCF") !== -1;
        if (key === "oupti") return String(p.module).indexOf("OUPTI") !== -1;
        return false;
      }).length;
      el.textContent = count;
    });

    $$(".filter").forEach(function (btn) {
      var active = btn.getAttribute("data-filter") === state.filter;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    $$("[data-view-mode]").forEach(function (btn) {
      var active = btn.getAttribute("data-view-mode") === state.viewMode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (els.filterSummary) {
      var label = state.filter === "all" ? t("allDomains") : t(state.filter === "international" ? "intl" : state.filter === "algeria" ? "dz" : state.filter === "scf" ? "scf" : "oupti");
      var noun = list.length === 1 ? t("worksOne") : t("works");
      setBilingual(els.filterSummary, label + " · " + list.length + " " + noun, label + " · " + list.length + " " + t("works"));
    }

    var pageCount = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > pageCount) state.page = pageCount;
    if (state.page < 1) state.page = 1;
    var start = (state.page - 1) * state.pageSize;
    var end = Math.min(start + state.pageSize, list.length);
    var pageItems = list.slice(start, end);

    var isIndex = state.viewMode === "index";

    if (!list.length) {
      els.grid.innerHTML = "";
      els.grid.hidden = true;
      if (els.indexBody) els.indexBody.innerHTML = "";
      if (els.indexWrap) els.indexWrap.hidden = true;
      if (els.pager) els.pager.hidden = true;
      if (els.empty) els.empty.hidden = false;
      return;
    }
    if (els.empty) els.empty.hidden = true;

    els.grid.hidden = isIndex;
    if (els.indexWrap) els.indexWrap.hidden = !isIndex;

    if (isIndex) {
      els.grid.innerHTML = "";
      renderIndexHead();
      if (els.indexCaption) els.indexCaption.textContent = t("indexCaption");
      if (els.indexBody) {
        els.indexBody.innerHTML = pageItems.map(function (raw, i) {
          return indexRowHTML(raw, start + i + 1);
        }).join("");
      }
    } else {
      els.grid.innerHTML = pageItems.map(cardHTML).join("");
    }

    renderPager(list.length, start, end, pageCount);
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function pageNumbers(page, pageCount) {
    var out = [];
    for (var i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) out.push(i);
      else if (out[out.length - 1] !== "gap") out.push("gap");
    }
    return out;
  }

  function renderPager(total, start, end, pageCount) {
    if (!els.pager) return;
    if (!total) {
      els.pager.hidden = true;
      els.pager.innerHTML = "";
      return;
    }
    els.pager.hidden = false;

    var sizeOptions = PAGE_SIZES.map(function (n) {
      return '<option value="' + n + '"' + (n === state.pageSize ? " selected" : "") + '>' + n + "</option>";
    }).join("");

    var pages = pageNumbers(state.page, pageCount).map(function (n) {
      if (n === "gap") return '<span class="pager__gap" aria-hidden="true">…</span>';
      var current = n === state.page;
      return '<button type="button" class="pager__btn" data-page="' + n + '"' +
        (current ? ' aria-current="page"' : "") +
        ' aria-label="' + esc(t("page") + " " + n + " " + t("of") + " " + pageCount) + '">' + n + "</button>";
    }).join("");

    els.pager.innerHTML =
      '<p class="pager__meta">' +
        "<span><b>" + (start + 1) + "–" + end + "</b> " + esc(t("of")) + " <b>" + total + "</b></span>" +
        '<label class="pager__size"><span>' + esc(t("perPage")) + "</span>" +
          '<select id="pageSize" aria-label="' + esc(t("perPage")) + '">' + sizeOptions + "</select></label>" +
      "</p>" +
      '<div class="pager__pages">' +
        '<button type="button" class="pager__btn" data-page="' + (state.page - 1) + '"' +
          (state.page <= 1 ? " disabled" : "") + ' aria-label="' + esc(t("prev")) + '">' + icons("arrow-left") + "</button>" +
        pages +
        '<button type="button" class="pager__btn" data-page="' + (state.page + 1) + '"' +
          (state.page >= pageCount ? " disabled" : "") + ' aria-label="' + esc(t("next")) + '">' + icons("arrow") + "</button>" +
      "</div>";
  }

  function renderIndexHead() {
    if (!els.indexHead) return;
    els.indexHead.innerHTML =
      "<tr>" +
        '<th scope="col" class="index-no">' + esc(t("colNo")) + "</th>" +
        '<th scope="col" class="index-work">' + esc(t("colWork")) + "</th>" +
        '<th scope="col" class="index-module">' + esc(t("colModule")) + "</th>" +
        '<th scope="col" class="index-author">' + esc(t("colAuthor")) + "</th>" +
        '<th scope="col" class="index-date">' + esc(t("colDate")) + "</th>" +
        '<th scope="col" class="index-go"><span class="sr-only">' + esc(t("read")) + "</span></th>" +
      "</tr>";
  }

  function cardHTML(raw) {
    var p = localize(raw);
    var tags = (p.keywords || []).slice(0, 3).map(function (k) {
      return '<li class="tag">' + esc(k) + '</li>';
    }).join("");
    var extra = (p.keywords || []).length > 3 ? '<li class="tag">+' + (p.keywords.length - 3) + '</li>' : "";
    var place = [p.city, p.country].filter(Boolean).join(" · ");
    return (
      '<article class="project-card' + (state.newId === p.id ? " is-new" : "") + '" ' +
        'role="button" tabindex="0" data-id="' + esc(p.id) + '" ' +
        'aria-label="' + esc(p.title) + ' — ' + esc(t("read")) + '">' +
        '<span class="project-card__accent" data-visual="' + esc(visualKey(raw)) + '" aria-hidden="true"></span>' +
        '<div class="project-card__body">' +
          '<div class="project-card__top">' +
            '<span class="project-card__module" data-module="' + esc(p.module) + '">' + esc(p.module) + '</span>' +
            '<span class="project-card__flag">' + esc(p.category === "algeria" ? "DZ" : "INTL") + '</span>' +
          '</div>' +
          (place ? '<p class="project-card__place">' + icons("pin") + '<span>' + esc(place) + '</span></p>' : "") +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p class="project-card__summary">' + esc(p.summary || "") + '</p>' +
          '<ul class="project-card__tags">' + tags + extra + '</ul>' +
          '<div class="project-card__foot">' +
            '<span class="project-card__author">' + esc(p.authors) + '</span>' +
            '<span class="project-card__more">' + esc(t("read")) + icons("arrow") + '</span>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function indexRowHTML(raw, n) {
    var p = localize(raw);
    var place = [p.city, p.country].filter(Boolean).join(" · ");
    return (
      '<tr class="index-row" data-id="' + esc(p.id) + '">' +
        '<td class="index-no">' + pad(n) + '</td>' +
        '<td class="index-work">' +
          '<a class="index-title" href="#etude=' + encodeURIComponent(p.id) + '">' + esc(p.title) + '</a>' +
          (place ? '<span class="index-place">' + esc(place) + '</span>' : "") +
        '</td>' +
        '<td class="index-module"><span class="tag ' + moduleClass(p.module) + '">' + esc(p.module) + '</span></td>' +
        '<td class="index-author">' + esc(p.authors) + '</td>' +
        '<td class="index-date">' + esc(formatDate(p.createdAt)) + '</td>' +
        '<td class="index-go">' + icons("arrow") + '</td>' +
      '</tr>'
    );
  }

  /* ---------- Modals ---------- */
  function anyOpenModal() {
    return $$(".modal").filter(function (m) { return !m.hidden; })[0] || null;
  }

  function openModal(modal) {
    if (!modal) return;
    if (!anyOpenModal()) {
      state.lastFocus = document.activeElement;
      document.body.style.overflow = "hidden";
    }
    modal.hidden = false;
    var focusable = modal === els.submitModal
      ? document.getElementById("f-title")
      : modal.querySelector("input:not([type=hidden]):not([tabindex='-1']), textarea, select, button, [href]");
    if (focusable) {
      window.setTimeout(function () { try { focusable.focus({ preventScroll: true }); } catch (_) { focusable.focus(); } }, 60);
    }
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (!anyOpenModal()) {
      document.body.style.overflow = "";
      if (state.lastFocus && typeof state.lastFocus.focus === "function") {
        try { state.lastFocus.focus({ preventScroll: true }); } catch (_) { /* no-op */ }
      }
    }
  }

  function closeAllModals() {
    $$(".modal").forEach(function (m) { m.hidden = true; });
    document.body.style.overflow = "";
  }

  var FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    var modal = anyOpenModal();
    if (!modal) return;
    var items = $$(FOCUSABLE, modal).filter(function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- Toast ---------- */
  function toast(message, kind) {
    if (!els.toastStack) return;
    var node = document.createElement("div");
    node.className = "toast" + (kind ? " toast--" + kind : "");
    node.innerHTML = icons(kind === "ok" ? "check" : kind === "error" ? "alert" : "cloud") + "<p>" + esc(message) + "</p>";
    els.toastStack.appendChild(node);
    window.setTimeout(function () {
      node.classList.add("is-leaving");
      window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 260);
    }, 4200);
  }

  /* ---------- Details ---------- */
  function openDetail(id) {
    var raw = allProjects().filter(function (p) { return p.id === id; })[0];
    if (!raw) {
      toast(t("errGeneric"), "error");
      return;
    }
    state.selected = raw;
    var p = localize(raw);

    els.detailEyebrow.textContent = p.module + " · " + categoryLabel(p.category);
    els.detailTitle.textContent = p.title;
    els.detailPlace.innerHTML = p.city || p.country ? icons("pin") + "<span>" + esc([p.city, p.country].filter(Boolean).join(" · ")) + "</span>" : "";
    els.detailVisual.dataset.visual = visualKey(raw);

    var meta = [];
    meta.push('<span class="tag ' + moduleClass(p.module) + '">' + esc(p.module) + '</span>');
    meta.push('<span class="tag ' + (p.category === "algeria" ? "tag--oupti" : "tag--scf") + '">' + esc(categoryLabel(p.category)) + '</span>');
    if (p.createdAt) meta.push('<span class="tag">' + esc(formatDate(p.createdAt)) + '</span>');
    if (p.authors) meta.push('<span class="tag">' + esc(p.authors) + '</span>');
    els.detailMeta.innerHTML = meta.join("");

    var paragraphs = String(p.summary || "").split(/\n{2,}/).filter(Boolean);
    els.detailSummary.innerHTML = paragraphs.length
      ? paragraphs.map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("")
      : "<p>" + esc(t("noProjects")) + "</p>";

    els.detailTags.innerHTML = (p.keywords || []).map(function (k) {
      return '<span class="tag">' + esc(k) + '</span>';
    }).join("");

    var actions = [];
    if (p.link) {
      actions.push('<a class="btn btn--primary" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + icons("external") + esc(t("openStudy")) + '</a>');
    }
    if (p.fileUrl) {
      actions.push('<a class="btn btn--ghost" href="' + esc(p.fileUrl) + '" download="' + esc(p.fileName || "") + '" target="_blank" rel="noopener">' + icons("download") + esc(t("download")) + '</a>');
    }
    if (raw.source === "local") {
      actions.push('<button class="btn btn--ghost" type="button" data-action="delete" data-id="' + esc(p.id) + '">' + icons("trash") + esc(t("delete")) + '</button>');
    }
    if (!actions.length) {
      actions.push('<span class="tag">' + esc(t("noProjects")) + '</span>');
    }
    els.detailActions.innerHTML = actions.join("");

    openModal(els.detailModal);
    try { history.replaceState(null, "", "#etude=" + encodeURIComponent(id)); } catch (_) { /* no-op */ }
  }

  function closeDetail() {
    closeModal(els.detailModal);
    state.selected = null;
    if (location.hash.indexOf("#etude=") === 0) {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (_) { /* no-op */ }
    }
  }

  function deleteProject(id) {
    if (!window.confirm(t("deleteConfirm"))) return;
    state.local = state.local.filter(function (p) { return p.id !== id; });
    if (!saveLocal()) {
      toast(t("errGeneric"), "error");
      return;
    }
    closeDetail();
    renderCorpus();
    toast(t("delete"), "ok");
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through */ }
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  /* ---------- Cloud ---------- */
  async function probeCloud(manual) {
    var pill = els.cloudStatusBtn;
    if (manual) {
      pill.setAttribute("data-mode", "checking");
      els.cloudStatusText.textContent = t("checking");
      toast(t("cloudTesting"));
    }

    var next = { mode: "local", db: "none", files: false, provider: "localStorage", requireCode: false };
    try {
      var res = await fetch("api/projects?meta=1", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      if (!data || data.ok !== true) throw new Error("not configured");
      next.mode = "cloud";
      next.db = (data.storage && data.storage.db) || "blob";
      next.files = !!(data.storage && data.storage.files);
      next.provider = (data.storage && data.storage.provider) || "Vercel";
      next.requireCode = !!(data.storage && data.storage.requireCode);
      var remote = Array.isArray(data.projects) ? data.projects : [];
      state.remote = remote.filter(function (p) { return p && p.id; });
    } catch (_) {
      state.remote = [];
    }

    state.cloud = next;
    updateCloudUI();
    renderCorpus();

    // A shared study link may have arrived before the cloud list did.
    if (location.hash.indexOf("#etude=") === 0 && !state.selected) {
      openDetail(decodeURIComponent(location.hash.slice(7)));
    }

    if (manual) {
      if (next.mode === "cloud") toast(t("cloudOkToast"), "ok");
      else toast(t("cloudLocalToast"));
    }
  }

  function updateCloudUI() {
    var c = state.cloud;
    var isCloud = c.mode === "cloud";
    var ar = state.lang === "ar";

    if (els.cloudStatusBtn) {
      els.cloudStatusBtn.setAttribute("data-mode", c.mode);
      els.cloudStatusText.textContent = isCloud ? t("cloudMode") : t("localMode");
      els.cloudStatusBtn.title = isCloud
        ? (ar ? "متصل بالتخزين السحابي" : "Stockage cloud connecté")
        : (ar ? "التخزين والمزامنة" : "Stockage & synchronisation");
    }
    if (els.localBanner) els.localBanner.hidden = isCloud;

    var dbNames = { kv: "Upstash KV", supabase: "Supabase", blob: "Index Blob", none: "" };
    if (els.cloudDbText) {
      if (isCloud) els.cloudDbText.textContent = dbNames[c.db] || c.db;
      else els.cloudDbText.textContent = ar ? "غير مهيّأة" : "Non configurée";
    }
    if (els.cloudDbBadge) {
      els.cloudDbBadge.textContent = isCloud ? "OK" : "—";
      els.cloudDbBadge.className = "cloud__badge " + (isCloud ? "is-ok" : "is-local");
    }
    if (els.cloudFilesText) {
      els.cloudFilesText.textContent = c.files ? "Vercel Blob" : (ar ? "وضع محلي" : "Mode local");
    }
    if (els.cloudFilesBadge) {
      els.cloudFilesBadge.textContent = c.files ? "OK" : (ar ? "محلي" : "Local");
      els.cloudFilesBadge.className = "cloud__badge " + (c.files ? "is-ok" : "is-local");
    }
    if (els.cloudProviderText) els.cloudProviderText.textContent = isCloud ? c.provider : "localStorage";
    if (els.cloudProviderBadge) {
      els.cloudProviderBadge.textContent = isCloud ? "Cloud" : (ar ? "محلي" : "Local");
      els.cloudProviderBadge.className = "cloud__badge " + (isCloud ? "is-ok" : "is-local");
    }
    if (els.cloudModeLine) {
      els.cloudModeLine.textContent = isCloud
        ? (ar ? "الوضع الحالي: سحابي" : "Mode actuel : cloud")
        : (ar ? "الوضع الحالي: محلي" : "Mode actuel : local");
    }
    if (els.submitModeNote) {
      var span = els.submitModeNote.querySelector("span");
      setBilingual(span, isCloud ? T.fr.cloudNoteCloud : T.fr.cloudNoteLocal, isCloud ? T.ar.cloudNoteCloud : T.ar.cloudNoteLocal);
    }
    updateGateUI();
  }

  function updateGateUI() {
    if (!els.codeField) return;
    var required = gateRequired();
    var cloud = state.cloud.mode === "cloud";
    els.codeField.hidden = !required;
    if (els.codeInput) {
      els.codeInput.required = required;
      els.codeInput.setAttribute("aria-required", required ? "true" : "false");
    }
    if (els.codeHint) {
      setBilingual(
        els.codeHint,
        cloud
          ? "Dépôt partagé protégé par le code de cohorte. Demandez-le au Dr. Khoukhi."
          : "Le dépôt est protégé par le code de cohorte de la promotion. Demandez-le au Dr. Khoukhi.",
        cloud
          ? "الرفع المشترك محمي برمز الفوج. اطلبه من الدكتور خوكي."
          : "الرفع محمي برمز فوج الماستر. اطلبه من الدكتور خوكي."
      );
    }
  }

  /* ---------- Submit ---------- */
  function openSubmit() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.formStatus.hidden = true;
    setProgress(0, "");
    if (els.codeInput) els.codeInput.value = savedCode();
    updateCloudUI();
    openModal(els.submitModal);
  }

  function setProgress(pct, label) {
    if (els.formStatus) els.formStatus.hidden = !label;
    if (label && els.formStatusText) els.formStatusText.textContent = label;
    if (els.formStatusPct) els.formStatusPct.textContent = Math.max(0, Math.min(100, Math.round(pct))) + "%";
    if (els.formBar) els.formBar.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }

  function setBusy(busy) {
    state.busy = busy;
    if (els.submitBtn) {
      els.submitBtn.disabled = busy;
      els.submitBtn.classList.toggle("is-loading", busy);
    }
  }

  function showFormError(message) {
    if (!els.formError) return;
    els.formError.textContent = message;
    els.formError.hidden = false;
    els.formError.setAttribute("tabindex", "-1");
    try { els.formError.focus({ preventScroll: true }); } catch (_) { /* no-op */ }
  }

  function readFileAsDataURL(file, onProgress) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(5 + (e.loaded / e.total) * 80);
      };
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error(t("errGeneric"))); };
      reader.readAsDataURL(file);
    });
  }

  async function verifyClassCode(code) {
    var res;
    try {
      res = await fetch("api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ verifyCode: true, code: code })
      });
    } catch (_) {
      return; // network issue: let the upload/POST report it
    }
    if (res.status === 401) {
      var authErr = new Error(t("errCode"));
      authErr.isAuth = true;
      throw authErr;
    }
  }

  async function uploadToBlob(file, code, onProgress) {
    var mod;
    try {
      mod = await import("./portal-blob-client.js");
    } catch (_) {
      throw new Error(t("errCloud"));
    }
    if (!mod || typeof mod.upload !== "function") throw new Error(t("errCloud"));
    var ext = fileExt(file.name);
    if (!FILE_TYPES[ext]) throw new Error(t("errFileType"));
    // Random UUID filename: never trust (or expose) the original name.
    var path = "atlas/files/" + fileUuid() + "." + ext;
    var blob = await mod.upload(path, file, {
      access: "public",
      handleUploadUrl: "api/upload",
      clientPayload: JSON.stringify({ code: code || "" }),
      onUploadProgress: function (evt) {
        if (onProgress) onProgress((evt && evt.percentage) || 0);
      }
    });
    return blob && blob.url ? blob.url : "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (state.busy) return;

    var form = els.form;
    var title = form.elements.title.value.trim();
    var city = form.elements.city.value.trim();
    var country = form.elements.country.value.trim();
    var authors = form.elements.authors.value.trim();
    var category = form.elements.category.value;
    var moduleInput = form.querySelector('input[name="module"]:checked');
    var summary = form.elements.summary.value.trim();
    var keywords = form.elements.keywords.value.split(",").map(function (k) { return k.trim(); }).filter(Boolean).slice(0, 8);
    var link = form.elements.link.value.trim();
    var website = form.elements.website.value;
    var code = form.elements.code ? form.elements.code.value.trim() : "";

    var fail = function (message, field) {
      showFormError(message);
      if (field && typeof field.focus === "function") field.focus();
    };

    if (website) return fail(t("errGeneric"));
    if (!title) return fail(t("errTitle"), form.elements.title);
    if (!country) return fail(t("errCountry"), form.elements.country);
    if (!authors) return fail(t("errAuthors"), form.elements.authors);
    if (!moduleInput) return fail(t("errModule"));
    if (!state.file && !link) return fail(t("errFile"), form.elements.link);
    if (link && !/^https?:\/\/\S+$/i.test(link)) return fail(t("errLink"), form.elements.link);
    if (state.file && !fileTypeAllowed(state.file)) return fail(t("errFileType"), els.fileInput);
    if (state.file && state.file.size > MAX_FILE) return fail(t("errBigFile"), els.fileInput);
    if (state.file && state.cloud.mode !== "cloud" && state.file.size > LOCAL_FILE_MAX) {
      return fail(t("errLocalFile"), els.fileInput);
    }
    if (gateRequired()) {
      if (!code) return fail(t("errCode"), els.codeInput);
      // Local mode has no server to verify against: apply the documented fallback code.
      if (state.cloud.mode !== "cloud" && norm(code) !== norm(LOCAL_CLASS_CODE)) {
        return fail(t("errCode"), els.codeInput);
      }
      if (state.cloud.mode !== "cloud") {
        try { window.localStorage.setItem(LS_CODE, code); } catch (_) { /* no-op */ }
      }
    }

    els.formError.hidden = true;
    setBusy(true);
    setProgress(4, t("saving"));

    var id = uid();
    var project = {
      id: id,
      title: title,
      city: city,
      country: country,
      authors: authors,
      category: category,
      module: moduleInput.value,
      summary: summary,
      keywords: keywords,
      link: link,
      fileUrl: "",
      fileName: "",
      featured: false,
      source: state.cloud.mode === "cloud" ? "cloud" : "local",
      createdAt: new Date().toISOString()
    };

    try {
      if (state.cloud.mode === "cloud" && state.file && state.cloud.files && gateRequired()) {
        await verifyClassCode(code);
      }
      if (state.file) {
        if (state.cloud.mode === "cloud" && state.cloud.files) {
          setProgress(8, t("uploading"));
          project.fileUrl = await uploadToBlob(state.file, code, function (pct) {
            setProgress(8 + pct * 0.82, t("uploading"));
          });
          project.fileName = displayFileName(state.file.name);
        } else {
          setProgress(10, t("uploading"));
          project.fileUrl = await readFileAsDataURL(state.file, function (pct) {
            setProgress(pct, t("uploading"));
          });
          project.fileName = displayFileName(state.file.name);
        }
      }

      setProgress(94, t("saving"));

      if (state.cloud.mode === "cloud") {
        try {
          var res = await fetch("api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ project: project, code: code })
          });
          var data = await res.json().catch(function () { return {}; });
          if (!res.ok || !data || data.ok !== true) {
            // A rejected passcode must never fall back to a local "publication".
            if (res.status === 401 || (data && data.error === "invalid-class-code")) {
              var authErr = new Error(t("errCode"));
              authErr.isAuth = true;
              throw authErr;
            }
            throw new Error((data && data.error) || t("errCloud"));
          }
          if (data.project) project = data.project;
          state.remote.unshift(project);
          if (code) {
            try { window.localStorage.setItem(LS_CODE, code); } catch (_) { /* no-op */ }
          }
          finish(project, t("publishedCloud"));
        } catch (cloudErr) {
          if (cloudErr && cloudErr.isAuth) throw cloudErr;
          // Keep the student's work rather than losing it: fall back to local storage.
          var localCopy = Object.assign({}, project, { source: "local" });
          if (!saveLocalWith(localCopy)) throw cloudErr;
          finish(localCopy, t("savedFallback"));
        }
      } else {
        if (!saveLocalWith(project)) throw new Error(t("errLocalFile"));
        finish(project, t("publishedLocal"));
      }
    } catch (err) {
      setProgress(0, "");
      var message = err && err.message ? String(err.message) : "";
      showFormError(/invalid-class-code/i.test(message) ? t("errCode") : message || t("errGeneric"));
    } finally {
      setBusy(false);
    }

    function saveLocalWith(p) {
      state.local.unshift(p);
      if (saveLocal()) return true;
      state.local = state.local.filter(function (x) { return x.id !== p.id; });
      return false;
    }

    function finish(saved, message) {
      setProgress(100, t("done"));
      state.newId = saved.id;
      state.page = 1;
      closeModal(els.submitModal);
      els.form.reset();
      clearFile();
      renderCorpus();
      switchView("hub", { animate: false });
      toast(message, "ok");
      window.setTimeout(function () {
        var card = document.querySelector('.project-card[data-id="' + saved.id + '"]');
        var row = document.querySelector('.index-row[data-id="' + saved.id + '"]');
        var target = card || row;
        if (!target) return;
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
        var focusEl = row && !card ? row.querySelector(".index-title") : target;
        if (focusEl && typeof focusEl.focus === "function") {
          try { focusEl.focus({ preventScroll: true }); } catch (_) { focusEl.focus(); }
        }
      }, 120);
      window.setTimeout(function () { state.newId = null; }, 1200);
    }
  }

  /* ---------- File picker ---------- */
  function resetFileUI() {
    if (!els.filePill) return;
    els.filePill.hidden = true;
    if (els.fileName) els.fileName.textContent = "";
    if (els.fileSize) els.fileSize.textContent = "";
    if (els.fileInput) els.fileInput.value = "";
  }

  function setFile(file) {
    if (file && !fileTypeAllowed(file)) {
      state.file = null;
      resetFileUI();
      showFormError(t("errFileType"));
      return false;
    }
    if (file && file.size > MAX_FILE) {
      state.file = null;
      resetFileUI();
      showFormError(t("errBigFile"));
      return false;
    }

    state.file = file || null;
    if (!file) {
      resetFileUI();
      return true;
    }

    if (els.formError) els.formError.hidden = true;
    els.filePill.hidden = false;
    if (els.fileName) els.fileName.textContent = displayFileName(file.name);
    if (els.fileSize) els.fileSize.textContent = formatSize(file.size);
    return true;
  }

  function clearFile() { setFile(null); }

  /* ---------- View routing ---------- */
  function switchView(view, opts) {
    opts = opts || {};
    var animate = opts.animate !== false && !reducedMotion;
    var target = view === "hub" ? "hub" : "cover";
    if (state.view === target && !opts.force) {
      if (opts.scrollTo) scrollToSection(opts.scrollTo);
      return;
    }

    var apply = function () {
      state.view = target;
      if (els.coverView) els.coverView.hidden = target !== "cover";
      if (els.hubView) els.hubView.hidden = target !== "hub";
      els.app.setAttribute("data-view", target);
      if (els.canvas) {
        els.canvas.style.opacity = target === "cover" ? "1" : "0";
        els.canvas.style.visibility = target === "cover" ? "visible" : "hidden";
      }
      document.body.classList.toggle("view-hub", target === "hub");
      if (opts.scrollTo === "corpus") {
        scrollToSection(els.hubToolbar);
      } else if (opts.scrollTo === "grid") {
        scrollToSection(els.gridWrap);
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      if (target === "hub") updateProgress();
    };

    if (animate && els.veil) {
      els.veil.classList.add("is-active");
      window.setTimeout(apply, 230);
      window.setTimeout(function () { els.veil.classList.remove("is-active"); }, 640);
    } else {
      apply();
    }
  }

  function scrollToSection(el) {
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset - 84;
    window.scrollTo({ top: Math.max(0, y), behavior: reducedMotion ? "auto" : "smooth" });
  }

  function updateProgress() {
    if (!els.progress) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
    els.progress.style.transform = "scaleX(" + ratio + ")";
    if (els.hubNav) els.hubNav.classList.toggle("is-scrolled", window.pageYOffset > 8);
  }

  /* ---------- Cover canvas ---------- */
  function initCanvas() {
    var canvas = els.canvas;
    if (!canvas || reducedMotion) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dots = [];
    var w = 0;
    var h = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var raf = null;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(58, Math.max(24, (w * h) / 30000)));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 0.7 + Math.random() * 1.5,
          amber: Math.random() < 0.28
        });
      }
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      var i, j, a, b, dx, dy, dist;
      for (i = 0; i < dots.length; i++) {
        a = dots[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < -20) a.x = w + 20;
        if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20;
        if (a.y > h + 20) a.y = -20;
      }
      for (i = 0; i < dots.length; i++) {
        a = dots[i];
        for (j = i + 1; j < dots.length; j++) {
          b = dots[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.strokeStyle = "rgba(17,22,29," + (0.1 * (1 - dist / 140)).toFixed(3) + ")";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.fillStyle = a.amber ? "rgba(192,138,69,0.55)" : "rgba(17,22,29,0.28)";
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = window.requestAnimationFrame(step);
    }

    function start() {
      if (raf != null) return;
      step();
    }
    function stop() {
      if (raf == null) return;
      window.cancelAnimationFrame(raf);
      raf = null;
    }

    resize();
    start();
    window.addEventListener("resize", function () {
      resize();
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden || state.view !== "cover") stop();
      else start();
    });
    window.addEventListener("atlas:view", function (e) {
      if (e.detail === "cover") start();
      else stop();
    });
  }

  /* ---------- Bootstrap ---------- */
  function cacheElements() {
    els.app = document.getElementById("app");
    els.coverView = document.getElementById("coverView");
    els.hubView = document.getElementById("hubView");
    els.canvas = document.getElementById("coverCanvas");
    els.veil = document.getElementById("pageVeil");
    els.coverCount = document.getElementById("coverCount");
    els.statFeatured = document.getElementById("statFeatured");
    els.statTotal = document.getElementById("statTotal");
    els.cloudStatusBtn = document.getElementById("cloudStatusBtn");
    els.cloudStatusText = document.getElementById("cloudStatusText");
    els.hubNav = document.getElementById("hubNav");
    els.progress = document.getElementById("hubProgress");
    els.localBanner = document.getElementById("localBanner");
    els.search = document.getElementById("searchInput");
    els.searchClear = document.getElementById("searchClear");
    els.sort = document.getElementById("sortSelect");
    els.corpusCount = document.getElementById("corpusCount");
    els.filterSummary = document.getElementById("filterSummary");
    els.grid = document.getElementById("projectGrid");
    els.indexWrap = document.getElementById("projectIndex");
    els.indexHead = document.getElementById("indexHead");
    els.indexBody = document.getElementById("indexBody");
    els.indexCaption = document.getElementById("indexCaption");
    els.pager = document.getElementById("pager");
    els.viewToggle = document.getElementById("viewToggle");
    els.empty = document.getElementById("emptyState");
    els.gridWrap = document.querySelector(".hub-grid-wrap");
    els.hubToolbar = document.getElementById("corpus");
    els.toastStack = document.getElementById("toastStack");

    els.submitModal = document.getElementById("submitModal");
    els.form = document.getElementById("submitForm");
    els.formError = document.getElementById("formError");
    els.formStatus = document.getElementById("formStatus");
    els.formStatusText = document.getElementById("formStatusText");
    els.formStatusPct = document.getElementById("formStatusPct");
    els.formBar = document.getElementById("formBar");
    els.submitBtn = document.getElementById("submitFormBtn");
    els.submitModeNote = document.getElementById("submitModeNote");
    els.fileInput = document.getElementById("f-file");
    els.filePill = document.getElementById("filePill");
    els.fileName = document.getElementById("fileName");
    els.fileSize = document.getElementById("fileSize");
    els.fileRemove = document.getElementById("fileRemove");
    els.dropZone = document.getElementById("dropZone");
    els.codeField = document.getElementById("codeField");
    els.codeInput = document.getElementById("f-code");
    els.codeHint = document.getElementById("codeHint");
    els.codeToggle = document.getElementById("codeToggle");
    els.tagSuggest = document.getElementById("tagSuggest");

    els.detailModal = document.getElementById("detailModal");
    els.detailEyebrow = document.getElementById("detailEyebrow");
    els.detailVisual = document.getElementById("detailVisual");
    els.detailTitle = document.getElementById("detailTitle");
    els.detailPlace = document.getElementById("detailPlace");
    els.detailMeta = document.getElementById("detailMeta");
    els.detailSummary = document.getElementById("detailSummary");
    els.detailTags = document.getElementById("detailTags");
    els.detailActions = document.getElementById("detailActions");
    els.detailCopy = document.getElementById("detailCopy");

    els.cloudModal = document.getElementById("cloudModal");
    els.cloudStatusGrid = document.getElementById("cloudStatusGrid");
    els.cloudDbText = document.getElementById("cloudDbText");
    els.cloudDbBadge = document.getElementById("cloudDbBadge");
    els.cloudFilesText = document.getElementById("cloudFilesText");
    els.cloudFilesBadge = document.getElementById("cloudFilesBadge");
    els.cloudProviderText = document.getElementById("cloudProviderText");
    els.cloudProviderBadge = document.getElementById("cloudProviderBadge");
    els.cloudModeLine = document.getElementById("cloudModeLine");
    els.cloudRefresh = document.getElementById("cloudRefresh");
    els.copySql = document.getElementById("copySql");
    els.sqlSnippet = document.getElementById("sqlSnippet");
  }

  function bindEvents() {
    // Language
    $$("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-set-lang");
        if (lang !== state.lang) applyLang(lang, true);
      });
    });

    // Modal openers
    [
      ["openSubmit", openSubmit],
      ["openSubmit2", openSubmit],
      ["openSubmitEmpty", openSubmit],
      ["openCloud", function () { openModal(els.cloudModal); }],
      ["openCloudFoot", function () { openModal(els.cloudModal); }],
      ["openCloudFromBanner", function () { openModal(els.cloudModal); }]
    ].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.addEventListener("click", function (e) { e.preventDefault(); pair[1](); });
    });

    // Close buttons / backdrop
    $$("[data-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        var modal = document.getElementById(el.getAttribute("data-close"));
        if (modal === els.detailModal) closeDetail();
        else closeModal(modal);
      });
    });

    // Card interactions (delegation)
    els.grid.addEventListener("click", function (e) {
      var card = e.target.closest(".project-card");
      if (card) openDetail(card.getAttribute("data-id"));
    });
    els.grid.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest(".project-card");
      if (!card) return;
      e.preventDefault();
      openDetail(card.getAttribute("data-id"));
    });

    // Detail actions
    els.detailActions.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action='delete']");
      if (btn) deleteProject(btn.getAttribute("data-id"));
    });

    // Copy detail link
    if (els.detailCopy) {
      els.detailCopy.addEventListener("click", async function () {
        var p = state.selected;
        if (!p) return;
        var url = location.origin + location.pathname + "#etude=" + encodeURIComponent(p.id);
        var ok = await copyText(url);
        toast(ok ? t("linkCopied") : t("copyFailed"), ok ? "ok" : "error");
      });
    }

    // Copy SQL
    if (els.copySql) {
      els.copySql.addEventListener("click", async function () {
        var text = els.sqlSnippet ? els.sqlSnippet.textContent : "";
        var ok = await copyText(text);
        toast(ok ? t("sqlCopied") : t("copyFailed"), ok ? "ok" : "error");
      });
    }

    // Cloud test
    if (els.cloudRefresh) {
      els.cloudRefresh.addEventListener("click", function () { probeCloud(true); });
    }

    // Search
    if (els.search) {
      els.search.addEventListener("input", function () {
        state.query = els.search.value;
        state.page = 1;
        if (els.searchClear) els.searchClear.hidden = !state.query;
        renderCorpus();
      });
      els.search.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          els.search.value = "";
          state.query = "";
          state.page = 1;
          if (els.searchClear) els.searchClear.hidden = true;
          renderCorpus();
          els.search.blur();
        }
      });
    }
    if (els.searchClear) {
      els.searchClear.addEventListener("click", function () {
        els.search.value = "";
        state.query = "";
        state.page = 1;
        els.searchClear.hidden = true;
        renderCorpus();
        els.search.focus();
      });
    }

    // Filters
    $$(".filter").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.filter = btn.getAttribute("data-filter");
        state.page = 1;
        renderCorpus();
      });
    });

    // Sort
    if (els.sort) {
      els.sort.addEventListener("change", function () {
        state.sort = els.sort.value;
        state.page = 1;
        renderCorpus();
      });
    }

    // Grid / index view toggle
    $$("[data-view-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-view-mode") === "index" ? "index" : "grid";
        if (mode === state.viewMode) return;
        state.viewMode = mode;
        state.page = 1;
        try { window.localStorage.setItem(LS_VIEW, mode); } catch (_) { /* no-op */ }
        renderCorpus();
      });
    });

    // Pagination
    if (els.pager) {
      els.pager.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-page]");
        if (!btn || btn.disabled) return;
        var page = parseInt(btn.getAttribute("data-page"), 10);
        if (!page || page === state.page) return;
        state.page = page;
        renderCorpus();
        scrollToSection(els.gridWrap);
      });
      els.pager.addEventListener("change", function (e) {
        if (!e.target || e.target.id !== "pageSize") return;
        var size = parseInt(e.target.value, 10);
        if (PAGE_SIZES.indexOf(size) === -1) return;
        state.pageSize = size;
        state.page = 1;
        renderCorpus();
      });
    }

    // Index rows open the detail panel (the title itself is a real link).
    if (els.indexBody) {
      els.indexBody.addEventListener("click", function (e) {
        if (e.target.closest("a")) return; // handled by the hash-link delegate
        var row = e.target.closest(".index-row");
        if (row) openDetail(row.getAttribute("data-id"));
      });
    }

    // Reset filters
    var reset = document.getElementById("resetFilters");
    if (reset) {
      reset.addEventListener("click", function () {
        state.filter = "all";
        state.query = "";
        state.page = 1;
        if (els.search) els.search.value = "";
        if (els.searchClear) els.searchClear.hidden = true;
        renderCorpus();
      });
    }

    // Submit
    if (els.form) els.form.addEventListener("submit", handleSubmit);

    // File input
    if (els.fileInput) {
      els.fileInput.addEventListener("change", function () {
        var f = els.fileInput.files && els.fileInput.files[0];
        setFile(f || null);
      });
    }
    if (els.fileRemove) {
      els.fileRemove.addEventListener("click", function (e) {
        e.preventDefault();
        clearFile();
      });
    }
    if (els.dropZone) {
      ["dragenter", "dragover"].forEach(function (evt) {
        els.dropZone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          els.dropZone.classList.add("is-drag");
        });
      });
      ["dragleave", "dragend"].forEach(function (evt) {
        els.dropZone.addEventListener(evt, function (e) {
          e.preventDefault();
          els.dropZone.classList.remove("is-drag");
        });
      });
      els.dropZone.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        els.dropZone.classList.remove("is-drag");
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) setFile(f);
      });
    }

    // Cohort passcode visibility
    if (els.codeToggle && els.codeInput) {
      els.codeToggle.addEventListener("click", function () {
        var show = els.codeInput.type === "password";
        els.codeInput.type = show ? "text" : "password";
        els.codeToggle.setAttribute("aria-pressed", show ? "true" : "false");
        els.codeToggle.setAttribute("aria-label", show ? t("codeHide") : t("codeShow"));
        var use = els.codeToggle.querySelector("use");
        if (use) use.setAttribute("href", show ? "#ic-eye-off" : "#ic-eye");
        els.codeInput.focus();
      });
    }

    // Keywords suggestions
    if (els.tagSuggest) {
      els.tagSuggest.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-tag]");
        if (!btn) return;
        var input = document.getElementById("f-keywords");
        if (!input) return;
        var tag = btn.getAttribute("data-tag");
        var parts = input.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
        if (parts.indexOf(tag) === -1) parts.push(tag);
        input.value = parts.join(", ");
        input.focus();
      });
    }

    // Auto-detect category from country
    var country = document.getElementById("f-country");
    var category = document.getElementById("f-category");
    if (country && category) {
      country.addEventListener("blur", function () {
        var v = norm(country.value);
        if (!v) return;
        var dz = ["algerie", "algeria", "الجزائر", "dz"];
        if (dz.some(function (x) { return v.indexOf(norm(x)) !== -1; })) category.value = "algeria";
        else category.value = "international";
      });
    }

    // Routing (anchors)
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href) return;
      if (href.indexOf("#etude=") === 0) {
        e.preventDefault();
        openDetail(decodeURIComponent(href.slice(7)));
        return;
      }
      if (href === "#couverture" || href === "#projets" || href === "#corpus") {
        e.preventDefault();
        try { history.replaceState(null, "", href); } catch (_) { /* no-op */ }
        if (href === "#couverture") switchView("cover");
        else if (href === "#corpus") switchView("hub", { scrollTo: "corpus" });
        else switchView("hub", { scrollTo: "top" });
      }
    });

    // Scroll progress
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });

    // Keyboard
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var open = anyOpenModal();
        if (open === els.detailModal) closeDetail();
        else if (open) closeModal(open);
        return;
      }
      trapFocus(e);
      if (e.key === "/" && state.view === "hub" && !anyOpenModal()) {
        var tag = (document.activeElement && document.activeElement.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        if (els.search) els.search.focus();
      }
    });

    // Hash routing on load / change
    window.addEventListener("hashchange", routeFromHash);
  }

  function routeFromHash() {
    var h = location.hash || "";
    if (h.indexOf("#etude=") === 0) {
      switchView("hub", { animate: false });
      openDetail(decodeURIComponent(h.slice(7)));
    } else if (h === "#couverture") {
      switchView("cover", { animate: false });
    } else if (h === "#projets" || h === "#corpus") {
      switchView("hub", { animate: false, scrollTo: h === "#corpus" ? "corpus" : "top" });
    }
  }

  function init() {
    cacheElements();
    loadLocal();
    state.viewMode = savedView();

    var storedLang = "fr";
    try { storedLang = window.localStorage.getItem(LS_LANG) || "fr"; } catch (_) { /* no-op */ }
    applyLang(storedLang, false);

    if (els.sort) els.sort.value = state.sort;
    bindEvents();
    initCanvas();

    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    switchView("cover", { animate: false });
    renderCorpus();
    updateCloudUI();
    probeCloud(false);

    if (location.hash) {
      // Defer so the corpus exists before opening a shared study.
      window.setTimeout(routeFromHash, 80);
    }
  }

  // Announce view changes for the canvas loop.
  var originalSwitch = switchView;
  switchView = function (view, opts) {
    originalSwitch(view, opts);
    try {
      window.dispatchEvent(new CustomEvent("atlas:view", { detail: view === "hub" ? "hub" : "cover" }));
    } catch (_) { /* no-op */ }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose a small debug surface (handy for verifying data in the console).
  window.ATLAS = {
    state: state,
    refresh: renderCorpus,
    probe: probeCloud
  };
})();
