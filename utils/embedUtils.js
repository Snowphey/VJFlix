const { EmbedBuilder } = require('discord.js');

class EmbedUtils {
    static createWatchlistEmbed(watchlist, page = 1, totalPages = 1, totalFilms = null, pageSize = 50) {
        const embed = new EmbedBuilder()
            .setTitle(`🎬 Liste des Films à Regarder${totalPages > 1 ? ` — Page ${page}/${totalPages}` : ''}`)
            .setColor(0x00AE86)
            .setTimestamp();

        if (watchlist.length === 0) {
            embed.setDescription('Aucun film dans la liste pour le moment.\nUtilisez `/ajouter-film` pour en ajouter !');
        } else {
            // Calcul de l'index de départ pour la page courante
            const startIndex = (page - 1) * pageSize;
            const movieList = watchlist.map((movie, index) => {
                const addedByText = movie.addedBy ? ` (ajouté par <@${movie.addedBy.id}>)` : '';
                return `${startIndex + index + 1}. ${movie.title}${addedByText}`;
            }).join('\n');
            embed.setDescription(movieList);
            let footerText = `Page ${page}/${totalPages}`;
            if (totalFilms !== null) footerText += ` • Total: ${totalFilms} film(s)`;
            embed.setFooter({ text: footerText });
        }

        return embed;
    }

    static createWatchedListEmbed(watchedlist, page = 1, totalPages = 1, totalFilms = null, pageSize = 50) {
        const embed = new EmbedBuilder()
            .setTitle(`✅ Films Déjà Vus${totalPages > 1 ? ` — Page ${page}/${totalPages}` : ''}`)
            .setColor(0x57F287)
            .setTimestamp();

        if (watchedlist.length === 0) {
            embed.setDescription('Aucun film marqué comme vu pour le moment.');
        } else {
            // Calcul de l'index de départ pour la page courante
            const startIndex = (page - 1) * pageSize;
            const movieList = watchedlist.map((movie, index) => {
                const addedByText = movie.addedBy ? ` (ajouté par <@${movie.addedBy.id}>)` : '';
                return `${startIndex + index + 1}. ${movie.title}${addedByText}`;
            }).join('\n');
            embed.setDescription(movieList);
            let footerText = `Page ${page}/${totalPages}`;
            if (totalFilms !== null) footerText += ` • Total: ${totalFilms} film(s) vu(s)`;
            embed.setFooter({ text: footerText });
        }

        return embed;
    }

    static createPollEmbed(selectedMovies) {
        const embed = new EmbedBuilder()
            .setTitle('🎲 Films Sélectionnés pour le Sondage')
            .setDescription('Choisissez le film que vous voulez regarder !')
            .setColor(0xFEE75C)
            .addFields(
                selectedMovies.map((movie, index) => ({
                    name: `Option ${index + 1}`,
                    value: movie.title,
                    inline: true
                }))
            )
            .setTimestamp();

        return embed;
    }

    static createPollResultsEmbed(sortedResults) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Résultats du Sondage')
            .setColor(0x57F287)
            .setTimestamp();

        if (sortedResults.length === 0) {
            embed.setDescription('Aucun vote reçu !');
        } else {
            const resultsText = sortedResults.map((result, index) => {
                const [movie, votes] = result;
                const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍';
                return `${emoji} **${movie}** - ${votes} vote(s)`;
            }).join('\n');

            embed.setDescription(resultsText);
            embed.addFields({
                name: '🎬 Film Gagnant',
                value: sortedResults[0] ? `**${sortedResults[0][0]}**` : 'Aucun',
                inline: false
            });
        }

        return embed;
    }

    static createDetailedPollResultsEmbed(sortedResults, voteDetails, totalVotes, forcedEnd = false, endedBy = null) {
        const embed = new EmbedBuilder()
            .setTitle(`📊 Résultats ${forcedEnd ? 'Finaux' : 'du Sondage'}`)
            .setColor(forcedEnd ? 0xED4245 : 0x57F287)
            .setTimestamp();

        if (sortedResults.length === 0 || totalVotes === 0) {
            embed.setDescription('Aucun vote reçu !');
        } else {
            let resultsText = '';
            let currentRank = 1;
            let previousVotes = null;
            
            sortedResults.forEach((result, index) => {
                const [movie, votes] = result;
                const percentage = ((votes / totalVotes) * 100).toFixed(1);
                
                // Gérer les égalités - même rang si même nombre de votes
                if (previousVotes !== null && votes !== previousVotes) {
                    currentRank = index + 1;
                }
                
                // Emoji selon le rang (en tenant compte des égalités)
                let emoji;
                if (currentRank === 1) emoji = '🏆';
                else if (currentRank === 2) emoji = '🥈';
                else if (currentRank === 3) emoji = '🥉';
                else emoji = '📍';
                
                const voters = voteDetails.get(movie) || [];
                const voterMentions = voters.map(userId => `<@${userId}>`).join(', ');
                
                resultsText += `${emoji} **${movie}**\n`;
                resultsText += `📊 ${votes} vote(s) (${percentage}%)\n`;
                if (voters.length > 0) {
                    resultsText += `👥 ${voterMentions}\n`;
                }
                resultsText += '\n';
                
                previousVotes = votes;
            });

            embed.setDescription(resultsText);
            
            // Gérer les films gagnants (peut y en avoir plusieurs en cas d'égalité)
            const topVotes = sortedResults[0][1];
            const winners = sortedResults.filter(result => result[1] === topVotes);
            
            if (winners.length === 1) {
                embed.addFields({
                    name: '🎬 Film Gagnant',
                    value: `**${winners[0][0]}**`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: `🎬 Films Gagnants (Égalité - ${topVotes} vote${topVotes > 1 ? 's' : ''})`,
                    value: winners.map(winner => `**${winner[0]}**`).join('\n'),
                    inline: false
                });
            }
            
            embed.setFooter({ 
                text: `Total: ${totalVotes} vote(s)${forcedEnd && endedBy ? ` • Terminé par ${endedBy}` : ''}` 
            });
        }

        return embed;
    }

    static createCurrentPollResultsEmbed(voteCount, voteDetails, totalVotes, timeRemaining) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Résultats Actuels du Sondage')
            .setColor(0xFEE75C)
            .setTimestamp();

        if (totalVotes === 0) {
            embed.setDescription('Aucun vote pour le moment !');
        } else {
            const sortedResults = [...voteCount.entries()].sort((a, b) => b[1] - a[1]);
            let resultsText = '';
            let currentRank = 1;
            let previousVotes = null;
            
            sortedResults.forEach((result, index) => {
                const [movie, votes] = result;
                const percentage = ((votes / totalVotes) * 100).toFixed(1);
                
                // Gérer les égalités - même rang si même nombre de votes
                if (previousVotes !== null && votes !== previousVotes) {
                    currentRank = index + 1;
                }
                
                // Emoji selon le rang (en tenant compte des égalités)
                let emoji;
                if (currentRank === 1) emoji = '🏆';
                else if (currentRank === 2) emoji = '🥈';
                else if (currentRank === 3) emoji = '🥉';
                else emoji = '📍';
                
                const voters = voteDetails.get(movie) || [];
                const voterMentions = voters.map(userId => `<@${userId}>`).join(', ');
                
                resultsText += `${emoji} **${movie}**\n`;
                resultsText += `📊 ${votes} vote(s) (${percentage}%)\n`;
                if (voters.length > 0) {
                    resultsText += `👥 ${voterMentions}\n`;
                }
                resultsText += '\n';
                
                previousVotes = votes;
            });

            embed.setDescription(resultsText);
        }

        embed.setFooter({ 
            text: `${totalVotes} vote(s) • Temps restant: ${Math.ceil(timeRemaining)} min` 
        });

        return embed;
    }

    static createLivePollResultsEmbed(moviesList, voteCount, voteDetails, totalVotes, timeRemainingMs) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Résultats en Temps Réel')
            .setColor(0x5865F2)
            .setTimestamp();

        if (moviesList.length === 0) {
            embed.setDescription('🗳️ Aucune option disponible');
        } else {
            let resultsText = '';
            
            // Créer un tableau avec toutes les options dans l'ordre original
            const allResults = moviesList.map((movie, index) => {
                const movieTitle = movie.title || movie; // Gérer les cas où c'est un objet ou une string
                const votes = voteCount.get(movieTitle) || 0;
                return { title: movieTitle, votes, index };
            });
            
            // Trier par nombre de votes pour déterminer les rangs
            const sortedForRanking = [...allResults].sort((a, b) => b.votes - a.votes);
            
            // Créer un map des rangs
            const rankMap = new Map();
            let currentRank = 1;
            let previousVotes = null;
            
            sortedForRanking.forEach((result, index) => {
                if (previousVotes !== null && result.votes !== previousVotes) {
                    currentRank = index + 1;
                }
                rankMap.set(result.title, currentRank);
                previousVotes = result.votes;
            });
            
            // Afficher dans l'ordre original
            allResults.forEach((result, index) => {
                const { title, votes } = result;
                const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0';
                const rank = rankMap.get(title);
                
                // Emoji selon le rang (en tenant compte des égalités)
                let emoji;
                if (votes === 0) emoji = '⚪';
                else if (rank === 1) emoji = '🏆';
                else if (rank === 2) emoji = '🥈';
                else if (rank === 3) emoji = '🥉';
                else emoji = '📍';
                
                const voters = voteDetails.get(title) || [];
                const voterMentions = voters.map(userId => `<@${userId}>`).join(', ');
                
                resultsText += `${emoji} **${index + 1}. ${title}**\n`;
                resultsText += `📊 ${votes} vote(s) (${percentage}%)\n`;
                if (voters.length > 0) {
                    resultsText += `👥 ${voterMentions}\n`;
                }
                resultsText += '\n';
            });

            embed.setDescription(resultsText);
        }

        // Formatage du temps restant en minutes et secondes
        let timeText;
        if (timeRemainingMs > 0) {
            const totalSeconds = Math.ceil(timeRemainingMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            if (minutes > 0) {
                timeText = `⏰ Temps restant : ${minutes}min ${seconds}s`;
            } else {
                timeText = `⏰ Temps restant : ${seconds}s`;
            }
        } else {
            timeText = '⏰ Terminé';
        }

        embed.setFooter({ 
            text: `${totalVotes} vote(s) • ${timeText}` 
        });

        return embed;
    }


        /**
     * Retourne une chaîne d'emojis représentant la note d'envie (💜, 🟣, ⚪, 🤍)
     * @param {number} rating Note sur 5 (peut être décimale)
     * @returns {string} Chaîne d'emojis
     */
    static getDesireStars(rating) {
        if (!rating || rating <= 0) return '🤍🤍🤍🤍🤍';
        let fullStars = Math.floor(rating);
        const decimal = rating - fullStars;
        let halfStar = 0;
        let whiteCircle = 0;
        if (decimal >= 0.5) {
            halfStar = 1;
        } else if (decimal > 0) {
            whiteCircle = 1;
        }
        const emptyStars = 5 - fullStars - halfStar - whiteCircle;
        return '💜'.repeat(fullStars) + (halfStar ? '🟣' : '') + (whiteCircle ? '⚪' : '') + '🤍'.repeat(emptyStars);
    }

}

module.exports = EmbedUtils;
