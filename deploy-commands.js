const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];

// Récupérer tous les fichiers de commandes depuis le dossier commands
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    // Récupérer tous les fichiers .js du dossier de commandes actuel
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    // Récupérer la SlashCommandBuilder#toJSON() de chaque fichier de commande pour le déploiement
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[ATTENTION] La commande dans ${filePath} n'a pas de propriété "data" ou "execute" requise.`);
        }
    }
}

// Construire et préparer une instance du module REST
const rest = new REST().setToken(token);

// et déployer vos commandes !
(async () => {
    try {
        console.log(`Début du rafraîchissement de ${commands.length} commandes slash d'application.`);

        // La méthode put est utilisée pour actualiser complètement toutes les commandes dans la guilde avec l'ensemble actuel
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Rechargement réussi de ${data.length} commandes slash d'application.`);
    } catch (error) {
        // Et bien sûr, afficher les erreurs dans la console
        console.error(error);
    }
})();
