const { SlashCommandBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afficher-liste')
        .setDescription('Affiche la liste des films à regarder et des films vus'),
    async execute(interaction) {
        const unwatchedMovies = await dataManager.getUnwatchedMovies();
        const watchedMovies = await dataManager.getWatchedMovies();
        
        const watchlistEmbed = EmbedUtils.createWatchlistEmbed(unwatchedMovies);
        const watchedlistEmbed = EmbedUtils.createWatchedListEmbed(watchedMovies);
        
        await interaction.reply({ embeds: [watchlistEmbed, watchedlistEmbed] });
    },
};
