const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats-bd')
        .setDescription('Afficher les statistiques de la base de données'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Récupérer les statistiques
            const watchlist = await dataManager.getUnwatchedMovies();
            const watchedMovies = await dataManager.getWatchedMovies();
            const allMovies = await dataManager.getMovies();
            // Top 3 des films selon l'envie
            const topDesire = await dataManager.getMostDesiredMovies(3);

            // Compter les notations d'envie
            const desireRatingsCount = await dataManager.db.get('SELECT COUNT(*) as count FROM watch_desires');
            const desireRatedMoviesCount = await dataManager.db.get('SELECT COUNT(DISTINCT movie_id) as count FROM watch_desires');

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
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                    const avg = movie.desireRating?.average || 0;
                    const fullHearts = '💜'.repeat(Math.floor(avg));
                    const emptyHearts = '🤍'.repeat(5 - Math.floor(avg));
                    return `${medal} ${movie.title} - ${avg}/5 ${fullHearts}${emptyHearts}`;
                }).join('\n');

                embed.addFields({ name: '🏆 Top envies', value: topText, inline: false });
            }

            // Statistiques par genre si disponible
            const movies = await dataManager.db.all(`
                SELECT genre 
                FROM movies 
                WHERE genre IS NOT NULL AND genre != '[]'
            `);

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
