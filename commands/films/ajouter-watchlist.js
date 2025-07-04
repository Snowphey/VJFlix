const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajouter-watchlist')
        .setDescription('Ajouter un film de la base de données à la watchlist')
        .addStringOption(option =>
            option.setName('film')
                .setDescription('Sélectionnez un film à ajouter à la watchlist')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        try {
            if (!focusedValue) {
                // Récupérer les films récents de la base de données qui ne sont pas dans la watchlist
                const movies = await dataManager.getMoviesNotInWatchlist(0, 25);
                const choices = movies.map(movie => ({
                    name: `${movie.title} (${movie.year || 'N/A'})`,
                    value: movie.id.toString()
                }));
                
                await interaction.respond(choices);
                return;
            }
            
            // Rechercher les films correspondants dans la base de données qui ne sont pas dans la watchlist
            const movies = await dataManager.searchMoviesNotInWatchlist(focusedValue);
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
        const movieId = parseInt(interaction.options.getString('film'));
        
        // Vérifier si le film existe
        const movie = await dataManager.getMovieFromDatabase(movieId);
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription(`Film introuvable dans la base de données.`)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Ajouter à la watchlist
        const result = await dataManager.addMovieToWatchlist(movieId, interaction.user);
        
        if (!result.success) {
            let message = 'Erreur lors de l\'ajout à la watchlist.';
            if (result.reason === 'already_in_watchlist') {
                message = `Le film "${movie.title}" est déjà dans la watchlist.`;
            } else if (result.reason === 'movie_not_found') {
                message = 'Film non trouvé dans la base de données.';
            }
            
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription(message)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Ajouté à la watchlist')
            .setDescription(`**${movie.title}** a été ajouté à la watchlist !`)
            .addFields(
                { name: 'ID watchlist', value: result.movie.id.toString(), inline: true }
            );

        if (movie.year) {
            embed.addFields({ name: 'Année', value: movie.year.toString(), inline: true });
        }

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        embed.setTimestamp();

        await interaction.reply({ embeds: [embed] });
        
        // Mettre à jour la liste dans le canal défini
        const settings = await dataManager.getSettings();
        if (settings.listChannelId) {
            await updateListInChannel(interaction.client);
        }
    }
};
