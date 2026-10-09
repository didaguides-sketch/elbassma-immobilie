# Globanic — Architecture Technique

## 1. Stack

| Couche | Choix | Justification |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Server Components, Server Actions, SSR/SEO natif |
| Langage | TypeScript strict | Type-safety end-to-end |
| UI | React + Tailwind CSS | Cohérent avec le design fourni |
| Base de données | PostgreSQL | Relationnel, Full Text Search natif, indexation avancée |
| ORM | Prisma | Migrations, type-safety, requêtes relationnelles claires |
| Auth | Auth.js (NextAuth v5) + Credentials/OAuth, sessions JWT ou DB | Auth réel, sessions sécurisées, rôles |
| Storage fichiers | Provider-agnostic (S3-compatible : AWS S3 / Cloudflare R2 / MinIO en dev) | Metadata en DB, binaire hors DB |
| Recherche | PostgreSQL Full Text Search (tsvector) au départ, interface `SearchProvider` abstraite | Migration future vers Meilisearch/Elasticsearch sans réécrire les appelants |
| Déploiement | Vercel (app) + Neon/Supabase (Postgres) + R2 (storage) | Production-ready, scalable |

## 2. Structure du projet

```
globanic/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                      # Seed data (dev uniquement)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                       # /
│   │   │   ├── search/page.tsx
│   │   │   ├── resources/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [type]/page.tsx
│   │   │   │   └── [type]/[slug]/page.tsx
│   │   │   ├── universities/[[...slug]]/page.tsx
│   │   │   ├── authors/[[...slug]]/page.tsx
│   │   │   ├── domains/[[...slug]]/page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (account)/account/...
│   │   ├── (publisher)/publisher/...
│   │   ├── (admin)/admin/...
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── resources/... (route handlers si nécessaire hors Server Actions)
│   │   │   ├── uploads/route.ts               # Upload signé vers Storage
│   │   │   └── track/(view|download)/route.ts
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── server/
│   │   ├── actions/                 # Server Actions (mutations)
│   │   │   ├── resource.actions.ts
│   │   │   ├── publisher.actions.ts
│   │   │   ├── admin.actions.ts
│   │   │   └── account.actions.ts
│   │   ├── services/                # Logique métier pure (testable)
│   │   │   ├── resource.service.ts
│   │   │   ├── search.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── moderation.service.ts
│   │   │   └── notification.service.ts
│   │   ├── repositories/            # Accès Prisma isolé
│   │   ├── storage/
│   │   │   ├── storage.interface.ts # abstraction provider
│   │   │   ├── s3.provider.ts
│   │   │   └── local.provider.ts    # dev only
│   │   ├── search/
│   │   │   ├── search.interface.ts
│   │   │   ├── postgres.provider.ts
│   │   │   └── meilisearch.provider.ts  # activable plus tard
│   │   └── auth/
│   │       ├── auth.config.ts
│   │       ├── rbac.ts              # can(role, action, resource)
│   │       └── session.ts
│   ├── components/                  # UI réutilisable (garde l'identité visuelle)
│   ├── lib/
│   │   ├── validation/               # Zod schemas (server-side validation)
│   │   └── utils/
│   └── middleware.ts                 # Protection routes /admin, /publisher
├── package.json
└── next.config.ts
```

## 3. RBAC (Role-Based Access Control)

Rôles : `USER`, `PUBLISHER`, `ADMIN`, `SUPER_ADMIN`.

Règles :
- Le rôle est **toujours** lu depuis la session serveur (JWT signé / DB), jamais depuis le client.
- `middleware.ts` bloque `/admin/*` si rôle ∉ {ADMIN, SUPER_ADMIN}, `/publisher/*` si rôle ∉ {PUBLISHER, ADMIN, SUPER_ADMIN} (sauf `/publisher/apply` accessible à USER).
- Chaque Server Action re-vérifie les permissions côté serveur (défense en profondeur — jamais confiance au middleware seul).
- `rbac.ts` centralise une fonction `can(user, action, subject)` type CASL, pour éviter la logique de permission dupliquée.

## 4. Storage abstraction

```ts
interface StorageProvider {
  upload(file: Buffer, key: string, mime: string): Promise<{ storageKey: string; url: string }>;
  getSignedUrl(storageKey: string): Promise<string>;
  delete(storageKey: string): Promise<void>;
}
```

Le service `resource.service.ts` ne connaît que cette interface. Changer de provider = changer l'implémentation injectée, aucun impact sur le reste du code. Metadata (storage_key, file_url, mime_type, file_size, checksum) est stockée dans `ResourceFile`/`ResourceVersion`.

Validation à l'upload : type MIME whitelist (PDF uniquement pour les documents), taille max, scan de checksum (SHA-256) pour intégrité et déduplication.

## 5. Search abstraction

```ts
interface SearchProvider {
  index(resource: SearchableResource): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult>;
  removeFromIndex(resourceId: string): Promise<void>;
}
```

Phase 1 : `PostgresSearchProvider` — colonne `search_vector tsvector` générée (GIN index) sur title/abstract/description/keywords, jointe aux facettes (author, university, domain...) pour les filtres.
Phase 2 (sans réécrire les appelants) : `MeilisearchProvider` ou `ElasticsearchProvider`, activé par variable d'environnement `SEARCH_PROVIDER`.

## 6. Tracking Views/Downloads (anti-spam basique)

- Table `resource_views` : `resource_id, user_id?, session_id, ip_hash, country?, device?, referrer?, created_at`.
- Déduplication : une vue est comptée une seule fois par `(resource_id, session_id)` sur une fenêtre glissante (ex. 30 min), via contrainte + vérification côté service avant insert.
- `resource_downloads` : même logique, mais chaque téléchargement authentifié est tracé sans déduplication agressive (on veut le vrai total), avec rate-limiting (ex. max N téléchargements/minute/IP) pour éviter l'abus par script.
- Les compteurs affichés (`views`, `downloads`) sont soit des colonnes dénormalisées mises à jour de façon transactionnelle, soit calculées via `COUNT()` avec cache (Redis) — recommandé pour la scalabilité : dénormalisation + recalcul périodique.

## 7. Workflow de modération

`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED`, branches `REJECTED` (avec `rejection_reason`) et `CHANGES_REQUESTED` (retour à `DRAFT` modifiable, ré-soumission possible). Chaque transition passe par `moderation.service.ts` et écrit une ligne immuable dans `moderation_logs` (jamais de suppression).

## 8. SEO

- Chaque page dynamique (`resources/[type]/[slug]`, `universities/[slug]`, `authors/[slug]`, `domains/[slug]`) génère `generateMetadata()` depuis la DB : title, description, Open Graph, canonical, JSON-LD (`ScholarlyArticle`/`Course` selon le type).
- `sitemap.ts` et `robots.ts` natifs Next.js, générés dynamiquement à partir des ressources publiées + entités indexables.

## 9. Plan d'implémentation par phases (repris de ta spec, ordre d'exécution)

1. Project structure + configuration
2. Database schema (Prisma) + migrations
3. Authentication (Auth.js) + sessions sécurisées
4. RBAC / permissions
5. Modèle Resource + versioning
6. Storage abstraction (upload PDF/cover)
7. Publisher workflow (apply → verification → dashboard)
8. Admin moderation (approve/reject/changes requested)
9. Pages publiques resource/university/author/domain
10. Search (Postgres FTS)
11. Analytics (views/downloads réels)
12. Favorites / Follows / Notifications
13. SEO (metadata, sitemap, robots)
14. Polish UI final (respect strict de la maquette fournie)

Chaque phase doit être fonctionnelle et testée (au minimum manuellement) avant de passer à la suivante — aucune page ne doit contenir de données codées en dur passé la phase 2.
