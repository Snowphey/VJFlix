const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chercher-film')
        .setDescription('Chercher un film dans la base de données')
        .addStringOption(option =>
            option.setName('recherche')
                .setDescription('Titre, réalisateur ou acteur à rechercher')
                .setRequired(true)),

    async execute(interaction) {
        const query = interaction.options.getString('recherche');
        
        // Rechercher dans la base de données
        const results = await dataManager.searchMoviesInDatabase(query);
        
        if (results.length === 0) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Aucun résultat')
                    .setDescription(`Aucun film trouvé pour la recherche : "${query}"`)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        if (results.length === 1) {
            // Un seul résultat, affichage détaillé
            return await this.displayMovieDetails(interaction, results[0]);
        }

        // Plusieurs résultats, affichage liste
        await this.displaySearchResults(interaction, results, query);
    },

    async displaySearchResults(interaction, results, query) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`🔍 Résultats de recherche : "${query}"`)
            .setDescription(`${results.length} film(s) trouvé(s)`)
            .setTimestamp();

        // Limiter à 10 résultats
        const limitedResults = results.slice(0, 10);
        
        for (const movie of limitedResults) {
            const averageRating = await dataManager.getAverageRating(movie.id);
            const ratingText = averageRating 
                ? `⭐ ${averageRating.average}/5 (${averageRating.count} vote${averageRating.count > 1 ? 's' : ''})`
                : 'Pas encore noté';

            embed.addFields({
                name: `${movie.title} (${movie.year || 'N/A'})`,
                value: `ID: ${movie.id} | ${ratingText}\nRéalisateur: ${movie.director || 'N/A'}`,
                inline: false
            });
        }

        if (results.length > 10) {
            embed.setFooter({ text: `Affichage des 10 premiers résultats sur ${results.length}` });
        }

        // Boutons pour voir les détails
        const buttons = [];
        for (let i = 0; i < Math.min(limitedResults.length, 5); i++) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`movie_details_${limitedResults[i].id}`)
                    .setLabel(`Détails #${limitedResults[i].id}`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        const row = new ActionRowBuilder().addComponents(buttons);

        await interaction.reply({
            embeds: [embed],
            components: buttons.length > 0 ? [row] : []
        });
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
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`add_to_watchlist_${movie.id}`)
                    .setLabel('Ajouter à la watchlist')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId(`rate_movie_${movie.id}`)
                    .setLabel('Noter ce film')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⭐')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};
