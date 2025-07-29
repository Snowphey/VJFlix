const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');


// Pagination helpers
const PAGE_SIZE = 10;

function generateEnviesEmbed(user, userDesires, page, interactionUser) {
    const totalPages = Math.ceil(userDesires.length / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const desiresPage = userDesires.slice(start, end);
    const isSelf = user.id === interactionUser.id;
    const embed = new EmbedBuilder()
        .setColor('#9932CC')
        .setTitle(`💜 ${isSelf ? 'Vos envies de regarder' : `Les envies de ${user.username}`}`)
        .setDescription(`${isSelf ? `Vous avez noté ${userDesires.length} film${userDesires.length > 1 ? 's' : ''} pour l'envie de regarder` : `${user.username} a noté ${userDesires.length} film${userDesires.length > 1 ? 's' : ''} pour l'envie de regarder`}\nPage ${page + 1}/${totalPages}`)
        .setTimestamp();

    let description = '';
    desiresPage.forEach((item, index) => {
        const movie = item.movie;
        const stars = EmbedUtils.getDesireStars(item.desireRating);
        const statusIcon = movie.watched ? '✅' : '⏳';
        description += `${statusIcon} **${movie.title}** ${movie.year ? `(${movie.year})` : ''}\n`;
        description += `${stars} ${item.desireRating}/5\n`;
        if (movie.genre && movie.genre.length > 0) {
            description += `*${movie.genre.slice(0, 2).join(', ')}*\n`;
        }
        description += '\n';
    });
    if (userDesires.length > end) {
        description += `*... et ${userDesires.length - end} autre${userDesires.length - end > 1 ? 's' : ''} film${userDesires.length - end > 1 ? 's' : ''}*`;
    }
    embed.setDescription(description);

    // Statistiques globales
    const averageDesire = (userDesires.reduce((sum, item) => sum + item.desireRating, 0) / (userDesires.length || 1)).toFixed(1);
    const highestDesire = userDesires.length > 0 ? Math.max(...userDesires.map(item => item.desireRating)) : 0;
    const lowestDesire = userDesires.length > 0 ? Math.min(...userDesires.map(item => item.desireRating)) : 0;

    embed.addFields(
        { name: 'Envie moyenne', value: `${averageDesire}/5`, inline: true },
        { name: 'Plus haute envie', value: `${highestDesire}/5`, inline: true },
        { name: 'Plus basse envie', value: `${lowestDesire}/5`, inline: true },
        { name: 'Total noté', value: userDesires.length.toString(), inline: true }
    );
    return embed;
}

function getEnviesRow(page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`envies_prev_page:${page}`)
            .setLabel('⬅️ Précédent')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`envies_next_page:${page}`)
            .setLabel('Suivant ➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages - 1)
    );
}

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
            if (!userDesires || userDesires.length === 0) {
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
            const totalPages = Math.ceil(userDesires.length / PAGE_SIZE);
            const currentPage = 0;
            await interaction.reply({
                embeds: [generateEnviesEmbed(user, userDesires, currentPage, interaction.user)],
                components: [getEnviesRow(currentPage, totalPages)],
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
    },

    // Handler statique pour la pagination
    async handleEnviesPagination(interaction) {
        try {
            // customId format: envies_prev_page:currentPage OR envies_next_page:currentPage
            const [action, pageStr] = interaction.customId.split(":");
            let page = parseInt(pageStr, 10);
            if (isNaN(page)) page = 0;
            // Récupérer l'utilisateur cible (celui dont on affiche les envies)
            // On stocke l'id dans le message embed author ou dans le customId si besoin, ici on suppose interaction.message.embeds[0].title contient le nom
            // Pour robustesse, on prend l'auteur du message si possible, sinon fallback interaction.user
            let user = interaction.user;
            if (interaction.message && interaction.message.interaction && interaction.message.interaction.user) {
                user = interaction.message.interaction.user;
            }
            const userId = user.id;
            const userDesires = await databaseManager.getUserDesireRatings(userId);
            if (!userDesires || userDesires.length === 0) {
                return await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor('#9932CC')
                        .setTitle(`💜 ${user.id === interaction.user.id ? 'Vos' : `Les envies de ${user.username}`} envies de regarder`)
                        .setDescription(`${user.id === interaction.user.id ? "Vous n'avez encore noté aucune envie de regarder." : `${user.username} n'a encore noté aucune envie de regarder.`}`)
                        .setTimestamp()],
                    components: [],
                    flags: MessageFlags.Ephemeral
                });
            }
            userDesires.sort((a, b) => b.desireRating - a.desireRating);
            const totalPages = Math.ceil(userDesires.length / PAGE_SIZE);
            if (action === 'envies_prev_page' && page > 0) {
                page--;
            } else if (action === 'envies_next_page' && page < totalPages - 1) {
                page++;
            }
            await interaction.update({
                embeds: [generateEnviesEmbed(user, userDesires, page, interaction.user)],
                components: [getEnviesRow(page, totalPages)],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Erreur lors de la pagination des envies:', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de la pagination des envies.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
