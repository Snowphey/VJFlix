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

        await this.buttonsDesireRating(interaction, movieDbId, userId);
    },

    async buttonsDesireRating(interaction, movieDbId, userId) {
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
    },

    // === HANDLERS DE BOUTONS ===

    async handleDesireRating(interaction) {
        // Extraire l'ID du film et la note depuis le customId (desire_movieId_rating)
        const [, movieDbId, rating] = interaction.customId.split('_');
        const userId = interaction.user.id;
        const ratingValue = parseInt(rating);

        await this.desireRate(interaction, movieDbId, userId, ratingValue); 
    },

    async desireRate(interaction, movieDbId, userId, ratingValue) {
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

    async handleDesireQuick(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        const userId = interaction.user.id;

        await this.buttonsDesireRating(interaction, movieId, userId);
    },

    async handleSetDesire(interaction) {
        const [ , , movieId, desire ] = interaction.customId.split('_');
        const userId = interaction.user.id;

        await this.desireRate(interaction, movieId, userId, parseInt(desire));
    }
};
