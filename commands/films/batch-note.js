// batch-note.js
const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('batch-note')
        .setDescription('Noter en série tous les films non notés par vous'),

    async execute(interaction) {
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
        // Stocker la liste des films à noter dans une variable d'état (en mémoire ou base selon infra)
        // Pour simplicité, on encode la liste dans le customId du bouton "passer" (limité à 100 films max)
        await this.showNextMovie(interaction, userId, movies, 0);
    },

    async showNextMovie(interaction, userId, movies, index) {
        if (index >= movies.length) {
            // Si c'est un bouton, update le message pour le vider et désactiver les composants
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
        const movie = movies[index];
        // Reprendre le menu de noter-envie
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
        const [, , movieId, rating, userId, index] = interaction.customId.split('_');
        if (interaction.user.id !== userId) {
            return await interaction.reply({ content: 'Seul l\'utilisateur ayant lancé la commande peut noter.', ephemeral: true });
        }
        await databaseManager.rateMovieDesire(parseInt(movieId), userId, parseInt(rating));
        // Récupérer la liste des films non notés (pour robustesse, on relit la liste)
        const movies = await databaseManager.getUnratedUnwatchedMoviesByUser(userId);
        await this.showNextMovie(interaction, userId, movies, parseInt(index) + 1);
    },

    // Handler pour le bouton passer
    async handleBatchSkip(interaction) {
        // customId: batch_skip_{userId}_{index}
        const [, , userId, index] = interaction.customId.split('_');
        if (interaction.user.id !== userId) {
            return await interaction.reply({ content: 'Seul l\'utilisateur ayant lancé la commande peut passer.', ephemeral: true });
        }
        const movies = await databaseManager.getUnratedUnwatchedMoviesByUser(userId);
        await this.showNextMovie(interaction, userId, movies, parseInt(index) + 1);
    }
};
