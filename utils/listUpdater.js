const dataManager = require('./dataManager');
const EmbedUtils = require('./embedUtils');

/**
 * Met à jour la liste des films dans le canal défini
 * @param {Client} client - Instance du client Discord
 */
async function updateListInChannel(client) {
    const settings = dataManager.getSettings();
    if (!settings.listChannelId) return;

    try {
        const channel = await client.channels.fetch(settings.listChannelId);
        const watchlist = dataManager.getWatchlist();
        const watchedlist = dataManager.getWatchedlist();
        
        const watchlistEmbed = EmbedUtils.createWatchlistEmbed(watchlist);
        const watchedlistEmbed = EmbedUtils.createWatchedListEmbed(watchedlist);

        if (settings.listMessageId) {
            try {
                const message = await channel.messages.fetch(settings.listMessageId);
                await message.edit({ embeds: [watchlistEmbed, watchedlistEmbed] });
                return;
            } catch (error) {
                console.log('Impossible de mettre à jour le message existant, création d\'un nouveau...');
            }
        }

        // Créer un nouveau message
        const message = await channel.send({ embeds: [watchlistEmbed, watchedlistEmbed] });
        dataManager.setListMessageId(message.id);
        await dataManager.saveData();
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la liste:', error);
    }
}

module.exports = { updateListInChannel };
