const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, ComponentType } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('watchparty')
        .setDescription('Organise une watchparty avec sondage de disponibilité et recommandations')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Date proposée (ex: Samedi 8 juillet 20h)')
                .setRequired(true)),

    async execute(interaction) {
        const date = interaction.options.getString('date');

        // Créer l'embed principal
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle(`🎬 Nouvelle Watchparty !`)
            .setDescription(`**📅 Date proposée :** ${date}`)
            .addFields(
                { name: '✅ Disponibles', value: 'Aucun participant pour le moment', inline: true },
                { name: '❌ Indisponibles', value: 'Aucun', inline: true },
                { name: '❓ Peut-être', value: 'Aucun', inline: true }
            )
            .setFooter({ text: 'Cliquez sur les boutons pour indiquer votre disponibilité' })
            .setTimestamp();

        // Créer les boutons de sondage
        const pollRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('watchparty_available')
                    .setLabel('Disponible')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('watchparty_unavailable')
                    .setLabel('Indisponible')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('watchparty_maybe')
                    .setLabel('Peut-être')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        // Créer les boutons d'action
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('watchparty_recommendations')
                    .setLabel('Voir les recommandations')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('watchparty_end')
                    .setLabel('Finaliser la watchparty')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏁')
            );

        const fetchedMessage = await interaction.reply({
            embeds: [embed],
            components: [pollRow, actionRow],
            fetchReply: true
        });

        // Stocker les informations de la watchparty
        const watchpartyData = {
            messageId: fetchedMessage.id,
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            date: date,
            organizer: interaction.user.id,
            participants: {
                available: [],
                unavailable: [],
                maybe: []
            },
            createdAt: new Date().toISOString()
        };

        // Stocker temporairement (vous pourriez vouloir ajouter une table watchparties à votre DB)
        global.watchparties = global.watchparties || new Map();
        global.watchparties.set(fetchedMessage.id, watchpartyData);
    },

    async handleAvailabilityVote(interaction) {
        const userId = interaction.user.id;
        const messageId = interaction.message.id;
        
        // Récupérer les données de la watchparty
        const watchpartyData = global.watchparties?.get(messageId);
        if (!watchpartyData) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Déterminer le type de vote
        let voteType;
        if (interaction.customId === 'watchparty_available') {
            voteType = 'available';
        } else if (interaction.customId === 'watchparty_unavailable') {
            voteType = 'unavailable';
        } else if (interaction.customId === 'watchparty_maybe') {
            voteType = 'maybe';
        }

        // Retirer l'utilisateur de toutes les catégories
        Object.keys(watchpartyData.participants).forEach(category => {
            watchpartyData.participants[category] = watchpartyData.participants[category].filter(id => id !== userId);
        });

        // Ajouter l'utilisateur à la nouvelle catégorie
        watchpartyData.participants[voteType].push(userId);

        // Mettre à jour l'embed
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        
        // Formatter les listes de participants
        const formatParticipants = (userIds) => {
            if (userIds.length === 0) return 'Aucun';
            return userIds.map(id => `<@${id}>`).join(', ');
        };

        embed.setFields([
            { name: '✅ Disponibles', value: formatParticipants(watchpartyData.participants.available), inline: true },
            { name: '❌ Indisponibles', value: formatParticipants(watchpartyData.participants.unavailable), inline: true },
            { name: '❓ Peut-être', value: formatParticipants(watchpartyData.participants.maybe), inline: true }
        ]);

        await interaction.update({
            embeds: [embed],
            components: interaction.message.components
        });
    },

    async handleRecommendations(interaction) {
        const messageId = interaction.message.id;
        const watchpartyData = global.watchparties?.get(messageId);
        
        if (!watchpartyData) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Récupérer tous les participants disponibles et "peut-être"
            const availableUsers = [...watchpartyData.participants.available, ...watchpartyData.participants.maybe];
            
            if (availableUsers.length === 0) {
                return await interaction.editReply({
                    content: 'Aucun participant disponible pour générer des recommandations.',
                });
            }

            // Récupérer les recommandations basées sur les notes d'envie
            const result = await this.getMovieRecommendations(availableUsers);
            
            if (result.movies.length === 0) {
                return await interaction.editReply({
                    content: 'Aucune recommandation trouvée. Les participants n\'ont pas encore noté d\'envies de films.',
                });
            }

            // Créer l'embed des recommandations avec indication des critères utilisés
            const embed = new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle(`🎯 Recommandations pour la watchparty`)
                .setDescription(this.getCriteriaDescription(result.criteriaUsed, result.totalParticipants))
                .setTimestamp();

            // Ajouter les top 5 recommandations
            result.movies.slice(0, 5).forEach((movie, index) => {
                let description = '';
                
                if (movie.averageDesire > 0) {
                    const stars = '⭐'.repeat(Math.floor(movie.averageDesire)) + 
                                 (movie.averageDesire % 1 >= 0.5 ? '⭐' : '') +
                                 '☆'.repeat(Math.max(0, 5 - Math.ceil(movie.averageDesire)));
                    
                    description = `**Envie moyenne :** ${movie.averageDesire.toFixed(1)}/5 ${stars}\n` +
                                 `**Votes :** ${movie.voteCount} participant(s)\n`;
                } else {
                    description = `**Pas encore noté en envie**\n`;
                }
                
                description += `**Année :** ${movie.year || 'N/A'}`;
                if (movie.director) {
                    description += ` | **Réalisateur :** ${movie.director}`;
                }
                
                embed.addFields({
                    name: `${index + 1}. ${movie.title}`,
                    value: description,
                    inline: true
                });
            });

            // Ajouter une explication des critères si certains films n'ont pas de notes
            const moviesWithoutRatings = result.movies.filter(movie => movie.averageDesire === 0).length;
            if (moviesWithoutRatings > 0) {
                embed.addFields({
                    name: '📋 Critères adaptatifs',
                    value: `${moviesWithoutRatings > 0 ? 'Inclus des films sans notes d\'envie car peu de films notés par les participants.\n' : ''}` +
                           'Films triés par ordre de préférence décroissant.',
                    inline: false
                });
            }

            // Ajouter les participants pris en compte
            const participantsList = availableUsers.map(id => `<@${id}>`).join(', ');
            embed.addFields({
                name: '👥 Participants pris en compte',
                value: participantsList,
                inline: false
            });

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Erreur lors de la génération des recommandations:', error);
            await interaction.editReply({
                content: 'Une erreur est survenue lors de la génération des recommandations.',
            });
        }
    },

    getCriteriaDescription(criteriaUsed, totalParticipants) {
        switch (criteriaUsed) {
            case 'all_participants':
                return `🎯 **Critère optimal :** Films où tous les ${totalParticipants} participants ont une note d'envie`;
            case 'some_participants':
                return `⚡ **Critère élargi :** Films où au moins un participant a une note d'envie`;
            case 'all_unwatched':
                return `📋 **Critère général :** Tous les films non vus (aucune note d'envie trouvée)`;
            default:
                return `Basées sur les notes d'envie de ${totalParticipants} participant(s)`;
        }
    },

    async getMovieRecommendations(userIds) {
        // Récupérer les recommandations depuis la base de données
        // La méthode getMovieRecommendationsForUsers gère déjà le tri et les critères adaptatifs
        const result = await dataManager.getMovieRecommendationsForUsers(userIds);
        
        // result contient maintenant { movies, criteriaUsed, totalParticipants }
        const recommendations = result.movies || [];
        
        // Formater les données pour l'affichage
        return {
            movies: recommendations.map(movie => ({
                id: movie.id,
                title: movie.title,
                year: movie.year,
                director: movie.director,
                genre: movie.genre,
                poster: movie.poster,
                averageDesire: movie.averageDesire,
                voteCount: movie.participantCount,
                totalDesire: movie.totalDesire,
                maxDesire: movie.maxDesire
            })),
            criteriaUsed: result.criteriaUsed,
            totalParticipants: result.totalParticipants
        };
    },

    async handleEndWatchparty(interaction) {
        const messageId = interaction.message.id;
        const watchpartyData = global.watchparties?.get(messageId);
        
        if (!watchpartyData) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Vérifier si c'est l'organisateur
        if (watchpartyData.organizer !== interaction.user.id) {
            return await interaction.reply({
                content: 'Seul l\'organisateur peut finaliser la watchparty.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Créer l'embed de fin
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.setColor('#00ff00')
            .setTitle(`✅ Watchparty finalisée : ${watchpartyData.title}`)
            .setFooter({ text: 'Watchparty terminée' });

        // Désactiver tous les boutons
        const disabledComponents = interaction.message.components.map(row => {
            const newRow = new ActionRowBuilder();
            row.components.forEach(component => {
                if (component.type === ComponentType.Button) {
                    newRow.addComponents(
                        ButtonBuilder.from(component).setDisabled(true)
                    );
                }
            });
            return newRow;
        });

        await interaction.update({
            embeds: [embed],
            components: disabledComponents
        });

        // Nettoyer les données temporaires
        global.watchparties?.delete(messageId);
    }
};
