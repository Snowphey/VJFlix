const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');
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
                const movies = await dataManager.getMoviesPaginated(0, 25);
                const choices = movies.map(movie => ({
                    name: `${movie.title} (${movie.year || 'N/A'})`,
                    value: movie.id.toString()
                }));
                
                await interaction.respond(choices);
                return;
            }
            
            // Rechercher les films correspondants dans la base de données
            const movies = await dataManager.searchMovies(focusedValue);
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
        const movie = await dataManager.getMovieById(movieId);
        
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

    async displayMovieDetails(interaction, movie) {
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
            userDesire = await dataManager.getUserDesireRating(movie.id, interaction.user.id);
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
        const desireRating = await dataManager.getAverageDesireRating(movie.id);
        if (desireRating) {
            const avgStars = EmbedUtils.getDesireStars(desireRating.average);
            const ratingText = `${desireRating.average.toFixed(1)}/5 ${avgStars} (${desireRating.count} envie${desireRating.count > 1 ? 's' : ''})`;
            embed.addFields(
                { name: 'Envie moyenne', value: ratingText, inline: true },
                { name: 'Nombre de votes', value: desireRating.count.toString(), inline: true }
            );
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
        
        // Bouton pour marquer comme vu/non vu
        if (movie.watched) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mark_unwatched_${movie.id}`)
                    .setLabel('Marquer comme non vu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👁️')
            );
        } else {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mark_watched_${movie.id}`)
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

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    },

    // === HANDLERS DE BOUTONS ===

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

        await this.displayMovieDetails(interaction, movie);
    },
};
