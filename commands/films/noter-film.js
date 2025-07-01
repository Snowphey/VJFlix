const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noter-film')
        .setDescription('Noter un film de la base de données (0-5 étoiles)')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('L\'ID du film dans la base de données')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('note')
                .setDescription('Note de 0 à 5 étoiles')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(5)),

    async execute(interaction) {
        const movieDbId = interaction.options.getInteger('id');
        const rating = interaction.options.getInteger('note');
        const userId = interaction.user.id;

        // Vérifier si le film existe
        const movie = await dataManager.getMovieFromDatabase(movieDbId);
        if (!movie) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Film non trouvé')
                    .setDescription(`Aucun film trouvé avec l'ID ${movieDbId} dans la base de données.`)
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Noter le film
        const result = await dataManager.rateMovie(movieDbId, userId, rating);
        
        if (!result.success) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de noter le film.')
                    .setTimestamp()],
                flags: MessageFlags.Ephemeral
            });
        }

        // Obtenir les statistiques de notation
        const averageRating = await dataManager.getAverageRating(movieDbId);
        const userPreviousRating = await dataManager.getUserRating(movieDbId, userId);

        const starsDisplay = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Film noté !')
            .setDescription(`Vous avez donné **${rating}/5** étoiles à **${movie.title}**`)
            .addFields(
                { name: 'Votre note', value: starsDisplay, inline: true },
                { name: 'Film', value: movie.title, inline: true }
            );

        if (movie.year) {
            embed.addFields({ name: 'Année', value: movie.year.toString(), inline: true });
        }

        if (averageRating) {
            const avgStars = '⭐'.repeat(Math.floor(averageRating.average)) + 
                           (averageRating.average % 1 >= 0.5 ? '⭐' : '☆').repeat(1) +
                           '☆'.repeat(Math.max(0, 4 - Math.floor(averageRating.average)));
            
            embed.addFields(
                { name: 'Note moyenne', value: `${averageRating.average}/5 ${avgStars}`, inline: true },
                { name: 'Nombre de votes', value: averageRating.count.toString(), inline: true }
            );
        }

        if (movie.poster && movie.poster !== 'N/A') {
            embed.setThumbnail(movie.poster);
        }

        embed.setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};
