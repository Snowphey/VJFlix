const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const dataManager = require('../../utils/dataManager');
const { updateListInChannel } = require('../../utils/listUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajouter-watchlist')
        .setDescription('Ajouter un film de la base de données à la watchlist')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('L\'ID du film dans la base de données')
                .setRequired(true)),

    async execute(interaction) {
        const movieId = interaction.options.getInteger('id');
        
        // Vérifier si le film existe
        const movie = await dataManager.getMovieFromDatabase(movieId);
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription(`Aucun film trouvé avec l'ID ${movieId} dans la base de données.`)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Ajouter à la watchlist
        const result = await dataManager.addMovieToWatchlistFromDb(movieId, interaction.user);
        
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
                { name: 'ID watchlist', value: result.movie.id.toString(), inline: true },
                { name: 'Film ID', value: movieId.toString(), inline: true }
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
