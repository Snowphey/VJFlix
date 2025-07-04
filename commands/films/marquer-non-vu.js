const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marquer-non-vu')
        .setDescription('Marque un film comme non-vu (le remet dans la liste à regarder)')
        .addStringOption(option =>
            option.setName('film')
                .setDescription('Sélectionnez un film à marquer comme non-vu')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        try {
            if (!focusedValue) {
                // Si pas de recherche, afficher les premiers films vus de la watchlist
                const watchlistItems = await dataManager.getWatchedWatchlistMovies(0, 25);
                const choices = watchlistItems.map(watchlistItem => ({
                    name: `${watchlistItem.title} (${watchlistItem.year || 'N/A'})`,
                    value: watchlistItem.movieId.toString() // ID du film dans la table movies
                }));
                
                await interaction.respond(choices);
                return;
            }
            
            // Rechercher parmi les films vus de la watchlist
            const watchlistItems = await dataManager.searchWatchedWatchlistMovies(focusedValue);
            const choices = watchlistItems.slice(0, 25).map(watchlistItem => ({
                name: `${watchlistItem.title} (${watchlistItem.year || 'N/A'})`,
                value: watchlistItem.movieId.toString() // ID du film dans la table movies
            }));
            
            await interaction.respond(choices);
        } catch (error) {
            console.error('Erreur lors de l\'autocomplétion:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const movieId = parseInt(interaction.options.getString('film'));
        
        // Vérifier si le film existe dans la base de données
        const movie = await dataManager.getMovieFromDatabase(movieId);
        if (!movie) {
            await interaction.reply({ 
                content: `Aucun film trouvé avec cet ID dans la base de données !`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        // Marquer le film comme non-vu en utilisant son ID de base de données
        const unwatchedMovie = await dataManager.markAsUnwatched(movieId, interaction.user);
        if (!unwatchedMovie) {
            await interaction.reply({ 
                content: `Erreur lors du marquage du film comme non-vu ou le film n'était pas marqué comme vu !`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        await interaction.reply({ 
            content: `🔄 Film "${movie.title}" remis dans la liste à regarder !`
        });
        
        // Mettre à jour la liste dans le canal défini
        const settings = await dataManager.getSettings();
        if (settings.listChannelId) {
            await updateListInChannel(interaction.client);
        }
    },
};
