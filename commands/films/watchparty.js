const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, ComponentType } = require('discord.js');
const dataManager = require('../../utils/dataManager');
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
        const openWatchparty = await dataManager.db.getOpenWatchpartyByChannel(interaction.channelId);
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
                    .setEmoji('🏁'),
                new ButtonBuilder()
                    .setCustomId('watchparty_delete')
                    .setLabel('Supprimer la watchparty')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );

        const response = await interaction.reply({
            embeds: [embed],
            components: [pollRow, actionRow],
            withResponse: true
        });

        const fetchedMessage = response.resource.message;

        // Stocker la watchparty en base
        await dataManager.db.createWatchparty({
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
        const watchpartyRow = await dataManager.db.getWatchpartyByMessageId(messageId);
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
        await dataManager.db.updateWatchpartyParticipants(messageId, participants, new Date().toISOString());

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
        const messageId = interaction.message.id;
        const watchpartyRow = await dataManager.db.getWatchpartyByMessageId(messageId);
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

            // Générer les recommandations
            const { text, result } = await this.getMovieRecommendations(availableUsers);

            // Construire l'embed
            const embed = new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('🎯 Recommandations pour la watchparty')
                .setDescription('Voici les 5 recommandations, classées par priorité de critère :')

            // Afficher tous les critères dans la légende, même ceux non utilisés
            const catText = [
                '🎯 Tous les participants',
                '⚡ Au moins un participant',
                '📋 Non vus aléatoires'
            ].join('\n');
            embed.addFields({ name: 'Légende', value: catText, inline: false });

            // Ajouter chaque film en champ
            for (const entry of result) {
                let value = `${entry.legend}`;
                if (entry.ratingStr) value += `\n${entry.ratingStr}`;
                if (entry.year) value += `\nAnnée : ${entry.year}`;
                if (entry.director) value += `\nRéalisateur : ${entry.director}`;
                embed.addFields({ name: `${entry.idx}. ${entry.title}`, value, inline: false });
            }

            // Ajouter la liste des participants en champ dédié
            const participantsList = availableUsers.map(id => `<@${id}>`).join(', ');
            embed.addFields({
                name: '👥 Participants pris en compte',
                value: participantsList || 'Aucun',
                inline: false
            });

            return await interaction.editReply({
                embeds: [embed],
                allowedMentions: { users: availableUsers }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des participants:', error);
            return await interaction.editReply({
                content: 'Erreur lors de la récupération des participants. Veuillez réessayer plus tard.',
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
        // Récupérer tous les films non vus
        const allUnwatched = await dataManager.db.getUnwatchedMovies(0, 200);
        // Récupérer toutes les envies pour ces films et ces users
        const movieIdSet = new Set(allUnwatched.map(m => m.id));
        // Map movieId -> { movie, ratings: [ { userId, desire_rating } ] }
        const movieMap = new Map();
        for (const movie of allUnwatched) {
            movieMap.set(movie.id, { movie, ratings: [] });
        }
        // Pour chaque user, récupérer ses envies
        for (const userId of userIds) {
            const ratings = await dataManager.db.getUserDesireRatings(userId);
            for (const r of ratings) {
                if (movieMap.has(r.movie.id)) {
                    movieMap.get(r.movie.id).ratings.push({ userId, desire_rating: r.desireRating });
                }
            }
        }

        // Catégoriser les films
        const allCount = userIds.length;
        const allParticipants = [];
        const someParticipants = [];
        const noDesire = [];
        for (const { movie, ratings } of movieMap.values()) {
            // Pour ce film, combien de participants ont une envie ?
            const userRated = new Set(ratings.map(r => r.userId));
            if (userRated.size === allCount && allCount > 0) {
                // Tous les participants ont une envie
                allParticipants.push({ movie, ratings });
            } else if (userRated.size > 0) {
                // Au moins un participant a une envie
                someParticipants.push({ movie, ratings });
            } else {
                // Personne n'a d'envie
                noDesire.push({ movie, ratings: [] });
            }
        }

        // Trier chaque catégorie par rating moyen décroissant
        function avg(ratings) {
            if (!ratings.length) return 0;
            return ratings.reduce((a, b) => a + b.desire_rating, 0) / ratings.length;
        }
        allParticipants.sort((a, b) => avg(b.ratings) - avg(a.ratings));
        // Trier d'abord par nombre de participants ayant noté, puis par moyenne des envies
        someParticipants.sort((a, b) => {
            const countDiff = b.ratings.length - a.ratings.length;
            if (countDiff !== 0) return countDiff;
            return avg(b.ratings) - avg(a.ratings);
        });
        // Les non-désirés : random
        noDesire.sort(() => Math.random() - 0.5);

        // Prendre les 5 premiers dans l'ordre des catégories
        const selected = [];
        for (const arr of [allParticipants, someParticipants, noDesire]) {
            for (const entry of arr) {
                if (selected.length < 5) selected.push(entry);
            }
        }

        // Pour chaque film sélectionné, préparer la légende
        const result = selected.map((entry, idx) => {
            const { movie, ratings } = entry;
            let legend = '';
            if (allParticipants.includes(entry)) {
                legend = `🎯 Tous les participants ont envie de voir ce film`;
            } else if (someParticipants.includes(entry)) {
                // Qui ?
                const users = ratings.map(r => `<@${r.userId}>`).join(', ');
                legend = `⚡ Au moins un participant a envie de voir ce film (${users})`;
            } else {
                legend = `📋 Film non vu (plus d'envie pour recommander)`;
            }
            // Rating moyen
            let ratingStr = '';
            if (ratings.length) {
                const mean = avg(ratings);
                const meanStr = mean.toFixed(1);
                const hearts = '💜'.repeat(Math.round(mean));
                ratingStr = `Envie moyenne : ${meanStr}/5 ${hearts}`;
            }
            return {
                idx: idx + 1,
                title: movie.title,
                legend,
                ratingStr,
                year: movie.year,
                director: movie.director
            };
        });

        // Liste des participants
        const participantsMention = userIds.map(id => `<@${id}>`).join(', ');

        // Générer le texte final
        let text = `🎯 Recommandations pour la watchparty\nVoici les 5 recommandations, classées par priorité de critère :\n`;
        if (allParticipants.length) text += `🎯 Tous les participants\n`;
        if (someParticipants.length) text += `⚡ Au moins un participant\n`;
        if (noDesire.length) text += `📋 Non vus aléatoires\n`;
        text += `\nVoir la légende pour chaque film ci-dessous.\n`;
        for (const entry of result) {
            text += `\n${entry.idx}. ${entry.title}\n${entry.legend}`;
            if (entry.ratingStr) text += `\n${entry.ratingStr}`;
            if (entry.year) text += `\nAnnée : ${entry.year}`;
            if (entry.director) text += `\nRéalisateur : ${entry.director}`;
        }

        return { text, result };
    },

    async handleEndWatchparty(interaction) {
        const messageId = interaction.message.id;
        // Récupérer la watchparty depuis la base
        const watchpartyRow = await dataManager.db.getWatchpartyByMessageId(messageId);
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
        // Fermer la watchparty en base
        await dataManager.db.closeWatchparty(messageId, new Date().toISOString());

        // Créer l'embed de fin
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.setColor('#00ff00')
            .setTitle(`✅ Watchparty finalisée`)
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
    },

    async handleDeleteWatchparty(interaction) {
        const messageId = interaction.message.id;
        // Récupérer la watchparty depuis la base
        const watchpartyRow = await dataManager.db.getWatchpartyByMessageId(messageId);
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
        // Message de confirmation avant suppression
        await interaction.reply({
            content: '🗑️ Watchparty supprimée avec succès.',
            flags: MessageFlags.Ephemeral
        });
        // Supprimer la watchparty en base
        await dataManager.db.deleteWatchparty(messageId);
        // Supprimer le message Discord
        await interaction.message.delete();
    },
};
