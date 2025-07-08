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
            const userStars = userRating.rating === 0 ? '☆☆☆☆☆' : '⭐'.repeat(userRating.rating) + '☆'.repeat(5 - userRating.rating);
            embed.addFields({ name: 'Votre note actuelle', value: `${userRating.rating}/5 ${userStars}`, inline: false });
            embed.setDescription(`**${movie.title}**\n\n*Vous avez déjà noté ce film. Vous pouvez modifier votre note.*`);
        } else {
            embed.setDescription(`**${movie.title}**\n\n*Choisissez une note pour ce film :*`);
        }

        if (averageRating) {
            const avgStars = averageRating.average === 0 ? '☆☆☆☆☆' : '⭐'.repeat(Math.floor(averageRating.average)) + 
                           (averageRating.average % 1 >= 0.5 ? '⭐' : '') +
                           '☆'.repeat(Math.max(0, 5 - Math.ceil(averageRating.average)));
            
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
                    .setCustomId(`rate_${movieDbId}_0`)
                    .setLabel('☆')
                    .setStyle(ButtonStyle.Secondary),
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
                    .setStyle(ButtonStyle.Secondary)
            );

        const ratingRow2 = new ActionRowBuilder()
            .addComponents(
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
            components: [ratingRow, ratingRow2, actionRow],
            flags: MessageFlags.Ephemeral
        });
    },

    // === HANDLERS DE BOUTONS ===
    
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
    }
};
