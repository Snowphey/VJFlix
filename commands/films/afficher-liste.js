const { SlashCommandBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afficher-liste')
        .setDescription('Affiche la liste des films à regarder et des films vus'),
    async execute(interaction) {
        const watchlist = dataManager.getWatchlist();
        const watchedlist = dataManager.getWatchedlist();
        
        const watchlistEmbed = EmbedUtils.createWatchlistEmbed(watchlist);
        const watchedlistEmbed = EmbedUtils.createWatchedListEmbed(watchedlist);
        
        await interaction.reply({ embeds: [watchlistEmbed, watchedlistEmbed] });
    },
};
