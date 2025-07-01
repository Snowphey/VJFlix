const { Events } = require('discord.js');
const { updateListInChannel } = require('../utils/listUpdater');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Bot connecté en tant que ${client.user.tag}!`);
        
        // Actualiser automatiquement le message dans le canal au démarrage
        try {
            await updateListInChannel(client);
            console.log('Liste des films actualisée au démarrage');
        } catch (error) {
            console.error('Erreur lors de l\'actualisation de la liste au démarrage:', error);
        }
    },
};
