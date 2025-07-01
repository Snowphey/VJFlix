const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dataManager = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mes-notes')
        .setDescription('Voir vos notes de films')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Voir les notes d\'un autre utilisateur (optionnel)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const isOwnRatings = targetUser.id === interaction.user.id;
        
        const userRatings = await dataManager.getUserRatings(targetUser.id);
        
        if (userRatings.length === 0) {
            const message = isOwnRatings 
                ? 'Vous n\'avez encore noté aucun film.'
                : `${targetUser.displayName || targetUser.username} n'a encore noté aucun film.`;
                
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('📊 Notes de films')
                    .setDescription(message)
                    .setTimestamp()],
                ephemeral: isOwnRatings
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`⭐ Notes de ${isOwnRatings ? 'vos' : 'ses'} films`)
            .setDescription(`${userRatings.length} film${userRatings.length > 1 ? 's' : ''} noté${userRatings.length > 1 ? 's' : ''}`)
            .setTimestamp();

        if (targetUser.avatarURL()) {
            embed.setThumbnail(targetUser.avatarURL());
        }

        // Calculer des statistiques
        const ratings = userRatings.map(r => r.rating);
        const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        const favoriteRating = Math.max(...ratings);
        const favoriteMovies = userRatings.filter(r => r.rating === favoriteRating);

        embed.addFields({
            name: '📈 Statistiques',
            value: `Note moyenne donnée: ${averageRating.toFixed(1)}/5\nNote la plus haute: ${favoriteRating}/5\nFilms favoris: ${favoriteMovies.length}`,
            inline: true
        });

        // Limiter l'affichage à 15 films
        const displayedRatings = userRatings.slice(0, 15);
        
        for (const userRating of displayedRatings) {
            const movie = userRating.movie;
            const stars = '⭐'.repeat(userRating.rating) + '☆'.repeat(5 - userRating.rating);
            const ratedDate = new Date(userRating.ratedAt).toLocaleDateString('fr-FR');
            
            let movieInfo = `${userRating.rating}/5 ${stars}`;
            if (movie.year) {
                movieInfo += ` • ${movie.year}`;
            }
            movieInfo += `\nNoté le ${ratedDate}`;
            
            // Ajouter la note moyenne du film
            const averageMovieRating = await dataManager.getAverageRating(movie.id);
            if (averageMovieRating && averageMovieRating.count > 1) {
                movieInfo += ` • Moy. ${averageMovieRating.average}/5`;
            }

            embed.addFields({
                name: movie.title,
                value: movieInfo,
                inline: true
            });
        }

        if (userRatings.length > 15) {
            embed.setFooter({ text: `Affichage des 15 dernières notes sur ${userRatings.length}` });
        }

        await interaction.reply({
            embeds: [embed],
            ephemeral: isOwnRatings
        });
    }
};
