const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
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

    // === HANDLERS DE BOUTONS ===
    
    async handleConfirmation(interaction, movieId, confirmed) {
        if (confirmed) {
            await this.handleConfirmRemove(interaction, movieId);
        } else {
            await this.handleCancelRemove(interaction);
        }
    },

    async handleConfirmRemove(interaction, movieId) {
        // Supprimer le film de la base de données
        const result = await dataManager.removeMovie(movieId);
        
        if (!result.success) {
            return await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de supprimer le film de la watchlist.')
                    .setTimestamp()],
                components: []
            });
        }
        
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Film supprimé')
                .setDescription(`**${result.movie.title}** a été supprimé de la watchlist et de la base de données.`)
                .setTimestamp()],
            components: []
        });

        // Mettre à jour la liste dans le canal défini
        const { updateListInChannel } = require('../../utils/listUpdater');
        await updateListInChannel(interaction.client);
    },

    async handleCancelRemove(interaction) {
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#888888')
                .setTitle('❌ Suppression annulée')
                .setDescription('La suppression du film a été annulée.')
                .setTimestamp()],
            components: []
        });
    },

    async handleRemoveFromWatchlist(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[3]);
        
        // Récupérer les informations du film avant suppression
        const movie = await dataManager.getMovieById(movieId);
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription('Ce film n\'existe plus dans la base de données.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Demander confirmation
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('⚠️ Confirmation de suppression')
            .setDescription(`Êtes-vous sûr de vouloir supprimer **${movie.title}** de votre watchlist ?\n\n**⚠️ Attention : Cela supprimera définitivement le film de la base de données !**`)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_remove_${movieId}`)
                    .setLabel('Confirmer la suppression')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId(`cancel_remove_${movieId}`)
                    .setLabel('Annuler')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }
};
