
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

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

function getWatchlistEmbed(watchlistPages, watchlistPage, watchlist) {
    const page = watchlistPages[watchlistPage] || [];
    return EmbedUtils.createWatchlistEmbed(page, watchlistPage + 1, watchlistPages.length, watchlist.length, PAGE_SIZE);
}
function getWatchedlistEmbed(watchedlistPages, watchedlistPage, watchedlist) {
    const page = watchedlistPages[watchedlistPage] || [];
    return EmbedUtils.createWatchedListEmbed(page, watchedlistPage + 1, watchedlistPages.length, watchedlist.length, PAGE_SIZE);
}

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afficher-liste')
        .setDescription('Affiche la liste des films à regarder et des films vus'),
    async execute(interaction) {
        const unwatchedMovies = await databaseManager.getUnwatchedMovies();
        const watchedMovies = await databaseManager.getWatchedMovies();
        const watchlistPages = paginate(unwatchedMovies);
        const watchedlistPages = paginate(watchedMovies);
        let watchlistPage = 0;
        let watchedlistPage = 0;

        const embeds = [
            getWatchedlistEmbed(watchedlistPages, watchedlistPage, watchedMovies),
            getWatchlistEmbed(watchlistPages, watchlistPage, unwatchedMovies)
        ];
        const components = [
            getRow('watched', watchedlistPage, watchedlistPages.length),
            getRow('watch', watchlistPage, watchlistPages.length)
        ];

        await interaction.reply({ embeds, components });
    },

    // Handler for pagination button interactions
    async handlePagination(interaction) {
        const unwatchedMovies = await databaseManager.getUnwatchedMovies();
        const watchedMovies = await databaseManager.getWatchedMovies();
        const watchlistPages = paginate(unwatchedMovies);
        const watchedlistPages = paginate(watchedMovies);
        let watchlistPage = 0;
        let watchedlistPage = 0;
        if (interaction.message && interaction.message.components && interaction.message.components.length === 2) {
            const watchedRow = interaction.message.components[0];
            const watchRow = interaction.message.components[1];
            const watchedPrevId = watchedRow.components[0].customId;
            const watchPrevId = watchRow.components[0].customId;
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
                    getWatchedlistEmbed(watchedlistPages, watchedlistPage, watchedMovies),
                    getWatchlistEmbed(watchlistPages, watchlistPage, unwatchedMovies)
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
};
