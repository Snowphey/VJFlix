const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats-bd')
        .setDescription('Afficher les statistiques de la base de données'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Récupérer les statistiques
            const watchlist = await databaseManager.getUnwatchedMovies();
            const watchedMovies = await databaseManager.getWatchedMovies();
            const allMovies = await databaseManager.getAllMovies();

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

            // Top 3 des films avec la meilleure envie
            const topDesire = moviesWithDesire.slice(0, 3);

            const desireRatingsCount = await databaseManager.getDesireRatingsCount();
            const desireRatedMoviesCount = await databaseManager.getDesireRatedMoviesCount();

            const embed = new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('📊 Statistiques de la base de données')
                .setTimestamp();

            // Statistiques générales
            embed.addFields(
                { name: '🎬 Films en base', value: allMovies.length.toString(), inline: true },
                { name: '📝 Films en watchlist', value: watchlist.length.toString(), inline: true },
                { name: '✅ Films vus', value: watchedMovies.length.toString(), inline: true },
                { name: '💜 Total des envies', value: desireRatingsCount.count.toString(), inline: true },
                { name: '🎯 Films avec envie', value: desireRatedMoviesCount.count.toString(), inline: true },
                { name: '📈 Taux d\'envie', value: allMovies.length > 0 ? `${Math.round((desireRatedMoviesCount.count / allMovies.length) * 100)}%` : '0%', inline: true }
            );

            // Top 3 des films avec la meilleure envie
            if (topDesire.length > 0) {
                const topText = topDesire.map((movie, index) => {
                            const rank = index + 1;
                            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
                            const avg = movie.desireRating.average;
                            const count = movie.desireRating.count;
                            const stars = EmbedUtils.getDesireStars(avg);
                            let ratingStr = `${stars} ${avg.toFixed(1)}/5 (${count} vote${count > 1 ? 's' : ''})`;
                            return `${medal} **${movie.title}** ${movie.year ? `(${movie.year})` : ''}\n${ratingStr}\n`;
                }).join('\n');

                embed.addFields({ name: '🏆 Top envies', value: topText, inline: false });
            }

            // Statistiques par genre si disponible
            const movies = await databaseManager.getMoviesWithGenres();

            if (movies.length > 0) {
                const genreCounts = {};
                
                movies.forEach(movie => {
                    try {
                        const genres = JSON.parse(movie.genre);
                        genres.forEach(genre => {
                            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                        });
                    } catch {
                        // Si ce n'est pas du JSON, traiter comme un genre simple
                        const genre = movie.genre;
                        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                    }
                });

                const sortedGenres = Object.entries(genreCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                if (sortedGenres.length > 0) {
                    const genreText = sortedGenres.map(([genre, count]) => 
                        `${genre}: ${count}`
                    ).join('\n');

                    embed.addFields({ name: '🎭 Genres populaires', value: genreText, inline: false });
                }
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de récupérer les statistiques de la base de données.')
                    .setTimestamp()]
            });
        }
    }
};
