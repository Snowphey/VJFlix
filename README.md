# VJFlix 🎬

Bot Discord pour organiser des watchparty de films avec gestion de listes et sondages.

<p align="center" width="100%">
    <img src="https://github.com/Snowphey/VJFlix/blob/8eae06e075a39f0e9802906fd84ecd9d86e25909/logo.jpg" alt="vjflix_logo"/ width=700>
</p>

## Fonctionnalités

### ✅ Fonctionnalités Implémentées

- **Gestion de la Liste de Films**
  - `/afficher-liste` - Affiche la liste des films à regarder (se met à jour automatiquement)
  - `/ajouter-film [titre]` - Ajoute un film à la liste
  - `/retirer-film [id]` - Retire un film de la liste par son ID

- **Système de Films Vus**
  - `/marquer-vu [id]` - Marque un film comme vu et l'ajoute à la watchedlist
  - `/marquer-non-vu [id]` - Remet un film vu dans la liste à regarder
  - `/films-vus` - Affiche tous les films déjà vus

- **Sondages pour Choisir des Films**
  - `/pick-films [nombre] [duree]` - Sélectionne des films aléatoires et lance un sondage
  - Durée personnalisable (1-60 minutes, défaut: 10)
  - Système de vote avec boutons Discord
  - Affichage automatique des résultats

- **Configuration Dynamique**
  - `/definir-canal [canal]` - Définit le canal où afficher automatiquement la liste

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
- **[TECHNIQUE.md](TECHNIQUE.md)** - Documentation technique du système d'IDs
- **tests.js** - Suite de tests pour valider le système

## Installation

1. **Prérequis**
   - Node.js (version 16 ou plus récente)
   - Un bot Discord créé sur le Discord Developer Portal

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
     "guildId": "VOTRE_GUILD_ID"
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
5. Invitez le bot sur votre serveur avec les permissions appropriées
6. Récupérez l'ID du serveur (Guild ID)

## Utilisation

### Commandes Disponibles

| Commande | Description | Paramètres |
|----------|-------------|------------|
| `/afficher-liste` | Affiche la liste des films | Aucun |
| `/ajouter-film` | Ajoute un film | `titre` (requis) |
| `/retirer-film` | Retire un film | `id` (requis) |
| `/marquer-vu` | Marque un film comme vu | `id` (requis) |
| `/marquer-non-vu` | Remet un film dans la liste | `id` (requis) |
| `/films-vus` | Affiche les films vus | Aucun |
| `/pick-films` | Lance un sondage | `nombre` (2-10, défaut: 5), `duree` (1-60 min, défaut: 10) |
| `/definir-canal` | Définit le canal de la liste | `canal` (requis) |

### Exemples d'Utilisation

```
/ajouter-film titre:Inception
/ajouter-film titre:Le Seigneur des Anneaux
/definir-canal canal:#films-à-regarder
/retirer-film id:3
/marquer-vu id:1
/marquer-non-vu id:1
/pick-films nombre:3 duree:15
```

## Structure des Données

Les données sont stockées dans le dossier `data/` :
- `watchlist.json` - Liste des films à regarder
- `watchedlist.json` - Liste des films déjà vus
- `settings.json` - Configuration du bot (canal de liste, etc.)

## Fonctionnalités Techniques

- **Architecture modulaire** : Commandes séparées dans des fichiers individuels
- **Système d'IDs** : Chaque film a un ID unique pour éviter les erreurs de saisie
- **Auto-refresh** : La liste se met à jour automatiquement sans créer de nouveaux messages
- **Persistance** : Les données sont sauvegardées localement en JSON
- **Sondages personnalisables** : Durée configurable de 1 à 60 minutes