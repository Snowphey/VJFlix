const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('definir-canal')
        .setDescription('Définit le canal où afficher la liste des films')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Le canal où afficher la liste')
                .setRequired(true)
        ),
    async execute(interaction) {
        const channel = interaction.options.getChannel('canal');
        
        // Vérifier que c'est un canal textuel
        if (channel.type !== 0) { // 0 = GUILD_TEXT
            await interaction.reply({ 
                content: 'Veuillez sélectionner un canal textuel !', 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        // Vérifier les permissions du bot dans ce canal
        const permissions = channel.permissionsFor(interaction.client.user);
        if (!permissions.has(['SendMessages', 'EmbedLinks', 'ReadMessageHistory'])) {
            await interaction.reply({ 
                content: 'Je n\'ai pas les permissions nécessaires dans ce canal ! J\'ai besoin de : Envoyer des messages, Intégrer des liens, et Lire l\'historique des messages.', 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        await dataManager.setListChannelId(channel.id);
        await dataManager.setListMessageId(null); // Reset pour créer un nouveau message

        await interaction.reply({ 
            content: `✅ Canal de la liste défini sur ${channel} !`, 
            flags: MessageFlags.Ephemeral 
        });

        // Afficher immédiatement la liste dans le nouveau canal
        await updateListInChannel(interaction.client);
    },
};
