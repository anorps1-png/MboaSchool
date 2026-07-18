# Handoff : Redesign « Tissé » — MboaSchool

## Objectif
Appliquer le redesign « Tissé » (identité chaleureuse camerounaise : crème, encre brune, terracotta, bande kenté) à l'application Next.js existante `apon-backend`, ainsi que le gabarit de bulletin MINESEC.

## À propos des fichiers de design
Les fichiers `.dc.html` de ce dossier sont des **références de design en HTML** (prototypes montrant l'apparence et le comportement voulus), pas du code de production. La tâche est de **recréer ces écrans dans la codebase Next.js existante** (App Router + Tailwind CSS v4), en respectant ses patterns actuels (composants dans `src/components`, routes dans `src/app/(dashboard)/…`). Ouvrir `MboaSchool Tissé.dc.html` dans un navigateur pour voir le rendu (bouton/nav interne pour changer d'écran).

## Fidélité
**Haute fidélité (hifi)** : couleurs, typo, espacements, rayons et états hover sont finaux. Reproduire au pixel près avec Tailwind.

## Design tokens

### Couleurs
- `--bg` `#f8f4eb` — fond de page (crème)
- `--surface` `#fffdf8` — cartes, header, tableaux
- `--border` `#e9e1cf` — bordures de cartes
- `--border-row` `#f0e9d8` — séparateurs de lignes de tableau
- `--border-outline` `#dfd6c0` — bordures de boutons secondaires / pills
- `--ink` `#2b2318` — texte principal (brun encre), aussi fond sombre (cartes accent, footer)
- `--ink-soft` `#6b5f4a` — texte secondaire
- `--ink-faint` `#a3947a` — texte tertiaire / labels
- `--accent` `#b5502f` — terracotta (CTA, liens, alertes impayés) ; hover `#9d4326`
- `--cream` `#fdf3e3` — texte sur fonds sombres/accent
- `--green` `#1a5c3f` — succès / payé ; fond pastille `#ecf1ea`
- `--red-bg` `#f7e8e1` — fond pastille impayé (texte `#b5502f`)
- `--chip` `#f3ecdb` — avatars, chips, barres de progression (piste) ; hover boutons beiges `#ece3cc`
- Fond input : `#f8f4eb`, focus : bordure `#b5502f` + fond `#fffdf8`
- Hover ligne de tableau : `#fdfaf2`

### Motif signature « bande kenté »
Bande horizontale en haut de chaque page (5–6 px) :
```css
background: repeating-linear-gradient(90deg, #b5502f 0 56px, #2b2318 56px 112px);
```

### Typographie
- Famille : **Bricolage Grotesque** (Google Fonts, poids 400–800). En Next.js : `next/font/google` → remplacer Geist dans `src/app/layout.tsx` et `globals.css`.
- Titres de page : 40–44px, weight 800, letter-spacing -1.5px, couleur ink.
- Gros chiffres KPI : 38–52px, weight 800, letter-spacing -1.5/-2px.
- Corps : 14–15px ; labels/en-têtes de tableau : 12px weight 700 uppercase letter-spacing 1px couleur faint.

### Rayons / ombres
- Cartes : 20px (grandes cartes login/pricing : 24px) ; inputs & boutons : 12px ; petits chips : 8–14px ; pills/nav/badges : 999px.
- Ombre CTA : `0 6px 16px -6px rgba(181,80,47,0.5)` ; carte login : `0 30px 60px -30px rgba(43,35,24,0.25)` ; hover carte classe : `translateY(-4px)` + `0 16px 32px -16px rgba(43,35,24,0.25)`.

### Animations
- `fadeUp` : opacity 0 / translateY(16px) → visible ; 0.4–0.6s `cubic-bezier(0.22,1,0.36,1)` ; délais en cascade (~0.06–0.08s par item).
- `growX` : scaleX(0→1), origin left, 0.9s — barres de recouvrement.
- `pulseDot` : pastille verte « Synchronisé » qui pulse (2s).

## Correspondance écrans → codebase

| Écran du design (`data-screen-label`) | Fichier(s) cible(s) |
|---|---|
| Landing page | `src/app/page.tsx` + `src/components/landing/` |
| Connexion | `src/app/login/` |
| Coquille app (bande kenté + header sticky, nav en pills, pastille « Synchronisé », avatar, déconnexion) | `src/components/DashboardLayout.tsx` + `src/app/(dashboard)/layout.tsx` |
| Tableau de bord | `src/app/(dashboard)/dashboard/` |
| Élèves (liste, KPI, filtres, table avec barre de scolarité) | `src/app/(dashboard)/eleves/` |
| Fiche élève | `src/app/(dashboard)/eleves/` (page détail) |
| Finance (onglets pills, journal OHADA) | `src/app/(dashboard)/finance/` |
| Évaluations (synthèse, rangs, mentions) | `src/app/(dashboard)/evaluations/` |
| Classes (cartes par section) | `src/app/(dashboard)/classes/` + `sections/` |
| **Emploi du temps** (nouveau module — grille 6 jours) | `src/app/(dashboard)/emploi-du-temps/` |
| Enseignants | `src/app/(dashboard)/enseignants/` |
| Ressources humaines | `src/app/(dashboard)/rh/` |
| Paramètres | `src/app/(dashboard)/settings/` |
| Bulletin MINESEC (`Bulletin MINESEC.dc.html`, format A4) | gabarit d'impression/PDF des bulletins |

**Changement structurel majeur** : la navigation passe d'une **sidebar sombre** (design actuel) à un **header horizontal sticky** sur fond `#fffdf8` avec nav en pills (item actif : fond `#2b2318`, texte `#fdf3e3` ; inactif : texte `#6b5f4a`, hover fond chip). La bande kenté est au-dessus du header sur chaque écran (login, landing, app).

## Module Emploi du temps — détail (nouveau)

Écran à construire (route probablement absente ou vide actuellement) :
- Header : titre "Emploi du temps" + sous-titre, `<select>` de classe à droite (style input standard, options : ex. Terminale D, 6ème A, Seconde C, Form 1) — brancher sur la liste réelle des classes.
- Carte tableau (`#fffdf8`, bordure `#e9e1cf`, radius 20px, `overflow: hidden`) contenant une grille CSS `grid-template-columns: 150px repeat(6, 1fr)` :
  - Ligne d'en-tête : fond `#f8f4eb`, colonnes Lundi→Samedi, texte 12px/800/uppercase/letter-spacing 1px couleur `#a3947a`, séparateurs verticaux `1px solid #f0e9d8`.
  - Une ligne par créneau horaire (ex. 07h-09h, 09h-11h, …), hauteur min 88px, séparateur horizontal `1px solid #f0e9d8` :
    - Colonne "Créneaux" : libellé du créneau (12px/800/ink) + durée (10px/600/faint).
    - 6 cellules jour : si un cours est planifié → pastille colorée (radius 12px, padding 10px 12px) avec nom de la matière (13px/800, couleur = `cell.color`) et nom du professeur (11px/600, même couleur, opacité 0.7) ; fond `cell.bg` = teinte pastel dérivée de la matière (mapper chaque matière à une couleur cohérente, palette pastel sur les tokens : ex. beige chip, vert clair, terracotta clair…) ; cellule vide si pas de cours.
  - Ligne "pause déjeuner" : au lieu de 6 cellules, une seule bande pleine largeur fond `#f8f4eb`, texte centré uppercase letter-spacing 2px "Pause déjeuner".
- Données à modéliser côté back : table `emploi_du_temps` (ou équivalent) avec classe, jour, créneau, matière, enseignant — alimentée depuis Supabase, pas de mock en dur.
- Actions attendues (à confirmer avec le produit) : édition d'un créneau au clic (modal ou inline), génération auto depuis les affectations enseignants/matières.

## Interactions & états
- Boutons CTA : fond `#b5502f`, texte `#fdf3e3`, weight 800, hover `#9d4326`.
- Boutons secondaires : transparent, bordure `#dfd6c0`, hover bordure/texte `#2b2318`.
- Liens : `#b5502f`, hover `#9d4326`, pas de soulignement.
- Statuts paiement : Payé (vert `#1a5c3f` / `#ecf1ea`), Partiel (brun `#6b5f4a` / `#f3ecdb`), Non payé (`#b5502f` / `#f7e8e1`) — pastilles pill weight 800 12px.
- Barres de progression : piste `#f3ecdb`, remplissage `#2b2318` si ≥ 75 %, `#b5502f` sinon.
- Onglets segmentés : conteneur pill `#fffdf8` bordure `#e9e1cf` padding 5px ; onglet actif fond `#2b2318` texte `#fdf3e3`.

## Mise en œuvre Tailwind v4 (suggestion)
Dans `src/app/globals.css`, remplacer les variables actuelles par un bloc `@theme` avec les tokens ci-dessus (ex. `--color-bg: #f8f4eb; --color-surface: #fffdf8; --color-ink: #2b2318; --color-accent: #b5502f; …`) + les `@keyframes` fadeUp/growX/pulseDot, et brancher Bricolage Grotesque via `next/font`. Supprimer le mode sombre auto (`prefers-color-scheme`) : le design est clair uniquement. Ne PAS toucher à la logique métier, aux appels Supabase ni aux routes — uniquement la couche présentation.

## Fichiers du bundle
- `MboaSchool Tissé.dc.html` — référence principale (12 écrans)
- `Bulletin MINESEC.dc.html` — bulletin A4 conforme MINESEC
- `support.js`, `doc-page.js` — runtime pour ouvrir les références dans un navigateur (ne pas porter dans l'app)
