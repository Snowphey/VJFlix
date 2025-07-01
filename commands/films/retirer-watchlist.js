const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('retirer-watchlist')
        .setDescription('Retire un film de la watchlist')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('L\'ID du film à retirer de la watchlist')
                .setRequired(true)
        ),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');
        
        const result = await dataManager.removeMovieFromWatchlist(id);
        if (!result.success) {
            let message = 'Erreur lors de la suppression du film de la watchlist.';
            if (result.reason === 'not_found') {
                message = `Aucun film trouvé avec l'ID ${id} dans la watchlist !`;
            }
            
            await interaction.reply({ 
                content: message, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        await interaction.reply({ 
            content: `❌ Film "${result.movie.title}" (ID: ${result.movie.id}) retiré de la watchlist !`
        });
        
        // Mettre à jour la liste dans le canal défini
        const settings = await dataManager.getSettings();
        if (settings.listChannelId) {
            await updateListInChannel(interaction.client);
        }
    },
};
