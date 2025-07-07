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
            const topRated = await dataManager.getTopRatedMovies(3);

            // Compter les notations
            const ratingsCount = await dataManager.db.get('SELECT COUNT(*) as count FROM ratings');
            const ratedMoviesCount = await dataManager.db.get('SELECT COUNT(DISTINCT movie_id) as count FROM ratings');

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📊 Statistiques de la base de données')
                .setTimestamp();

            // Statistiques générales
            embed.addFields(
                { name: '🎬 Films en base', value: allMovies.length.toString(), inline: true },
                { name: '📝 Films en watchlist', value: watchlist.length.toString(), inline: true },
                { name: '✅ Films vus', value: watchedMovies.length.toString(), inline: true },
                { name: '⭐ Total des notes', value: ratingsCount.count.toString(), inline: true },
                { name: '🎯 Films notés', value: ratedMoviesCount.count.toString(), inline: true },
                { name: '📈 Taux de notation', value: allMovies.length > 0 ? `${Math.round((ratedMoviesCount.count / allMovies.length) * 100)}%` : '0%', inline: true }
            );

            // Top 3 des films les mieux notés
            if (topRated.length > 0) {
                const topText = topRated.map((movie, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                    const stars = '⭐'.repeat(Math.floor(movie.rating.average));
                    return `${medal} ${movie.title} - ${movie.rating.average}/5 ${stars}`;
                }).join('\n');

                embed.addFields({ name: '🏆 Top films', value: topText, inline: false });
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
