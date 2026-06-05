# Documentation Technique - SaaS Scolaire APON / MboaSchool

Ce document présente l'architecture technique, le modèle de données, les règles métier et la sécurité du SaaS de gestion scolaire destiné aux établissements au Cameroun.

---

## 1. Stack Technique Globale

- **Frontend / Framework** : Next.js 14/16 (App Router) avec TypeScript & Tailwind CSS.
- **Backend / Database** : Supabase (PostgreSQL, Supabase Auth, Row-Level Security, REST PostgREST API).
- **Offline / PWA** : Serwist + IndexedDB (`idb-keyval`) pour le support hors-ligne et la synchronisation.

---

## 2. Modèle de Données Supabase (`supabase/schema.sql`)

La base de données repose sur un partitionnement multi-tenant par `etablissement_id`. Le schéma est structuré de la manière suivante :

### 2.1 Base & Académique
- **`etablissements`** : Enregistre les établissements scolaires avec leur `seuil_reussite` (ex: 10/20) et l'année scolaire active.
- **`annees_scolaires`** : Périodes scolaires (ex: "2025-2026").
- **`sections`** : Division par sous-systèmes (ex: "Francophone", "Anglophone", "Bilingue").
- **`niveaux_classes`** : Niveaux d'études (ex: "CM2", "Form 1", "6ème") rattachés à des cycles (Maternelle, Primaire, Secondaire).
- **`classes`** : Classes physiques pour une année scolaire donnée (ex: "6ème A", "CM2 B") avec le prix de la scolarité et l'enseignant principal.
- **`matieres`** : Matières d'un niveau avec leurs coefficients et barèmes.
- **`enseignants`** : Profils des enseignants (matricule, salaire, statut).

### 2.2 Élèves & Évaluations
- **`eleves`** : Informations de base de l'élève (matricule unique, classe, parent, statut).
- **`notes`** : Évaluations individuelles par trimestre. Supporte à la fois les notes chiffrées sur barème (ex: 14/20) et l'acquisition de compétences pour la Maternelle ("Acquis", "En cours", "Non acquis"). Contient également un champ texte `matiere` pour le support flexible des matières hors-catalogue.
- **`bulletins`** : Bulletins consolidés générés (moyenne, rang, mention, appréciation).
- **`paiements`** : Enregistrement des règlements (Scolarité, Inscription, Transport) avec statut (paid, pending) et référence de transaction (Orange Money, MTN MoMo, Espèces, Virement).

### 2.3 Comptabilité & Ressources Humaines (OHADA)
- **`comptes_ohada`** : Plan comptable basé sur les normes OHADA (classes 2, 4, 5, 6, 7).
- **`ecritures_comptables`** : En-têtes du journal de comptabilité générale.
- **`lignes_ecritures`** : Lignes d'écritures double-entrée (débit / crédit).
- **`membres_personnel`** : Fiche RH de tous les employés (Administration, Enseignant, Appui, Technique).
- **`absences_personnel`** & **`mouvements_personnel`** : Gestion des congés et des flux RH (embauche, départ).
- **`evaluations_rh`** & **`formations_rh`** : Processus d'évaluation des compétences et plans de formation.

### 2.4 QHSE & Satisfaction
- **`qhse_incidents`** : Registre de sécurité (gravité, résolution).
- **`enquetes`** & **`enquetes_historique`** : Enquêtes de satisfaction à destination des parents et du personnel.

---

## 3. Logique Métier & Moteur de Calculs (`src/lib/stats/`)

Le système embarque un module analytique (`calculations.ts`) pour automatiser les calculs scolaires complexes :
- **Normalisation des notes** : Conversion de notes de barèmes hétérogènes (ex: 35/50) vers un barème standard (ex: 14/20).
- **Moyenne Pondérée** : Calcul de moyennes trimestrielles en tenant compte des coefficients de chaque matière.
- **Calcul de Rang** : Tri dynamique et gestion des ex-æquos.
- **Quartiles & RCI** : Calcul des quartiles (Q1, médiane, Q3) pour détecter de manière précoce les décrochages scolaires.

---

## 4. Authentification, Rôles et Sécurité (RLS)

### 4.1 Authentification
L'authentification est gérée par **Supabase Auth**. La page `/login` utilise la méthode Email/Password.
Un middleware Next.js (`src/middleware.ts`) intercepte toutes les requêtes serveurs. Si aucun jeton de session n'est détecté dans les cookies, l'utilisateur est redirigé vers `/login`, sauf pour la landing page (`/`).

### 4.2 Row-Level Security (RLS)
Chaque table sensible dispose de politiques de sécurité limitant l'accès aux données. L'isolation multi-tenant s'effectue via l'ID de l'établissement lié au profil utilisateur :
```sql
CREATE POLICY "Eleves scope access" ON public.eleves TO authenticated 
  USING (
    classe_id IN (
      SELECT id FROM public.classes WHERE niveau_id IN (
        SELECT id FROM public.niveaux_classes WHERE section_id IN (
          SELECT id FROM public.sections WHERE etablissement_id = public.current_user_etablissement_id()
        )
      )
    )
  );
```

---

## 5. Résilience & Fallback Local (Hors-ligne)

Pour pallier les problèmes d'accès réseau fréquents, l'application intègre une architecture de fallback :
1. **Lecture Hybride** : Toutes les pages clés (`/finance`, `/rh`, `/evaluations`) tentent de charger les données depuis l'API REST de Supabase.
2. **Dégradation Gracieuse** : En cas de défaillance réseau ou si des tables spécifiques ne sont pas encore provisionnées dans l'instance de développement, le système bascule automatiquement sur les données de sauvegarde stockées dans le `localStorage` du navigateur.
3. **Synchronisation Locale** : Les insertions (comptes, écritures) sont enregistrées localement et poussées en tâche de fond dans le cloud lorsque la liaison avec Supabase est disponible.

---
*Ce document fait office de guide de référence pour le déploiement et la maintenance de la solution.*
