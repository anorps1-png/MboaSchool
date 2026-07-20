# État de préparation à la production — MboaSchool / APON

Suivi des chantiers de robustesse et de scalabilité. Mis à jour le 2026-07-22.

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
