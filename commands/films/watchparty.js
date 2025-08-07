const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, ComponentType } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const EmbedUtils = require('../../utils/embedUtils');

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
        // Vérifier s'il existe déjà une watchparty ouverte dans ce salon
        const openWatchparty = await databaseManager.getOpenWatchpartyByChannel(interaction.channelId);
        if (openWatchparty) {
            return await interaction.reply({
                content: '❌ Il y a déjà une watchparty en cours dans ce salon. Merci de la finaliser ou supprimer avant d\'en créer une nouvelle.',
                flags: MessageFlags.Ephemeral
            });
        }

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
            .setFooter({ text: 'Cliquez sur les boutons pour indiquer votre disponibilité', iconURL: undefined })
            .setTimestamp();


        const pollRow = this.getWatchpartyPollRow();
        const actionRow = this.getWatchpartyActionRow(true);
        const response = await interaction.reply({
            embeds: [embed],
            components: [pollRow, actionRow],
            withResponse: true
        });

        const fetchedMessage = response.resource.message;

        // Épingler le message de la watchparty
        try {
            await fetchedMessage.pin();
        } catch (err) {
            console.error('Erreur lors de l\'épinglage du message de watchparty:', err);
        }

        // Stocker la watchparty en base
        await databaseManager.createWatchparty({
            messageId: fetchedMessage.id,
            channelId: interaction.channelId,
            date: date,
            organizer: interaction.user.id,
            participants: { available: [], unavailable: [], maybe: [] },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isOpen: 1
        });
    },

    async handleAvailabilityVote(interaction) {
        const userId = interaction.user.id;
        const messageId = interaction.message.id;

        // Récupérer la watchparty depuis la base
        const watchpartyRow = await databaseManager.getWatchpartyByMessageId(messageId);
        if (!watchpartyRow) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }
        let participants = JSON.parse(watchpartyRow.participants);

        // Déterminer le type de vote
        let voteType;
        if (interaction.customId === 'watchparty_available') {
            voteType = 'available';
        } else if (interaction.customId === 'watchparty_unavailable') {
            voteType = 'unavailable';
        } else if (interaction.customId === 'watchparty_maybe') {
            voteType = 'maybe';
        }

        // Vérifier si l'utilisateur a déjà voté pour cette catégorie
        const alreadyVoted = participants[voteType].includes(userId);

        if (alreadyVoted) {
            // Si déjà voté, retirer le vote (enlève l'utilisateur de la catégorie)
            participants[voteType] = participants[voteType].filter(id => id !== userId);
        } else {
            // Sinon, retirer l'utilisateur de toutes les catégories puis l'ajouter à la nouvelle
            Object.keys(participants).forEach(category => {
                participants[category] = participants[category].filter(id => id !== userId);
            });
            participants[voteType].push(userId);
        }

        // Mettre à jour la base
        await databaseManager.updateWatchpartyParticipants(messageId, participants, new Date().toISOString());

        // Mettre à jour l'embed
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);

        // Formatter les listes de participants
        const formatParticipants = (userIds) => {
            if (userIds.length === 0) return 'Aucun';
            return userIds.map(id => `<@${id}>`).join(', ');
        };

        embed.setFields([
            { name: '✅ Disponibles', value: formatParticipants(participants.available), inline: true },
            { name: '❌ Indisponibles', value: formatParticipants(participants.unavailable), inline: true },
            { name: '❓ Peut-être', value: formatParticipants(participants.maybe), inline: true }
        ]);

        await interaction.update({
            embeds: [embed],
            components: interaction.message.components
        });
    },

    async handleRecommendations(interaction) {
        // On stocke la page dans l'interaction pour la pagination
        interaction.watchpartyPage = 1;
        const messageId = interaction.message.id;
        const watchpartyRow = await databaseManager.getWatchpartyByMessageId(messageId);
        if (!watchpartyRow) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Récupérer tous les participants disponibles et "peut-être"
            const participants = JSON.parse(watchpartyRow.participants);
            const availableUsers = [...participants.available, ...participants.maybe];
            if (availableUsers.length === 0) {
                return await interaction.editReply({
                    content: 'Aucun participant disponible pour générer des recommandations.',
                });
            }

            // Pagination
            const page = 1;
            const pageSize = 5;
            const { text, totalPages } = await this.getMovieRecommendations(availableUsers, page, pageSize);

            // Construire l'embed avec la description textuelle formatée et stocker l'id du message principal dans le footer
            const embed = new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('🎯 Recommandations pour la watchparty')
                .setDescription(text + `\nPage ${page}/${totalPages}`)
                .setFooter({ text: `watchparty:${interaction.message.id}` });

            // Boutons de pagination
            const paginationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('watchparty_prev_page')
                    .setLabel('Précédent')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('watchparty_next_page')
                    .setLabel('Suivant')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(totalPages <= 1)
            );

            return await interaction.editReply({
                embeds: [embed],
                components: [paginationRow],
                allowedMentions: { users: availableUsers }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des participants:', error);
            return await interaction.editReply({
                content: 'Erreur lors de la récupération des participants. Veuillez réessayer plus tard.',
            });
        }
    },

    // Handler pour la pagination des recommandations
    async handleRecommendationsPagination(interaction) {
        // Récupérer la page actuelle depuis le message
        let page = 1;
        const pageSize = 5;
        const embed = interaction.message.embeds[0];
        const pageMatch = embed?.description?.match(/Page (\d+)\/(\d+)/);
        let totalPages = 1;
        if (pageMatch) {
            page = parseInt(pageMatch[1]);
            totalPages = parseInt(pageMatch[2]);
        }
        // Déterminer le bouton cliqué
        if (interaction.customId === 'watchparty_next_page') {
            if (page < totalPages) page++;
        } else if (interaction.customId === 'watchparty_prev_page') {
            if (page > 1) page--;
        }
        // Récupérer l'id du message principal depuis le footer
        let messageId;
        if (embed.footer && embed.footer.text && embed.footer.text.startsWith('watchparty:')) {
            messageId = embed.footer.text.replace('watchparty:', '');
        } else {
            messageId = interaction.message.id;
        }
        const watchpartyRow = await databaseManager.getWatchpartyByMessageId(messageId);
        if (!watchpartyRow) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }
        const participants = JSON.parse(watchpartyRow.participants);
        const availableUsers = [...participants.available, ...participants.maybe];
        const result = await this.getMovieRecommendations(availableUsers, page, pageSize);
        const text = result.text;
        totalPages = result.totalPages;

        // Mettre à jour l'embed
        const newEmbed = EmbedBuilder.from(embed)
            .setDescription(text + `\nPage ${page}/${totalPages}`);

        // Mettre à jour les boutons
        const paginationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('watchparty_prev_page')
                .setLabel('Précédent')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId('watchparty_next_page')
                .setLabel('Suivant')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages)
        );

        await interaction.update({
            embeds: [newEmbed],
            components: [paginationRow],
            allowedMentions: { users: availableUsers }
        });
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

    async getMovieRecommendations(userIds, page = 1, pageSize = 10) {
        // Récupérer tous les films non vus
        const allUnwatched = await databaseManager.getUnwatchedMovies(0, 200);
        // Map movieId -> { movie, ratings: [ { userId, desire_rating } ] }
        const movieMap = new Map();
        for (const movie of allUnwatched) {
            movieMap.set(movie.id, { movie, ratings: [] });
        }
        // Pour chaque user, récupérer ses envies
        for (const userId of userIds) {
            const ratings = await databaseManager.getUserDesireRatings(userId);
            for (const r of ratings) {
                if (movieMap.has(r.movie.id)) {
                    movieMap.get(r.movie.id).ratings.push({ userId, desire_rating: r.desireRating });
                }
            }
        }

        // Calculer la somme des notes pour chaque film (0 si aucune note)
        function sumRatings(ratings) {
            if (!ratings.length) return 0;
            return ratings.reduce((a, b) => a + b.desire_rating, 0);
        }

        // Trier tous les films par somme décroissante
        const allMovies = Array.from(movieMap.values());
        allMovies.sort((a, b) => sumRatings(b.ratings) - sumRatings(a.ratings));

        // Pagination
        const totalPages = Math.max(1, Math.ceil(allMovies.length / pageSize));
        const startIdx = (page - 1) * pageSize;
        const selected = allMovies.slice(startIdx, startIdx + pageSize);

        // Pour chaque film sélectionné, préparer la légende (plus de critère, juste la note)
        const result = selected.map((entry, idx) => {
            const { movie, ratings } = entry;
            return {
                idx: startIdx + idx + 1,
                title: movie.title,
                ratings,
                year: movie.year,
                director: movie.director,
                genre: movie.genre || [],
            };
        });

        // Liste des participants
        const participantsMention = userIds.map(id => `<@${id}>`).join(', ');

        // Générer le texte final
        let text = `Voici les recommandations, classées par la somme des notes des participants :\n`;

        for (const entry of result) {
            const rank = entry.idx;
            let medal = '';
            if (rank === 1) medal = '🥇';
            else if (rank === 2) medal = '🥈';
            else if (rank === 3) medal = '🥉';
            else medal = `**${rank}.**`;

            // Calcul des étoiles, votes et somme
            let avgRating = 0, count = 0, stars = '', sum = 0;
            if (entry.ratings && entry.ratings.length) {
                sum = entry.ratings.reduce((a, b) => a + b.desire_rating, 0);
                avgRating = sum / entry.ratings.length;
                count = entry.ratings.length;
                stars = EmbedUtils.getDesireStars(avgRating);
            }
            let ratingStr = count > 0 ? `${stars} ${avgRating.toFixed(1)}/5 (${count} vote${count > 1 ? 's' : ''}, total : ${sum})` : 'Aucune note';

            text += `\n${medal} **${entry.title}**`;
            if (entry.year) text += ` (${entry.year})`;
            text += `\n${ratingStr}`;
            if (entry.genre && entry.genre.length > 0) {
                text += `\n*${entry.genre.slice(0, 3).join(', ')}*`;
            }
            text += '\n';
        }

        // Ajouter la liste des participants pris en compte à la fin
        text += `\n👥 Participants pris en compte : `;
        text += participantsMention || 'Aucun';

        return { text, result, totalPages };
    },

    async handleEndWatchparty(interaction) {
        const messageId = interaction.message.id;
        // Récupérer la watchparty depuis la base
        const watchpartyRow = await databaseManager.getWatchpartyByMessageId(messageId);
        if (!watchpartyRow) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (watchpartyRow.organizer !== interaction.user.id) {
            return await interaction.reply({
                content: 'Seul l\'organisateur peut finaliser la watchparty.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Afficher la confirmation
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('watchparty_confirm_end')
                .setLabel('Confirmer')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('watchparty_cancel')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({
            content: 'Êtes-vous sûr de vouloir finaliser la watchparty ? Vous pourrez la rouvrir plus tard si besoin',
            components: [confirmRow],
            flags: MessageFlags.Ephemeral
        });
    },

    /**
     * Handler pour rouvrir une watchparty
     */
    async handleReopenWatchparty(interaction) {
        const messageId = interaction.message.id;
        const watchpartyRow = await databaseManager.getWatchpartyByMessageId(messageId);
        if (!watchpartyRow) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (watchpartyRow.organizer !== interaction.user.id) {
            return await interaction.reply({
                content: 'Seul l\'organisateur peut rouvrir la watchparty.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (watchpartyRow.isOpen) {
            return await interaction.reply({
                content: 'La watchparty est déjà ouverte.',
                flags: MessageFlags.Ephemeral
            });
        }
        // Vérifier s'il existe déjà une autre watchparty ouverte dans ce salon
        const openWatchparty = await databaseManager.getOpenWatchpartyByChannel(interaction.channelId);
        if (openWatchparty && openWatchparty.messageId !== messageId) {
            return await interaction.reply({
                content: '❌ Il y a déjà une autre watchparty ouverte dans ce salon. Merci de la finaliser ou supprimer avant d\'en rouvrir une autre.',
                flags: MessageFlags.Ephemeral
            });
        }
        await databaseManager.reopenWatchparty(messageId, new Date().toISOString());
        // Réactiver les bons boutons sur le message principal
        const originalMsg = await interaction.channel.messages.fetch(messageId);
        const enabledComponents = [
            this.getWatchpartyPollRow(),
            this.getWatchpartyActionRow(true)
        ];
        await originalMsg.edit({
            embeds: originalMsg.embeds,
            components: enabledComponents
        });
        // Répondre à l'interaction de confirmation sans toucher au message principal
        await interaction.reply({
            content: 'La watchparty a été rouverte.',
            flags: MessageFlags.Ephemeral
        });
    },

        // --- Utils pour les boutons ---
    getWatchpartyPollRow() {
        return new ActionRowBuilder()
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
    },

    getWatchpartyActionRow(isOpen = true) {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('watchparty_recommendations')
                    .setLabel('Voir les recommandations')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId(isOpen ? 'watchparty_end' : 'watchparty_reopen')
                    .setLabel(isOpen ? 'Finaliser la watchparty' : 'Rouvrir la watchparty')
                    .setStyle(isOpen ? ButtonStyle.Primary : ButtonStyle.Success)
                    .setEmoji(isOpen ? '🏁' : '🔄'),
                new ButtonBuilder()
                    .setCustomId('watchparty_delete')
                    .setLabel('Supprimer la watchparty')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );
    },

    async handleDeleteWatchparty(interaction) {
        const messageId = interaction.message.id;
        // Récupérer la watchparty depuis la base
        const watchpartyRow = await databaseManager.getWatchpartyByMessageId(messageId);
        if (!watchpartyRow) {
            return await interaction.reply({
                content: 'Erreur : données de la watchparty introuvables.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (watchpartyRow.organizer !== interaction.user.id) {
            return await interaction.reply({
                content: 'Seul l\'organisateur peut supprimer la watchparty.',
                flags: MessageFlags.Ephemeral
            });
        }
        // Afficher la confirmation
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('watchparty_confirm_delete')
                .setLabel('Confirmer')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('watchparty_cancel')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({
            content: 'Êtes-vous sûr de vouloir supprimer la watchparty ? Cette action est irréversible.',
            components: [confirmRow],
            flags: MessageFlags.Ephemeral
        });
    },
    // Handler pour la confirmation de finalisation
    async handleConfirmEnd(interaction) {
        const messageId = interaction.message.reference?.messageId || interaction.message.id;
        const watchpartyRow = await databaseManager.getWatchpartyByMessageId(messageId);
        if (!watchpartyRow) {
            return await interaction.update({
                content: 'Erreur : données de la watchparty introuvables.',
                components: [],
            });
        }
        // Fermer la watchparty en base
        await databaseManager.closeWatchparty(messageId, new Date().toISOString());
        // Ne pas toucher à l'embed, seulement désactiver les bons boutons
        const originalMsg = await interaction.channel.messages.fetch(messageId);
        const disabledComponents = originalMsg.components.map(row => {
            const newRow = new ActionRowBuilder();
            row.components.forEach(component => {
                if (component.type === ComponentType.Button) {
                    let btn = ButtonBuilder.from(component).setDisabled(true);
                    // Remplacer le bouton Finaliser par Rouvrir si c'est l'organisateur
                    if (btn.data.custom_id === 'watchparty_end' && watchpartyRow.organizer === interaction.user.id) {
                        btn = btn.setCustomId('watchparty_reopen').setLabel('Rouvrir la watchparty').setStyle(ButtonStyle.Success).setEmoji('🔄').setDisabled(false);
                    }
                    newRow.addComponents(btn);
                }
            });
            return newRow;
        });
        await originalMsg.edit({
            embeds: originalMsg.embeds,
            components: disabledComponents
        });
        await interaction.update({
            content: 'La watchparty a été finalisée.',
            components: [],
        });
    },

    // Handler pour la confirmation de suppression
    async handleConfirmDelete(interaction) {
        const messageId = interaction.message.reference?.messageId || interaction.message.id;
        const watchpartyRow = await databaseManager.getWatchpartyByMessageId(messageId);
        if (!watchpartyRow) {
            return await interaction.update({
                content: 'Erreur : données de la watchparty introuvables.',
                components: [],
            });
        }
        // Supprimer la watchparty en base
        await databaseManager.deleteWatchparty(messageId);
        // Supprimer le message Discord
        try {
            const originalMsg = await interaction.channel.messages.fetch(messageId);
            await originalMsg.delete();
        } catch (e) {}
        await interaction.update({
            content: '🗑️ Watchparty supprimée avec succès.',
            components: [],
        });
    },

    // Handler pour annuler la confirmation
    async handleCancel(interaction) {
        await interaction.update({
            content: 'Action annulée.',
            components: [],
        });
    },
};
