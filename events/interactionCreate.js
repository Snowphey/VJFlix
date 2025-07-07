const { Events, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../utils/dataManager');
const tmdbService = require('../utils/tmdbService');
const { updateListInChannel } = require('../utils/listUpdater');

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
            } else if (interaction.customId.startsWith('mark_watched_')) {
                // Marquer un film comme vu
                try {
                    await this.handleMarkWatched(interaction);
                } catch (error) {
                    console.error('Erreur lors du marquage comme vu:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors du marquage du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('mark_unwatched_')) {
                // Marquer un film comme non vu
                try {
                    await this.handleMarkUnwatched(interaction);
                } catch (error) {
                    console.error('Erreur lors du marquage comme non vu:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors du marquage du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('remove_from_watchlist_')) {
                // Supprimer un film de la watchlist
                try {
                    await this.handleRemoveFromWatchlist(interaction);
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la suppression du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('confirm_remove_')) {
                // Confirmation de suppression d'un film
                try {
                    await this.handleConfirmRemove(interaction);
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la suppression du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('cancel_remove_')) {
                // Annulation de suppression d'un film
                try {
                    await this.handleCancelRemove(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('select_tmdb_movie_')) {
                // Sélection d'un film depuis la recherche TMDb
                try {
                    await this.handleTMDbMovieSelection(interaction);
                } catch (error) {
                    console.error('Erreur lors de la sélection TMDb:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la sélection du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId === 'cancel_movie_search') {
                // Annulation de la recherche de film
                try {
                    await this.handleCancelMovieSearch(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('confirm_add_movie_')) {
                // Confirmation d'ajout de film
                try {
                    await this.handleConfirmAddMovie(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'ajout du film:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de l\'ajout du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId === 'cancel_movie_add') {
                // Annulation de l'ajout de film
                try {
                    await this.handleCancelMovieAdd(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('select_movie_')) {
                // Sélection d'un film depuis la recherche TMDb (ancien format pour compatibilité)
                try {
                    await this.handleTMDbMovieSelection(interaction);
                } catch (error) {
                    console.error('Erreur lors de la sélection du film:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la sélection du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('movie_details_')) {
                // Afficher les détails d'un film
                try {
                    await this.handleMovieDetails(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'affichage des détails:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de l\'affichage des détails.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('rate_')) {
                // Gérer les notations de films (rate_movieId_rating ou rate_quick_movieId)
                try {
                    if (interaction.customId.startsWith('rate_quick_')) {
                        await this.handleQuickRatingInterface(interaction);
                    } else {
                        await this.handleMovieRating(interaction);
                    }
                } catch (error) {
                    console.error('Erreur lors de la notation du film:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la notation du film.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('confirm_delete_') || interaction.customId.startsWith('cancel_delete_')) {
                // Gestion de la confirmation de suppression de film
                try {
                    await this.handleDeleteConfirmation(interaction);
                } catch (error) {
                    console.error('Erreur lors de la confirmation de suppression:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la confirmation.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('list_movies_page_')) {
                // Navigation dans la liste des films
                try {
                    await this.handleMovieListPagination(interaction);
                } catch (error) {
                    console.error('Erreur lors de la navigation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la navigation.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('desire_')) {
                // Gérer les notations d'envie de regarder
                try {
                    await this.handleDesireRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de la notation d\'envie:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la notation d\'envie.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('remove_desire_')) {
                // Supprimer une note d'envie
                try {
                    await this.handleRemoveDesireRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de la suppression de la note d\'envie:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la suppression de la note.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('cancel_desire_')) {
                // Annuler la notation d'envie
                try {
                    await this.handleCancelDesireRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('remove_rating_')) {
                // Supprimer une note de film
                try {
                    await this.handleRemoveRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de la suppression de la note:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la suppression de la note.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('cancel_rating_')) {
                // Annuler la notation de film
                try {
                    await this.handleCancelRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('watchparty_')) {
                // Gérer les interactions de watchparty
                try {
                    await this.handleWatchpartyInteraction(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'interaction watchparty:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de l\'interaction.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }
        }
    },

    async handleMovieDetails(interaction) {

        const movieId = parseInt(interaction.customId.split('_')[2]);
        const movie = await dataManager.getMovieById(movieId);
        
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription('Ce film n\'existe plus dans la base de données.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        const chercherFilmCommand = require('../commands/films/chercher-film.js');
        await chercherFilmCommand.displayMovieDetails(interaction, movie);
    },

    async handleDeleteConfirmation(interaction) {
        const retirerFilmCommand = require('../commands/films/retirer-film.js');
        
        const parts = interaction.customId.split('_');
        const movieId = parseInt(parts[2]);
        const confirmed = interaction.customId.startsWith('confirm_delete_');

        await retirerFilmCommand.handleConfirmation(interaction, movieId, confirmed);
    },

    async handleMovieListPagination(interaction) {

        const page = parseInt(interaction.customId.split('_')[3]);
        const itemsPerPage = 20;
        const offset = (page - 1) * itemsPerPage;

        try {
            // Récupérer le nombre total de films
            const totalCount = await dataManager.getTotalMovieCount();
            const totalPages = Math.ceil(totalCount / itemsPerPage);
            
            // Récupérer les films pour cette page
            const movies = await dataManager.getMoviesPaginated(offset, itemsPerPage);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎬 Liste des films')
                .setDescription(`Page ${page}/${totalPages} - ${totalCount} film(s) au total`)
                .setTimestamp();

            // Ajouter chaque film à l'embed
            for (const movie of movies) {
                const averageRating = await dataManager.getAverageRating(movie.id);
                const ratingText = averageRating 
                    ? `⭐ ${averageRating.average}/5 (${averageRating.count} vote${averageRating.count > 1 ? 's' : ''})`
                    : 'Pas encore noté';

                embed.addFields({
                    name: `ID: ${movie.id} - ${movie.title}`,
                    value: `Année: ${movie.year || 'N/A'} | Réalisateur: ${movie.director || 'N/A'}\n${ratingText}`,
                    inline: false
                });
            }

            // Boutons de navigation
            const components = [];
            const navigationButtons = [];

            if (page > 1) {
                navigationButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`list_movies_page_${page - 1}`)
                        .setLabel('◀ Page précédente')
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            if (page < totalPages) {
                navigationButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`list_movies_page_${page + 1}`)
                        .setLabel('Page suivante ▶')
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            if (navigationButtons.length > 0) {
                components.push(new ActionRowBuilder().addComponents(navigationButtons));
            }

            // Boutons pour voir les détails des premiers films
            const detailButtons = [];
            for (let i = 0; i < Math.min(movies.length, 5); i++) {
                detailButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`movie_details_${movies[i].id}`)
                        .setLabel(`Détails #${movies[i].id}`)
                        .setStyle(ButtonStyle.Primary)
                );
            }

            if (detailButtons.length > 0) {
                components.push(new ActionRowBuilder().addComponents(detailButtons));
            }

            await interaction.update({
                embeds: [embed],
                components: components
            });

        } catch (error) {
            console.error('Erreur lors de la navigation des films:', error);
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur est survenue lors de la navigation')
                    .setTimestamp()],
                components: []
            });
        }
    },

    async handleTMDbMovieSelection(interaction) {

        await interaction.deferUpdate();

        try {
            // Extraire l'ID depuis le customId (peut être tmdb ou ancien format)
            let tmdbId;
            if (interaction.customId.startsWith('select_tmdb_movie_')) {
                tmdbId = interaction.customId.split('_')[3];
            }

            // Récupérer les détails complets du film
            const movieData = await tmdbService.getMovieDetails(tmdbId);

            if (!movieData) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Erreur')
                        .setDescription('Impossible de récupérer les détails du film sélectionné.')
                        .setTimestamp()],
                    components: []
                });
            }

            // Afficher les détails du film avec confirmation
            await this.showMovieConfirmation(interaction, movieData);

        } catch (error) {
            console.error('Erreur lors de la sélection TMDb:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur est survenue lors de la sélection du film.')
                    .setTimestamp()],
                components: []
            });
        }
    },

    async showMovieConfirmation(interaction, movieData) {

        // Créer l'embed de confirmation avec tous les détails
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎬 Confirmer l\'ajout du film')
            .setDescription(`**${movieData.title}**`)
            .addFields(
                { name: 'Année', value: movieData.year?.toString() || 'N/A', inline: true }
            );

        // Ajouter l'ID TMDb
        if (movieData.tmdbId) {
            embed.addFields({ name: 'TMDb ID', value: movieData.tmdbId.toString(), inline: true });
        }

        if (movieData.director) {
            embed.addFields({ name: 'Réalisateur', value: movieData.director, inline: true });
        }

        if (movieData.genre && movieData.genre.length > 0) {
            embed.addFields({ name: 'Genres', value: movieData.genre.join(', '), inline: true });
        }

        // Support pour les notes TMDb
        if (movieData.tmdbRating) {
            embed.addFields({ name: 'Note TMDb', value: `${movieData.tmdbRating.toFixed(1)}/10`, inline: true });
        }

        if (movieData.plot) {
            embed.addFields({ name: 'Synopsis', value: movieData.plot.length > 1024 ? movieData.plot.substring(0, 1021) + '...' : movieData.plot });
        }

        if (movieData.poster && movieData.poster !== 'N/A') {
            embed.setThumbnail(movieData.poster);
        }

        embed.setFooter({ text: 'Voulez-vous ajouter ce film à la base de données ?' })
            .setTimestamp();

        // Boutons de confirmation
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_add_movie_${movieData.tmdbId}`)
                    .setLabel('✅ Confirmer l\'ajout')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel_movie_add')
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },

    async handleCancelMovieSearch(interaction) {

        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#888888')
                .setTitle('❌ Recherche annulée')
                .setDescription('La recherche de film a été annulée.')
                .setTimestamp()],
            components: []
        });
    },

    async handleConfirmAddMovie(interaction) {

        await interaction.deferUpdate();

        try {
            // Extraire l'ID TMDb depuis le customId
            const tmdbId = interaction.customId.split('_')[3];

            // Récupérer les détails complets du film
            const movieData = await tmdbService.getMovieDetails(tmdbId);

            if (!movieData) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Erreur')
                        .setDescription('Impossible de récupérer les détails du film.')
                        .setTimestamp()],
                    components: []
                });
            }

            // Ajouter le film à la base de données
            const result = await dataManager.addMovie(movieData, interaction.user);
            
            if (!result.success) {
                if (result.reason === 'exists') {
                    return await interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor('#ffaa00')
                            .setTitle('⚠️ Film déjà présent')
                            .setDescription(`Le film **${result.movie.title}** ${result.movie.year ? `(${result.movie.year})` : ''} est déjà dans la base de données.`)
                            .addFields(
                                { name: 'ID en base', value: result.movie.id.toString(), inline: true },
                                { name: 'Ajouté le', value: new Date(result.movie.addedAt).toLocaleDateString('fr-FR'), inline: true }
                            )
                            .setTimestamp()],
                        components: []
                    });
                }

                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Erreur')
                        .setDescription('Une erreur est survenue lors de l\'ajout du film.')
                        .setTimestamp()],
                    components: []
                });
            }

            // Créer l'embed de confirmation d'ajout réussi
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Film ajouté à la base de données')
                .setDescription(`**${result.movie.title}** a été ajouté avec succès !`)
                .addFields(
                    { name: 'ID en base', value: result.movie.id.toString(), inline: true },
                    { name: 'Année', value: result.movie.year?.toString() || 'N/A', inline: true }
                );

            // Ajouter l'ID TMDb
            if (result.movie.tmdbId) {
                embed.addFields({ name: 'TMDb ID', value: result.movie.tmdbId.toString(), inline: true });
            }

            if (result.movie.director) {
                embed.addFields({ name: 'Réalisateur', value: result.movie.director, inline: true });
            }

            if (result.movie.genre && result.movie.genre.length > 0) {
                embed.addFields({ name: 'Genres', value: result.movie.genre.join(', '), inline: true });
            }

            // Support pour les notes TMDb
            if (result.movie.tmdbRating) {
                embed.addFields({ name: 'Note TMDb', value: `${result.movie.tmdbRating.toFixed(1)}/10`, inline: true });
            }

            if (result.movie.plot) {
                embed.addFields({ name: 'Synopsis', value: result.movie.plot.length > 1024 ? result.movie.plot.substring(0, 1021) + '...' : result.movie.plot });
            }

            if (result.movie.poster && result.movie.poster !== 'N/A') {
                embed.setThumbnail(result.movie.poster);
            }

            embed.setTimestamp();

            // Boutons d'action
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mark_watched_${result.movie.id}`)
                        .setLabel('Marquer comme vu')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`rate_quick_${result.movie.id}`)
                        .setLabel('Noter le film')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⭐')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Erreur lors de l\'ajout du film:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur est survenue lors de l\'ajout du film.')
                    .setTimestamp()],
                components: []
            });
        }
    },

    async handleCancelMovieAdd(interaction) {

        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#888888')
                .setTitle('❌ Ajout annulé')
                .setDescription('L\'ajout du film a été annulé.')
                .setTimestamp()],
            components: []
        });
    },

    async handleMovieRating(interaction) {

        // Extraire l'ID du film et la note depuis le customId
        const [, movieDbId, rating] = interaction.customId.split('_');
        const userId = interaction.user.id;
        const ratingValue = parseInt(rating);

        // Vérifier si le film existe
        const movie = await dataManager.getMovieById(parseInt(movieDbId));
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription('Film introuvable dans la base de données.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Noter le film
        const result = await dataManager.rateMovie(parseInt(movieDbId), userId, ratingValue);
        
        if (!result.success) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de noter le film.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Obtenir les nouvelles statistiques
        const averageRating = await dataManager.getAverageRating(parseInt(movieDbId));
        const starsDisplay = ratingValue === 0 ? '☆☆☆☆☆' : '⭐'.repeat(ratingValue) + '☆'.repeat(5 - ratingValue);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Film noté !')
            .setDescription(`Vous avez donné **${ratingValue}/5** étoiles à **${movie.title}**`)
            .addFields(
                { name: 'Votre note', value: starsDisplay, inline: true },
                { name: 'Film', value: movie.title, inline: true }
            );

        if (movie.year) {
            embed.addFields({ name: 'Année', value: movie.year.toString(), inline: true });
        }

        if (averageRating) {
            const avgStars = averageRating.average === 0 ? '☆☆☆☆☆' : '⭐'.repeat(Math.floor(averageRating.average)) + 
                           (averageRating.average % 1 >= 0.5 ? '⭐' : '') +
                           '☆'.repeat(Math.max(0, 5 - Math.ceil(averageRating.average)));
            
            embed.addFields(
                { name: 'Note moyenne', value: `${averageRating.average.toFixed(1)}/5 ${avgStars}`, inline: true },
                { name: 'Nombre de votes', value: averageRating.count.toString(), inline: true }
            );
        }

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        embed.setTimestamp();

        await interaction.update({
            embeds: [embed],
            components: []
        });
    },

    async handleMarkWatched(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        
        // Marquer le film comme vu
        const result = await dataManager.markAsWatched(movieId, interaction.user);
        
        if (!result) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de marquer le film comme vu.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Film marqué comme vu')
                .setDescription(`**${result.title}** a été marqué comme vu !`)
                .setTimestamp()],
            flags: MessageFlags.Ephemeral
        });

        // Mettre à jour la liste dans le canal défini
        await updateListInChannel(interaction.client);
    },

    async handleMarkUnwatched(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        
        // Marquer le film comme non vu
        const result = await dataManager.markAsUnwatched(movieId, interaction.user);
        
        if (!result) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de marquer le film comme non vu.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Film marqué comme non vu')
                .setDescription(`**${result.title}** a été remis dans la liste à regarder !`)
                .setTimestamp()],
            flags: MessageFlags.Ephemeral
        });

        // Mettre à jour la liste dans le canal défini
        await updateListInChannel(interaction.client);
    },

    async handleRemoveFromWatchlist(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[3]);
        
        // Récupérer les informations du film avant suppression
        const movie = await dataManager.getMovieById(movieId);
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription('Ce film n\'existe plus dans la base de données.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Demander confirmation
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('⚠️ Confirmation de suppression')
            .setDescription(`Êtes-vous sûr de vouloir supprimer **${movie.title}** de votre watchlist ?\n\n**⚠️ Attention : Cela supprimera définitivement le film de la base de données !**`)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_remove_${movieId}`)
                    .setLabel('Confirmer la suppression')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId(`cancel_remove_${movieId}`)
                    .setLabel('Annuler')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    },

    async handleConfirmRemove(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        
        // Supprimer le film de la base de données
        const result = await dataManager.removeMovie(movieId);
        
        if (!result.success) {
            return await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de supprimer le film de la watchlist.')
                    .setTimestamp()],
                components: []
            });
        }
        
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Film supprimé')
                .setDescription(`**${result.movie.title}** a été supprimé de la watchlist et de la base de données.`)
                .setTimestamp()],
            components: []
        });

        // Mettre à jour la liste dans le canal défini
        await updateListInChannel(interaction.client);
    },

    async handleCancelRemove(interaction) {
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#888888')
                .setTitle('❌ Suppression annulée')
                .setDescription('La suppression du film a été annulée.')
                .setTimestamp()],
            components: []
        });
    },

    async handleQuickRatingInterface(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        const movie = await dataManager.getMovieById(movieId);
        
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription('Ce film n\'existe plus dans la base de données.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`⭐ Noter : ${movie.title}`)
            .setDescription('Choisissez votre note de 0 à 5 étoiles :')
            .setTimestamp();

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        // Boutons de notation
        const ratingButtons = [];
        for (let i = 0; i <= 5; i++) {
            const stars = '⭐'.repeat(i) + '☆'.repeat(5 - i);
            ratingButtons.push(
                new ButtonBuilder()
                    .setCustomId(`rate_${movieId}_${i}`)
                    .setLabel(`${i} ${stars}`)
                    .setStyle(i === 0 ? ButtonStyle.Danger : i <= 2 ? ButtonStyle.Secondary : i <= 4 ? ButtonStyle.Primary : ButtonStyle.Success)
            );
        }

        const rows = [];
        for (let i = 0; i < ratingButtons.length; i += 3) {
            rows.push(new ActionRowBuilder().addComponents(ratingButtons.slice(i, i + 3)));
        }

        await interaction.reply({
            embeds: [embed],
            components: rows,
            flags: MessageFlags.Ephemeral
        });
    },

    // === MÉTHODES POUR LES NOTES D'ENVIE ===

    async handleDesireRating(interaction) {
        // Extraire l'ID du film et la note depuis le customId (desire_movieId_rating)
        const [, movieDbId, rating] = interaction.customId.split('_');
        const userId = interaction.user.id;
        const ratingValue = parseInt(rating);

        // Vérifier si le film existe
        const movie = await dataManager.getMovieById(parseInt(movieDbId));
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription('Film introuvable dans la base de données.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Noter l'envie de regarder le film
        const result = await dataManager.rateMovieDesire(parseInt(movieDbId), userId, ratingValue);
        
        if (!result.success) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de noter l\'envie de regarder ce film.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Obtenir les nouvelles statistiques
        const averageDesire = await dataManager.getAverageDesireRating(parseInt(movieDbId));
        const starsDisplay = ratingValue === 0 ? '🤍🤍🤍🤍🤍' : '💜'.repeat(ratingValue) + '🤍'.repeat(5 - ratingValue);

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('✅ Envie notée !')
            .setDescription(`Vous avez donné **${ratingValue}/5** pour votre envie de regarder **${movie.title}**`)
            .addFields(
                { name: 'Votre envie', value: starsDisplay, inline: true },
                { name: 'Film', value: movie.title, inline: true }
            );

        if (movie.year) {
            embed.addFields({ name: 'Année', value: movie.year.toString(), inline: true });
        }

        // Indiquer le statut du film
        const statusIcon = movie.watched ? '✅' : '⏳';
        const statusText = movie.watched ? 'Déjà vu' : 'Non vu';
        embed.addFields({ name: 'Statut', value: `${statusIcon} ${statusText}`, inline: true });

        if (averageDesire) {
            const avgStars = averageDesire.average === 0 ? '🤍🤍🤍🤍🤍' : '💜'.repeat(Math.floor(averageDesire.average)) + 
                           (averageDesire.average % 1 >= 0.5 ? '💜' : '') +
                           '🤍'.repeat(Math.max(0, 5 - Math.ceil(averageDesire.average)));
            
            embed.addFields(
                { name: 'Envie moyenne', value: `${averageDesire.average.toFixed(1)}/5 ${avgStars}`, inline: true },
                { name: 'Nombre de votes', value: averageDesire.count.toString(), inline: true }
            );
        }

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        embed.setTimestamp();

        await interaction.update({
            embeds: [embed],
            components: []
        });
    },

    async handleRemoveDesireRating(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        const userId = interaction.user.id;

        // Vérifier si le film existe
        const movie = await dataManager.getMovieById(movieId);
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription('Film introuvable dans la base de données.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Supprimer la note d'envie
        const result = await dataManager.removeUserDesireRating(movieId, userId);
        
        if (!result.success) {
            let errorMessage = 'Impossible de supprimer votre note d\'envie.';
            if (result.reason === 'rating_not_found') {
                errorMessage = 'Vous n\'avez pas encore noté votre envie pour ce film.';
            }
            
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription(errorMessage)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('✅ Note d\'envie supprimée')
            .setDescription(`Votre note d'envie pour **${movie.title}** a été supprimée.`)
            .setTimestamp();

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        await interaction.update({
            embeds: [embed],
            components: []
        });
    },

    async handleCancelDesireRating(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#6c757d')
            .setTitle('❌ Notation annulée')
            .setDescription('La notation d\'envie a été annulée.')
            .setTimestamp();

        await interaction.update({
            embeds: [embed],
            components: []
        });
    },

    async handleRemoveRating(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        const userId = interaction.user.id;

        // Vérifier si le film existe
        const movie = await dataManager.getMovieById(movieId);
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription('Film introuvable dans la base de données.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Supprimer la note
        const result = await dataManager.removeUserRating(movieId, userId);
        
        if (!result.success) {
            let errorMessage = 'Impossible de supprimer votre note.';
            if (result.reason === 'rating_not_found') {
                errorMessage = 'Vous n\'avez pas encore noté ce film.';
            }
            
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription(errorMessage)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('✅ Note supprimée')
            .setDescription(`Votre note pour **${movie.title}** a été supprimée.`)
            .setTimestamp();

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        await interaction.update({
            embeds: [embed],
            components: []
        });
    },

    async handleCancelRating(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#6c757d')
            .setTitle('❌ Notation annulée')
            .setDescription('La notation a été annulée.')
            .setTimestamp();

        await interaction.update({
            embeds: [embed],
            components: []
        });
    },

    async handleRefreshTopDesires(interaction) {
        // Réexécuter la commande top-envies
        const topEnviesCommand = require('../commands/films/top-envies.js');
        await topEnviesCommand.execute(interaction);
    },

    async handleRefreshMyDesires(interaction) {
        // Réexécuter la commande mes-envies
        const mesEnviesCommand = require('../commands/films/mes-envies.js');
        await mesEnviesCommand.execute(interaction);
    },

    async handleWatchpartyInteraction(interaction) {
        const watchpartyCommand = require('../commands/films/watchparty.js');
        
        if (interaction.customId === 'watchparty_available' || 
            interaction.customId === 'watchparty_unavailable' || 
            interaction.customId === 'watchparty_maybe') {
            await watchpartyCommand.handleAvailabilityVote(interaction);
        } else if (interaction.customId === 'watchparty_recommendations') {
            await watchpartyCommand.handleRecommendations(interaction);
        } else if (interaction.customId === 'watchparty_end') {
            await watchpartyCommand.handleEndWatchparty(interaction);
        }
    },
};
