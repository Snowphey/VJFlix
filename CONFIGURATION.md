# Configuration du Bot Discord VJFlix

## Comment obtenir les informations pour config.json

### 1. TOKEN (Token du Bot)
- Allez sur https://discord.com/developers/applications
- Sélectionnez votre application (ou créez-en une nouvelle)
- Allez dans l'onglet "Bot"
- Cliquez sur "Reset Token" puis "Copy"
- Collez cette valeur dans le champ "token" de config.json

### 2. CLIENT_ID (ID de l'Application)
- Sur la même page d'application Discord
- Allez dans "General Information"
- Copiez "Application ID"
- Collez cette valeur dans le champ "clientId" de config.json

### 3. GUILD_ID (ID du Serveur Discord)
- Dans Discord, faites un clic droit sur votre serveur
- Sélectionnez "Copier l'identifiant"
- Si cette option n'apparaît pas, activez le "Mode développeur" dans les paramètres Discord
- Collez cette valeur dans le champ "guildId" de config.json

## Configuration du Canal de Liste

Utilisez la commande `/definir-canal` dans Discord pour choisir le canal où la liste des films sera affichée et mise à jour automatiquement.

## Permissions Requises pour le Bot

Lors de l'invitation du bot sur votre serveur, assurez-vous qu'il ait au minimum ces permissions :
- `Send Messages` (Envoyer des messages)
- `Use Slash Commands` (Utiliser les commandes slash)
- `Embed Links` (Intégrer des liens)
- `Read Message History` (Lire l'historique des messages)
- `Manage Messages` (Gérer les messages) - pour mettre à jour la liste

## Exemple de config.json final

```json
{
  "token": "VOTRE_TOKEN_ICI",
  "clientId": "VOTRE_CLIENTID_ICI",
  "guildId": "VOTRE_GUILDID_ICI"
}
```

⚠️ **ATTENTION** : Ne partagez jamais ces informations publiquement ! Gardez votre config.json secret.
