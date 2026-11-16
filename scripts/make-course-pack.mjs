/**
 * Generates the 10 bundled course supports as lightweight, valid PDF files.
 *
 * The portal links to `cours/01-...pdf` ... `cours/10-...pdf`. Those files are
 * committed so the teacher space works offline and on a fresh deployment.
 *
 * Usage: node scripts/make-course-pack.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "cours");

const COURSES = [
  {
    file: "01-scf-cadres-conceptuels.pdf",
    code: "SCF 01",
    title: "Cadres conceptuels de la ville intelligente",
    lede: "Frameworks, dimensions et grille de lecture comparative des modeles de smart city.",
    sections: [
      ["1. Du modele technique au modele societal", [
        "La smart city n'est pas un catalogue de capteurs : c'est un projet de territoire qui articule infrastructure, services, gouvernance et usages.",
        "Trois lectures se completent : l'approche techno-centree (efficacite des reseaux), l'approche humano-centree (qualite de vie, inclusion) et l'approche systemique (flux, acteurs, temporalites)."
      ]],
      ["2. Les six dimensions de reference", [
        "Smart Economy : competitivite, innovation, emploi qualifie.",
        "Smart Mobility : accessibilite, intermodalite, logistique urbaine.",
        "Smart Environment : energie, eau, air, biodiversite, climat.",
        "Smart People : education, capital social, participation.",
        "Smart Living : sante, securite, culture, cadre de vie.",
        "Smart Governance : transparence, co-construction, capacite publique."
      ]],
      ["3. Grille de lecture comparative", [
        "Pour chaque dimension, qualifier : le niveau de maturite, les donnees disponibles, les acteurs porteurs, les risques de fracture numerique et les effets attendus.",
        "Une ville intelligente se juge a la coherence de son systeme, pas a la quantite de dispositifs deployes."
      ]]
    ]
  },
  {
    file: "02-scf-indicateurs-iso.pdf",
    code: "SCF 02",
    title: "Indicateurs ISO 37120 / 37122",
    lede: "Methode de lecture et d'usage des indicateurs de performance urbaine.",
    sections: [
      ["1. A quoi servent les normes", [
        "ISO 37120 definit un socle d'indicateurs de services urbains et de qualite de vie. ISO 37122 ajoute les indicateurs dits intelligents.",
        "L'objectif n'est pas le classement : c'est la comparabilite dans le temps et entre villes de taille comparable."
      ]],
      ["2. Familles d'indicateurs", [
        "Economie, education, energie, environnement, finances, incendie et urgence, gouvernance, sante, logement, loisirs, securite, dechets solides, telecommunications, transport, eau et assainissement.",
        "Chaque indicateur doit etre documente : definition, source, annee, perimetre, methode de calcul."
      ]],
      ["3. Construire un tableau de bord utile", [
        "Selectionner un noyau de 20 a 30 indicateurs lisibles, alignes sur les objectifs politiques, et accepter les zones grises comme des questions de recherche.",
        "Toujours distinguer indicateur de moyen (deploiement) et indicateur de resultat (impact)."
      ]]
    ]
  },
  {
    file: "03-scf-gouvernance-ouverte.pdf",
    code: "SCF 03",
    title: "Gouvernance ouverte et donnees urbaines",
    lede: "Open data, budget participatif, plateformes citoyennes et evaluation de la maturite.",
    sections: [
      ["1. Les piliers de la gouvernance ouverte", [
        "Transparence : publier les donnees et les decisions.",
        "Participation : associer les habitants aux arbitrages.",
        "Redevabilite : rendre compte des resultats et des couts.",
        "Collaboration : faire travailler services, universites, entreprises et societe civile."
      ]],
      ["2. Donnees : de la collecte au commun", [
        "Qualite, interoperabilite, securite et gouvernance des donnees conditionnent toute politique intelligente.",
        "Un jeu de donnees utile est documente, versionne, licencie et maintenu dans la duree."
      ]],
      ["3. Evaluer la maturite", [
        "Grille : strategie, portage politique, capacites internes, budget, partenariats, dispositifs de participation, mesure d'impact.",
        "Le niveau de maturite se mesure par la capacite a transformer une donnee en decision legitime."
      ]]
    ]
  },
  {
    file: "04-oupti-diagnostic-pdau.pdf",
    code: "OUPTI 04",
    title: "Diagnostic territorial et lecture PDAU",
    lede: "Armature urbaine, instruments de planification et lecture critique du PDAU.",
    sections: [
      ["1. Lire le territoire avant de le projeter", [
        "Le diagnostic croise demographie, armature urbaine, mobilite, foncier, environnement et economie.",
        "Les dynamiques se lisent a plusieurs echelles : aire urbaine, commune, quartier, projet."
      ]],
      ["2. Le PDAU comme instrument", [
        "Le Plan Directeur d'Amenagement et d'Urbanisme fixe les orientations d'amenagement et de composition urbaine.",
        "Sa lecture critique interroge les ecarts entre prescriptions, pratiques et capacites de mise en oeuvre."
      ]],
      ["3. Restituer le diagnostic", [
        "Structurer la restitution autour de cartes, de indicateurs et de recits d'acteurs.",
        "Conclure par des enjeux hierarchises qui alimenteront le projet de ville intelligente."
      ]]
    ]
  },
  {
    file: "05-oupti-sig-analyse-spatiale.pdf",
    code: "OUPTI 05",
    title: "SIG et analyses spatiales appliquees",
    lede: "Projections, couches, requetes spatiales et cartographie thematique.",
    sections: [
      ["1. Socle technique", [
        "Systemes de reference, projections, georeferencement et qualite geometrique sont les prerequis de toute analyse.",
        "Une carte n'est pas neutre : choix de projection, de classes et de symboles orientent la lecture."
      ]],
      ["2. Analyses utiles au diagnostic", [
        "Densites, buffers d'accessibilite, intersections de couches, analyses de reseau et cartes de chaleur.",
        "Les requetes spatiales permettent de relier equipements, population et reseaux."
      ]],
      ["3. Produire une carte defendable", [
        "Documenter les sources, la date, l'echelle et les limites.",
        "Accompagner la carte d'un commentaire ecrit : ce qu'elle montre, ce qu'elle ne montre pas."
      ]]
    ]
  },
  {
    file: "06-oupti-mobilite-multimodale.pdf",
    code: "OUPTI 06",
    title: "Mobilite multimodale et transport intelligent",
    lede: "Diagnostic des deplacements, intermodalite, ITS et indicateurs d'accessibilite.",
    sections: [
      ["1. Comprendre les flux", [
        "Origine-destination, motifs, heures de pointe, part modale et temps de parcours structurent le diagnostic.",
        "Les donnees de telephonie, de billetique et de comptage enrichissent l'enquete classique."
      ]],
      ["2. Intermodalite et ITS", [
        "Poles d'echange, information voyageurs, priorite des bus, gestion adaptative des feux et tarification integree.",
        "Le transport intelligent est un moyen : l'objectif reste l'accessibilite pour tous."
      ]],
      ["3. Indicateurs et scenario", [
        "Accessibilite aux emplois et services, regularite, securite, emissions et cout pour l'usager.",
        "Comparer un scenario tendanciel et un scenario volontariste avant d'arbitrer."
      ]]
    ]
  },
  {
    file: "07-oupti-energie-reseaux.pdf",
    code: "OUPTI 07",
    title: "Energie, reseaux et ville bas carbone",
    lede: "Reseaux intelligents, efficacite energetique et trajectoires de decarbonation.",
    sections: [
      ["1. Cartographier la demande", [
        "Bati, eclairage public, mobilite, industrie et services : chaque poste a ses leviers.",
        "La precarite energetique est un enjeu social autant que technique."
      ]],
      ["2. Reseaux et production locale", [
        "Smart grids, autoconsommation, chaleur renouvelable, recuperation de chaleur et stockage.",
        "La resilience se construit par la diversite des sources et la maitrise de la pointe."
      ]],
      ["3. Trajectoire bas carbone", [
        "Fixer un budget carbone, prioriser la renovation, electrifier les usages pertinents et mesurer chaque annee.",
        "Eviter l'effet rebond : un gain d'efficacite peut etre annule par une hausse des usages."
      ]]
    ]
  },
  {
    file: "08-oupti-economie-circulaire.pdf",
    code: "OUPTI 08",
    title: "Economie circulaire et gestion des dechets",
    lede: "Flux de matiere, collecte, valorisation et indicateurs de circularite.",
    sections: [
      ["1. Lire les flux de matiere", [
        "Quantifier les flux entrants, les stocks de bati et les flux sortants pour identifier les gisements.",
        "La carte des flux relie producteurs, collecteurs, transformateurs et debouches."
      ]],
      ["2. Prevention avant valorisation", [
        "Reduction a la source, reemploi, reparabilite, compostage et tri a la source.",
        "La collecte se dimensionne selon l'habitat, les usages et la capacite de traitement locale."
      ]],
      ["3. Indicateurs et gouvernance", [
        "Taux de valorisation, taux d'enfouissement, cout a la tonne, qualite du tri et emplois locaux.",
        "La circularite se pilote avec les acteurs de la filiere, pas seulement avec la collecte."
      ]]
    ]
  },
  {
    file: "09-atelier-vienne.pdf",
    code: "ATELIER 09",
    title: "Etude de cas Vienne : methode",
    lede: "Grille d'analyse appliquee a la trajectoire viennoise et a ses indicateurs.",
    sections: [
      ["1. Pourquoi Vienne", [
        "Vienne combine une longue tradition de logement social, un reseau de transport dense et une strategie climat explicite.",
        "Le cas permet d'observer la coherence entre politiques sociales, mobilite et environnement."
      ]],
      ["2. Grille d'analyse", [
        "Contexte, gouvernance, instruments, financement, resultats et limites.",
        "Mobiliser des indicateurs comparables et distinguer les effets propres des effets de contexte."
      ]],
      ["3. Transposer sans copier", [
        "Identifier les conditions de reussite transferables : portage politique, capacite technique, acceptabilite, financement durable.",
        "Conclure par des enseignements pour un contexte algerien ou maghrebin."
      ]]
    ]
  },
  {
    file: "10-atelier-boughezoul.pdf",
    code: "ATELIER 10",
    title: "Etude de cas Boughezoul : methode",
    lede: "Diagnostic compare Ksar El Boukhari / ville nouvelle de Boughezoul.",
    sections: [
      ["1. Deux territoires, deux logiques", [
        "Ksar El Boukhari : ville oasis, heritage, dynamiques agricoles et pression urbaine.",
        "Boughezoul : ville nouvelle planifiee, infrastructure recente et objectif de polarisation."
      ]],
      ["2. Grille comparee", [
        "Demographie, foncier, mobilite, services, energie, emploi et gouvernance.",
        "Comparer les trajectoires plutot que les seuls stocks d'equipements."
      ]],
      ["3. Enjeux pour le projet intelligent", [
        "Quelle complementarite entre ville existante et ville nouvelle ?",
        "Quels services intelligents ont du sens a cette echelle, avec quels moyens et quels acteurs ?"
      ]]
    ]
  }
];

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 62;
const TOP_Y = 770;
const BOTTOM_Y = 78;
const BODY_SIZE = 10.5;
const BODY_LEAD = 15;

function winAnsi(text) {
  return String(text)
    .replace(/\u2014|\u2013/g, "-")
    .replace(/\u2019|\u2018/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u20ac/g, "EUR")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x00-\xff]/g, "?");
}

function escPdf(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if ((line + " " + word).length <= maxChars) line += " " + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function textLine(font, size, x, y, text) {
  return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escPdf(winAnsi(text))}) Tj ET`;
}

function buildCourse(course) {
  const ops = [];
  let y = TOP_Y;

  const push = (op) => ops.push(op);

  push("0.06 0.09 0.13 rg");
  push("0 812 595 30 re f");
  push(textLine("F2", 8, MARGIN_X, 822, "ATLAS & OBSERVATOIRE DES VILLES INTELLIGENTES"));
  push("0.62 0.68 0.74 rg");
  push(textLine("F1", 7.5, 420, 822, "M1 SMART CITIES ENGINEERING"));

  push("0.72 0.77 0.82 rg");
  push(textLine("F1", 8, MARGIN_X, y, course.code));
  y -= 24;

  push("0.06 0.09 0.13 rg");
  for (const line of wrap(course.title, 62)) {
    push(textLine("F2", 19, MARGIN_X, y, line));
    y -= 24;
  }
  y -= 4;

  push("0.36 0.42 0.48 rg");
  for (const line of wrap(course.lede, 86)) {
    push(textLine("F1", 10.5, MARGIN_X, y, line));
    y -= 15;
  }

  y -= 8;
  push("0.78 0.62 0.34 rg");
  push(`${MARGIN_X} ${y} 58 1.4 re f`);
  y -= 22;

  for (const [heading, paragraphs] of course.sections) {
    if (y < BOTTOM_Y + 70) {
      // Continue on an overflow page without repeating the cover block.
      push("0.36 0.42 0.48 rg");
      push(textLine("F1", 8, MARGIN_X, BOTTOM_Y - 18, `${course.code} - ${course.title} - page 2`));
      ops.push("PAGEBREAK");
      y = TOP_Y - 90;
    }
    push("0.06 0.09 0.13 rg");
    for (const line of wrap(heading, 70)) {
      push(textLine("F2", 12, MARGIN_X, y, line));
      y -= 18;
    }
    push("0.22 0.25 0.29 rg");
    for (const paragraph of paragraphs) {
      for (const line of wrap(paragraph, 92)) {
        if (y < BOTTOM_Y) {
          push("0.36 0.42 0.48 rg");
          push(textLine("F1", 8, MARGIN_X, BOTTOM_Y - 18, `${course.code} - ${course.title} - page 2`));
          ops.push("PAGEBREAK");
          y = TOP_Y - 90;
          push("0.22 0.25 0.29 rg");
        }
        push(textLine("F1", BODY_SIZE, MARGIN_X, y, line));
        y -= BODY_LEAD;
      }
      y -= 4;
    }
    y -= 6;
  }

  push("0.62 0.68 0.74 rg");
  push(textLine("F1", 7.5, MARGIN_X, BOTTOM_Y - 24, "M1 Smart Cities Engineering - Dir. Dr. Khoukhi - Universite Yahia Fares de Medea"));

  // Split the operation list into pages.
  const pages = [[]];
  for (const op of ops) {
    if (op === "PAGEBREAK") pages.push([]);
    else pages[pages.length - 1].push(op);
  }
  return pages;
}

function buildPdf(course) {
  const pages = buildCourse(course);
  const objects = [];

  const fontF1 = objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontF2 = objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const pageRefs = [];

  for (const pageOps of pages) {
    const content = pageOps.join("\n");
    const contentId = objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    const pageId = objects.push(
      `<< /Type /Page /Parent __PAGES__ /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${fontF1} 0 R /F2 ${fontF2} 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`
    );
    pageRefs.push(pageId);
  }

  const pagesId = objects.push(
    `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] >>`
  );
  const catalogId = objects.push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  for (let i = 0; i < objects.length; i += 1) {
    objects[i] = objects[i].replace(/__PAGES__/g, `${pagesId} 0 R`);
  }

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const course of COURSES) {
  const target = path.join(OUT_DIR, course.file);
  fs.writeFileSync(target, buildPdf(course));
  console.log(`wrote ${path.relative(ROOT, target)}`);
}
console.log(`\n${COURSES.length} course supports generated in ${path.relative(ROOT, OUT_DIR)}/`);
