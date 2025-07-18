# VJFlix 🎬

Bot Discord pour organiser des watchparties de films, gérer des listes de visionnage, noter ses envies et suivre les films vus ou à voir en groupe.

<p align="center" width="100%">
    <img src="https://github.com/Snowphey/VJFlix/blob/8eae06e075a39f0e9802906fd84ecd9d86e25909/logo.jpg" alt="vjflix_logo"/ width=200>
</p>

## Fonctionnalités principales

- **Ajout de films** à la liste via recherche TMDb
- **Suppression de films** de la liste
- **Gestion des statuts** : marquer un film comme vu/non vu
- **Gestion collaborative** : chaque membre peut ajouter, retirer ou marquer des films
- **Système d’envie** : chaque utilisateur peut noter son envie de voir un film (0 à 5)
- **Classement des envies** : top des films les plus désirés par le groupe
- **Recommandations personnalisées** pour les watchparties selon les envies des participants
- **Statistiques** sur la base de données de films
- **Gestion des paramètres** (canal d’affichage, etc.)

## Installation

1. **Prérequis**
   - Node.js (version 16 ou plus récente)
   - Un bot Discord créé sur le [Discord Developer Portal](https://discord.com/developers/applications)
   - Une clé API TMDb pour rechercher des films

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

4. **Permissions Discord requises**
   - `Send Messages`
   - `Use Slash Commands`
   - `Embed Links`
   - `Read Message History`
   - `Manage Messages` (pour épingler les messages)

5. **Première utilisation**
   - Démarrez le bot avec `npm start`
   - Utilisez `/definir-canal` pour choisir le canal d’affichage
   - Ajoutez des films avec `/ajouter-film`
   - Marquez les films vus/non vus, notez vos envies, consultez les tops et recommandations !

## Commandes principales

- `/ajouter-film` : Ajouter un film à la liste
- `/retirer-film` : Retirer un film de la liste
- `/marquer-vu` : Marquer un film comme vu
- `/marquer-non-vu` : Marquer un film comme non vu
- `/noter-envie` : Noter votre envie de voir un film
- `/top-envies` : Voir les films les plus désirés
- `/watchparty` : Obtenir des recommandations pour une soirée film
- `/stats-bd` : Statistiques sur la base de films
- `/lister-films` : Afficher la liste complète
- `/chercher-film` : Rechercher un film dans la liste

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