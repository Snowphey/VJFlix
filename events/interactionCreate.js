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
        } else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Aucune commande d'autocomplétion correspondant à ${interaction.commandName} n'a été trouvée.`);
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`Erreur lors de l'autocomplétion de ${interaction.commandName}:`);
                console.error(error);
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
            
            // === HANDLERS POUR MARQUER VU/NON VU ===
            } else if (interaction.customId.startsWith('mark_watched_')) {
                const marquerVuCommand = require('../commands/films/marquer-vu.js');
                try {
                    await marquerVuCommand.handleMarkWatched(interaction);
                } catch (error) {
                    console.error('Erreur lors du marquage comme vu:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors du marquage du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('mark_unwatched_')) {
                const marquerNonVuCommand = require('../commands/films/marquer-non-vu.js');
                try {
                    await marquerNonVuCommand.handleMarkUnwatched(interaction);
                } catch (error) {
                    console.error('Erreur lors du marquage comme non vu:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors du marquage du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            
            // === HANDLERS POUR SUPPRIMER FILMS ===
            } else if (interaction.customId.startsWith('remove_from_watchlist_')) {
                const retirerFilmCommand = require('../commands/films/retirer-film.js');
                try {
                    await retirerFilmCommand.handleRemoveFromWatchlist(interaction);
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la suppression du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('confirm_remove_')) {
                const retirerFilmCommand = require('../commands/films/retirer-film.js');
                try {
                    const movieId = parseInt(interaction.customId.split('_')[2]);
                    await retirerFilmCommand.handleConfirmation(interaction, movieId, true);
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la suppression du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('cancel_remove_')) {
                const retirerFilmCommand = require('../commands/films/retirer-film.js');
                try {
                    await retirerFilmCommand.handleCancelRemove(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('confirm_delete_') || interaction.customId.startsWith('cancel_delete_')) {
                const retirerFilmCommand = require('../commands/films/retirer-film.js');
                try {
                    const parts = interaction.customId.split('_');
                    const movieId = parseInt(parts[2]);
                    const confirmed = interaction.customId.startsWith('confirm_delete_');
                    await retirerFilmCommand.handleConfirmation(interaction, movieId, confirmed);
                } catch (error) {
                    console.error('Erreur lors de la confirmation de suppression:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la confirmation.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            
            // === HANDLERS POUR AJOUTER FILMS ===
            } else if (interaction.customId.startsWith('select_tmdb_movie_') || interaction.customId.startsWith('select_movie_')) {
                const ajouterFilmCommand = require('../commands/films/ajouter-film.js');
                try {
                    await ajouterFilmCommand.handleTMDbMovieSelection(interaction);
                } catch (error) {
                    console.error('Erreur lors de la sélection TMDb:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la sélection du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('confirm_add_movie_')) {
                const ajouterFilmCommand = require('../commands/films/ajouter-film.js');
                try {
                    await ajouterFilmCommand.handleConfirmAddMovie(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'ajout du film:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de l\'ajout du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId === 'cancel_movie_add') {
                const ajouterFilmCommand = require('../commands/films/ajouter-film.js');
                try {
                    await ajouterFilmCommand.handleCancelMovieAdd(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId === 'cancel_movie_search') {
                const ajouterFilmCommand = require('../commands/films/ajouter-film.js');
                try {
                    await ajouterFilmCommand.handleCancelMovieSearch(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            
            // === HANDLERS POUR DÉTAILS FILMS ===
            } else if (interaction.customId.startsWith('movie_details_')) {
                const chercherFilmCommand = require('../commands/films/chercher-film.js');
                try {
                    await chercherFilmCommand.handleMovieDetails(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'affichage des détails:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de l\'affichage des détails.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }

            
            // === HANDLERS POUR NOTER ENVIE ===
            } else if (interaction.customId.startsWith('desire_quick_')) {
                const noterEnvieCommand = require('../commands/films/noter-envie.js');
                try {
                    await noterEnvieCommand.handleDesireQuick(interaction);
                } catch (error) {
                    console.error('Erreur lors de la notation rapide d\'envie:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la notation d\'envie.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('set_desire_')) {
                const noterEnvieCommand = require('../commands/films/noter-envie.js');
                try {
                    await noterEnvieCommand.handleSetDesire(interaction);
                } catch (error) {
                    console.error('Erreur lors de la sélection de la note d\'envie:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la sélection de la note d\'envie.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('desire_')) {
                const noterEnvieCommand = require('../commands/films/noter-envie.js');
                try {
                    await noterEnvieCommand.handleDesireRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de la notation d\'envie:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la notation d\'envie.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('remove_desire_')) {
                const noterEnvieCommand = require('../commands/films/noter-envie.js');
                try {
                    await noterEnvieCommand.handleRemoveDesireRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de la suppression de la note d\'envie:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la suppression de la note.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('cancel_desire_')) {
                const noterEnvieCommand = require('../commands/films/noter-envie.js');
                try {
                    await noterEnvieCommand.handleCancelDesireRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            
            // === HANDLERS POUR PAGINATION ===
            } else if (interaction.customId.startsWith('list_movies_page_')) {
                const listerFilmsCommand = require('../commands/films/lister-films.js');
                try {
                    await listerFilmsCommand.handleMovieListPagination(interaction);
                } catch (error) {
                    console.error('Erreur lors de la navigation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la navigation.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            
            // === HANDLERS POUR WATCHPARTY ===
            } else if (interaction.customId.startsWith('watchparty_')) {
                const watchpartyCommand = require('../commands/films/watchparty.js');
                try {
                    if (interaction.customId === 'watchparty_available' || 
                        interaction.customId === 'watchparty_unavailable' || 
                        interaction.customId === 'watchparty_maybe') {
                        await watchpartyCommand.handleAvailabilityVote(interaction);
                    } else if (interaction.customId === 'watchparty_recommendations') {
                        await watchpartyCommand.handleRecommendations(interaction);
                    } else if (interaction.customId === 'watchparty_end') {
                        await watchpartyCommand.handleEndWatchparty(interaction);
                    } else if (interaction.customId === 'watchparty_delete') {
                        await watchpartyCommand.handleDeleteWatchparty(interaction);
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'interaction watchparty:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de l\'interaction.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }
        }
    }
};
