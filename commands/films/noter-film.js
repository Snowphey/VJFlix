const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noter-film')
        .setDescription('Noter un film de la base de données')
        .addStringOption(option =>
            option.setName('film')
                .setDescription('Sélectionnez un film à noter')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        if (!focusedValue) {
            // Récupérer les films récents
            const movies = await dataManager.getMoviesPaginated(0, 25);
            const choices = movies.map(movie => ({
                name: `${movie.title} (${movie.year || 'N/A'})`,
                value: movie.id.toString()
            }));
            
            await interaction.respond(choices);
            return;
        }
        
        // Rechercher les films correspondants
        const movies = await dataManager.searchMoviesInDatabase(focusedValue);
        const choices = movies.slice(0, 25).map(movie => ({
            name: `${movie.title} (${movie.year || 'N/A'})`,
            value: movie.id.toString()
        }));
        
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const movieDbId = parseInt(interaction.options.getString('film'));
        const userId = interaction.user.id;

        // Vérifier si le film existe
        const movie = await dataManager.getMovieFromDatabase(movieDbId);
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

        // Vérifier si l'utilisateur a déjà noté ce film
        const userRating = await dataManager.getUserRating(movieDbId, userId);
        const averageRating = await dataManager.getAverageRating(movieDbId);

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🎬 Noter le film')
            .setDescription(`**${movie.title}**`)
            .setTimestamp();

        if (movie.year) {
            embed.addFields({ name: 'Année', value: movie.year.toString(), inline: true });
        }

        if (movie.genre && movie.genre.length > 0) {
            embed.addFields({ name: 'Genres', value: movie.genre.join(', '), inline: true });
        }

        if (userRating) {
            const userStars = '⭐'.repeat(userRating.rating) + '☆'.repeat(5 - userRating.rating);
            embed.addFields({ name: 'Votre note actuelle', value: `${userRating.rating}/5 ${userStars}`, inline: false });
            embed.setDescription(`**${movie.title}**\n\n*Vous avez déjà noté ce film. Vous pouvez modifier votre note.*`);
        } else {
            embed.setDescription(`**${movie.title}**\n\n*Choisissez une note pour ce film :*`);
        }

        if (averageRating) {
            const avgStars = '⭐'.repeat(Math.floor(averageRating.average)) + 
                           (averageRating.average % 1 >= 0.5 ? '⭐' : '☆') +
                           '☆'.repeat(Math.max(0, 4 - Math.floor(averageRating.average)));
            
            embed.addFields(
                { name: 'Note moyenne', value: `${averageRating.average.toFixed(1)}/5 ${avgStars}`, inline: true },
                { name: 'Votes', value: averageRating.count.toString(), inline: true }
            );
        }

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        // Créer les boutons de notation
        const ratingRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rate_${movieDbId}_1`)
                    .setLabel('⭐')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`rate_${movieDbId}_2`)
                    .setLabel('⭐⭐')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`rate_${movieDbId}_3`)
                    .setLabel('⭐⭐⭐')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`rate_${movieDbId}_4`)
                    .setLabel('⭐⭐⭐⭐')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`rate_${movieDbId}_5`)
                    .setLabel('⭐⭐⭐⭐⭐')
                    .setStyle(ButtonStyle.Secondary)
            );

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`cancel_rating_${movieDbId}`)
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Danger)
            );

        // Ajouter le bouton de suppression si l'utilisateur a déjà noté
        if (userRating) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`remove_rating_${movieDbId}`)
                    .setLabel('🗑️ Supprimer ma note')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        await interaction.reply({
            embeds: [embed],
            components: [ratingRow, actionRow],
            flags: MessageFlags.Ephemeral
        });
    }
};
