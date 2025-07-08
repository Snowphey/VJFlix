const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lister-films')
        .setDescription('Lister tous les films de la base de données avec leurs IDs')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Numéro de page (20 films par page)')
                .setMinValue(1)),

    async execute(interaction) {
        const page = interaction.options.getInteger('page') || 1;
        const itemsPerPage = 20;
        const offset = (page - 1) * itemsPerPage;

        try {
            // Récupérer le nombre total de films
            const totalCount = await dataManager.getTotalMovieCount();
            
            if (totalCount === 0) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Aucun film')
                        .setDescription('Aucun film trouvé dans la base de données')
                        .setTimestamp()],
                    flags: MessageFlags.Ephemeral
                });
            }

            const totalPages = Math.ceil(totalCount / itemsPerPage);
            
            if (page > totalPages) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Page inexistante')
                        .setDescription(`La page ${page} n'existe pas. Il y a ${totalPages} page(s) au total.`)
                        .setTimestamp()],
                    flags: MessageFlags.Ephemeral
                });
            }

            // Récupérer les films pour cette page
            const movies = await dataManager.getMoviesPaginated(offset, itemsPerPage);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎬 Liste des films')
                .setDescription(`Page ${page}/${totalPages} - ${totalCount} film(s) au total`)
                .setTimestamp();

            // Ajouter chaque film à l'embed
            for (const movie of movies) {
                const averageRating = await dataManager.getAverageRating(movie.id);
                const ratingText = averageRating 
                    ? `⭐ ${averageRating.average}/5 (${averageRating.count} vote${averageRating.count > 1 ? 's' : ''})`
                    : 'Pas encore noté';

                embed.addFields({
                    name: `ID: ${movie.id} - ${movie.title}`,
                    value: `Année: ${movie.year || 'N/A'} | Réalisateur: ${movie.director || 'N/A'}\n${ratingText}`,
                    inline: false
                });
            }

            // Boutons de navigation
            const components = [];
            const navigationButtons = [];

            if (page > 1) {
                navigationButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`list_movies_page_${page - 1}`)
                        .setLabel('◀ Page précédente')
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            if (page < totalPages) {
                navigationButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`list_movies_page_${page + 1}`)
                        .setLabel('Page suivante ▶')
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            if (navigationButtons.length > 0) {
                components.push(new ActionRowBuilder().addComponents(navigationButtons));
            }

            await interaction.reply({
                embeds: [embed],
                components: components
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des films:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur est survenue lors de la récupération des films')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }
    },

    // === HANDLERS DE BOUTONS ===
    
    async handleMovieListPagination(interaction) {
        const page = parseInt(interaction.customId.split('_')[3]);
        const itemsPerPage = 20;
        const offset = (page - 1) * itemsPerPage;

        // Récupérer le nombre total de films
        const totalCount = await dataManager.getTotalMovieCount();
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        
        // Récupérer les films pour cette page
        const movies = await dataManager.getMoviesPaginated(offset, itemsPerPage);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎬 Liste des films')
            .setDescription(`Page ${page}/${totalPages} - ${totalCount} film(s) au total`)
            .setTimestamp();

        // Ajouter chaque film à l'embed
        for (const movie of movies) {
            const averageRating = await dataManager.getAverageRating(movie.id);
            const ratingText = averageRating 
                ? `⭐ ${averageRating.average}/5 (${averageRating.count} vote${averageRating.count > 1 ? 's' : ''})`
                : 'Pas encore noté';

            embed.addFields({
                name: `ID: ${movie.id} - ${movie.title}`,
                value: `Année: ${movie.year || 'N/A'} | Réalisateur: ${movie.director || 'N/A'}\n${ratingText}`,
                inline: false
            });
        }

        // Boutons de navigation
        const components = [];
        const navigationButtons = [];

        if (page > 1) {
            navigationButtons.push(
                new ButtonBuilder()
                    .setCustomId(`list_movies_page_${page - 1}`)
                    .setLabel('◀ Page précédente')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (page < totalPages) {
            navigationButtons.push(
                new ButtonBuilder()
                    .setCustomId(`list_movies_page_${page + 1}`)
                    .setLabel('Page suivante ▶')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (navigationButtons.length > 0) {
            components.push(new ActionRowBuilder().addComponents(navigationButtons));
        }

        // Boutons pour voir les détails des premiers films
        const detailButtons = [];
        for (let i = 0; i < Math.min(movies.length, 5); i++) {
            detailButtons.push(
                new ButtonBuilder()
                    .setCustomId(`movie_details_${movies[i].id}`)
                    .setLabel(`Détails #${movies[i].id}`)
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (detailButtons.length > 0) {
            components.push(new ActionRowBuilder().addComponents(detailButtons));
        }

        await interaction.update({
            embeds: [embed],
            components: components
        });
    }
};
