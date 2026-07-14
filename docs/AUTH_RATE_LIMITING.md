# Sécurité d'authentification & rate-limiting (Supabase Auth)

Guide de configuration des protections anti-abus de l'authentification.
Dernière mise à jour : 2026-07-14.

> **Pourquoi ce document ?** L'application ne possède pas de route d'API custom
> exposée à protéger : le login et l'inscription passent **directement par
> Supabase Auth** depuis le client (`signInWithPassword`, `signUp`). C'est donc
> Supabase — pas le code applicatif — qui doit porter le rate-limiting. Un
> rate-limiter maison serait redondant avec celui de Supabase, ou imposerait de
> re-router l'auth via une API route + un service externe (effort élevé, gain
> faible). La bonne approche est de **configurer et durcir Supabase Auth**.

---

## ⚠️ Risque spécifique à cette application

À l'inscription, un trigger base (`handle_new_user_signup`) crée **un
établissement complet + une année scolaire + un profil admin**. Une inscription
n'est donc pas anodine : un flot d'inscriptions automatisées créerait des
établissements fantômes en masse. De plus, un autre trigger
(`handle_before_user_signup`) **auto-confirme l'email** (`email_confirmed_at = NOW()`),
ce qui retire la barrière naturelle de la vérification d'email.

**Conséquence : la protection de l'inscription (CAPTCHA + confirmation d'email)
est au moins aussi importante que le rate-limiting du login.**

---

## 1. Rate limits — Dashboard Supabase

**Authentication → Rate Limits.** Supabase applique déjà des limites par défaut ;
il s'agit de les vérifier et de les resserrer. Les catégories configurables :

| Limite | Rôle | Recommandation |
|---|---|---|
| **Sign in / Sign up** (par IP, fenêtre de 5 min) | Plafonne les tentatives de connexion/inscription — c'est la barrière anti brute-force du login | Garder basse (l'ordre de grandeur par défaut, ~30/5 min/IP, convient). Ne pas augmenter sans raison. |
| **Token refresh** (par IP, 5 min) | Rafraîchissement de session | Défaut adapté ; à ne pas abaisser (couperait des sessions légitimes). |
| **Token / OTP verification** (par IP, 5 min) | Vérification de codes | Garder bas : limite le bruteforce d'OTP. |
| **Email sending** (par heure) | Emails d'auth (confirmation, reset) | Faible avec le SMTP intégré. **Configurer un SMTP dédié** (voir §4) puis fixer une limite raisonnable. |
| **SMS sending** (par heure) | OTP SMS (si activé) | Sans objet ici (pas de SMS). Laisser au minimum. |
| **Anonymous sign-ins** (par IP/heure) | Connexions anonymes | Sans objet (non utilisé). Laisser au minimum ou désactiver. |

> Les valeurs par défaut exactes évoluent selon les versions de Supabase :
> **vérifiez les chiffres réels dans votre projet** et ajustez à partir de là.
> Principe : **le login et l'OTP doivent rester à des limites basses par IP**.

---

## 2. CAPTCHA — la protection la plus efficace ici

**Authentication → Settings → Bot and Abuse Protection (CAPTCHA).**

Active un challenge (hCaptcha ou Cloudflare Turnstile) sur les endpoints d'auth.
C'est le **levier le plus efficace** contre :
- le brute-force du login (chaque tentative exige un challenge) ;
- les inscriptions automatisées (qui créeraient des établissements en masse).

**Étapes :**
1. Créer un site hCaptcha ou Turnstile, récupérer *site key* + *secret*.
2. Renseigner le secret dans Supabase (Bot Protection) et activer.
3. Côté client, intégrer le widget et passer le token à `signUp` /
   `signInWithPassword` via `options: { captchaToken }`.

> À défaut d'intégration front immédiate, priorisez au minimum la **confirmation
> d'email** (§3) qui limite déjà fortement l'abus d'inscription.

---

## 3. Confirmation d'email

**Authentication → Providers → Email → "Confirm email".**

Aujourd'hui l'email est **auto-confirmé** par le trigger `handle_before_user_signup`.
Deux options selon votre besoin produit :

- **Recommandé (sécurité)** : activer la confirmation d'email réelle et
  **retirer l'auto-confirmation** du trigger. Une inscription ne crée alors un
  accès qu'après clic sur le lien reçu → stoppe les inscriptions à emails bidon.
  Nécessite un SMTP fiable (§4).
- **Si vous gardez l'auto-confirmation** (onboarding sans friction) : alors
  **CAPTCHA (§2) devient indispensable** pour compenser l'absence de barrière.

> Décision produit à trancher. Ne pas laisser *ni* confirmation *ni* CAPTCHA en
> production.

---

## 4. SMTP dédié

**Authentication → Settings → SMTP Settings.**

Le SMTP intégré de Supabase est fortement limité (quelques emails/heure) et
réservé au développement. Pour la production (confirmation, reset de mot de
passe), configurer un fournisseur (Resend, SendGrid, Amazon SES, Postmark…).
Sans cela, les emails de confirmation/reset seront throttlés et non fiables.

---

## 5. Politique de mots de passe

**Authentication → Settings → Password.**

- **Longueur minimale** : la porter à **au moins 8-10 caractères** (viser 12).
  ✅ Le front applique désormais **8 caractères minimum + au moins une lettre et
  un chiffre** (`src/lib/validation/password.ts`, utilisé au signup et à la
  création de comptes). **À aligner côté Supabase** (même longueur minimale).
- **Protection contre les mots de passe compromis** : activer
  **"Leaked password protection"** (vérification HaveIBeenPwned). Refuse les mots
  de passe connus dans des fuites.
- **Complexité** : exiger un mélange (lettres + chiffres au minimum).

---

## 6. Sessions & JWT

**Authentication → Settings → Sessions.**

- Durée de vie du JWT d'accès : garder courte (défaut ~1 h) — la rotation du
  refresh token limite l'impact d'un vol de token.
- Envisager une **expiration d'inactivité** et une **durée de session maximale**
  pour les comptes admin/directeur.

---

## 7. MFA (authentification à deux facteurs)

**Authentication → Settings → Multi-Factor Authentication.**

Activer le MFA (TOTP) et l'**exiger pour les rôles `admin` et `directeur`** :
ces comptes voient les salaires, la comptabilité et les données de tous les
élèves. C'est la protection la plus forte contre le vol d'identifiants.

---

## Checklist de mise en production

- [ ] Vérifier les rate limits (login/OTP bas par IP) — §1
- [ ] Activer CAPTCHA sur login + signup — §2
- [ ] Trancher la politique de confirmation d'email (réelle *ou* CAPTCHA) — §3
- [ ] Configurer un SMTP dédié — §4
- [x] Longueur mot de passe ≥ 8 **côté front** (fait) — reste : aligner Supabase + activer leaked password protection — §5
- [ ] Vérifier la durée de vie des sessions — §6
- [ ] Activer/exiger le MFA pour admin & directeur — §7

## Ce qui est déjà en place (côté application)

- Rate-limiting de base assuré par **Supabase Auth** (limites par défaut).
- Les inscriptions de **collaborateurs** sont verrouillées côté serveur par la
  table `invitations` (un compte ne rejoint un établissement que sur invitation
  valide — voir `20260713120000_security_hardening.sql`).
- Le middleware n'accorde l'accès que sur session Supabase vérifiée (plus de
  contournement par cookie).
