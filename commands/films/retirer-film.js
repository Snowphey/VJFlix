const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('retirer-film')
        .setDescription('Retire un film de la liste')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('L\'ID du film à retirer')
                .setRequired(true)
        ),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');
        
        const removed = dataManager.removeMovie(id);
        if (!removed) {
            await interaction.reply({ 
                content: `Aucun film trouvé avec l'ID ${id} !`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        await dataManager.saveData();
        
        await interaction.reply({ 
            content: `❌ Film "${removed.title}" (ID: ${removed.id}) retiré de la liste !`
        });
        
        // Mettre à jour la liste dans le canal défini
        const settings = dataManager.getSettings();
        if (settings.listChannelId) {
            await updateListInChannel(interaction.client);
        }
    },
};
