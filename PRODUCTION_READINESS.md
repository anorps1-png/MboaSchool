# État de préparation à la production — MboaSchool / APON

Suivi des chantiers de robustesse et de scalabilité. Mis à jour le 2026-07-26.

---

## 🔴 Incident critique corrigé — 2026-07-26

**Le correctif du 22/07 n'avait fermé la fuite qu'à moitié.** Il a nettoyé les
politiques de `eleves` et `paiements`, mais la table `parent_eleves`, créée par
la même migration fautive (`20260721140000`), porte exactement le même motif et
n'avait jamais été corrigée :

```sql
CREATE POLICY "Parents see their children" ON public.parent_eleves
  USING (parent_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles
         WHERE id = auth.uid() AND role IN ('admin','directeur')));
```

Branche admin sans filtre `etablissement_id`, pas de clause `FOR` (donc
`FOR ALL`), pas de `WITH CHECK` (donc Postgres réutilise l'expression `USING`
en écriture). **Chaîne d'exploitation complète, sans privilège préalable** :
s'inscrire normalement rend admin de son propre établissement, ce qui donne la
lecture de tous les couples (parent, élève) de la plateforme, donc les UUID
d'élèves des autres écoles ; un second compte `parent` créé dans sa propre
école permet ensuite de s'y rattacher par `INSERT`, et les politiques parent de
`20260722100000` (qui ne vérifiaient jamais `etablissement_id`, déléguant 100 %
de l'isolation à `parent_eleves`) ouvrent alors l'identité complète de l'élève
visé et tout son historique de paiements.

**Corrigé par `20260726100000_fix_parent_eleves_leak_and_role_scoping.sql`** :
- `parent_eleves` : `SELECT` et écriture séparés, tous deux scopés au tenant,
  écriture réservée à admin/directeur.
- Politiques parent sur `eleves`/`paiements` : ajout du filtre tenant et de
  `deleted_at IS NULL` (absent, alors que toutes les autres politiques du
  projet l'ont : un parent voyait un élève ou un paiement soft-supprimé).
- `tranches_scolarite`, `matieres`, `emploi_du_temps` : exclusion du rôle
  `parent`, qui pouvait supprimer la grille tarifaire de son école.
- `paiements` : lecture large, écriture (INSERT/UPDATE/DELETE) réservée à
  admin/directeur. Auparavant une seule politique `FOR ALL` n'excluait que
  `parent`, si bien qu'un enseignant pouvait modifier ou supprimer n'importe
  quel paiement depuis la console du navigateur ; le seul garde-fou était un
  rendu conditionnel React alimenté par le localStorage.
- `discipline_incidents` : un parent pouvait effacer une sanction.
- **Filet structurel** : politique `AS RESTRICTIVE` de tenant sur les tables
  concernées. Les politiques permissives se combinant par OR, elles ne peuvent
  qu'élargir l'accès, ce qui est le mécanisme commun aux incidents du 22/07 et
  du 23/07. Une restrictive est combinée par AND et rend inoffensive toute
  future politique permissive mal écrite. Pose défensive : elle n'est appliquée
  qu'aux tables sans ligne à `etablissement_id` NULL, pour ne pas masquer de
  données existantes (les tables sautées émettent un NOTICE).

**Autres correctifs du même audit :**

| Migration | Objet |
|---|---|
| `20260726110000` | Les 3 RPC finance et `get_dashboard_stats`/`get_students_paginated`/`get_students_widget_stats` : paramètre année scolaire, filtre `type_frais = 'Scolarité'`, suppression du prix par défaut inventé (200 000 F). |
| `20260726120000` | Triggers de cohérence tenant sur `classes.annee_scolaire_id`, `tranches_scolarite.annee_scolaire_id`, `eleves.annee_scolaire_id` et `paiements.tranche_id` : le contrôle de clé étrangère s'exécute hors RLS, donc une ligne pouvait référencer un autre établissement (avec `ON DELETE CASCADE`, cela constituait une primitive de destruction inter-tenant). |
| `20260726130000` | `soft_delete_paiement` / `restore_paiement` : le paiement était le seul objet financier détruit physiquement. |

**Montants faux corrigés (aucun signal d'erreur ne les signalait) :**
- Le taux de recouvrement divisait un numérateur filtré par année scolaire
  (`get_dashboard_stats`) par un dénominateur toutes années confondues
  (`get_finance_account_balances`, sans paramètre année) : 33 % affichés au lieu
  de 100 % sur une école de 3 ans, l'écart grandissant à chaque rentrée.
- `total_paid` : le commit `4fc589a` avait restreint le total aux paiements de
  scolarité côté client mais pas côté SQL, si bien qu'un élève ayant payé
  inscription plus scolarité partielle apparaissait « Payé » dans le tableau et
  « Partiel » sur sa fiche.
- Quatre valeurs de repli différentes pour le même frais quand `classes.prix`
  est vide (200 000, 150 000, 0, « Non configuré »). Plus aucun montant inventé.

**Fonctionnalités réparées :** le modal de réinscription cherchait dans une
liste qui n'est peuplée qu'en mode dégradé (donc toujours vide en production,
désormais recherche serveur) ; l'acompte encaissé à l'inscription et à la
réinscription était perdu hors-ligne (la branche offline sortait avant la
création du paiement) ; la classe de réinscription pouvait appartenir à une
autre année que l'année de destination ; supprimer une tranche détaguait
silencieusement les paiements (`ON DELETE SET NULL`), ce qui faisait repasser
« en retard » des familles à jour.

**Sécurité applicative :** le service worker mettait les réponses Supabase en
cache disque une heure via `defaultCache` (identités, coordonnées des parents,
historique des paiements), sans que le JWT fasse partie de la clé de cache,
donc relisibles hors réseau sur un poste partagé — désormais `NetworkOnly` sur
l'origine Supabase, règle placée avant `defaultCache` (vérifié dans le bundle
généré) ; aucune purge n'avait lieu à la déconnexion (ajout de `caches.delete`
et du nettoyage des clés locales, hors hashes PBKDF2 en desktop) ; les
mutations de paiement de la fiche élève contournaient `paiementSchema` ;
`path.includes('.')` dans `proxy.ts` traitait toute route dynamique contenant
un point comme un fichier statique.

### Régression introduite puis corrigée le même jour

`20260726100000` scopait les politiques de `parent_eleves` par une sous-requête
sur `eleves`, alors que la politique parent de `eleves` interroge
`parent_eleves`. Les expressions de politique étant soumises à la RLS de la
table référencée, cela a créé un cycle `eleves -> parent_eleves -> eleves` :
Postgres l'a détecté et **toute lecture de `eleves` échouait** (42P17), pour
tous les rôles. Détecté par le test d'isolation joué juste après l'application.

Corrigé par `20260726140000_fix_rls_infinite_recursion.sql` : les deux côtés du
cycle passent par des fonctions `SECURITY DEFINER`
(`eleve_etablissement_id`, `current_parent_eleve_ids`), qui s'exécutent hors RLS
— même mécanisme que `current_user_etablissement_id()`. Le durcissement est
intégralement préservé. **Leçon** : toute politique RLS qui référence une table
elle-même protégée par une politique référençant la première doit passer par
une fonction `SECURITY DEFINER`.

### Vérification en production (2026-07-26, après application)

Migrations appliquées sur le projet `fjsuhzgvoswdmwaowkcz`, chaque fichier dans
sa propre transaction, avec test d'isolation avant COMMIT.

- **Isolation confirmée** : les 9 comptes admin voient exactement leur propre
  établissement (735/735, 393/393, 1576/1576, les autres 0/0) sur un total
  plateforme de 3356 élèves. Le compte parent voit **1 élève** au lieu des 1576
  de son école.
- **Chaîne d'exploitation bloquée à chaque étape** : rattachement d'un parent à
  un élève d'une autre école refusé (42501) ; modification par l'admin A d'un
  élève de l'école B sans effet (0 ligne) ; classe de A pointant vers une année
  de B refusée par le trigger (23514) ; parent sans aucun accès en écriture aux
  tranches.
- **Aucune régression** : un admin conserve la lecture et l'écriture des
  tranches de son école et peut toujours encaisser un paiement ; les six RPC
  (dont les trois de finance, aux nouvelles signatures) répondent normalement.
- L'historique `supabase_migrations.schema_migrations` a été resynchronisé :
  les migrations du 21 au 25/07 avaient été appliquées à la main sans y être
  enregistrées, si bien qu'un `supabase db push` aurait tenté de les rejouer et
  échoué sur une contrainte déjà existante.

**Points levés par la vérification en base :**
1. **Résolu** — l'unicité du matricule est bien `UNIQUE (etablissement_id,
   matricule, annee_scolaire_id)` et l'ancienne contrainte globale a disparu.
   Réserve subsistante : `eleves.annee_scolaire_id` est encore *nullable*, et
   NULL étant distinct de NULL dans un index unique, l'unicité ne s'applique
   pas aux lignes sans année. Aucune ligne dans ce cas aujourd'hui.
2. **Résolu, ce n'était pas un P0** — les 13 tables ont bien `etablissement_id`
   et la RLS active en production (seules `discipline_incidents` et
   `formations_beneficiaires` n'ont pas la colonne, mais elles sont protégées
   par une politique passant par `eleve_etablissement_id`). Le risque ne
   concerne que les bases reconstruites depuis les seules migrations.
3. **Toujours ouvert** — logs PostgREST du 23 au 25/07 sur
   `tranches_scolarite` : la policy tautologique de `20260723100000` a pu
   exposer la grille tarifaire de toutes les écoles pendant environ deux jours.
   À vérifier dans le dashboard Supabase.
4. Constat annexe : les 5278 paiements sont tous de type `Scolarité`. Le filtre
   ajouté ne change donc aucun montant aujourd'hui, il empêche la divergence
   dès qu'un premier frais d'inscription sera saisi.

---

## 🔴 Incident critique corrigé — 2026-07-22

**Fuite RLS inter-tenant** introduite par `20260721140000_parent_accounts_system.sql` :
les politiques RLS ajoutées pour restreindre les comptes parents à leurs enfants
contenaient des branches admin/directeur/enseignant **sans filtre
`etablissement_id`**. Les politiques RLS permissives se combinant par OR, cela
donnait à tout admin/directeur/enseignant, de n'importe quel établissement,
un accès en lecture à **tous les élèves et paiements de toutes les écoles**.
Un second défaut lié rendait par ailleurs la restriction parent inopérante :
un compte parent avait accès en lecture **et écriture** à toute l'école de son
enfant, la politique de base ne pouvant pas être restreinte par une politique
additionnelle (les politiques RLS permissives ne font qu'ajouter de la
visibilité, jamais en retirer).

**Confirmé actif en production** avant correction : un admin réel (école à
3000 élèves) voyait les 5677 élèves de la plateforme entière (12
établissements) au lieu des 3000 de sa propre école. Seuls 9 comptes `admin`
existaient en base au moment du correctif (aucun `directeur`/`enseignant`/
`parent`) — la fuite était donc exploitable par ces 9 comptes ; le volet
parent n'avait pas encore été exposé à un utilisateur réel.

**Corrigé et vérifié** par `20260722100000_fix_parent_rls_cross_tenant_leak.sql` :
- Suppression des branches non scopées (admin/directeur/enseignant retrouvent
  leur accès via la politique tenant existante, déjà correcte).
- La politique de base exclut désormais explicitement le rôle `parent`
  (lecture et écriture) ; seule la politique dédiée `parent_eleves` gouverne
  la visibilité d'un compte parent, en lecture seule.
- Vérifié en base : un admin ne voit plus que son établissement (3000/5677
  élèves, 2393/5212 paiements — comptage exact, plus de fuite).
- Trouvaille annexe corrigée dans la même migration : `discipline_incidents`
  existait sans RLS (table vide, créée par une migration précédente,
  jamais réellement utilisée par le code — celui-ci écrit dans `discipline`).
  RLS activée par défense en profondeur ; le bulletin (qui lisait la mauvaise
  table) a été corrigé pour lire `discipline`.

**Reste à faire** : roter le mot de passe DB (transité en clair une seconde
fois pendant l'incident) et le token GitHub déjà signalé précédemment.

---

## ✅ Fait

### Sécurité (application)
- **Middleware** : suppression du contournement d'authentification par simple
  présence de cookie ; la session hors-ligne n'est honorée que dans l'app desktop
  (`MBOASCHOOL_DESKTOP=1`), jamais sur le web.
- **API `/api/local-db`** : verrouillée au runtime desktop (403 sinon).
- **Mots de passe hors-ligne** : hachés en PBKDF2-SHA256 (plus jamais en clair),
  migration automatique des anciennes entrées.
- **Backdoor démo** : limitée aux builds de développement.

### Sécurité (base de données) — migrations appliquées
- `20260713120000_security_hardening.sql` : RLS stricte par tenant sur toutes
  les tables (dont `fiches_de_paie` qui fuyait entre écoles), fin de la prise de
  contrôle inter-tenant via `profiles`/signup, table `invitations` contrôlée
  côté serveur, anti-escalade de rôle, unicités par établissement, contraintes
  CHECK, index, `current_user_etablissement_id()` durcie (STABLE + search_path).
- `20260713130000_ecriture_comptable_rpc.sql` : RPC transactionnelle
  `create_ecriture_comptable` — en-tête + lignes atomiques + contrôle de
  l'équilibre débit = crédit (invariant OHADA). Câblée dans `finance.ts`.
- `20260713140000_updated_at_audit.sql` : colonnes `updated_at` + triggers.
- `20260713150000_dashboard_stats_rpc.sql` : RPC `get_dashboard_stats` — tous les
  indicateurs globaux du tableau de bord calculés en base (agrégats SQL) au lieu
  du recalcul client sur toutes les lignes. Vérifiée sur 3000 élèves (~275 ms).
  Le tableau de bord ne charge plus les notes imbriquées (taux de réussite
  désormais serveur) : transfert allégé. Câblée via `getDashboardStats()`.
- `20260713160000_class_rankings_rpc.sql` : RPC `get_class_rankings` — moyennes,
  rangs et mentions par classe calculés en base, reproduisant fidèlement la
  sémantique des pages (vérifié : 197 élèves, 0 écart avec le calcul client).
  Câblée dans la synthèse de classe et le bulletin via `getClassRankings()`,
  avec repli sur le calcul client en cas d'indisponibilité (hors-ligne).
- `20260714100000_scalability_indexes.sql` : index composites/couvrants pour la
  montée en charge multi-tenant. Mesuré sur données réelles : la somme des
  paiements réglés passe de **40 ms à ~1 ms** (Index Only Scan couvrant), et la
  liste des élèves triée par nom passe en Index Scan (plus de tri).
- `20260714110000_soft_delete.sql` : soft-delete des données sensibles. Colonnes
  `deleted_at` + politiques RLS qui masquent les lignes supprimées de TOUTES les
  lectures (y compris les RPC d'agrégat, en SECURITY INVOKER). RPC
  `soft_delete_eleve` / `soft_delete_ecriture` (+ enfants : paiements, notes,
  bulletins, lignes) et `restore_*`. Vérifié en base : la suppression masque la
  ligne et ses enfants, les agrégats les excluent, la restauration fonctionne.
  Handlers UI câblés (page Élèves, suppression d'écriture en finance). La
  suppression de compte (settings) reste une destruction physique via CASCADE.

### Qualité / industrialisation
- **Observabilité** : reporting d'erreurs agnostique (`lib/observability/logger`)
  + intégration Sentry **inerte tant qu'aucun DSN n'est configuré**. Error
  boundaries React (racine + dashboard) et capture dans les couches DB/sync.
  Pour activer : renseigner `NEXT_PUBLIC_SENTRY_DSN` (voir `.env.example`).
- **Tests** : Vitest, 39 tests sur les calculs scolaires, la paie CNPS et la
  validation. `npm test`.
- **CI** : `.github/workflows/ci.yml` — lint + typecheck + tests + build.
- **Validation** : schémas Zod sur élèves et paiements (`lib/validation`).
- **Politique de mot de passe (front)** : minimum **8 caractères + une lettre et
  un chiffre** au signup et à la création de comptes (`lib/validation/password`).
  Reste à aligner côté Supabase Auth (voir `docs/AUTH_RATE_LIMITING.md`).
- **Dépendance vulnérable** : `xlsx` npm (CVE) remplacé par le build officiel
  SheetJS. Vulnérabilité `undici` (high) corrigée.
- **Hygiène repo** : `.env.example`, scripts jetables archivés dans
  `scripts/dev-archive`, SQL legacy dans `supabase/legacy`, script à secrets
  supprimé.

---

## ⏳ À faire — nécessite une décision ou un compte externe (vous)

| Chantier | Action attendue | Priorité |
|---|---|---|
| **Rotation du mot de passe DB** | Régénérer le mot de passe Postgres (il a transité en clair pendant la mise en place). Sans impact : l'app n'utilise que la clé anon. | 🔴 Haute |
| **Backups / PITR** | Activer les sauvegardes et le Point-In-Time Recovery dans le dashboard Supabase, puis tester une restauration. | 🔴 Haute |
| **Observabilité (Sentry)** | ✅ Intégration en place (inerte sans DSN). Reste à **créer le projet Sentry** et renseigner `NEXT_PUBLIC_SENTRY_DSN` (+ token CI pour les sourcemaps). | 🟠 Moyenne |
| **Rate limiting / durcissement Auth** | Le login/signup passe par Supabase Auth (rate-limit intégré). Reste à **configurer le dashboard** : CAPTCHA, confirmation email, SMTP, politique mot de passe, MFA. Guide détaillé : [`docs/AUTH_RATE_LIMITING.md`](docs/AUTH_RATE_LIMITING.md). | 🟠 Moyenne |
| **Confirmation email** | Vérifier la config Supabase Auth (SMTP) : actuellement l'email est auto-confirmé par trigger. À réévaluer selon votre politique. | 🟠 Moyenne |

---

## ⏳ À faire — chantiers de code (à planifier)

| Chantier | Détail | Priorité |
|---|---|---|
| **Soft-delete** | ✅ En place pour élèves (+ paiements/notes/bulletins) et écritures comptables (+ lignes), masqués par RLS et récupérables. Reste éventuellement à ajouter un écran de « corbeille » (restauration) et à couvrir la suppression d'enseignant dédiée. | 🟢 Basse |
| **Résolution de conflits offline** | Exploiter `updated_at` + un `client_id` idempotent ; réconcilier les IDs locaux `local_*` avec les UUID serveur pour ne pas casser les FK à la synchro. | 🟠 Moyenne |
| **Pagination serveur réelle** | L'UI charge encore tout en mémoire. Paginer côté serveur + `select` de colonnes explicites (46 `select('*')`). | 🟠 Moyenne |
| **Agrégats en base** | ✅ Tableau de bord (`get_dashboard_stats`) + moyennes/rangs par classe (`get_class_rankings`, câblé dans la synthèse et le bulletin). Reste à étendre aux vues finance/RH. | 🟠 Moyenne |
| **Découpage des pages géantes** | `finance/page.tsx` (~143 Ko) et `rh/page.tsx` (~166 Ko) : découper, passer les lectures en Server Components ou TanStack Query (cache/retry/invalidation). | 🟡 Basse |
| **SQLite en desktop** | Remplacer le fallback JSON/localStorage (quota ~5 Mo) par `better-sqlite3` côté Electron pour les gros jeux de données. | 🟡 Basse |
| **Migration `middleware` → `proxy`** | Next 16 déprécie la convention `middleware`. Renommer selon la nouvelle API. | 🟡 Basse |

---

## Vulnérabilités résiduelles (npm audit)

En **production** : 2 avis modérés `postcss`, transitifs via Next.js lui-même —
corrigeables seulement quand Next publie une release patchée (ne pas forcer :
`npm audit fix --force` downgraderait Next en v9). Les avis critical/high
restants sont **uniquement dans les devDependencies** (esbuild/vite via Vitest),
jamais livrées aux utilisateurs.
