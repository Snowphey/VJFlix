const databaseManager = require('./databaseManager');

class DataManagerAdapter {
    constructor() {
        this.db = databaseManager;
    }

    async getWatchlist() {
        return await this.db.getWatchlist();
    }

    async getWatchedMovies() {
        return await this.db.getWatchedMovies();
    }

    // === MÉTHODES POUR LES FILMS VUS ===

    async markAsWatched(movieId, user = null) {
        return await this.db.markAsWatched(movieId, user);
    }

    async markAsUnwatched(movieId, user = null) {
        return await this.db.markAsUnwatched(movieId, user);
    }

    async getWatchedMovieById(movieId) {
        const watchedMovies = await this.getWatchedMovies();
        return watchedMovies.find(movie => movie.id === parseInt(movieId)) || null;
    }

    // === MÉTHODES UTILITAIRES ===

    async getRandomMovies(count) {
        const watchlist = await this.getWatchlist();
        if (watchlist.length < count) return null;
        const shuffled = [...watchlist].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    async getMoviesByIds(ids) {
        const watchlist = await this.getWatchlist();
        const movies = [];
        for (const id of ids) {
            const movie = watchlist.find(m => m.id === parseInt(id));
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

    async addMovie(movieData, user = null) {
        return await this.db.addMovie(movieData, user);
    }

    async removeMovie(id) {
        return await this.db.removeMovie(id);
    }

    async addMovieToWatchlist(movieDbId, user = null) {
        if (!movieDbId) {
            console.warn('⚠️ Tentative d\'ajout d\'un film sans ID de base de données. Utilisez addMovie()');
            return { success: false, reason: 'no_db_id' };
        }

        const result = await this.db.addToWatchlist(movieDbId, user);
        return result;
    }

    async removeMovieFromWatchlist(movieDbId, user = null) {
        if (!movieDbId) {
            console.warn('⚠️ Tentative de suppression d\'un film sans ID de base de données. Utilisez addMovie()');
            return { success: false, reason: 'no_db_id' };
        }

        const result = await this.db.removeFromWatchlist(movieDbId);
        return result;
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

    async getMoviesNotInWatchlist(offset = 0, limit = 20) {
        return await this.db.getMoviesNotInWatchlist(offset, limit);
    }

    async searchMoviesNotInWatchlist(query) {
        return await this.db.searchMoviesNotInWatchlist(query);
    }

    // === MÉTHODES POUR LES FILMS DE LA WATCHLIST ===
    
    async getUnwatchedWatchlistMovies(offset = 0, limit = 20) {
        return await this.db.getUnwatchedWatchlistMovies(offset, limit);
    }

    async searchUnwatchedWatchlistMovies(query) {
        return await this.db.searchUnwatchedWatchlistMovies(query);
    }

    async getWatchedWatchlistMovies(offset = 0, limit = 20) {
        return await this.db.getWatchedWatchlistMovies(offset, limit);
    }

    async searchWatchedWatchlistMovies(query) {
        return await this.db.searchWatchedWatchlistMovies(query);
    }

    // === SYSTÈME DE NOTATION ===

    async rateMovie(movieDbId, userId, rating) {
        return await this.db.rateMovie(movieDbId, userId, rating);
    }

    async removeUserRating(movieDbId, userId) {
        return await this.db.removeUserRating(movieDbId, userId);
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
}

module.exports = new DataManagerAdapter();
