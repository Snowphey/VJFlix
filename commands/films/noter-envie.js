const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noter-envie')
        .setDescription('Noter votre envie de regarder un film')
        .addStringOption(option =>
            option.setName('film')
                .setDescription('Sélectionnez un film pour noter votre envie')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        if (!focusedValue) {
            // Récupérer les films récents (priorité aux non vus pour l'envie)
            const movies = await dataManager.getUnwatchedMovies(0, 25);
            const choices = movies.map(movie => ({
                name: `${movie.title} (${movie.year || 'N/A'})`,
                value: movie.id.toString()
            }));
            
            await interaction.respond(choices);
            return;
        }
        
        // Rechercher les films correspondants
        const movies = await dataManager.searchMovies(focusedValue);
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
        const movie = await dataManager.getMovieById(movieDbId);
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

        // Vérifier si l'utilisateur a déjà noté l'envie pour ce film
        const userDesireRating = await dataManager.getUserDesireRating(movieDbId, userId);
        const averageDesireRating = await dataManager.getAverageDesireRating(movieDbId);

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('💜 Noter votre envie de regarder')
            .setDescription(`**${movie.title}**`)
            .setTimestamp();

        if (movie.year) {
            embed.addFields({ name: 'Année', value: movie.year.toString(), inline: true });
        }

        if (movie.genre && movie.genre.length > 0) {
            embed.addFields({ name: 'Genres', value: movie.genre.join(', '), inline: true });
        }

        // Indiquer si le film est déjà vu
        if (movie.watched) {
            embed.addFields({ name: 'Statut', value: '✅ Déjà vu', inline: true });
        } else {
            embed.addFields({ name: 'Statut', value: '⏳ Non vu', inline: true });
        }

        if (userDesireRating) {
            const userStars = userDesireRating.desire_rating === 0 ? '🤍🤍🤍🤍🤍' : '💜'.repeat(userDesireRating.desire_rating) + '🤍'.repeat(5 - userDesireRating.desire_rating);
            embed.addFields({ name: 'Votre envie actuelle', value: `${userDesireRating.desire_rating}/5 ${userStars}`, inline: false });
            embed.setDescription(`**${movie.title}**\n\n*Vous avez déjà noté votre envie pour ce film. Vous pouvez modifier votre note.*`);
        } else {
            embed.setDescription(`**${movie.title}**\n\n*Choisissez votre niveau d'envie de regarder ce film :*`);
        }

        if (averageDesireRating) {
            const avgStars = averageDesireRating.average === 0 ? '🤍🤍🤍🤍🤍' : '💜'.repeat(Math.floor(averageDesireRating.average)) + 
                           (averageDesireRating.average % 1 >= 0.5 ? '💜' : '') +
                           '🤍'.repeat(Math.max(0, 5 - Math.ceil(averageDesireRating.average)));
            
            embed.addFields(
                { name: 'Envie moyenne', value: `${averageDesireRating.average.toFixed(1)}/5 ${avgStars}`, inline: true },
                { name: 'Votes', value: averageDesireRating.count.toString(), inline: true }
            );
        }

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        // Créer les boutons de notation d'envie
        const ratingRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`desire_${movieDbId}_0`)
                    .setLabel('🤍')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`desire_${movieDbId}_1`)
                    .setLabel('💜')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`desire_${movieDbId}_2`)
                    .setLabel('💜💜')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`desire_${movieDbId}_3`)
                    .setLabel('💜💜💜')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`desire_${movieDbId}_4`)
                    .setLabel('💜💜💜💜')
                    .setStyle(ButtonStyle.Secondary)
            );

        const ratingRow2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`desire_${movieDbId}_5`)
                    .setLabel('💜💜💜💜💜')
                    .setStyle(ButtonStyle.Secondary)
            );

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`cancel_desire_${movieDbId}`)
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Danger)
            );

        // Ajouter le bouton de suppression si l'utilisateur a déjà noté
        if (userDesireRating) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`remove_desire_${movieDbId}`)
                    .setLabel('🗑️ Supprimer ma note')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        await interaction.reply({
            embeds: [embed],
            components: [ratingRow, ratingRow2, actionRow],
            flags: MessageFlags.Ephemeral
        });
    }
};
