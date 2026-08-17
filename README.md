# WINTRACKER

Suivi de colis en temps réel — propulsé par Winner Express.

PWA React + TypeScript + Vite + Tailwind, backend Supabase (Auth, Postgres/RLS, Realtime, Storage).

## 1. Installer les dépendances

```bash
npm install
```

## 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com) (plan Free).
2. Copier `.env.example` vers `.env` et renseigner `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API).
3. Appliquer les migrations (`supabase/migrations/*.sql`), soit via le CLI Supabase :

   ```bash
   supabase link --project-ref <votre-ref>
   supabase db push
   ```

   soit en copiant chaque fichier dans l'éditeur SQL du dashboard, dans l'ordre numérique.

4. Déployer la fonction Edge `admin-create-user` (nécessaire pour créer les comptes
   compagnie/livreur depuis l'interface admin) :

   ```bash
   supabase functions deploy admin-create-user
   ```

## 3. Lancer en local

```bash
npm run dev
```

## 4. Créer le scénario de test (optionnel)

Crée UTB Transport, Jean Kouassi (COMPANY_USER), Koffi Yao (DRIVER) et un premier colis,
comme décrit dans `PROMPT.txt` (section 30).

```bash
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx npm run seed:test
```

Le premier compte SUPER_ADMIN doit être créé manuellement : créez l'utilisateur dans
Authentication → Users sur le dashboard Supabase, puis insérez sa ligne dans `profiles`
avec `role = 'SUPER_ADMIN'` et `company_id = null`.

## 5. Déploiement GitHub Pages

Le workflow `.github/workflows/deploy.yml` build et déploie automatiquement à chaque push
sur `main`. Configurer dans Settings → Secrets and variables → Actions :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Puis activer GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Structure

```
src/
  components/   composants UI et métier réutilisables
  pages/        pages par espace (admin, company, driver, auth)
  layouts/      layouts + garde de routes par rôle
  hooks/        auth, temps réel
  services/     accès Supabase (packages, companies, drivers, admin)
  types/        types partagés (schéma, statuts)
  lib/          client Supabase
supabase/
  migrations/   schéma, fonctions/triggers, RLS, storage
  functions/    Edge Function admin-create-user
scripts/        script de seed du scénario de test
```
