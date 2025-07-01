# Documentation Technique - Système de Gestion des IDs

## Vue d'ensemble

Le bot VJFlix utilise un système d'IDs consécutifs pour gérer efficacement les films dans la watchlist et la watchedlist. Ce système garantit une expérience utilisateur cohérente et une manipulation facile des films.

## Principes de base

### 1. IDs Consécutifs
- La **watchlist** utilise des IDs de `1` à `N` (où N = nombre de films à regarder)
- La **watchedlist** utilise des IDs de `N+1` à `M` (où M = N + nombre de films vus)
- Les IDs sont automatiquement réorganisés après chaque modification

### 2. Réorganisation Automatique
La réorganisation des IDs se produit :
- À chaque sauvegarde (`saveData()`)
- Au chargement des données (`loadData()`)
- Après toute modification (ajout, suppression, changement de statut)

## Architecture du Code

### DataManager (`utils/dataManager.js`)

**Méthodes principales :**
- `reorganizeIds()` : Réorganise tous les IDs pour qu'ils soient consécutifs
- `addMovie(title)` : Ajoute un film avec le prochain ID disponible
- `removeMovie(id)` : Supprime un film et déclenche la réorganisation
- `markAsWatched(id)` : Déplace un film vers la watchedlist
- `markAsUnwatched(id)` : Remet un film dans la watchlist

**Structure des données :**
```json
{
  "watchlist": [
    {
      "id": 1,
      "title": "Film Title",
      "addedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "watchedlist": [
    {
      "id": 3,
      "title": "Watched Film",
      "addedAt": "2025-01-01T00:00:00.000Z",
      "watchedAt": "2025-01-01T01:00:00.000Z"
    }
  ]
}
```

## Scénarios de Test

### Test 1: Ajout de Films
```
Ajout: Film A, Film B, Film C
Résultat: IDs 1, 2, 3
```

### Test 2: Suppression avec Réorganisation
```
État initial: [1: Film A, 2: Film B, 3: Film C]
Suppression: Film B (ID 2)
Résultat: [1: Film A, 2: Film C]
```

### Test 3: Marquer comme Vu
```
État initial: [1: Film A, 2: Film B]
Marquer Film A comme vu
Résultat: 
- Watchlist: [1: Film B]
- Watchedlist: [2: Film A]
```

### Test 4: Marquer comme Non-Vu
```
État initial: 
- Watchlist: [1: Film B]
- Watchedlist: [2: Film A]
Marquer Film A comme non-vu
Résultat:
- Watchlist: [1: Film B, 2: Film A]
- Watchedlist: []
```

## Migration des Données

Le système inclut une migration automatique pour les anciens formats de données :

**Ancien format (chaînes simples) :**
```json
["Film 1", "Film 2", "Film 3"]
```

**Nouveau format (objets avec métadonnées) :**
```json
[
  {"id": 1, "title": "Film 1", "addedAt": "2025-01-01T00:00:00.000Z"},
  {"id": 2, "title": "Film 2", "addedAt": "2025-01-01T00:00:00.000Z"},
  {"id": 3, "title": "Film 3", "addedAt": "2025-01-01T00:00:00.000Z"}
]
```

## Commandes Discord

Toutes les commandes utilisent des IDs numériques :
- `/retirer-film id:2` - Retire le film avec l'ID 2
- `/marquer-vu id:1` - Marque le film avec l'ID 1 comme vu
- `/marquer-non-vu id:5` - Remet le film avec l'ID 5 dans la watchlist

## Avantages du Système

1. **Consistance** : Les IDs sont toujours consécutifs, pas de "trous"
2. **Simplicité** : L'utilisateur peut facilement référencer un film par son numéro
3. **Robustesse** : Gestion automatique de la réorganisation
4. **Migration** : Support transparent des anciennes données
5. **Performance** : Recherche par ID plus rapide que par titre

## Tests de Validation

Le fichier `tests/ids-system.test.js` contient une suite complète de tests pour valider :
- La réorganisation des IDs
- La migration des données
- Les scénarios complexes d'usage
- La cohérence après multiples opérations

Pour exécuter les tests :
```bash
npm test
```
ou directement :
```bash
node tests/ids-system.test.js
```

## Maintenance

### Ajout de Nouvelles Fonctionnalités
Lors de l'ajout de nouvelles fonctionnalités :
1. Toujours appeler `saveData()` après modification
2. Utiliser les IDs numériques pour toutes les références
3. Tester avec `tests.js` après modifications

### Debugging
Pour déboguer des problèmes d'IDs :
1. Vérifier que `reorganizeIds()` est appelée
2. Contrôler les fichiers JSON dans `/data`
3. Exécuter les tests pour identifier les régressions
