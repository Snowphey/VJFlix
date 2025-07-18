const databaseManager = require('./databaseManager');
const EmbedUtils = require('./embedUtils');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/**
 * Met à jour la liste des films dans le canal défini
 * @param {Client} client - Instance du client Discord
 */

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

        // La pagination est maintenant gérée dans le handler d'interaction (interactionCreate.js)
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

/**
 * Handler pour la pagination des listes de films
 * @param {ButtonInteraction} interaction
 */
async function handleListPagination(interaction) {
    // On récupère l'état courant à partir des customId
    // customId: watched_prev_0, watch_next_2, etc.
    const settings = await databaseManager.getSettings();
    const watchlist = await databaseManager.getUnwatchedMovies();
    const watchedlist = await databaseManager.getWatchedMovies();
    const watchlistPages = paginate(watchlist);
    const watchedlistPages = paginate(watchedlist);

    // Trouver la page courante à partir des boutons
    // On parse les customId pour savoir quel bouton a été cliqué et sur quelle page on était
    let watchlistPage = 0;
    let watchedlistPage = 0;
    if (interaction.message && interaction.message.components && interaction.message.components.length === 2) {
        // On récupère les customId des boutons pour retrouver la page
        const watchedRow = interaction.message.components[0];
        const watchRow = interaction.message.components[1];
        const watchedPrevId = watchedRow.components[0].customId;
        const watchedNextId = watchedRow.components[1].customId;
        const watchPrevId = watchRow.components[0].customId;
        const watchNextId = watchRow.components[1].customId;
        watchedlistPage = parseInt(watchedPrevId.split('_')[2]);
        watchlistPage = parseInt(watchPrevId.split('_')[2]);
    }

    let update = false;
    if (interaction.customId.startsWith('watch_prev_') && watchlistPage > 0) {
        watchlistPage--;
        update = true;
    } else if (interaction.customId.startsWith('watch_next_') && watchlistPage < watchlistPages.length - 1) {
        watchlistPage++;
        update = true;
    } else if (interaction.customId.startsWith('watched_prev_') && watchedlistPage > 0) {
        watchedlistPage--;
        update = true;
    } else if (interaction.customId.startsWith('watched_next_') && watchedlistPage < watchedlistPages.length - 1) {
        watchedlistPage++;
        update = true;
    }

    if (update) {
        await interaction.update({
            embeds: [
                getWatchedlistEmbed(watchedlistPages, watchedlistPage, watchedlist),
                getWatchlistEmbed(watchlistPages, watchlistPage, watchlist)
            ],
            components: [
                getRow('watched', watchedlistPage, watchedlistPages.length),
                getRow('watch', watchlistPage, watchlistPages.length)
            ]
        });
    } else {
        await interaction.deferUpdate();
    }
}

module.exports = { updateListInChannel, deleteListMessage, handleListPagination };
