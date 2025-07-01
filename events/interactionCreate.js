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
            } else if (interaction.customId.startsWith('add_to_watchlist_')) {
                // Ajouter un film de la base de données à la watchlist
                try {
                    await this.handleAddToWatchlist(interaction);
                } catch (error) {
                    console.error('Erreur lors de l\'ajout à la watchlist:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de l\'ajout à la watchlist.', 
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
            } else if (interaction.customId.startsWith('rate_movie_')) {
                // Interface de notation rapide
                try {
                    await this.handleQuickRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de la notation:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la notation.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } else if (interaction.customId.startsWith('rate_') && interaction.customId.split('_').length === 3) {
                // Bouton de notation directe (rate_movieId_rating)
                try {
                    await this.handleDirectRating(interaction);
                } catch (error) {
                    console.error('Erreur lors de la notation directe:', error);
                    await interaction.reply({ 
                        content: 'Une erreur est survenue lors de la notation.', 
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
            }
        }
    },

    async handleAddToWatchlist(interaction) {
        const { EmbedBuilder } = require('discord.js');
        const dataManager = require('../utils/dataManager');
        const { updateListInChannel } = require('../utils/listUpdater');

        const movieDbId = parseInt(interaction.customId.split('_')[3]);
        
        const result = await dataManager.addMovieToWatchlistFromDb(movieDbId, interaction.user);
        
        if (!result.success) {
            let message = 'Erreur lors de l\'ajout à la watchlist.';
            if (result.reason === 'not_found') {
                message = 'Film non trouvé dans la base de données.';
            } else if (result.reason === 'already_in_watchlist') {
                message = 'Ce film est déjà dans la watchlist.';
            }
            
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription(message)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Récupérer la watchlist mise à jour pour obtenir l'ID séquentiel
        const watchlist = await dataManager.getWatchlist();
        const addedMovie = watchlist.find(m => m.id === result.movie.id);
        const sequentialId = addedMovie ? addedMovie.sequentialId : result.movie.id;

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Ajouté à la watchlist')
                .setDescription(`**${result.movie.title}** a été ajouté à la watchlist avec l'ID ${sequentialId} !`)
                .setTimestamp()]
        });

        // Mettre à jour la liste dans le canal défini
        await updateListInChannel(interaction.client);
    },

    async handleMovieDetails(interaction) {
        const { EmbedBuilder } = require('discord.js');
        const dataManager = require('../utils/dataManager');

        const movieId = parseInt(interaction.customId.split('_')[2]);
        const movie = await dataManager.getMovieFromDatabase(movieId);
        
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

    async handleQuickRating(interaction) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const dataManager = require('../utils/dataManager');

        const movieId = parseInt(interaction.customId.split('_')[2]);
        const movie = await dataManager.getMovieFromDatabase(movieId);
        
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

    async handleDirectRating(interaction) {
        const { EmbedBuilder } = require('discord.js');
        const dataManager = require('../utils/dataManager');

        const parts = interaction.customId.split('_');
        const movieId = parseInt(parts[1]);
        const rating = parseInt(parts[2]);
        const userId = interaction.user.id;

        // Noter le film
        const result = await dataManager.rateMovie(movieId, userId, rating);
        
        if (!result.success) {
            return await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de noter le film.')
                    .setTimestamp()],
                components: []
            });
        }

        const movie = await dataManager.getMovieFromDatabase(movieId);
        const averageRating = await dataManager.getAverageRating(movieId);
        const starsDisplay = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Film noté !')
            .setDescription(`Vous avez donné **${rating}/5** étoiles à **${movie.title}**`)
            .addFields({ name: 'Votre note', value: starsDisplay, inline: true });

        if (averageRating) {
            const avgStars = '⭐'.repeat(Math.floor(averageRating.average)) + '☆'.repeat(5 - Math.floor(averageRating.average));
            embed.addFields(
                { name: 'Note moyenne', value: `${averageRating.average}/5 ${avgStars}`, inline: true },
                { name: 'Nombre de votes', value: averageRating.count.toString(), inline: true }
            );
        }

        embed.setTimestamp();

        await interaction.update({
            embeds: [embed],
            components: []
        });
    },

    async handleDeleteConfirmation(interaction) {
        const retirerFilmCommand = require('../commands/films/retirer-film.js');
        
        const parts = interaction.customId.split('_');
        const movieId = parseInt(parts[2]);
        const confirmed = interaction.customId.startsWith('confirm_delete_');

        await retirerFilmCommand.handleConfirmation(interaction, movieId, confirmed);
    },

    async handleMovieListPagination(interaction) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const dataManager = require('../utils/dataManager');

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
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const tmdbService = require('../utils/tmdbService');

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
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
        const { EmbedBuilder } = require('discord.js');

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
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const tmdbService = require('../utils/tmdbService');
        const dataManager = require('../utils/dataManager');

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
            const result = await dataManager.addMovieToDatabase(movieData, interaction.user);
            
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

            // Bouton pour l'ajouter à la watchlist
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`add_to_watchlist_${result.movie.id}`)
                        .setLabel('Ajouter à la watchlist')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📝')
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
        const { EmbedBuilder } = require('discord.js');

        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#888888')
                .setTitle('❌ Ajout annulé')
                .setDescription('L\'ajout du film a été annulé.')
                .setTimestamp()],
            components: []
        });
    }
};
