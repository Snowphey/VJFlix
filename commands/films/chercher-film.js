const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const { handleButtonsDesireRating, buttonsDesireRating, desireRate } = require('./noter-envie');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chercher-film')
        .setDescription('Chercher un film dans la base de données')
        .addStringOption(option =>
            option.setName('film')
                .setDescription('Sélectionnez un film pour voir ses détails')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        try {
            if (!focusedValue) {
                // Récupérer les films récents de la base de données
                const movies = await databaseManager.getMoviesPaginated(0, 25);
                const choices = movies.map(movie => ({
                    name: `${movie.title} (${movie.year || 'N/A'})`,
                    value: movie.id.toString()
                }));
                
                await interaction.respond(choices);
                return;
            }
            
            // Rechercher les films correspondants dans la base de données
            const movies = await databaseManager.searchMovies(focusedValue);
            const choices = movies.slice(0, 25).map(movie => ({
                name: `${movie.title} (${movie.year || 'N/A'})`,
                value: movie.id.toString()
            }));
            
            await interaction.respond(choices);
        } catch (error) {
            console.error('Erreur lors de l\'autocomplétion:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const movieId = parseInt(interaction.options.getString('film'));
        
        // Récupérer le film par son ID
        const movie = await databaseManager.getMovieById(movieId);
        
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription(`Film introuvable dans la base de données.`)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Afficher les détails du film
        await this.displayMovieDetails(interaction, movie);
    },

    async displayMovieDetails(interaction, movie, isUpdate = false) {
        // Construire l'embed avec les détails du film
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`🎬 ${movie.title}`)
            .setTimestamp();

        if (movie.director) {
            embed.addFields({ name: 'Réalisateur', value: movie.director, inline: true });
        }

        if (movie.genre && movie.genre.length > 0) {
            embed.addFields({ name: 'Genres', value: movie.genre.join(', '), inline: true });
        }

        if (movie.runtime) {
            embed.addFields({ name: 'Durée', value: movie.runtime, inline: true });
        }

        if (movie.actors && movie.actors.length > 0) {
            embed.addFields({ name: 'Acteurs principaux', value: movie.actors.slice(0, 3).join(', '), inline: false });
        }
            
        // Afficher la note d'envie de l'utilisateur si elle existe
        let userDesire = null;
        if (interaction.user) {
            userDesire = await databaseManager.getUserDesireRating(movie.id, interaction.user.id);
        }

        if (userDesire) {
            const userHearts = EmbedUtils.getDesireStars(userDesire.desire_rating);
            embed.addFields({
                name: 'Votre envie',
                value: `${userDesire.desire_rating}/5 ${userHearts}`,
                inline: true
            });
        }

        // Notation d'envie uniquement
        const desireRating = await databaseManager.getAverageDesireRating(movie.id);
        if (desireRating) {
            const avgStars = EmbedUtils.getDesireStars(desireRating.average);
            const ratingText = `${desireRating.average.toFixed(1)}/5 ${avgStars} (${desireRating.count} envie${desireRating.count > 1 ? 's' : ''})`;
            embed.addFields(
                { name: 'Envie moyenne', value: ratingText, inline: true },
                { name: 'Nombre de votes', value: desireRating.count.toString(), inline: true }
            );

            // Afficher la liste des votants si au moins 1
            if (desireRating.count > 0) {
                const ratings = await databaseManager.getMovieDesireRatings(movie.id);
                if (ratings && ratings.length > 0) {
                    // Afficher la mention Discord de chaque votant (userId)
                    const voterMentions = ratings.slice(0, 10).map(r => `<@${r.user_id}>`);
                    const displayNames = voterMentions.join(', ');
                    const more = ratings.length > 10 ? `, ...(+${ratings.length - 10})` : '';
                    embed.addFields({
                        name: `Votant${ratings.length > 1 ? 's' : ''}`,
                        value: displayNames + more,
                        inline: false
                    });
                }
            }
        }

        if (movie.tmdbRating) {
            embed.addFields({ name: 'Note TMDB', value: `${movie.tmdbRating}/10`, inline: true });
        }

        if (movie.plot) {
            embed.addFields({ name: 'Synopsis', value: movie.plot.length > 1024 ? movie.plot.substring(0, 1021) + '...' : movie.plot });
        }

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        embed.setTimestamp();

        // Boutons d'action
        const row = new ActionRowBuilder();
        // Bouton pour marquer comme vu/non vu (customId spécifique)
        if (movie.watched) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mark_unwatched_chercher_${movie.id}`)
                    .setLabel('Marquer comme non vu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👁️')
            );
        } else {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mark_watched_chercher_${movie.id}`)
                    .setLabel('Marquer comme vu')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );
        }

        // Bouton pour noter l'envie
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`desire_quick_${movie.id}`)
                .setLabel('Noter l\'envie')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💜')
        );

        // Bouton pour supprimer de la watchlist
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`remove_from_watchlist_${movie.id}`)
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
        );


        if (isUpdate && interaction.isMessageComponent && interaction.isMessageComponent()) {
            await interaction.update({
                embeds: [embed],
                components: [row]
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }
    },

    // === HANDLERS DE BOUTONS ===

    // Handler custom : marquer comme vu
    async handleMarkWatched(interaction) {
        const movieId = parseInt(interaction.customId.split('_').pop());
        // Marquer le film comme vu
        const result = await databaseManager.markAsWatched(movieId, interaction.user);
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
        // Rafraîchir le message avec le nouveau statut
        const movie = await databaseManager.getMovieById(movieId);
        await this.displayMovieDetails(interaction, movie, true);
    },

    // Handler custom : marquer comme non-vu
    async handleMarkUnwatched(interaction) {
        const movieId = parseInt(interaction.customId.split('_').pop());
        // Marquer le film comme non vu
        const result = await databaseManager.markAsUnwatched(movieId, interaction.user);
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
        // Rafraîchir le message avec le nouveau statut
        const movie = await databaseManager.getMovieById(movieId);
        await this.displayMovieDetails(interaction, movie, true);
    },

    async handleMovieDetails(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        const movie = await databaseManager.getMovieById(movieId);
        
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

        await this.displayMovieDetails(interaction, movie, true);
    },
};
