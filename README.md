# VJFlix 🎬

Bot Discord pour organiser des watchparty de films avec gestion de listes et sondages.

<p align="center" width="100%">
    <img src="https://github.com/Snowphey/VJFlix/blob/8eae06e075a39f0e9802906fd84ecd9d86e25909/logo.jpg" alt="vjflix_logo"/ width=200>
</p>

## Fonctionnalités

### ✅ Fonctionnalités Implémentées

- **Gestion de la Liste de Films**
  - `/afficher-liste` - Affiche la liste des films à regarder et des films vus
  - `/ajouter-film [titre]` - Ajoute un film à la base de données avec recherche TMDb automatique
  - `/ajouter-watchlist [id]` - Ajoute un film existant de la base de données à la watchlist
  - `/retirer-watchlist [id]` - Retire un film de la watchlist par son ID
  - `/retirer-film [id]` - ⚠️ Supprime définitivement un film de la base de données (action irréversible)

- **Système de Films Vus**
  - `/marquer-vu [id]` - Marque un film comme vu et l'ajoute à la liste des films vus
  - `/marquer-non-vu [id]` - Remet un film vu dans la liste à regarder

- **Système de Notation et Recherche**
  - `/noter-film [id] [note]` - Note un film de 0 à 5 étoiles
  - `/mes-notes [utilisateur]` - Affiche vos notes ou celles d'un autre utilisateur
  - `/top-films [limite]` - Affiche les films les mieux notés
  - `/chercher-film [recherche]` - Recherche un film dans la base de données
  - `/lister-films [page]` - Liste tous les films de la base de données avec pagination

- **Statistiques et Gestion**
  - `/stats-bd` - Affiche les statistiques de la base de données

- **Sondages pour Choisir des Films**
  - `/pick-films [nombre] [duree]` - Sélectionne des films aléatoires et lance un sondage
  - `/pick-films [ids] [duree]` - Lance un sondage avec des films spécifiques par leurs IDs
  - Durée personnalisable (1-60 minutes, défaut: 10)
  - Système de vote avec boutons Discord
  - Affichage automatique des résultats

- **Configuration Dynamique**
  - `/definir-canal [canal]` - Définit le canal où afficher automatiquement la liste
  - `/reset-canal` - Supprime le message de liste et remet à zéro la configuration du canal

### 🔄 Mise à Jour Automatique

La liste des films se met à jour automatiquement à chaque modification (ajout/suppression) sans spam de messages.

### 🔢 Système d'IDs

Chaque film ajouté reçoit un ID unique automatiquement. La liste s'affiche ainsi :
```
1. Inception
2. Le Seigneur des Anneaux  
3. Matrix
```

Utilisez ces IDs pour retirer ou marquer des films plutôt que de retaper le titre (évite les fautes de frappe) !

**Note :** Les IDs se réorganisent automatiquement pour rester consécutifs (1, 2, 3...) après chaque modification.

## Documentation

- **[CONFIGURATION.md](CONFIGURATION.md)** - Guide de configuration détaillé

## Installation

1. **Prérequis**
   - Node.js (version 16 ou plus récente)
   - Un bot Discord créé sur le Discord Developer Portal
   - (Optionnel) Une clé API TMDb pour des recherches de films améliorées

2. **Installation des dépendances**
   ```cmd
   npm install
   ```

3. **Configuration**
   - Remplissez le fichier `config.json` avec vos informations :
   ```json
   {
     "token": "VOTRE_TOKEN_BOT_DISCORD",
     "clientId": "VOTRE_CLIENT_ID",
     "guildId": "VOTRE_GUILD_ID",
     "tmdbApiKey": "VOTRE_CLE_API_TMDB_OPTIONNELLE"
   }
   ```
   - **Nouveau** : Le canal de liste se configure maintenant avec `/definir-canal` dans Discord !

4. **Permissions Discord Requises**
   - `Send Messages`
   - `Use Slash Commands`
   - `Embed Links`
   - `Read Message History`

5. **Déploiement des Commandes**
   ```cmd
   npm run deploy
   ```

6. **Première Configuration**
   - Démarrez le bot avec `npm start`
   - Utilisez `/definir-canal` pour choisir où afficher la liste
   - Commencez à ajouter des films avec `/ajouter-film` !

7. **Démarrage**
   ```cmd
   npm start
   ```
   ou pour le développement :
   ```cmd
   npm run dev
   ```

8. **Tests (Optionnel)**
   Pour valider le système de gestion des IDs :
   ```cmd
   npm test
   ```

## Configuration du Bot Discord

1. Allez sur https://discord.com/developers/applications
2. Créez une nouvelle application
3. Dans la section "Bot" :
   - Créez un bot
   - Copiez le token dans `config.json`
4. Dans la section "General Information" :
   - Copiez l'Application ID dans `clientId`
5. (Optionnel) Obtenez une clé API TMDb sur https://www.themoviedb.org/settings/api
6. Invitez le bot sur votre serveur avec les permissions appropriées
7. Récupérez l'ID du serveur (Guild ID)

## Utilisation

### Commandes Disponibles

| Commande | Description | Paramètres |
|----------|-------------|------------|
| `/afficher-liste` | Affiche la liste des films | Aucun |
| `/ajouter-film` | Ajoute un film | `titre` (requis) |
| `/ajouter-watchlist` | Ajoute un film existant à la watchlist | `id` (requis) |
| `/retirer-watchlist` | Retire un film de la watchlist | `id` (requis) |
| `/retirer-film` | Retire définitivement un film | `id` (requis) |
| `/marquer-vu` | Marque un film comme vu | `id` (requis) |
| `/marquer-non-vu` | Remet un film dans la liste | `id` (requis) |
| `/noter-film` | Note un film | `id` (requis), `note` (0-5, requis) |
| `/mes-notes` | Affiche les notes | `utilisateur` (optionnel) |
| `/top-films` | Affiche les films les mieux notés | `limite` (1-25, optionnel) |
| `/chercher-film` | Recherche un film | `recherche` (requis) |
| `/lister-films` | Liste tous les films | `page` (optionnel) |
| `/stats-bd` | Affiche les statistiques | Aucun |
| `/pick-films` | Lance un sondage | `nombre` (2-10) OU `ids` (liste), `duree` (1-60 min, défaut: 10) |
| `/definir-canal` | Définit le canal de la liste | `canal` (requis) |
| `/reset-canal` | Remet à zéro la configuration | Aucun |

### Exemples d'Utilisation

```
/ajouter-film titre:Inception
/ajouter-watchlist id:42
/definir-canal canal:#films-à-regarder
/retirer-watchlist id:3
/retirer-film id:15
/marquer-vu id:1
/marquer-non-vu id:1
/noter-film id:1 note:5
/mes-notes utilisateur:@UnAutreUtilisateur
/top-films limite:15
/chercher-film recherche:Christopher Nolan
/lister-films page:2
/pick-films nombre:3 duree:15
/pick-films ids:1,5,12 duree:20
/reset-canal
```

## Structure des Données

Les données sont stockées dans une base de données SQLite dans le dossier `data/` :
- `vjflix.db` - Base de données SQLite contenant :
  - Table `movies` - Informations complètes des films (TMDb)
  - Table `watchlist` - Films à regarder
  - Table `watched_movies` - Films déjà vus
  - Table `ratings` - Notes des utilisateurs
  - Table `settings` - Configuration du bot (canal, etc.)

## Fonctionnalités Techniques

- **Architecture modulaire** : Commandes séparées dans des fichiers individuels
- **Base de données SQLite** : Stockage robuste et performant
- **API TMDb** : Recherche de films avec informations détaillées (titre, année, réalisateur, acteurs, etc.)
- **Système d'IDs** : Chaque film a un ID unique pour éviter les erreurs de saisie
- **Système de notation** : Notes de 0 à 5 étoiles par utilisateur
- **Auto-refresh** : La liste se met à jour automatiquement sans créer de nouveaux messages
- **Sondages personnalisables** : Durée configurable de 1 à 60 minutes, sélection aléatoire ou manuelle
- **Recherche avancée** : Recherche par titre, réalisateur ou acteur
- **Pagination** : Navigation dans les listes de films
- **Statistiques** : Vue d'ensemble de la base de données