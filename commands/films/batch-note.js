// batch-note.js
const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('batch-note')
        .setDescription('Noter en série tous les films non notés par vous'),

    async execute(interaction) {
        // Nettoyage périodique des sessions expirées (plus d'1h)
        await databaseManager.cleanupOldBatchNoteSessions(60);
        const userId = interaction.user.id;
        // Récupérer tous les films non notés ET non vus par l'utilisateur, triés par ordre d'ajout
        const movies = await databaseManager.getUnratedUnwatchedMoviesByUser(userId);
        if (!movies || movies.length === 0) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#00b894')
                    .setTitle('🎉 Aucun film à noter !')
                    .setDescription('Vous avez déjà noté tous les films disponibles.')
                    .setTimestamp()
                ],
                flags: MessageFlags.Ephemeral
            });
        }
        // Stocker la liste temporaire en base
        const movieIds = movies.slice(0, 100).map(m => m.id);
        await databaseManager.createBatchNoteSession(userId, movieIds);
        await this.showNextMovie(interaction, userId, movies, 0);
    },

    async showNextMovie(interaction, userId, movies, index) {
        // On récupère la session temporaire
        const session = await databaseManager.getBatchNoteSession(userId);
        if (!session || !session.movieIds || session.movieIds.length === 0) {
            // Session expirée ou supprimée
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#00b894')
                    .setTitle('✅ Fin de la notation')
                    .setDescription('Session expirée ou terminée.')
                    .setTimestamp()
                ],
                flags: MessageFlags.Ephemeral
            });
        }
        const movieIds = session.movieIds;
        if (index >= movieIds.length) {
            // Fin de la session, on supprime la session temporaire
            await databaseManager.deleteBatchNoteSession(userId);
            if (typeof interaction.isButton === 'function' && interaction.isButton()) {
                return await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor('#00b894')
                        .setTitle('✅ Fin de la notation')
                        .setDescription('Vous avez passé ou noté tous les films proposés.')
                        .setTimestamp()
                    ],
                    components: [],
                    flags: MessageFlags.Ephemeral
                });
            } else {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#00b894')
                        .setTitle('✅ Fin de la notation')
                        .setDescription('Vous avez passé ou noté tous les films proposés.')
                        .setTimestamp()
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
        }
        const movieId = movieIds[index];
        const movie = movies.find(m => m.id === movieId);
        // Afficher la progression dans le titre
        const total = movieIds.length;
        const current = index + 1;
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle(`💜 Noter votre envie de regarder (${current}/${total})`)
            .setDescription(`**${movie.title}**`)
            .setTimestamp();
        if (movie.year) {
            embed.addFields({ name: 'Année', value: movie.year.toString(), inline: true });
        }
        if (movie.genre && movie.genre.length > 0) {
            embed.addFields({ name: 'Genres', value: movie.genre.join(', '), inline: true });
        }
        if (movie.watched) {
            embed.addFields({ name: 'Statut', value: '✅ Déjà vu', inline: true });
        } else {
            embed.addFields({ name: 'Statut', value: '⏳ Non vu', inline: true });
        }
        const averageDesireRating = await databaseManager.getAverageDesireRating(movie.id);
        if (averageDesireRating) {
            const avgStars = EmbedUtils.getDesireStars(averageDesireRating.average);
            embed.addFields(
                { name: 'Envie moyenne', value: `${averageDesireRating.average.toFixed(1)}/5 ${avgStars}`, inline: true },
                { name: 'Votes', value: averageDesireRating.count.toString(), inline: true }
            );
        }
        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }
        // Boutons de note
        const ratingRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`batch_desire_${movie.id}_0_${userId}_${index}`).setLabel('🤍').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`batch_desire_${movie.id}_1_${userId}_${index}`).setLabel('💜').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`batch_desire_${movie.id}_2_${userId}_${index}`).setLabel('💜💜').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`batch_desire_${movie.id}_3_${userId}_${index}`).setLabel('💜💜💜').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`batch_desire_${movie.id}_4_${userId}_${index}`).setLabel('💜💜💜💜').setStyle(ButtonStyle.Secondary)
            );
        const ratingRow2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`batch_desire_${movie.id}_5_${userId}_${index}`).setLabel('💜💜💜💜💜').setStyle(ButtonStyle.Secondary)
            );
        // Bouton passer
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`batch_skip_${userId}_${index}`).setLabel('⏭️ Passer').setStyle(ButtonStyle.Primary)
            );
        // Si c'est un bouton, toujours update
        if (interaction.isButton()) {
            await interaction.update({
                embeds: [embed],
                components: [ratingRow, ratingRow2, actionRow],
                flags: MessageFlags.Ephemeral
            });
        } else if (interaction.replied || interaction.deferred) {
            await interaction.editReply({
                embeds: [embed],
                components: [ratingRow, ratingRow2, actionRow],
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: [ratingRow, ratingRow2, actionRow],
                flags: MessageFlags.Ephemeral
            });
        }
    },

    // Handler pour les boutons de note
    async handleBatchDesireRating(interaction) {
        // customId: batch_desire_{movieId}_{rating}_{userId}_{index}
        const parts = interaction.customId.split('_');
        const movieId = parts[2];
        const rating = parts[3];
        const userId = parts[4];
        const index = parseInt(parts[5]);
        if (interaction.user.id !== userId) {
            return await interaction.reply({ content: 'Seul l\'utilisateur ayant lancé la commande peut noter.', ephemeral: true });
        }
        await databaseManager.rateMovieDesire(parseInt(movieId), userId, parseInt(rating));
        const movies = await databaseManager.getUnratedUnwatchedMoviesByUser(userId);
        await this.showNextMovie(interaction, userId, movies, index + 1);
    },

    // Handler pour le bouton passer
    async handleBatchSkip(interaction) {
        // customId: batch_skip_{userId}_{index}
        const parts = interaction.customId.split('_');
        const userId = parts[2];
        const index = parseInt(parts[3]);
        if (interaction.user.id !== userId) {
            return await interaction.reply({ content: 'Seul l\'utilisateur ayant lancé la commande peut passer.', ephemeral: true });
        }
        const movies = await databaseManager.getUnratedUnwatchedMoviesByUser(userId);
        await this.showNextMovie(interaction, userId, movies, index + 1);
    }
};
