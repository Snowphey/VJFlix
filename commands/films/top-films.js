const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top-films')
        .setDescription('Afficher les films les mieux notés de la base de données')
        .addIntegerOption(option =>
            option.setName('limite')
                .setDescription('Nombre de films à afficher (par défaut: 10)')
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)),

    async execute(interaction) {
        const limit = interaction.options.getInteger('limite') || 10;
        
        const topMovies = await dataManager.getTopRatedMovies(limit);
        
        if (topMovies.length === 0) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('📊 Classement des films')
                    .setDescription('Aucun film n\'a encore été suffisamment noté pour apparaître dans le classement.\n\n*Les films doivent avoir au moins 2 notes pour être classés.*')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('🏆 Top des films les mieux notés')
            .setDescription(`Les ${topMovies.length} meilleurs films de la base de données`)
            .setTimestamp();

        topMovies.forEach((movie, index) => {
            const position = index + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
            const stars = '⭐'.repeat(Math.floor(movie.rating.average)) + '☆'.repeat(5 - Math.floor(movie.rating.average));
            
            let movieInfo = `${movie.rating.average}/5 ${stars}\n`;
            movieInfo += `${movie.rating.count} vote${movie.rating.count > 1 ? 's' : ''}`;
            
            if (movie.year) {
                movieInfo += ` • ${movie.year}`;
            }
            
            if (movie.director) {
                movieInfo += `\nRéalisateur: ${movie.director}`;
            }

            embed.addFields({
                name: `${medal} ${movie.title}`,
                value: movieInfo,
                inline: false
            });
        });

        // Ajouter des statistiques générales
        const totalMovies = (await dataManager.getMovies()).length;
        const ratedMoviesCount = (await dataManager.db.all('SELECT DISTINCT movie_id FROM ratings')).length;
        
        embed.addFields({
            name: '📈 Statistiques',
            value: `Films en base: ${totalMovies}\nFilms notés: ${ratedMoviesCount}`,
            inline: true
        });

        if (topMovies.length > 0 && topMovies[0].poster && topMovies[0].poster !== 'N/A') {
            embed.setThumbnail(topMovies[0].poster);
        }

        await interaction.reply({
            embeds: [embed]
        });
    }
};
