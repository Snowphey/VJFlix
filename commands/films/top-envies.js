const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top-envies')
        .setDescription('Afficher les films les plus désirés'),

    async execute(interaction) {
        try {
            // Récupérer tous les films non vus
            const unwatchedMovies = await databaseManager.getUnwatchedMovies(0, 1000);
            // Pour chaque film, récupérer les notes d'envie
            const moviesWithDesire = [];
            for (const movie of unwatchedMovies) {
                const ratings = await databaseManager.getMovieDesireRatings(movie.id);
                if (!ratings || ratings.length === 0) continue;
                const count = ratings.length;
                const average = ratings.reduce((sum, r) => sum + r.desire_rating, 0) / count;
                moviesWithDesire.push({
                    ...movie,
                    desireRating: {
                        average,
                        count
                    },
                    ratings // pour affichage des votants
                });
            }

            // Tri : d'abord par nombre de votes décroissant, puis par moyenne décroissante
            moviesWithDesire.sort((a, b) => {
                const countDiff = b.desireRating.count - a.desireRating.count;
                if (countDiff !== 0) return countDiff;
                return b.desireRating.average - a.desireRating.average;
            });

            if (moviesWithDesire.length === 0) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#9932CC')
                        .setTitle('💜 Films les plus désirés')
                        .setDescription('Aucun film n\'a encore été noté pour l\'envie de regarder.')
                        .setTimestamp()]
                });
            }

            // Pagination
            const pageSize = 10;
            const totalPages = Math.ceil(moviesWithDesire.length / pageSize);
            let currentPage = 0;

            // Fonction pour générer l'embed d'une page
            function generateEmbed(page) {
                const start = page * pageSize;
                const end = start + pageSize;
                const mostDesired = moviesWithDesire.slice(start, end);
                const embed = new EmbedBuilder()
                    .setColor('#9932CC')
                    .setTitle('💜 Films les plus désirés')
                    .setDescription(`Page ${page + 1}/${totalPages} — Top ${moviesWithDesire.length} films avec les meilleures notes d'envie`)
                    .setTimestamp();

                let description = '';
                mostDesired.forEach((movie, index) => {
                    const rank = start + index + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
                    const avg = movie.desireRating.average;
                    const count = movie.desireRating.count;
                    const stars = EmbedUtils.getDesireStars(avg);
                    let ratingStr = `${stars} ${avg.toFixed(1)}/5 (${count} vote${count > 1 ? 's' : ''})`;
                    description += `${medal} **${movie.title}** ${movie.year ? `(${movie.year})` : ''}\n`;
                    description += `${ratingStr}\n`;
                    if (movie.ratings && movie.ratings.length > 0) {
                        const voters = movie.ratings.map(r => `<@${r.user_id}>`).join(', ');
                        description += `👤 Votants : ${voters}\n`;
                    }
                    if (movie.genre && movie.genre.length > 0) {
                        description += `*${movie.genre.slice(0, 3).join(', ')}*\n`;
                    }
                    description += '\n';
                });
                embed.setDescription(description);

                // Statistiques de la page
                const totalDesires = mostDesired.reduce((sum, movie) => sum + movie.desireRating.count, 0);
                const averageDesire = (mostDesired.reduce((sum, movie) => sum + movie.desireRating.average, 0) / (mostDesired.length || 1)).toFixed(1);
                embed.addFields(
                    { name: 'Total des votes (page)', value: totalDesires.toString(), inline: true },
                    { name: 'Envie moyenne (page)', value: `${averageDesire}/5`, inline: true },
                    { name: 'Films classés (page)', value: mostDesired.length.toString(), inline: true }
                );
                return embed;
            }

            // Créer les boutons
            function getRow(page) {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('⬅️ Précédent')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Suivant ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1)
                );
            }

            // Envoyer la première page
            await interaction.reply({
                embeds: [generateEmbed(currentPage)],
                components: [getRow(currentPage)]
            });

            // Créer un collector pour les boutons
            const message = await interaction.fetchReply();
            const filter = i => i.user.id === interaction.user.id && ['prev_page', 'next_page'].includes(i.customId);
            const collector = message.createMessageComponentCollector({ filter, time: 120000 });

            collector.on('collect', async i => {
                if (i.customId === 'prev_page' && currentPage > 0) {
                    currentPage--;
                } else if (i.customId === 'next_page' && currentPage < totalPages - 1) {
                    currentPage++;
                }
                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [getRow(currentPage)]
                });
            });

            collector.on('end', async () => {
                // Désactiver les boutons à la fin
                if (message.editable) {
                    await message.edit({ components: [getRow(currentPage).setComponents(
                        ...getRow(currentPage).components.map(btn => btn.setDisabled(true))
                    )] });
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des films les plus désirés:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur est survenue lors de la récupération des films les plus désirés.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
