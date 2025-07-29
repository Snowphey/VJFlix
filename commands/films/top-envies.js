const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

// Helpers for top-envies pagination
const PAGE_SIZE = 10;

async function getSortedMoviesWithDesire() {
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
    return moviesWithDesire;
}

function generateEmbed(moviesWithDesire, page) {
    const totalPages = Math.ceil(moviesWithDesire.length / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
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

    // Statistiques globales
    const totalVotes = moviesWithDesire.reduce((sum, movie) => sum + movie.desireRating.count, 0);
    const globalAverage = (moviesWithDesire.reduce((sum, movie) => sum + movie.desireRating.average, 0) / (moviesWithDesire.length || 1)).toFixed(1);
    embed.addFields(
        { name: 'Total des votes', value: totalVotes.toString(), inline: true },
        { name: 'Envie moyenne', value: `${globalAverage}/5`, inline: true },
        { name: 'Films classés', value: moviesWithDesire.length.toString(), inline: true }
    );
    return embed;
}

function getRow(page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`topenvies_prev_page:${page}`)
            .setLabel('⬅️ Précédent')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`topenvies_next_page:${page}`)
            .setLabel('Suivant ➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages - 1)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top-envies')
        .setDescription('Afficher les films les plus désirés'),

    async execute(interaction) {
        try {
            const moviesWithDesire = await getSortedMoviesWithDesire();
            if (moviesWithDesire.length === 0) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#9932CC')
                        .setTitle('💜 Films les plus désirés')
                        .setDescription('Aucun film n\'a encore été noté pour l\'envie de regarder.')
                        .setTimestamp()]
                });
            }
            const totalPages = Math.ceil(moviesWithDesire.length / PAGE_SIZE);
            const currentPage = 0;
            await interaction.reply({
                embeds: [generateEmbed(moviesWithDesire, currentPage)],
                components: [getRow(currentPage, totalPages)]
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
    },

    // Handler statique pour la pagination
    async handleTopEnviesPagination(interaction) {
        try {
            // customId format: topenvies_prev_page:currentPage OR topenvies_next_page:currentPage
            const [action, pageStr] = interaction.customId.split(":");
            let page = parseInt(pageStr, 10);
            if (isNaN(page)) page = 0;
            const moviesWithDesire = await getSortedMoviesWithDesire();
            const totalPages = Math.ceil(moviesWithDesire.length / PAGE_SIZE);
            if (action === 'topenvies_prev_page' && page > 0) {
                page--;
            } else if (action === 'topenvies_next_page' && page < totalPages - 1) {
                page++;
            }
            await interaction.update({
                embeds: [generateEmbed(moviesWithDesire, page)],
                components: [getRow(page, totalPages)]
            });
        } catch (error) {
            console.error('Erreur lors de la pagination du top envies:', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de la pagination du top envies.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
