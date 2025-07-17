const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');
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

            const mostDesired = await dataManager.getMostDesiredMovies(limit);
            // Tri : d'abord par moyenne décroissante, puis par nombre de votes décroissant
            mostDesired.sort((a, b) => {
                if (b.desireRating.average !== a.desireRating.average) {
                    return b.desireRating.average - a.desireRating.average;
                }
                return b.desireRating.count - a.desireRating.count;
            });

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
                // Affichage centralisé via embedUtils
                const avg = movie.desireRating.average;
                const stars = EmbedUtils.getDesireStars(avg);
                const statusIcon = movie.watched ? '✅' : '⏳';

                description += `${medal} **${movie.title}** ${movie.year ? `(${movie.year})` : ''}\n`;
                description += `${statusIcon} ${stars} ${avg.toFixed(1)}/5 (${movie.desireRating.count} vote${movie.desireRating.count > 1 ? 's' : ''})\n`;

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
