const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Erreur lors de l'exécution de ${interaction.commandName}:`);
                console.error(error);
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ 
                        content: 'Une erreur est survenue lors de l\'exécution de cette commande !', 
                        flags: MessageFlags.Ephemeral 
                    });
                } else {
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de l\'exécution de cette commande !', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }
        } else if (interaction.isButton()) {
            // Gérer les votes pour les sondages
            if (interaction.customId.startsWith('vote_')) {
                const pickFilmsCommand = require('../commands/films/pick-films.js');
                try {
                    await pickFilmsCommand.handleVote(interaction);
                } catch (error) {
                    console.error('Erreur lors du traitement du vote:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors du traitement de votre vote.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId === 'poll_end') {
                const pickFilmsCommand = require('../commands/films/pick-films.js');
                try {
                    await pickFilmsCommand.handlePollEnd(interaction);
                } catch (error) {
                    console.error('Erreur lors de la fin du sondage:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la fin du sondage.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId === 'remove_vote') {
                const pickFilmsCommand = require('../commands/films/pick-films.js');
                try {
                    await pickFilmsCommand.handleRemoveVote(interaction);
                } catch (error) {
                    console.error('Erreur lors de la suppression du vote:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la suppression de votre vote.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }
        }
    },
};
