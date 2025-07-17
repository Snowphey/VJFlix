const { SlashCommandBuilder } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afficher-liste')
        .setDescription('Affiche la liste des films à regarder et des films vus'),
    async execute(interaction) {
        const unwatchedMovies = await databaseManager.getUnwatchedMovies();
        const watchedMovies = await databaseManager.getWatchedMovies();
        
        const watchlistEmbed = EmbedUtils.createWatchlistEmbed(unwatchedMovies);
        const watchedlistEmbed = EmbedUtils.createWatchedListEmbed(watchedMovies);
        
        await interaction.reply({ embeds: [watchlistEmbed, watchedlistEmbed] });
    },
};
