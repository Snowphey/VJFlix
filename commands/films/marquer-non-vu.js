const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marquer-non-vu')
        .setDescription('Marque un film comme non-vu (le remet dans la liste à regarder)')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('L\'ID du film à marquer comme non-vu')
                .setRequired(true)
        ),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');
        
        const unwatchedMovie = dataManager.markAsUnwatched(id);
        if (!unwatchedMovie) {
            await interaction.reply({ 
                content: `Aucun film vu trouvé avec l'ID ${id} !`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        await dataManager.saveData();
        
        await interaction.reply({ 
            content: `🔄 Film "${unwatchedMovie.title}" (ID: ${unwatchedMovie.id}) remis dans la liste à regarder !`
        });
        
        // Mettre à jour la liste dans le canal défini
        const settings = dataManager.getSettings();
        if (settings.listChannelId) {
            await updateListInChannel(interaction.client);
        }
    },
};
