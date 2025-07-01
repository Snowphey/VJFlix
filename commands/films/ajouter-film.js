const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajouter-film')
        .setDescription('Ajoute un film à la liste')
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre du film à ajouter')
                .setRequired(true)
        ),
    async execute(interaction) {
        const title = interaction.options.getString('titre');
        
        const movie = dataManager.addMovie(title, interaction.user);
        if (!movie) {
            await interaction.reply({ 
                content: `Le film "${title}" est déjà dans la liste !`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        await dataManager.saveData();
        
        await interaction.reply({ 
            content: `✅ Film "${title}" ajouté à la liste avec l'ID ${movie.id} !`, 
        });
        
        const settings = dataManager.getSettings();
        if (!settings.listChannelId) {
            await interaction.followUp({ 
                content: '💡 Conseil : Utilisez `/definir-canal` pour définir un canal où la liste sera automatiquement mise à jour !', 
                flags: MessageFlags.Ephemeral 
            });
        } else {
            // Mettre à jour la liste dans le canal défini
            await updateListInChannel(interaction.client);
        }
    },
};
