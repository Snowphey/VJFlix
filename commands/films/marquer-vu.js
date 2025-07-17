const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const databaseManager = require('../../utils/databaseManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marquer-vu')
        .setDescription('Marque un film comme vu')
        .addStringOption(option =>
            option.setName('film')
                .setDescription('Sélectionnez un film à marquer comme vu')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        try {
            if (!focusedValue) {
                // Si pas de recherche, afficher les premiers films non vus
                const unwatchedMovies = await databaseManager.getUnwatchedMovies(0, 25);
                const choices = unwatchedMovies.map(movie => ({
                    name: `${movie.title} (${movie.year || 'N/A'})`,
                    value: movie.id.toString()
                }));
                
                await interaction.respond(choices);
                return;
            }
            
            // Rechercher parmi les films non vus
            const unwatchedMovies = await databaseManager.searchUnwatchedMovies(focusedValue);
            const choices = unwatchedMovies.slice(0, 25).map(movie => ({
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
        const movieId = parseInt(interaction.options.getString('film'));
        
        // Vérifier si le film existe dans la base de données
        const movie = await databaseManager.getMovieById(movieId);
        if (!movie) {
            await interaction.reply({ 
                content: `Aucun film trouvé avec cet ID dans la base de données !`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        // Marquer le film comme vu en utilisant son ID de base de données
        const watchedMovie = await databaseManager.markAsWatched(movieId, interaction.user);
        if (!watchedMovie) {
            await interaction.reply({ 
                content: `Erreur lors du marquage du film comme vu !`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        await interaction.reply({ 
            content: `✅ Film "${movie.title}" marqué comme vu !`
        });
        
        // Mettre à jour la liste dans le canal défini
        const settings = await databaseManager.getSettings();
        if (settings.listChannelId) {
            await updateListInChannel(interaction.client);
        }
    },

    // === HANDLERS DE BOUTONS ===
    
    async handleMarkWatched(interaction) {
        const movieId = parseInt(interaction.customId.split('_')[2]);
        
        // Marquer le film comme vu
        const result = await databaseManager.markAsWatched(movieId, interaction.user);
        
        if (!result) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de marquer le film comme vu.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Film marqué comme vu')
                .setDescription(`**${result.title}** a été marqué comme vu !`)
                .setTimestamp()],
            flags: MessageFlags.Ephemeral
        });

        // Mettre à jour la liste dans le canal défini
        await updateListInChannel(interaction.client);
    }
};
