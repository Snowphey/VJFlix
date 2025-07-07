const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');

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
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(movie.title)
            .addFields(
                { name: 'ID en base', value: movie.id.toString(), inline: true },
                { name: 'Année', value: movie.year?.toString() || 'N/A', inline: true },
                { name: 'Type', value: movie.type || 'movie', inline: true }
            );

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

        // Notations
        const averageRating = await dataManager.getAverageRating(movie.id);
        if (averageRating) {
            const avgStars = '⭐'.repeat(Math.floor(averageRating.average)) + '☆'.repeat(5 - Math.floor(averageRating.average));
            embed.addFields(
                { name: 'Note moyenne', value: `${averageRating.average}/5 ${avgStars}`, inline: true },
                { name: 'Nombre de votes', value: averageRating.count.toString(), inline: true }
            );
        } else {
            embed.addFields({ name: 'Note moyenne', value: 'Pas encore noté', inline: true });
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

        // Bouton pour noter le film
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`rate_quick_${movie.id}`)
                .setLabel('Noter le film')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⭐')
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
    }
};
