const databaseManager = require('./databaseManager');
const EmbedUtils = require('./embedUtils');

/**
 * Met à jour la liste des films dans le canal défini
 * @param {Client} client - Instance du client Discord
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

async function updateListInChannel(client) {
    const settings = await databaseManager.getSettings();
    if (!settings.listChannelId) return;

    try {
        const channel = await client.channels.fetch(settings.listChannelId);
        const watchlist = await databaseManager.getUnwatchedMovies();
        const watchedlist = await databaseManager.getWatchedMovies();

        // Pagination: 50 films max par page
        const PAGE_SIZE = 50;
        function paginate(list) {
            const pages = [];
            for (let i = 0; i < list.length; i += PAGE_SIZE) {
                pages.push(list.slice(i, i + PAGE_SIZE));
            }
            if (pages.length === 0) pages.push([]); // Toujours au moins une page
            return pages;
        }
        const watchlistPages = paginate(watchlist);
        const watchedlistPages = paginate(watchedlist);

        // Génère l'embed pour une page donnée
        function getWatchlistEmbed(pageIdx) {
            const page = watchlistPages[pageIdx] || [];
            return EmbedUtils.createWatchlistEmbed(page, pageIdx + 1, watchlistPages.length, watchlist.length, PAGE_SIZE);
        }
        function getWatchedlistEmbed(pageIdx) {
            const page = watchedlistPages[pageIdx] || [];
            return EmbedUtils.createWatchedListEmbed(page, pageIdx + 1, watchedlistPages.length, watchedlist.length, PAGE_SIZE);
        }

        // Génère les boutons de pagination
        function getRow(type, pageIdx, totalPages) {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`${type}_prev_${pageIdx}`)
                    .setLabel('⬅️ Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIdx === 0),
                new ButtonBuilder()
                    .setCustomId(`${type}_next_${pageIdx}`)
                    .setLabel('Suivant ➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIdx === totalPages - 1)
            );
        }

        // On commence à la page 0 pour chaque liste
        let watchlistPage = 0;
        let watchedlistPage = 0;

        const embeds = [getWatchedlistEmbed(watchedlistPage), getWatchlistEmbed(watchlistPage)];
        const components = [getRow('watched', watchedlistPage, watchedlistPages.length), getRow('watch', watchlistPage, watchlistPages.length)];

        let message;
        if (settings.listMessageId) {
            try {
                message = await channel.messages.fetch(settings.listMessageId);
                await message.edit({ embeds, components });
            } catch (error) {
                console.log("Impossible de mettre à jour le message existant.");
            }
        } else {
            message = await channel.send({ embeds, components });
            await databaseManager.setListMessageId(message.id);
        }

        // Collector pour la pagination
        const filter = i => ['watch_prev_', 'watch_next_', 'watched_prev_', 'watched_next_'].some(prefix => i.customId.startsWith(prefix));
        const collector = message.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async i => {
            let update = false;
            if (i.customId.startsWith('watch_prev_') && watchlistPage > 0) {
                watchlistPage--;
                update = true;
            } else if (i.customId.startsWith('watch_next_') && watchlistPage < watchlistPages.length - 1) {
                watchlistPage++;
                update = true;
            } else if (i.customId.startsWith('watched_prev_') && watchedlistPage > 0) {
                watchedlistPage--;
                update = true;
            } else if (i.customId.startsWith('watched_next_') && watchedlistPage < watchedlistPages.length - 1) {
                watchedlistPage++;
                update = true;
            }
            if (update) {
                await i.update({
                    embeds: [getWatchedlistEmbed(watchedlistPage), getWatchlistEmbed(watchlistPage)],
                    components: [getRow('watched', watchedlistPage, watchedlistPages.length), getRow('watch', watchlistPage, watchlistPages.length)]
                });
            } else {
                await i.deferUpdate();
            }
        });

        collector.on('end', async () => {
            // Désactiver les boutons à la fin
            if (message.editable) {
                const disabledRows = [
                    getRow('watched', watchedlistPage, watchedlistPages.length),
                    getRow('watch', watchlistPage, watchlistPages.length)
                ].map(row => row.setComponents(...row.components.map(btn => btn.setDisabled(true))));
                await message.edit({ components: disabledRows });
            }
        });
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
        const channelId = await databaseManager.getListChannelId();
        const messageId = await databaseManager.getListMessageId();
        
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
