const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('retirer-watchlist')
        .setDescription('Retire un film de la watchlist')
        .addStringOption(option =>
            option.setName('film')
                .setDescription('Sélectionnez un film à retirer de la watchlist')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        try {
            // Récupérer seulement les films de la watchlist
            const watchlist = await dataManager.getWatchlist();
            
            if (!focusedValue) {
                // Si pas de recherche, afficher les premiers films de la watchlist
                const choices = watchlist.slice(0, 25).map(movie => ({
                    name: `${movie.title} (${movie.year || 'N/A'})`,
                    value: movie.id.toString()
                }));
                
                await interaction.respond(choices);
                return;
            }
            
            // Rechercher parmi les films de la watchlist
            const filteredMovies = watchlist.filter(movie => 
                movie.title.toLowerCase().includes(focusedValue.toLowerCase())
            );
            
            const choices = filteredMovies.slice(0, 25).map(movie => ({
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
        const watchlistId = parseInt(interaction.options.getString('film'));
        
        const result = await dataManager.removeMovieFromWatchlist(watchlistId);
        if (!result.success) {
            let message = 'Erreur lors de la suppression du film de la watchlist.';
            if (result.reason === 'not_found') {
                message = `Aucun film trouvé avec cet ID dans la watchlist !`;
            }
            
            await interaction.reply({ 
                content: message, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        await interaction.reply({ 
            content: `❌ Film "${result.movie.title}" retiré de la watchlist !`
        });
        
        // Mettre à jour la liste dans le canal défini
        const settings = await dataManager.getSettings();
        if (settings.listChannelId) {
            await updateListInChannel(interaction.client);
        }
    },
};
