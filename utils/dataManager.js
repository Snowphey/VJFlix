const databaseManager = require('./databaseManager');

class DataManagerAdapter {
    constructor() {
        this.db = databaseManager;
    }

    // === MÉTHODES POUR LA WATCHLIST (anciennes) ===

    async addMovie(title, user = null, movieDbId = null) {
        // Dans le nouveau système, on ne peut ajouter que des films qui existent en base
        if (!movieDbId) {
            console.warn('⚠️ Tentative d\'ajout d\'un film sans ID de base de données. Utilisez addMovieToWatchlistFromDb()');
            return false;
        }
        
        const result = await this.db.addToWatchlist(movieDbId, user);
        if (!result.success) return false;
        return result.movie;
    }

    async removeMovie(id) {
        return await this.db.removeFromWatchlist(id);
    }

    async removeMovieFromWatchlist(id) {
        const result = await this.db.removeFromWatchlist(id);
        return result;
    }

    async removeMovieByTitle(title) {
        const watchlist = await this.getWatchlist();
        const movie = watchlist.find(m => m.title.toLowerCase() === title.toLowerCase());
        if (movie) {
            return await this.removeMovie(movie.id);
        }
        return null;
    }

    async getMovieById(sequentialId) {
        const watchlist = await this.getWatchlist();
        return watchlist.find(movie => movie.sequentialId === parseInt(sequentialId)) || null;
    }

    async getMovieByTitle(title) {
        const watchlist = await this.getWatchlist();
        return watchlist.find(movie => movie.title.toLowerCase() === title.toLowerCase()) || null;
    }

    async getWatchlist() {
        return await this.db.getWatchlist();
    }

    async getWatchedlist() {
        return await this.db.getWatchedMovies();
    }

    // === MÉTHODES POUR LES FILMS VUS ===

    async markAsWatched(sequentialId) {
        // Récupérer la watchlist pour trouver le vrai ID par l'ID séquentiel
        const watchlist = await this.getWatchlist();
        const movie = watchlist.find(m => m.sequentialId === parseInt(sequentialId));
        
        if (!movie) {
            return null;
        }
        
        return await this.db.markAsWatched(movie.id);
    }

    async markAsWatchedByTitle(title) {
        const movie = await this.getMovieByTitle(title);
        if (!movie) return null;
        return await this.markAsWatched(movie.id);
    }

    async markAsUnwatched(id) {
        // Cette fonctionnalité nécessiterait une logique spéciale pour remettre dans la watchlist
        // Pour l'instant, on la maintient pour compatibilité mais on la désactive
        console.warn('markAsUnwatched non implémenté avec SQLite pour le moment');
        return null;
    }

    async getWatchedMovieById(id) {
        const watchedMovies = await this.getWatchedlist();
        return watchedMovies.find(movie => movie.id === parseInt(id)) || null;
    }

    // === MÉTHODES UTILITAIRES ===

    async getRandomMovies(count) {
        const watchlist = await this.getWatchlist();
        if (watchlist.length < count) return null;
        const shuffled = [...watchlist].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    async getMoviesByIds(sequentialIds) {
        const watchlist = await this.getWatchlist();
        const movies = [];
        for (const sequentialId of sequentialIds) {
            const movie = watchlist.find(m => m.sequentialId === parseInt(sequentialId));
            if (movie) {
                movies.push(movie);
            }
        }
        return movies;
    }

    // === MÉTHODES POUR LES PARAMÈTRES ===

    async getSettings() {
        return await this.db.getSettings();
    }

    async setListChannelId(channelId) {
        await this.db.setSetting('listChannelId', channelId);
    }

    async setListMessageId(messageId) {
        await this.db.setSetting('listMessageId', messageId);
    }

    async getListChannelId() {
        return await this.db.getSetting('listChannelId');
    }

    async getListMessageId() {
        return await this.db.getSetting('listMessageId');
    }

    // === NOUVELLES MÉTHODES POUR LA BASE DE DONNÉES ÉLARGIE ===

    async addMovieToDatabase(movieData, user = null) {
        return await this.db.addMovie(movieData, user);
    }

    async removeMovieFromDatabase(id) {
        return await this.db.removeMovieFromDatabase(id);
    }

    async addMovieToWatchlistFromDb(movieDbId, user = null) {
        if (!movieDbId) {
            console.warn('⚠️ Tentative d\'ajout d\'un film sans ID de base de données. Utilisez addMovieToWatchlistFromDb()');
            return { success: false, reason: 'no_db_id' };
        }

        const result = await this.db.addToWatchlist(movieDbId, user);
        return result;
    }

    async removeMovieFromWatchlist(sequentialId) {
        // Récupérer la watchlist pour trouver le vrai ID par l'ID séquentiel
        const watchlist = await this.getWatchlist();
        const movie = watchlist.find(m => m.sequentialId === parseInt(sequentialId));
        
        if (!movie) {
            return { success: false, reason: 'not_found' };
        }
        
        const result = await this.db.removeFromWatchlist(movie.id);
        if (result) {
            return { success: true, movie: result };
        } else {
            return { success: false, reason: 'database_error' };
        }
    }

    async removeMovieFromWatchlistByDbId(id) {
        return await this.db.removeFromWatchlist(id);
    }

    async searchMoviesInDatabase(query) {
        return await this.db.searchMovies(query);
    }

    async getMovieFromDatabase(id) {
        return await this.db.getMovieById(id);
    }

    async getMoviesDatabase() {
        return await this.db.getAllMovies();
    }

    async getTotalMovieCount() {
        return await this.db.getTotalMovieCount();
    }

    async getMoviesPaginated(offset = 0, limit = 20) {
        return await this.db.getMoviesPaginated(offset, limit);
    }

    // === SYSTÈME DE NOTATION ===

    async rateMovie(movieDbId, userId, rating) {
        return await this.db.rateMovie(movieDbId, userId, rating);
    }

    async getUserRating(movieDbId, userId) {
        return await this.db.getUserRating(movieDbId, userId);
    }

    async getMovieRatings(movieDbId) {
        return await this.db.getMovieRatings(movieDbId);
    }

    async getAverageRating(movieDbId) {
        return await this.db.getAverageRating(movieDbId);
    }

    async getTopRatedMovies(limit = 10) {
        return await this.db.getTopRatedMovies(limit);
    }

    async getUserRatings(userId) {
        return await this.db.getUserRatings(userId);
    }

    async getWatchlistMovieWithDetails(id) {
        const watchlistMovie = await this.getMovieById(id);
        if (!watchlistMovie) return null;

        if (watchlistMovie.movieId) {
            const dbMovie = await this.getMovieFromDatabase(watchlistMovie.movieId);
            return {
                ...watchlistMovie,
                details: dbMovie,
                averageRating: await this.getAverageRating(watchlistMovie.movieId)
            };
        }

        return watchlistMovie;
    }

    // Compatibilité avec l'ancien système d'ID
    reorganizeIds() {
        // SQLite gère les IDs automatiquement, cette méthode est maintenue pour compatibilité
        return Promise.resolve();
    }

    // Propriété data pour compatibilité (ATTENTION: sera asynchrone maintenant)
    get data() {
        console.warn('⚠️ Accès à data synchrone obsolète. Utilisez les méthodes async à la place.');
        return {
            watchlist: [],
            watchedlist: [],
            settings: {},
            moviesDatabase: [],
            ratings: {},
            nextId: 1,
            nextMovieDbId: 1
        };
    }
}

module.exports = new DataManagerAdapter();
