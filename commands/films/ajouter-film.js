const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const tmdbService = require('../../utils/tmdbService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajouter-film')
        .setDescription('Ajouter un film à la base de données avec recherche TMDB automatique')
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre du film (en anglais)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('annee')
                .setDescription('L\'année de sortie (optionnel, aide à affiner la recherche)')
                .setRequired(false)),

    async execute(interaction) {
        const title = interaction.options.getString('titre');
        const year = interaction.options.getInteger('annee');

        await interaction.deferReply();

        try {
            // Recherche TMDb - récupérer TOUS les films correspondants
            let allMovies = await tmdbService.searchMultipleMovies(title, 20, year);
            
            // Si une année est spécifiée mais qu'aucun résultat n'est trouvé, essayer sans l'année
            if (year && (!allMovies || allMovies.length === 0)) {
                allMovies = await tmdbService.searchMultipleMovies(title, 20);
                // Filtrer les résultats pour l'année spécifiée après coup
                if (allMovies && allMovies.length > 0) {
                    allMovies = allMovies.filter(movie => movie.year === year);
                }
            }
            
            if (allMovies && allMovies.length > 0) {
                // Trier par popularité décroissante
                allMovies.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                
                const searchResults = {
                    suggestions: allMovies,
                    usedAlternative: null
                };
                return await this.handleSuggestions(interaction, searchResults, title);
            }

            // Si aucun résultat avec le titre original, essayer des variations
            const alternatives = tmdbService.generateAlternativeSearchTerms(title);
            
            for (const alternative of alternatives.slice(1)) { // Skip le premier qui est le titre original
                let altMovies = await tmdbService.searchMultipleMovies(alternative, 15, year);
                
                // Si une année est spécifiée mais qu'aucun résultat n'est trouvé, essayer sans l'année
                if (year && (!altMovies || altMovies.length === 0)) {
                    altMovies = await tmdbService.searchMultipleMovies(alternative, 15);
                    // Filtrer les résultats pour l'année spécifiée après coup
                    if (altMovies && altMovies.length > 0) {
                        altMovies = altMovies.filter(movie => movie.year === year);
                    }
                }
                
                if (altMovies && altMovies.length > 0) {
                    // Trier par popularité décroissante
                    altMovies.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                    
                    const searchResults = {
                        suggestions: altMovies,
                        usedAlternative: alternative
                    };
                    return await this.handleSuggestions(interaction, searchResults, title);
                }
            }

            // Aucun résultat trouvé
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Film non trouvé')
                .setDescription(`Aucun film trouvé pour "${title}"${year ? ` (${year})` : ''}.`)
                .addFields({
                    name: '� Suggestions pour améliorer la recherche',
                    value: '• Vérifiez l\'orthographe du titre\n• Utilisez le titre original en anglais si possible\n• Essayez sans l\'année ou avec une année différente\n• Utilisez des mots-clés principaux du titre'
                })
                .addFields({
                    name: '� Exemples',
                    value: '• Pour "Le Parrain" → `The Godfather`\n• Pour "Amélie Poulain" → `Amelie`\n• Pour "Intouchables" → `The Intouchables`'
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de l\'ajout du film:', error);
            
            if (error.message.includes('Clé API TMDb non configurée')) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('⚠️ Configuration requise')
                        .setDescription('La clé API TMDb n\'est pas configurée. Contactez un administrateur.')
                        .setTimestamp()]
                });
            }

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur s\'est produite lors de la recherche du film.')
                    .setTimestamp()]
            });
        }
    },

    async handleSuggestions(interaction, searchResults, originalTitle) {
        const year = interaction.options.getInteger('annee'); // Récupérer l'année depuis les options
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎬 Films trouvés')
            .setDescription(`${searchResults.suggestions.length} film(s) trouvé(s) pour "${originalTitle}"${year ? ` (${year})` : ''}. Sélectionnez celui que vous souhaitez ajouter :`);

        if (searchResults.usedAlternative) {
            embed.addFields({
                name: '🔄 Recherche adaptée',
                value: `Terme utilisé: "${searchResults.usedAlternative}"`,
                inline: false
            });
        }

        const buttons = [];
        searchResults.suggestions.forEach((movie, index) => {
            const movieYear = movie.year || 'N/A';
            
            // Formater la date de sortie en format français DD/MM/YYYY
            let releaseDate = 'Date inconnue';
            if (movie.releaseDate) {
                try {
                    const date = new Date(movie.releaseDate);
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    releaseDate = `${day}/${month}/${year}`;
                } catch (e) {
                    releaseDate = movie.releaseDate; // Fallback vers la date brute si erreur
                }
            }
            
            const rating = movie.tmdbRating ? ` ⭐ ${movie.tmdbRating.toFixed(1)}` : '';
            
            embed.addFields({
                name: `${index + 1}. ${movie.title} (${movieYear}) ${rating}`,
                value: `${movie.originalTitle && movie.originalTitle !== movie.title ? `Titre original : ${movie.originalTitle}\n` : ''}Sortie : ${releaseDate}`,
                inline: false
            });

            // Créer un bouton seulement pour les 20 premiers films (limite Discord)
            if (index < 20) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`select_tmdb_movie_${movie.tmdbId}`)
                        .setLabel(`${index + 1}`)
                        .setStyle(ButtonStyle.Secondary)
                );
            }
        });

        // Ajouter un bouton pour annuler
        buttons.push(
            new ButtonBuilder()
                .setCustomId('cancel_movie_search')
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Danger)
        );

        // Diviser les boutons en lignes de 5 maximum
        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        // Si trop de films trouvés, ajouter une note
        if (searchResults.suggestions.length > 20) {
            embed.addFields({
                name: '⚠️ Trop de résultats',
                value: `Seuls les 20 premiers films sont affichés avec des boutons. Affinez votre recherche si le film souhaité n'apparaît pas dans cette liste.`,
                inline: false
            });
        }

        embed.setTimestamp();

        await interaction.editReply({
            embeds: [embed],
            components: rows
        });
    },

    // === HANDLERS DE BOUTONS ===
    
    async handleTMDbMovieSelection(interaction) {
        await interaction.deferUpdate();

        // Extraire l'ID depuis le customId (peut être tmdb ou ancien format)
        let tmdbId;
        if (interaction.customId.startsWith('select_tmdb_movie_')) {
            tmdbId = interaction.customId.split('_')[3];
        } else if (interaction.customId.startsWith('select_movie_')) {
            tmdbId = interaction.customId.split('_')[2];
        }

        // Récupérer les détails complets du film
        const movieData = await tmdbService.getMovieDetails(tmdbId);

        if (!movieData) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de récupérer les détails du film sélectionné.')
                    .setTimestamp()],
                components: []
            });
        }

        // Afficher les détails du film avec confirmation
        await this.showMovieConfirmation(interaction, movieData);
    },

    async showMovieConfirmation(interaction, movieData) {
        // Créer l'embed de confirmation avec tous les détails
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎬 Confirmer l\'ajout du film')
            .setDescription(`**${movieData.title}**`)
            .addFields(
                { name: 'Année', value: movieData.year?.toString() || 'N/A', inline: true }
            );

        // Ajouter l'ID TMDb
        if (movieData.tmdbId) {
            embed.addFields({ name: 'TMDb ID', value: movieData.tmdbId.toString(), inline: true });
        }

        if (movieData.director) {
            embed.addFields({ name: 'Réalisateur', value: movieData.director, inline: true });
        }

        if (movieData.genre && movieData.genre.length > 0) {
            embed.addFields({ name: 'Genres', value: movieData.genre.join(', '), inline: true });
        }

        // Support pour les notes TMDb
        if (movieData.tmdbRating) {
            embed.addFields({ name: 'Note TMDb', value: `${movieData.tmdbRating.toFixed(1)}/10`, inline: true });
        }

        if (movieData.plot) {
            embed.addFields({ name: 'Synopsis', value: movieData.plot.length > 1024 ? movieData.plot.substring(0, 1021) + '...' : movieData.plot });
        }

        if (movieData.poster && movieData.poster !== 'N/A') {
            embed.setThumbnail(movieData.poster);
        }

        embed.setFooter({ text: 'Voulez-vous ajouter ce film à la base de données ?' })
            .setTimestamp();

        // Boutons de confirmation
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_add_movie_${movieData.tmdbId}`)
                    .setLabel('✅ Confirmer l\'ajout')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel_movie_add')
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },

    async handleConfirmAddMovie(interaction) {
        await interaction.deferUpdate();

        // Extraire l'ID TMDb depuis le customId
        const tmdbId = interaction.customId.split('_')[3];

        // Récupérer les détails complets du film
        const movieData = await tmdbService.getMovieDetails(tmdbId);

        if (!movieData) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de récupérer les détails du film.')
                    .setTimestamp()],
                components: []
            });
        }

        // Ajouter le film à la base de données
        const result = await dataManager.addMovie(movieData, interaction.user);
        
        if (!result.success) {
            if (result.reason === 'exists') {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ffaa00')
                        .setTitle('⚠️ Film déjà présent')
                        .setDescription(`Le film **${result.movie.title}** ${result.movie.year ? `(${result.movie.year})` : ''} est déjà dans la base de données.`)
                        .addFields(
                            { name: 'ID en base', value: result.movie.id.toString(), inline: true },
                            { name: 'Ajouté le', value: new Date(result.movie.addedAt).toLocaleDateString('fr-FR'), inline: true }
                        )
                        .setTimestamp()],
                    components: []
                });
            }

            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur est survenue lors de l\'ajout du film.')
                    .setTimestamp()],
                components: []
            });
        }

        // Créer l'embed de confirmation d'ajout réussi
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Film ajouté à la base de données')
            .setDescription(`**${result.movie.title}** a été ajouté avec succès !`)
            .addFields(
                { name: 'ID en base', value: result.movie.id.toString(), inline: true },
                { name: 'Année', value: result.movie.year?.toString() || 'N/A', inline: true }
            );

        // Ajouter l'ID TMDb
        if (result.movie.tmdbId) {
            embed.addFields({ name: 'TMDb ID', value: result.movie.tmdbId.toString(), inline: true });
        }

        if (result.movie.director) {
            embed.addFields({ name: 'Réalisateur', value: result.movie.director, inline: true });
        }

        if (result.movie.genre && result.movie.genre.length > 0) {
            embed.addFields({ name: 'Genres', value: result.movie.genre.join(', '), inline: true });
        }

        // Support pour les notes TMDb
        if (result.movie.tmdbRating) {
            embed.addFields({ name: 'Note TMDb', value: `${result.movie.tmdbRating.toFixed(1)}/10`, inline: true });
        }

        if (result.movie.plot) {
            embed.addFields({ name: 'Synopsis', value: result.movie.plot.length > 1024 ? result.movie.plot.substring(0, 1021) + '...' : result.movie.plot });
        }

        if (result.movie.poster && result.movie.poster !== 'N/A') {
            embed.setThumbnail(result.movie.poster);
        }

        embed.setTimestamp();

        // Boutons d'action
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`mark_watched_${result.movie.id}`)
                    .setLabel('Marquer comme vu')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`rate_quick_${result.movie.id}`)
                    .setLabel('Noter le film')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⭐')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        // Mettre à jour la liste dans le canal défini
        const { updateListInChannel } = require('../../utils/listUpdater');
        await updateListInChannel(interaction.client);
    },

    async handleCancelMovieAdd(interaction) {
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#888888')
                .setTitle('❌ Ajout annulé')
                .setDescription('L\'ajout du film a été annulé.')
                .setTimestamp()],
            components: []
        });
    },

    async handleCancelMovieSearch(interaction) {
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor('#888888')
                .setTitle('❌ Recherche annulée')
                .setDescription('La recherche de film a été annulée.')
                .setTimestamp()],
            components: []
        });
    }
};
