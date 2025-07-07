const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('retirer-film')
        .setDescription('Retire définitivement un film de la base de données')
        .addStringOption(option =>
            option.setName('film')
                .setDescription('Sélectionnez un film à supprimer définitivement')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        try {
            if (!focusedValue) {
                // Récupérer les films récents de la base de données
                const movies = await dataManager.getMoviesPaginated(0, 25);
                const choices = movies.map(movie => ({
                    name: `${movie.title} (${movie.year || 'N/A'})`,
                    value: movie.id.toString()
                }));
                
                await interaction.respond(choices);
                return;
            }
            
            // Rechercher les films correspondants dans la base de données
            const movies = await dataManager.searchMovies(focusedValue);
            const choices = movies.slice(0, 25).map(movie => ({
                name: `${movie.title} (${movie.year || 'N/A'})`,
                value: movie.id.toString()
            }));
            
            await interaction.respond(choices);
        } catch (error) {
            console.error('Erreur lors de l\'autocomplétion:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const id = parseInt(interaction.options.getString('film'));

        await interaction.deferReply();

        try {
            // Récupérer les informations du film avant suppression
            const movie = await dataManager.getMovieById(id);
            
            if (!movie) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Film non trouvé')
                        .setDescription(`Film introuvable dans la base de données.`)
                        .setTimestamp()]
                });
            }

            // Créer un embed de confirmation avec toutes les informations
            const confirmEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚠️ Confirmation de suppression')
                .setDescription(`Voulez-vous vraiment supprimer définitivement ce film de la base de données ?
                
**Cette action est irréversible et supprimera :**
• Le film de la base de données
• Toutes ses références dans la watchlist
• Toutes ses références dans les films vus
• Toutes les notations associées`)
                .addFields(
                    { name: 'Film à supprimer', value: `**${movie.title}**`, inline: false },
                    { name: 'ID', value: movie.id.toString(), inline: true },
                    { name: 'Année', value: movie.year?.toString() || 'N/A', inline: true },
                    { name: 'TMDB ID', value: movie.tmdb || 'N/A', inline: true }
                );

            if (movie.director) {
                confirmEmbed.addFields({ name: 'Réalisateur', value: movie.director, inline: true });
            }

            if (movie.genre && movie.genre.length > 0) {
                confirmEmbed.addFields({ name: 'Genres', value: movie.genre.join(', '), inline: true });
            }

            if (movie.poster && movie.poster !== 'N/A') {
                confirmEmbed.setThumbnail(movie.poster);
            }

            confirmEmbed.setTimestamp();

            // Boutons de confirmation
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirm_delete_${id}`)
                        .setLabel('Confirmer la suppression')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                    new ButtonBuilder()
                        .setCustomId(`cancel_delete_${id}`)
                        .setLabel('Annuler')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );

            await interaction.editReply({
                embeds: [confirmEmbed],
                components: [row]
            });

        } catch (error) {
            console.error('Erreur lors de la préparation de suppression du film:', error);
            
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur s\'est produite lors de la préparation de la suppression.')
                    .setTimestamp()]
            });
        }
    },

    async handleConfirmation(interaction, movieId, confirmed) {
        if (!confirmed) {
            return await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor('#6c757d')
                    .setTitle('❌ Suppression annulée')
                    .setDescription('La suppression du film a été annulée.')
                    .setTimestamp()],
                components: []
            });
        }

        try {
            // Effectuer la suppression
            const result = await dataManager.removeMovie(movieId);
            
            if (!result.success) {
                let message = 'Erreur lors de la suppression du film.';
                if (result.reason === 'not_found') {
                    message = `Aucun film trouvé avec l'ID ${movieId}.`;
                }
                
                return await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Erreur')
                        .setDescription(message)
                        .setTimestamp()],
                    components: []
                });
            }

            // Confirmation de suppression
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Film supprimé')
                .setDescription(`Le film **${result.movie.title}** a été supprimé définitivement de la base de données.`)
                .addFields(
                    { name: 'ID supprimé', value: result.movie.id.toString(), inline: true },
                    { name: 'Titre', value: result.movie.title, inline: true },
                    { name: 'Année', value: result.movie.year?.toString() || 'N/A', inline: true }
                )
                .setFooter({ text: 'Toutes les données associées (watchlist, films vus, notations) ont également été supprimées.' })
                .setTimestamp();

            await interaction.update({
                embeds: [successEmbed],
                components: []
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du film:', error);
            
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur s\'est produite lors de la suppression du film.')
                    .setTimestamp()],
                components: []
            });
        }
    }
};
