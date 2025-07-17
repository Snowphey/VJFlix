const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('envies')
        .setDescription('Afficher les notes d\'envie de regarder d\'un utilisateur (par défaut vous)')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur dont afficher les envies')
                .setRequired(false)
        ),


    async execute(interaction) {
        const user = interaction.options.getUser('utilisateur') || interaction.user;
        const userId = user.id;

        try {
            const userDesires = await databaseManager.getUserDesireRatings(userId);


            if (userDesires.length === 0) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#9932CC')
                        .setTitle(`💜 ${user.id === interaction.user.id ? 'Vos' : `Les envies de ${user.username}`} envies de regarder`)
                        .setDescription(`${user.id === interaction.user.id ? "Vous n'avez encore noté aucune envie de regarder." : `${user.username} n'a encore noté aucune envie de regarder.`}`)
                        .setTimestamp()],
                    flags: MessageFlags.Ephemeral
                });
            }

            // Trier par note d'envie décroissante
            userDesires.sort((a, b) => b.desireRating - a.desireRating);


            const embed = new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle(`💜 ${user.id === interaction.user.id ? 'Vos' : `Les envies de ${user.username}`} envies de regarder`)
                .setDescription(`${user.id === interaction.user.id ? `Vous avez noté ${userDesires.length} film${userDesires.length > 1 ? 's' : ''} pour l'envie de regarder` : `${user.username} a noté ${userDesires.length} film${userDesires.length > 1 ? 's' : ''} pour l'envie de regarder`}`)
                .setTimestamp();

            let description = '';
            const displayLimit = 15; // Limiter l'affichage pour éviter les messages trop longs

            userDesires.slice(0, displayLimit).forEach((item, index) => {
                const movie = item.movie;
                // Affichage centralisé via embedUtils
                const stars = EmbedUtils.getDesireStars(item.desireRating);
                const statusIcon = movie.watched ? '✅' : '⏳';

                description += `${statusIcon} **${movie.title}** ${movie.year ? `(${movie.year})` : ''}\n`;
                description += `${stars} ${item.desireRating}/5\n`;

                if (movie.genre && movie.genre.length > 0) {
                    description += `*${movie.genre.slice(0, 2).join(', ')}*\n`;
                }
                description += '\n';
            });

            if (userDesires.length > displayLimit) {
                description += `*... et ${userDesires.length - displayLimit} autre${userDesires.length - displayLimit > 1 ? 's' : ''} film${userDesires.length - displayLimit > 1 ? 's' : ''}*`;
            }

            embed.setDescription(description);

            // Statistiques
            const averageDesire = (userDesires.reduce((sum, item) => sum + item.desireRating, 0) / userDesires.length).toFixed(1);
            const highestDesire = Math.max(...userDesires.map(item => item.desireRating));
            const lowestDesire = Math.min(...userDesires.map(item => item.desireRating));
            const unwatchedDesires = userDesires.filter(item => !item.movie.watched).length;

            embed.addFields(
                { name: 'Envie moyenne', value: `${averageDesire}/5`, inline: true },
                { name: 'Plus haute envie', value: `${highestDesire}/5`, inline: true },
                { name: 'Plus basse envie', value: `${lowestDesire}/5`, inline: true },
                { name: 'Films non vus', value: unwatchedDesires.toString(), inline: true },
                { name: 'Films vus', value: (userDesires.length - unwatchedDesires).toString(), inline: true },
                { name: 'Total noté', value: userDesires.length.toString(), inline: true }
            );

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des envies utilisateur:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur est survenue lors de la récupération de vos envies.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
