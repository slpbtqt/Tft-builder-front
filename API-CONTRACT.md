# Contrat du frontend avec le backend Java

Référence : [`3lW30N/tft-team-builder`](https://github.com/3lW30N/tft-team-builder), `src/main/resources/database/schema.sql`, commit `5e48562`.

Ce document décrit les réponses nécessaires au frontend. Les routes ne sont **pas encore implémentées** dans le dépôt de référence. Son unique `ItemController` contient seulement `@RequestMapping("item")`, sans méthode GET.

## Modèles et noms de colonnes

| Ressource | Champs attendus |
| --- | --- |
| `unit` | `id: number`, `name: string`, `image_link: string \| null` |
| `item` | `id: string`, `name: string`, `image_link: string \| null`, `component1_id: string \| null`, `component2_id: string \| null` |
| `trait` | `id: string`, `name: string`, `image_link: string \| null` |
| `unit_trait` | `id: number`, `unit_id: number`, `trait_id: string` |
| `build` | `id: number`, `unit_id: number`, `avg_placement: number \| null`, `item1_id`, `item2_id`, `item3_id`: `string \| null`, `stars: number \| null` |
| `comp` | `id: number`, `name: string \| null`, `avg_placement: number \| null`, `win_rate: number \| null`, `difficulty: number \| null`, `levelling: string \| null`, `build_id: number \| null` |

La notation interne utilise les noms SQL. L’adaptateur accepte aussi les propriétés actuelles des getters Java : `imageLink`, `avgPlacement`, `winRate`, ainsi que les relations imbriquées `component1.id`, `component2.id`, `unit.id`, `trait.id`, `item1.id`, `item2.id`, `item3.id` et `build.id`.

Les champs numériques restent numériques. Un identifiant externe MetaTFT de champion doit être associé à `unit.id` par le backend, sans remplacer ce `serial` par une chaîne dans le front. Les IDs d’objets restent ceux de `item.id` ; aucun préfixe `TFT_Item_` n’est ajouté automatiquement.

`stars` peut être null dans la DB, sinon le front attend 1, 2 ou 3. Les images peuvent être null : l’interface affiche alors les initiales du nom.

## Routes de lecture

Toutes les routes renvoient un tableau JSON. Les pages Spring contenant `content: []` sont aussi acceptées.

```text
GET /unit        -> Unit[]
GET /item        -> Item[]
GET /trait       -> Trait[]
GET /unit_trait  -> UnitTrait[]
GET /build       -> Build[]
GET /comp        -> CompDTO[]
```

Le frontend charge les ressources indépendamment : une erreur sur les objets ou les compos ne remplace pas les champions par des données de démonstration. Un endpoint manquant, inaccessible ou incompatible produit un état vide et un avertissement, sans fabrication de résultat.

`public/config.js` règle `apiBaseUrl`. En développement, `/api/unit` est transmis à `http://localhost:8080/unit`. En production sur la même origine Spring Boot, configurer `apiBaseUrl: ''`. En production avec deux origines, fournir une URL de backend et son CORS, ou un reverse proxy `/api`.

## Point à compléter pour les équipes meta

Le schéma actuel possède seulement :

```text
comp.build_id -> build.id
build.unit_id -> unit.id
```

Il décrit un seul build de champion par ligne `comp`. Cette relation seule ne permet pas de connaître une équipe TFT entière. De plus, le modèle JPA `Build.java` ne déclare pas actuellement la relation `unit_id`, malgré sa présence dans le SQL.

Pour permettre le classement réel, `GET /comp` doit fournir une **projection d’API** reprenant tous les champs de `Comp`, accompagnée de l’une de ces collections :

```typescript
// Option A : les builds complets sont inclus directement.
interface CompDTO extends Comp {
  builds: Build[];
}

// Option B : les IDs font référence aux lignes disponibles dans GET /build.
interface CompReferenceDTO extends Comp {
  build_ids: number[];
}
```

`builds` / `build_ids` sont des collections de DTO, pas des colonnes que le front prétend trouver dans le schéma actuel. Le backend peut les assembler directement depuis MetaTFT, ou compléter son modèle de stockage par une relation entre une compo et plusieurs builds. Ce projet frontend ne modifie pas la DB et n’impose pas de migration.

Une compo doit transmettre tous ses champions et leurs IDs d’objets. Un `build_id` isolé est conservé comme métadonnée, mais ne rend jamais une compo éligible au calcul. Les références inconnues à des champions, des objets ou des builds rendent les détails incomplets. Le front ne reconstitue pas une équipe à partir du nom d’une compo, d’une image ou de noms de champions codés en dur.

## Positions et équipement locaux

Le schéma ne stocke ni coordonnées de terrain, ni banc. Ces informations restent donc dans un modèle UI explicite, séparé des entités persistantes :

```typescript
interface TeamState {
  level: number;                    // 1 à 10
  board: (TeamUnit | null)[];        // 28 cases, 4 × 7
  bench: (TeamUnit | null)[];        // 9 cases
}
interface TeamUnit {
  unit_id: number;
  stars: 1 | 2 | 3;
  item1_id: string | null;
  item2_id: string | null;
  item3_id: string | null;
}
```

Une position locale ne reçoit aucun faux `build.id`. Tout déplacement conserve les étoiles et l’équipement. Le tableau de trois objets est ordonné par ID pour respecter le contrôle SQL `chk_item_item_order` avant une éventuelle future persistance.

Le bouton de calcul travaille localement sur les équipes meta complètes déjà fournies par l’API. Il ne nécessite aucun endpoint POST inventé. Le frontend ne possède aucune clé MetaTFT et n’accède pas directement à la DB.

## Données absentes du schéma

Aucun coût de champion, seuil de trait, tier S/A/B, descriptif d’aptitude, patch ou statistique d’objet n’est fabriqué. Les compteurs de traits proviennent de `unit_trait` et excluent le banc. `avg_placement`, `win_rate`, `difficulty` et `levelling` viennent exclusivement de `comp`. L’unité de `win_rate` n’étant pas définie par le SQL, la valeur est affichée telle que transmise.
