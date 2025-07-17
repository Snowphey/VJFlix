const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top-envies')
        .setDescription('Afficher les films les plus désirés')
        .addIntegerOption(option =>
            option.setName('limite')
                .setDescription('Nombre de films à afficher (max 25)')
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)),

    async execute(interaction) {
        const limit = interaction.options.getInteger('limite') || 10;
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

            // Limiter le nombre de films affichés
            const mostDesired = moviesWithDesire.slice(0, limit);

            if (mostDesired.length === 0) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#9932CC')
                        .setTitle('💜 Films les plus désirés')
                        .setDescription('Aucun film n\'a encore été noté pour l\'envie de regarder.')
                        .setTimestamp()]
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('💜 Films les plus désirés')
                .setDescription(`Top ${mostDesired.length} des films avec les meilleures notes d'envie`)
                .setTimestamp();

            let description = '';
            mostDesired.forEach((movie, index) => {
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
                const avg = movie.desireRating.average;
                const count = movie.desireRating.count;
                const stars = EmbedUtils.getDesireStars(avg);
                let ratingStr = `${stars} ${avg.toFixed(1)}/5 (${count} vote${count > 1 ? 's' : ''})`;
                description += `${medal} **${movie.title}** ${movie.year ? `(${movie.year})` : ''}\n`;
                description += `${ratingStr}\n`;

                // afficher les votants
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

            // Ajouter des statistiques
            const totalDesires = mostDesired.reduce((sum, movie) => sum + movie.desireRating.count, 0);
            const averageDesire = (mostDesired.reduce((sum, movie) => sum + movie.desireRating.average, 0) / mostDesired.length).toFixed(1);
            embed.addFields(
                { name: 'Total des votes', value: totalDesires.toString(), inline: true },
                { name: 'Envie moyenne', value: `${averageDesire}/5`, inline: true },
                { name: 'Films classés', value: mostDesired.length.toString(), inline: true }
            );

            await interaction.reply({
                embeds: [embed],
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
