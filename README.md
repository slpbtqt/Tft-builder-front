# Hexforge — Frontend Angular TFT

Interface Angular 20 pour préparer une équipe TFT, gérer un terrain de 28 hexagones et un banc de 9 places, équiper les champions et calculer les compositions meta les plus proches.

Le backend associé est [`3lW30N/tft-team-builder`](https://github.com/3lW30N/tft-team-builder). Les modèles du front reprennent les noms et types de son `schema.sql` : `Unit`, `Item`, `Trait`, `UnitTrait`, `Build` et `Comp`.

**Aucune donnée de démonstration n’est embarquée.** Sans API disponible, le catalogue et les résultats restent vides. La bannière Jinx, la page « My comps », les sauvegardes et l’icône de compte ont été retirées.

## Démarrage

Node.js 20.19+, 22.12+ ou 24+ et npm sont nécessaires.

```bash
git clone https://github.com/slpbtqt/Tft-builder-front.git
cd Tft-builder-front
npm ci
npm start
```

Ouvrir `http://localhost:4200`. Le proxy de développement transmet `/api/**` à `http://localhost:8080/**`, en retirant le préfixe `/api`.

```bash
npm run check
npm test
npm run build
```

La compilation produit `dist/`. Pour servir le front depuis Spring Boot, copier son contenu dans `src/main/resources/static/` du projet Java, puis configurer `apiBaseUrl: ''` dans `config.js` afin de joindre directement les routes `/unit`, `/item`, etc.

## Configuration de l’API

- **Adresse du serveur :** `public/config.js`, modifiable sans recompiler Angular. En production séparée, renseigner l’URL HTTPS du backend et autoriser l’origine du front côté Java, ou utiliser un reverse proxy `/api`.
- **Noms des routes :** `src/app/core/api-config.ts`.
- **Adaptation des réponses :** `src/app/core/catalog-adapter.ts`. Les noms SQL (`image_link`, `avg_placement`, `unit_id`, `item1_id`, etc.) sont la notation interne. Les propriétés Java existantes (`imageLink`, `avgPlacement`, `item1`, etc.) sont également acceptées à l’entrée.

Les routes GET attendues sont `/unit`, `/item`, `/trait`, `/unit_trait`, `/build` et `/comp`. Elles doivent fournir des tableaux JSON, ou des pages Spring avec un tableau `content`. Le dépôt Java consulté, commit `5e48562`, ne les implémente pas encore ; ces appels constituent un contrat d’intégration, pas une affirmation qu’ils existent déjà.

Consulter [API-CONTRACT.md](./API-CONTRACT.md), notamment la limitation actuelle de `comp.build_id` et les informations nécessaires pour recevoir une équipe meta complète.

## Utilisation

1. Choisir « Terrain » ou « Banc » dans le catalogue, puis cliquer sur un champion. Le glisser-déposer permet aussi de choisir directement une case.
2. Déplacer un champion entre terrain et banc. Une destination occupée échange les deux champions. Sur mobile, utiliser « Vers le terrain », « Vers le banc » ou « Choisir une case ».
3. Sélectionner un champion pour changer ses étoiles et équiper jusqu’à trois objets. Les recettes utilisent `component1_id` et `component2_id` reçus du serveur.
4. Cliquer sur **Calculer la compo**. Les résultats s’affichent en dessous, triés par proximité, puis par `avg_placement` croissant.

Le niveau limite uniquement le terrain ; le banc possède toujours neuf places. Les traits utilisent les champions distincts du terrain et les relations `unit_trait`. Le schéma ne fournit pas de seuils de traits, de coûts de champions, de tiers meta ni de statistiques d’objets : le front n’invente aucun de ces champs.

## Calcul de proximité

- Les champions possédés comprennent le terrain **et** le banc.
- La couverture correspond au nombre de champions distincts partagés, divisé par le nombre de champions distincts de la compo meta.
- Avec les objets : 80 % pour cette couverture et 20 % pour les objets équipés sur le bon champion, parmi ceux demandés par les builds meta.
- Sans objets, ou si la compo n’en demande aucun : 100 % pour la couverture des champions.
- Les doublons n’augmentent pas la couverture. Un objet équipé une fois ne peut satisfaire deux occurrences du même objet demandé.
- Les compos sans champion commun et celles dont les équipes sont incomplètes sont exclues.
- Les résultats sont un instantané du dernier calcul. Toute modification de l’équipe ou des options invite à recalculer.

Les pondérations sont regroupées dans `src/app/core/comp-matcher.ts`. Les statistiques affichées viennent exclusivement du serveur. `win_rate` est affiché dans l’unité reçue : le front ne déduit pas arbitrairement s’il s’agit d’un ratio ou d’un pourcentage.

## Thème Arcane

La palette est centralisée dans les variables CSS de `src/styles.css` : fonds noirs (`--bg`, `--panel`, `--surface-*`), violet électrique (`--accent`, `--accent-light`, `--accent-strong`) et détails cyan (`--cyan`). Les composants utilisent ces variables plutôt que des couleurs répétées. Les lueurs restent discrètes ; le focus clavier utilise le cyan et les avertissements gardent une couleur distincte.

## Organisation du code

```text
src/app/
  core/
    models.ts                 Entités alignées sur les colonnes SQL
    api-config.ts             Adresse et routes configurables
    catalog-adapter.ts        Validation et adaptation JSON Java/SQL
    catalog.service.ts        Chargement des données réelles
    team-rules.ts             Capacité, objets, déplacements et traits
    team.store.ts             État du terrain/banc et annuler/rétablir
    comp-matcher.ts           Classement des équipes meta
    drag-data.ts              Format et validation du glisser-déposer
  features/
    team/                     Hexagones, banc et options du champion
    library/                  Recherche, traits, champions et objets
    results/                  Résultats et détail des builds
  shared/                     Images avec repli sur initiales et icônes
  app.component.*             Assemblage de l’écran principal
```

Les fichiers HTML et CSS sont séparés des règles métier. Les opérations utilisent des IDs numériques pour `unit`, `build` et `comp`, et des IDs texte pour `item` et `trait`. Les objets équipés sont ordonnés par ID pour respecter `chk_item_item_order`. Les placements locaux n’inventent pas de `build.id` persistant.

## Vérification et assets

`npm test` couvre les règles métier et l’adaptation SQL/Java avec de petites lignes synthétiques **isolées dans les tests** ; elles ne sont jamais importées par l’application. Les portraits, objets et traits affichés viennent des liens `image_link` de l’API. Les fichiers historiques de Set 13 et l’image Jinx ont été supprimés.

Seuls les polices Inter/Cinzel, les icônes Lucide et le favicon de l’interface sont conservés localement. Hexforge est un projet communautaire indépendant de Riot Games.
