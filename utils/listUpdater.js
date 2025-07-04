const dataManager = require('./dataManager');
const EmbedUtils = require('./embedUtils');

/**
 * Met à jour la liste des films dans le canal défini
 * @param {Client} client - Instance du client Discord
 */
async function updateListInChannel(client) {
    const settings = await dataManager.getSettings();
    if (!settings.listChannelId) return;

    try {
        const channel = await client.channels.fetch(settings.listChannelId);
        const watchlist = await dataManager.getWatchlist();
        const watchedlist = await dataManager.getWatchedMovies();
        
        const watchlistEmbed = EmbedUtils.createWatchlistEmbed(watchlist);
        const watchedlistEmbed = EmbedUtils.createWatchedListEmbed(watchedlist);

        // Toujours envoyer les embeds, même si les listes sont vides
        const embeds = [watchlistEmbed, watchedlistEmbed];

        if (settings.listMessageId) {
            try {
                const message = await channel.messages.fetch(settings.listMessageId);
                await message.edit({ embeds: embeds });
                return;
            } catch (error) {
                console.log('Impossible de mettre à jour le message existant, création d\'un nouveau...');
            }
        }

        // Créer un nouveau message
        const message = await channel.send({ embeds: embeds });
        await dataManager.setListMessageId(message.id);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la liste:', error);
    }
}

/**
 * Supprime le message de la liste du canal configuré
 * @param {Client} client - Instance du client Discord
 * @returns {boolean} True si le message a été supprimé avec succès
 */
async function deleteListMessage(client) {
    try {
        const channelId = await dataManager.getListChannelId();
        const messageId = await dataManager.getListMessageId();
        
        if (!channelId || !messageId) {
            return false;
        }

        const channel = await client.channels.fetch(channelId);
        const message = await channel.messages.fetch(messageId);
        await message.delete();
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression du message de la liste:', error);
        return false;
    }
}

module.exports = { updateListInChannel, deleteListMessage };
