const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { deleteListMessage } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-canal')
        .setDescription('Supprime le message de la liste et remet à zéro la configuration du canal'),
    async execute(interaction) {
        try {
            const settings = await dataManager.getSettings();
            
            // Vérifier s'il y a un canal et un message configurés
            if (!settings.listChannelId) {
                await interaction.reply({ 
                    content: '❌ Aucun canal n\'est configuré pour la liste !', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            let messageDeleted = false;
            
            // Tenter de supprimer le message existant
            if (settings.listMessageId) {
                messageDeleted = await deleteListMessage(interaction.client);
            }

            // Remettre les IDs à null
            await dataManager.setListChannelId(null);
            await dataManager.setListMessageId(null);

            // Message de confirmation
            let confirmMessage = '✅ Configuration du canal remise à zéro !';
            if (messageDeleted) {
                confirmMessage += ' Le message de la liste a été supprimé.';
            } else if (settings.listMessageId) {
                confirmMessage += ' (Le message n\'a pas pu être supprimé automatiquement)';
            }

            await interaction.reply({ 
                content: confirmMessage, 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Erreur lors du reset du canal:', error);
            await interaction.reply({ 
                content: '❌ Une erreur est survenue lors du reset du canal !', 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};
