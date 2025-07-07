const databaseManager = require('./databaseManager');

class DataManagerAdapter {
    constructor() {
        this.db = databaseManager;
    }

    async getUnwatchedMovies() {
        return await this.db.getUnwatchedMovies();
    }

    async getWatchedMovies() {
        return await this.db.getWatchedMovies();
    }

    async getUnwatchedMovies(offset = 0, limit = 20) {
        return await this.db.getUnwatchedMovies(offset, limit);
    }

    async getWatchedMovies(offset = 0, limit = 20) {
        return await this.db.getWatchedMovies(offset, limit);
    }

    async searchUnwatchedMovies(query) {
        return await this.db.searchUnwatchedMovies(query);
    }

    async searchWatchedMovies(query) {
        return await this.db.searchWatchedMovies(query);
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
        const watchlist = await this.getUnwatchedMovies();
        if (watchlist.length < count) return null;
        const shuffled = [...watchlist].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    async getMoviesByIds(ids) {
        const watchlist = await this.getUnwatchedMovies();
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

    

    async searchMovies(query) {
        return await this.db.searchMovies(query);
    }

    async getMovieById(id) {
        return await this.db.getMovieById(id);
    }

    async getMovies() {
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

    // === SYSTÈME DE NOTATION D'ENVIE ===

    async rateMovieDesire(movieDbId, userId, desireRating) {
        return await this.db.rateMovieDesire(movieDbId, userId, desireRating);
    }

    async removeUserDesireRating(movieDbId, userId) {
        return await this.db.removeUserDesireRating(movieDbId, userId);
    }

    async getUserDesireRating(movieDbId, userId) {
        return await this.db.getUserDesireRating(movieDbId, userId);
    }

    async getMovieDesireRatings(movieDbId) {
        return await this.db.getMovieDesireRatings(movieDbId);
    }

    async getAverageDesireRating(movieDbId) {
        return await this.db.getAverageDesireRating(movieDbId);
    }

    async getMostDesiredMovies(limit = 10) {
        return await this.db.getMostDesiredMovies(limit);
    }

    async getUserDesireRatings(userId) {
        return await this.db.getUserDesireRatings(userId);
    }
}

module.exports = new DataManagerAdapter();
