const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const EmbedUtils = require('../../utils/embedUtils');

// Stockage temporaire des sondages actifs
const activePolls = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pick-films')
        .setDescription('Choisit des films aléatoires pour un sondage')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de films à choisir (min 2, max 10)')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(10)
        )
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée du sondage en minutes (min 1, max 60, défaut: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(60)
        )
        .addStringOption(option =>
            option.setName('ids')
                .setDescription('Liste d\'IDs de films séparés par des virgules (ex: 1,3,5)')
                .setRequired(false)
        ),
    async execute(interaction) {
        const count = interaction.options.getInteger('nombre');
        const duration = interaction.options.getInteger('duree') || 10;
        const idsString = interaction.options.getString('ids');
        const watchlist = await dataManager.getWatchlist();
        
        // Vérifier que les options 'nombre' et 'ids' ne sont pas utilisées ensemble
        if (count && idsString) {
            await interaction.reply({ 
                content: '❌ Vous ne pouvez pas utiliser les options `nombre` et `ids` en même temps. Utilisez soit `nombre` pour une sélection aléatoire, soit `ids` pour des films spécifiques.', 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        // Variables pour les films sélectionnés
        let selectedMovies = [];
        
        // Si des IDs sont spécifiés, les utiliser
        if (idsString) {
            // Parser les IDs
            const idArray = idsString.split(',').map(id => id.trim()).filter(id => id !== '');
            const parsedIds = [];
            
            // Valider que tous les IDs sont des nombres
            for (const id of idArray) {
                const parsedId = parseInt(id);
                if (isNaN(parsedId)) {
                    await interaction.reply({ 
                        content: `❌ "${id}" n'est pas un ID valide. Utilisez des nombres séparés par des virgules (ex: 1,3,5).`, 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }
                parsedIds.push(parsedId);
            }
            
            // Vérifier la taille
            if (parsedIds.length < 2) {
                await interaction.reply({ 
                    content: '❌ Vous devez spécifier au moins 2 IDs de films.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }
            
            if (parsedIds.length > 10) {
                await interaction.reply({ 
                    content: '❌ Vous ne pouvez pas spécifier plus de 10 IDs de films.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }
            
            // Récupérer les films par leurs IDs
            selectedMovies = await dataManager.getMoviesByIds(parsedIds);
            
            // Vérifier que tous les IDs correspondent à des films existants
            if (selectedMovies.length !== parsedIds.length) {
                const foundIds = selectedMovies.map(movie => movie.sequentialId);
                const missingIds = parsedIds.filter(id => !foundIds.includes(id));
                await interaction.reply({ 
                    content: `❌ Les IDs suivants ne correspondent à aucun film : ${missingIds.join(', ')}`, 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }
        } else {
            // Sélection aléatoire classique
            const finalCount = count || 5; // Utiliser 5 par défaut si aucun nombre n'est spécifié
            
            if (watchlist.length === 0) {
                await interaction.reply({ 
                    content: 'Aucun film dans la liste pour faire un sondage !', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            if (watchlist.length < finalCount) {
                await interaction.reply({ 
                    content: `Il n'y a que ${watchlist.length} film(s) dans la liste, impossible d'en choisir ${finalCount}.`, 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            selectedMovies = await dataManager.getRandomMovies(finalCount);
        }
        
        // Vérifier s'il y a déjà un sondage actif dans ce canal
        const activePollInChannel = Array.from(activePolls.values()).find(poll => poll.channelId === interaction.channelId);
        if (activePollInChannel) {
            // Vérifier si le sondage n'a pas expiré
            const timeRemaining = activePollInChannel.startTime + activePollInChannel.duration * 60 * 1000 - Date.now();
            if (timeRemaining > 0) {
                await interaction.reply({ 
                    content: '⚠️ Un sondage est déjà en cours dans ce canal ! Attendez qu\'il se termine ou utilisez le bouton "🛑 Terminer le sondage" pour l\'arrêter.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            } else {
                // Nettoyer le sondage expiré
                activePolls.delete(activePollInChannel.messageId);
                if (activePollInChannel.refreshInterval) {
                    clearInterval(activePollInChannel.refreshInterval);
                }
            }
        }
        const embed = EmbedUtils.createPollEmbed(selectedMovies);

        // Créer les boutons pour le sondage
        const row = new ActionRowBuilder();
        const buttons = selectedMovies.slice(0, 5).map((movie, index) => 
            new ButtonBuilder()
                .setCustomId(`vote_${index}`)
                .setLabel(`${index + 1}`)
                .setStyle(ButtonStyle.Primary)
        );
        row.addComponents(buttons);

        const components = [row];
        
        // Si plus de 5 films, créer une deuxième rangée
        if (selectedMovies.length > 5) {
            const row2 = new ActionRowBuilder();
            const buttons2 = selectedMovies.slice(5, 10).map((movie, index) => 
                new ButtonBuilder()
                    .setCustomId(`vote_${index + 5}`)
                    .setLabel(`${index + 6}`)
                    .setStyle(ButtonStyle.Primary)
            );
            row2.addComponents(buttons2);
            components.push(row2);
        }

        // Ajouter les boutons de contrôle du sondage
        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('poll_end')
                    .setLabel('🛑 Terminer le sondage')
                    .setStyle(ButtonStyle.Danger)
            );
        components.push(controlRow);

        const response = await interaction.reply({ 
            embeds: [embed, EmbedUtils.createLivePollResultsEmbed(selectedMovies, new Map(), new Map(), 0, duration * 60 * 1000)], 
            components: components,
            content: `📊 **Sondage actif pendant ${duration} minute(s) !**`
        });
        
        const message = await interaction.fetchReply();

        // Stocker le sondage actif
        const pollData = {
            movies: selectedMovies,
            votes: new Map(), // userId -> Set de films votés
            startTime: Date.now(),
            duration: duration,
            messageId: message.id,
            channelId: interaction.channelId,
            creatorId: interaction.user.id,
            refreshInterval: null
        };
        
        activePolls.set(message.id, pollData);

        // Programmer le rafraîchissement toutes les 30 secondes pour un timer plus réactif
        pollData.refreshInterval = setInterval(async () => {
            try {
                const timeRemainingMs = Math.max(0, pollData.startTime + pollData.duration * 60 * 1000 - Date.now());
                if (timeRemainingMs > 0) {
                    await updatePollDisplay(interaction.client, pollData);
                }
            } catch (error) {
                console.error('Erreur lors du rafraîchissement du sondage:', error);
            }
        }, 30 * 1000); // Toutes les 30 secondes

        // Programmer la fin du sondage
        setTimeout(async () => {
            await endPoll(interaction.client, message.id);
        }, duration * 60 * 1000);
    },
};

async function endPoll(client, messageId, forcedEnd = false, endedBy = null) {
    const pollData = activePolls.get(messageId);
    if (!pollData) return;

    // Arrêter le rafraîchissement automatique
    if (pollData.refreshInterval) {
        clearInterval(pollData.refreshInterval);
    }

    const voteCount = new Map();
    const voteDetails = new Map(); // Pour stocker qui a voté quoi
    
    // Compter les votes et collecter les détails
    for (const [userId, userVotes] of pollData.votes.entries()) {
        for (const movieTitle of userVotes) {
            const count = voteCount.get(movieTitle) || 0;
            voteCount.set(movieTitle, count + 1);
            
            if (!voteDetails.has(movieTitle)) {
                voteDetails.set(movieTitle, []);
            }
            voteDetails.get(movieTitle).push(userId);
        }
    }

    const totalVotes = Array.from(pollData.votes.values()).reduce((sum, userVotes) => sum + userVotes.size, 0);
    
    // Trier par nombre de votes
    const sortedResults = [...voteCount.entries()].sort((a, b) => b[1] - a[1]);
    const embed = EmbedUtils.createDetailedPollResultsEmbed(
        sortedResults, 
        voteDetails, 
        totalVotes, 
        forcedEnd, 
        endedBy
    );

    try {
        const channel = await client.channels.fetch(pollData.channelId);
        
        // Envoyer les résultats finaux
        await channel.send({ embeds: [embed] });
        
        // Supprimer le message du sondage
        try {
            const originalMessage = await channel.messages.fetch(messageId);
            await originalMessage.delete();
        } catch (error) {
            console.error('Erreur lors de la suppression du message du sondage:', error);
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'envoi des résultats:', error);
    }

    activePolls.delete(messageId);
}

// Fonction pour gérer les votes (sera appelée depuis l'event handler)
function handleVote(interaction) {
    const messageId = interaction.message.id;
    const pollData = activePolls.get(messageId);
    
    if (!pollData) {
        return interaction.reply({ content: 'Aucun sondage actif !', flags: MessageFlags.Ephemeral });
    }

    const voteIndex = parseInt(interaction.customId.split('_')[1]);
    const userId = interaction.user.id;
    const selectedMovie = pollData.movies[voteIndex];

    // Initialiser les votes de l'utilisateur s'ils n'existent pas
    if (!pollData.votes.has(userId)) {
        pollData.votes.set(userId, new Set());
    }

    const userVotes = pollData.votes.get(userId);
    
    // Toggle : si l'utilisateur a déjà voté pour ce film, on retire le vote, sinon on l'ajoute
    if (userVotes.has(selectedMovie.title)) {
        // Retirer le vote
        userVotes.delete(selectedMovie.title);
        
        // Mettre à jour l'affichage des résultats en temps réel
        updateLivePollResults(interaction, pollData);
        
        return interaction.reply({ 
            content: `Votre vote pour "${selectedMovie.title}" a été retiré ! ❌ (Total: ${userVotes.size} vote(s))`, 
            flags: MessageFlags.Ephemeral 
        });
    } else {
        // Ajouter le vote
        userVotes.add(selectedMovie.title);

        // Mettre à jour l'affichage des résultats en temps réel
        updateLivePollResults(interaction, pollData);

        return interaction.reply({ 
            content: `Votre vote pour "${selectedMovie.title}" a été ajouté ! 🗳️ (Total: ${userVotes.size} vote(s))`, 
            flags: MessageFlags.Ephemeral 
        });
    }
}

// Fonction pour mettre à jour les résultats en temps réel
async function updateLivePollResults(interaction, pollData) {
    try {
        const voteCount = new Map();
        const voteDetails = new Map();
        
        // Compter les votes et collecter les détails
        for (const [userId, userVotes] of pollData.votes.entries()) {
            for (const movieTitle of userVotes) {
                const count = voteCount.get(movieTitle) || 0;
                voteCount.set(movieTitle, count + 1);
                
                if (!voteDetails.has(movieTitle)) {
                    voteDetails.set(movieTitle, []);
                }
                voteDetails.get(movieTitle).push(userId);
            }
        }

        const totalVotes = Array.from(pollData.votes.values()).reduce((sum, userVotes) => sum + userVotes.size, 0);
        const timeRemainingMs = Math.max(0, pollData.startTime + pollData.duration * 60 * 1000 - Date.now());
        
        // Créer les embeds mis à jour
        const pollEmbed = EmbedUtils.createPollEmbed(pollData.movies);
        const resultsEmbed = EmbedUtils.createLivePollResultsEmbed(
            pollData.movies,
            voteCount, 
            voteDetails, 
            totalVotes, 
            timeRemainingMs
        );

        // Mettre à jour le message
        await interaction.message.edit({
            embeds: [pollEmbed, resultsEmbed],
            components: interaction.message.components
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des résultats:', error);
    }
}

// Fonction pour afficher les résultats actuels
function handlePollResults(interaction) {
    // Cette fonction n'est plus nécessaire car les résultats sont affichés en permanence
    return interaction.reply({ 
        content: 'Les résultats sont affichés en temps réel sous le sondage !', 
        flags: MessageFlags.Ephemeral 
    });
}

// Fonction pour terminer prématurément un sondage
function handlePollEnd(interaction) {
    const messageId = interaction.message.id;
    const pollData = activePolls.get(messageId);
    
    if (!pollData) {
        return interaction.reply({ content: 'Aucun sondage actif !', flags: MessageFlags.Ephemeral });
    }

    const userId = interaction.user.id;
    const member = interaction.member;
    
    // Vérifier les permissions (créateur du sondage ou administrateur)
    if (userId !== pollData.creatorId && !member.permissions.has('Administrator')) {
        return interaction.reply({ 
            content: 'Seul le créateur du sondage ou un administrateur peut le terminer prématurément !', 
            flags: MessageFlags.Ephemeral 
        });
    }

    // Terminer le sondage
    endPoll(interaction.client, messageId, true, interaction.user.tag);
    
    return interaction.reply({ 
        content: 'Le sondage a été terminé prématurément !', 
        flags: MessageFlags.Ephemeral 
    });
}

// Fonction pour retirer son vote
function handleRemoveVote(interaction) {
    const messageId = interaction.message.id;
    const pollData = activePolls.get(messageId);
    
    if (!pollData) {
        return interaction.reply({ content: 'Aucun sondage actif !', flags: MessageFlags.Ephemeral });
    }

    const userId = interaction.user.id;
    
    // Vérifier si l'utilisateur a voté
    if (!pollData.votes.has(userId)) {
        return interaction.reply({ 
            content: 'Vous n\'avez pas encore voté dans ce sondage !', 
            flags: MessageFlags.Ephemeral 
        });
    }

    // Retirer le vote
    pollData.votes.delete(userId);

    // Mettre à jour l'affichage des résultats en temps réel
    updateLivePollResults(interaction, pollData);

    return interaction.reply({ 
        content: 'Votre vote a été retiré ! 🗑️', 
        flags: MessageFlags.Ephemeral 
    });
}

// Fonction pour mettre à jour l'affichage du sondage (utilisée pour le rafraîchissement automatique)
async function updatePollDisplay(client, pollData) {
    try {
        const channel = await client.channels.fetch(pollData.channelId);
        const message = await channel.messages.fetch(pollData.messageId);
        
        const voteCount = new Map();
        const voteDetails = new Map();
        
        // Compter les votes et collecter les détails
        for (const [userId, userVotes] of pollData.votes.entries()) {
            for (const movieTitle of userVotes) {
                const count = voteCount.get(movieTitle) || 0;
                voteCount.set(movieTitle, count + 1);
                
                if (!voteDetails.has(movieTitle)) {
                    voteDetails.set(movieTitle, []);
                }
                voteDetails.get(movieTitle).push(userId);
            }
        }

        const totalVotes = Array.from(pollData.votes.values()).reduce((sum, userVotes) => sum + userVotes.size, 0);
        const timeRemainingMs = Math.max(0, pollData.startTime + pollData.duration * 60 * 1000 - Date.now());
        
        // Créer les embeds mis à jour
        const pollEmbed = EmbedUtils.createPollEmbed(pollData.movies);
        const resultsEmbed = EmbedUtils.createLivePollResultsEmbed(
            pollData.movies,
            voteCount, 
            voteDetails, 
            totalVotes, 
            timeRemainingMs
        );

        // Mettre à jour le message
        await message.edit({
            embeds: [pollEmbed, resultsEmbed],
            components: message.components,
            content: `📊 **Sondage actif pendant ${pollData.duration} minute(s) !**`
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'affichage du sondage:', error);
    }
}

module.exports.handleVote = handleVote;
module.exports.handlePollResults = handlePollResults;
module.exports.handlePollEnd = handlePollEnd;
module.exports.handleRemoveVote = handleRemoveVote;
