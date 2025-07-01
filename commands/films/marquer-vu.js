const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marquer-vu')
        .setDescription('Marque un film comme vu')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('L\'ID du film à marquer comme vu')
                .setRequired(true)
        ),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');
        
        const watchedMovie = await data.markAsWatched(id);
        if (!watchedMovie) {
            await interaction.reply({ 
                content: `Aucun film trouvé avec l'ID ${id} !`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        await interaction.reply({ 
            content: `✅ Film "${watchedMovie.title}" (ID: ${watchedMovie.id}) marqué comme vu !`
        });
        
        // Mettre à jour la liste dans le canal défini
        const settings = await dataManager.getSettings();
        if (settings.listChannelId) {
            await updateListInChannel(interaction.client);
        }
    },
};
