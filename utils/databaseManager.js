const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'vjflix.db');
        this.dataPath = path.join(__dirname, '..', 'data');
        this.db = null;
        
        this.ensureDataDirectory();
        this.initDatabase();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Erreur lors de l\'ouverture de la base de données:', err);
                    reject(err);
                } else {
                    console.log('Base de données SQLite connectée.');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            // Table des films
            `CREATE TABLE IF NOT EXISTS movies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tmdb_id INTEGER,
                title TEXT NOT NULL,
                original_title TEXT,
                year INTEGER,
                director TEXT,
                actors TEXT, -- JSON array
                plot TEXT,
                poster TEXT,
                tmdb_rating REAL,
                runtime TEXT,
                genre TEXT, -- JSON array
                released TEXT,
                type TEXT DEFAULT 'movie',
                popularity REAL,
                vote_count INTEGER,
                budget INTEGER,
                revenue INTEGER,
                spoken_languages TEXT, -- JSON array
                production_countries TEXT, -- JSON array
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by_id TEXT,
                added_by_username TEXT,
                added_by_display_name TEXT
            )`,

            // Table des watchlists (films à voir et films vus)
            `CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                movie_id INTEGER NOT NULL,
                watched BOOLEAN DEFAULT FALSE,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                watched_at DATETIME,
                added_by_id TEXT,
                added_by_username TEXT,
                added_by_display_name TEXT,
                FOREIGN KEY (movie_id) REFERENCES movies (id),
                UNIQUE (movie_id) -- Un film ne peut être qu'une fois dans la watchlist
            )`,

            // Table des notations
            `CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                movie_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
                rated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (movie_id) REFERENCES movies (id),
                UNIQUE (movie_id, user_id)
            )`,

            // Table des paramètres
            `CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        // Créer des index pour les performances
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies (tmdb_id)',
            'CREATE INDEX IF NOT EXISTS idx_movies_title ON movies (title)',
            'CREATE INDEX IF NOT EXISTS idx_movies_title_year ON movies (title, year)',
            'CREATE INDEX IF NOT EXISTS idx_movies_tmdb_rating ON movies (tmdb_rating)',
            'CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies (popularity)',
            'CREATE INDEX IF NOT EXISTS idx_watchlist_movie_id ON watchlist (movie_id)',
            'CREATE INDEX IF NOT EXISTS idx_watchlist_watched ON watchlist (watched)',
            'CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings (movie_id)',
            'CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings (user_id)'
        ];

        for (const index of indexes) {
            await this.run(index);
        }

        console.log('Tables et index créés avec succès.');
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Erreur SQL:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Erreur SQL:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Erreur SQL:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Erreur lors de la fermeture de la base de données:', err);
                    } else {
                        console.log('Base de données fermée.');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // === MÉTHODES POUR LES FILMS ===

    async addMovie(movieData, user = null) {
        try {
            // Vérifier si le film existe déjà par TMDb ID ou titre+année
            let existingMovie = null;
            
            if (movieData.tmdbId) {
                existingMovie = await this.get('SELECT * FROM movies WHERE tmdb_id = ?', [movieData.tmdbId]);
            }
            
            if (!existingMovie) {
                existingMovie = await this.get(
                    'SELECT * FROM movies WHERE title = ? AND year = ?',
                    [movieData.title, movieData.year]
                );
            }

            if (existingMovie) {
                return { success: false, movie: this.formatMovie(existingMovie), reason: 'exists' };
            }

            const result = await this.run(`
                INSERT INTO movies (
                    tmdb_id, title, original_title, year, director, actors, plot, poster, 
                    tmdb_rating, runtime, genre, released, type, popularity, vote_count,
                    budget, revenue, spoken_languages, production_countries,
                    added_by_id, added_by_username, added_by_display_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                movieData.tmdbId || null,
                movieData.title,
                movieData.originalTitle || null,
                movieData.year || null,
                movieData.director || null,
                JSON.stringify(movieData.actors || []),
                movieData.plot || null,
                movieData.poster || null,
                movieData.tmdbRating || null,
                movieData.runtime || null,
                JSON.stringify(movieData.genre || []),
                movieData.released || null,
                movieData.type || 'movie',
                movieData.popularity || null,
                movieData.voteCount || null,
                movieData.budget || null,
                movieData.revenue || null,
                JSON.stringify(movieData.spokenLanguages || []),
                JSON.stringify(movieData.productionCountries || []),
                user?.id || null,
                user?.username || null,
                user?.displayName || user?.username || null
            ]);

            const movie = await this.get('SELECT * FROM movies WHERE id = ?', [result.id]);
            return { success: true, movie: this.formatMovie(movie) };
        } catch (error) {
            console.error('Erreur lors de l\'ajout du film:', error);
            return { success: false, error: error.message };
        }
    }

    async removeMovie(id) {
        try {
            // Récupérer les informations du film avant suppression
            const movie = await this.get('SELECT * FROM movies WHERE id = ?', [id]);
            if (!movie) {
                return { success: false, reason: 'not_found' };
            }

            // Supprimer toutes les références au film dans l'ordre approprié
            // 1. Supprimer les notations
            await this.run('DELETE FROM ratings WHERE movie_id = ?', [id]);
            
            // 2. Supprimer de la watchlist
            await this.run('DELETE FROM watchlist WHERE movie_id = ?', [id]);
            
            // 3. Supprimer le film lui-même
            await this.run('DELETE FROM movies WHERE id = ?', [id]);

            return { 
                success: true, 
                movie: this.formatMovie(movie),
                message: `Film "${movie.title}" supprimé définitivement de la base de données`
            };
        } catch (error) {
            console.error('Erreur lors de la suppression du film:', error);
            return { success: false, error: error.message };
        }
    }

    async getMovieById(id) {
        const movie = await this.get('SELECT * FROM movies WHERE id = ?', [id]);
        return movie ? this.formatMovie(movie) : null;
    }

    async getMovieByTmdbId(tmdbId) {
        const movie = await this.get('SELECT * FROM movies WHERE tmdb_id = ?', [tmdbId]);
        return movie ? this.formatMovie(movie) : null;
    }

    async searchMovies(query) {
        const movies = await this.all(`
            SELECT * FROM movies 
            WHERE title LIKE ? OR director LIKE ? OR actors LIKE ?
            ORDER BY title
        `, [`%${query}%`, `%${query}%`, `%${query}%`]);

        return movies.map(movie => this.formatMovie(movie));
    }

    async getAllMovies() {
        const movies = await this.all('SELECT * FROM movies ORDER BY id');
        return movies.map(movie => this.formatMovie(movie));
    }

    async getTotalMovieCount() {
        const result = await this.get('SELECT COUNT(*) as count FROM movies');
        return result.count;
    }

    async getMoviesPaginated(offset = 0, limit = 20) {
        const movies = await this.all('SELECT * FROM movies ORDER BY id LIMIT ? OFFSET ?', [limit, offset]);
        return movies.map(movie => this.formatMovie(movie));
    }

    async getMoviesNotInWatchlist(offset = 0, limit = 20) {
        const movies = await this.all(`
            SELECT * FROM movies 
            WHERE id NOT IN (SELECT movie_id FROM watchlist)
            ORDER BY id LIMIT ? OFFSET ?
        `, [limit, offset]);
        return movies.map(movie => this.formatMovie(movie));
    }

    async searchMoviesNotInWatchlist(query) {
        const movies = await this.all(`
            SELECT * FROM movies 
            WHERE (title LIKE ? OR director LIKE ? OR actors LIKE ?)
            AND id NOT IN (SELECT movie_id FROM watchlist)
            ORDER BY title
        `, [`%${query}%`, `%${query}%`, `%${query}%`]);

        return movies.map(movie => this.formatMovie(movie));
    }

    formatMovie(movie) {
        return {
            id: movie.id,
            tmdbId: movie.tmdb_id,
            title: movie.title,
            originalTitle: movie.original_title,
            year: movie.year,
            director: movie.director,
            actors: movie.actors ? JSON.parse(movie.actors) : [],
            plot: movie.plot,
            poster: movie.poster,
            tmdbRating: movie.tmdb_rating,
            runtime: movie.runtime,
            genre: movie.genre ? JSON.parse(movie.genre) : [],
            released: movie.released,
            type: movie.type,
            popularity: movie.popularity,
            voteCount: movie.vote_count,
            budget: movie.budget,
            revenue: movie.revenue,
            spokenLanguages: movie.spoken_languages ? JSON.parse(movie.spoken_languages) : [],
            productionCountries: movie.production_countries ? JSON.parse(movie.production_countries) : [],
            addedAt: movie.added_at,
            addedBy: movie.added_by_id ? {
                id: movie.added_by_id,
                username: movie.added_by_username,
                displayName: movie.added_by_display_name
            } : null
        };
    }

    // === MÉTHODES POUR LA WATCHLIST ===

    async addToWatchlist(movieId, user = null) {
        try {
            // Vérifier si le film existe
            const movie = await this.get('SELECT id FROM movies WHERE id = ?', [movieId]);
            if (!movie) {
                return { success: false, reason: 'movie_not_found' };
            }

            // Vérifier si déjà dans la watchlist
            const existing = await this.get('SELECT id FROM watchlist WHERE movie_id = ?', [movieId]);
            if (existing) {
                return { success: false, reason: 'already_in_watchlist' };
            }

            const result = await this.run(`
                INSERT INTO watchlist (movie_id, added_by_id, added_by_username, added_by_display_name)
                VALUES (?, ?, ?, ?)
            `, [
                movieId,
                user?.id || null,
                user?.username || null,
                user?.displayName || user?.username || null
            ]);

            const watchlistItem = await this.get(`
                SELECT w.*, m.title, m.year, m.poster 
                FROM watchlist w
                JOIN movies m ON w.movie_id = m.id
                WHERE w.id = ?
            `, [result.id]);

            return { success: true, movie: this.formatWatchlistItem(watchlistItem) };
        } catch (error) {
            console.error('Erreur lors de l\'ajout à la watchlist:', error);
            return { success: false, error: error.message };
        }
    }

    async getWatchlist(includeWatched = false) {
        const whereClause = includeWatched ? '' : 'WHERE w.watched = FALSE';
        const items = await this.all(`
            SELECT w.*, m.title, m.year, m.poster, m.director, m.genre, m.tmdb_rating
            FROM watchlist w
            JOIN movies m ON w.movie_id = m.id
            ${whereClause}
            ORDER BY w.added_at ASC
        `);

        return items.map(item => this.formatWatchlistItem(item));
    }

    async removeFromWatchlist(id) {
        try {
            const item = await this.get(`
                SELECT w.*, m.title, m.year, m.poster 
                FROM watchlist w
                JOIN movies m ON w.movie_id = m.id
                WHERE w.id = ?
            `, [id]);
            
            if (!item) return null;

            await this.run('DELETE FROM watchlist WHERE id = ?', [id]);
            return this.formatWatchlistItem(item);
        } catch (error) {
            console.error('Erreur lors de la suppression de la watchlist:', error);
            return null;
        }
    }

    formatWatchlistItem(item) {
        return {
            id: item.id,
            movieId: item.movie_id,
            title: item.title,
            year: item.year,
            poster: item.poster,
            director: item.director,
            genre: item.genre ? JSON.parse(item.genre) : [],
            tmdbRating: item.tmdb_rating,
            watched: Boolean(item.watched),
            addedAt: item.added_at,
            watchedAt: item.watched_at,
            addedBy: item.added_by_id ? {
                id: item.added_by_id,
                username: item.added_by_username,
                displayName: item.added_by_display_name
            } : null
        };
    }

    // === MÉTHODES POUR LES FILMS VUS ===

    async markAsWatched(movieId, user = null) {
        try {
            // Vérifier si le film existe
            const movie = await this.get('SELECT * FROM movies WHERE id = ?', [movieId]);
            if (!movie) return null;

            // Vérifier si le film est déjà dans la watchlist
            const existing = await this.get('SELECT * FROM watchlist WHERE movie_id = ?', [movieId]);
            
            if (existing) {
                // Mettre à jour l'entrée existante
                await this.run(`
                    UPDATE watchlist 
                    SET watched = TRUE, watched_at = CURRENT_TIMESTAMP
                    WHERE movie_id = ?
                `, [movieId]);
            } else {
                // Créer une nouvelle entrée directement marquée comme vue
                await this.run(`
                    INSERT INTO watchlist (
                        movie_id, watched, watched_at, added_by_id, added_by_username, added_by_display_name
                    ) VALUES (?, TRUE, CURRENT_TIMESTAMP, ?, ?, ?)
                `, [
                    movieId,
                    user ? user.id : null,
                    user ? user.username : null,
                    user ? user.displayName || user.username : null
                ]);
            }

            // Récupérer l'entrée mise à jour
            const watchlistItem = await this.get(`
                SELECT w.*, m.title, m.year, m.poster, m.director, m.genre, m.tmdb_rating
                FROM watchlist w
                JOIN movies m ON w.movie_id = m.id
                WHERE w.movie_id = ?
            `, [movieId]);

            return this.formatWatchlistItem(watchlistItem);
        } catch (error) {
            console.error('Erreur lors du marquage comme vu:', error);
            return null;
        }
    }

    async markAsUnwatched(movieId, user = null) {
        try {
            // Vérifier si le film existe
            const movie = await this.get('SELECT * FROM movies WHERE id = ?', [movieId]);
            if (!movie) return null;

            // Vérifier si le film est dans la watchlist
            const existing = await this.get('SELECT * FROM watchlist WHERE movie_id = ?', [movieId]);
            if (!existing) return null;

            // Mettre à jour pour marquer comme non vu
            await this.run(`
                UPDATE watchlist 
                SET watched = FALSE, watched_at = NULL
                WHERE movie_id = ?
            `, [movieId]);

            // Récupérer l'entrée mise à jour
            const watchlistItem = await this.get(`
                SELECT w.*, m.title, m.year, m.poster, m.director, m.genre, m.tmdb_rating
                FROM watchlist w
                JOIN movies m ON w.movie_id = m.id
                WHERE w.movie_id = ?
            `, [movieId]);

            return this.formatWatchlistItem(watchlistItem);
        } catch (error) {
            console.error('Erreur lors du marquage comme non-vu:', error);
            return null;
        }
    }

    async getWatchedMovies() {
        const items = await this.all(`
            SELECT w.*, m.title, m.year, m.poster, m.director, m.genre, m.tmdb_rating
            FROM watchlist w
            JOIN movies m ON w.movie_id = m.id
            WHERE w.watched = TRUE
            ORDER BY w.watched_at DESC
        `);

        return items.map(item => this.formatWatchlistItem(item));
    }

    async getUnwatchedWatchlistMovies(offset = 0, limit = 20) {
        const items = await this.all(`
            SELECT w.*, m.title, m.year, m.poster, m.director, m.genre, m.tmdb_rating
            FROM watchlist w
            JOIN movies m ON w.movie_id = m.id
            WHERE w.watched = FALSE
            ORDER BY w.added_at ASC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        return items.map(item => this.formatWatchlistItem(item));
    }

    async searchUnwatchedWatchlistMovies(query) {
        const items = await this.all(`
            SELECT w.*, m.title, m.year, m.poster, m.director, m.genre, m.tmdb_rating
            FROM watchlist w
            JOIN movies m ON w.movie_id = m.id
            WHERE w.watched = FALSE
            AND (m.title LIKE ? OR m.director LIKE ? OR m.actors LIKE ?)
            ORDER BY m.title
        `, [`%${query}%`, `%${query}%`, `%${query}%`]);

        return items.map(item => this.formatWatchlistItem(item));
    }

    async getWatchedWatchlistMovies(offset = 0, limit = 20) {
        const items = await this.all(`
            SELECT w.*, m.title, m.year, m.poster, m.director, m.genre, m.tmdb_rating
            FROM watchlist w
            JOIN movies m ON w.movie_id = m.id
            WHERE w.watched = TRUE
            ORDER BY w.watched_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        return items.map(item => this.formatWatchlistItem(item));
    }

    async searchWatchedWatchlistMovies(query) {
        const items = await this.all(`
            SELECT w.*, m.title, m.year, m.poster, m.director, m.genre, m.tmdb_rating
            FROM watchlist w
            JOIN movies m ON w.movie_id = m.id
            WHERE w.watched = TRUE
            AND (m.title LIKE ? OR m.director LIKE ? OR m.actors LIKE ?)
            ORDER BY m.title
        `, [`%${query}%`, `%${query}%`, `%${query}%`]);

        return items.map(item => this.formatWatchlistItem(item));
    }

    // === MÉTHODES POUR LES NOTATIONS ===

    async rateMovie(movieId, userId, rating) {
        try {
            if (rating < 0 || rating > 5) {
                return { success: false, reason: 'invalid_rating' };
            }

            const movie = await this.get('SELECT id FROM movies WHERE id = ?', [movieId]);
            if (!movie) {
                return { success: false, reason: 'movie_not_found' };
            }

            await this.run(`
                INSERT OR REPLACE INTO ratings (movie_id, user_id, rating)
                VALUES (?, ?, ?)
            `, [movieId, userId, rating]);

            return { success: true };
        } catch (error) {
            console.error('Erreur lors de la notation:', error);
            return { success: false, error: error.message };
        }
    }

    async removeUserRating(movieId, userId) {
        try {
            const movie = await this.get('SELECT id FROM movies WHERE id = ?', [movieId]);
            if (!movie) {
                return { success: false, reason: 'movie_not_found' };
            }

            const rating = await this.get(
                'SELECT * FROM ratings WHERE movie_id = ? AND user_id = ?',
                [movieId, userId]
            );

            if (!rating) {
                return { success: false, reason: 'rating_not_found' };
            }

            await this.run('DELETE FROM ratings WHERE movie_id = ? AND user_id = ?', [movieId, userId]);
            return { success: true };
        } catch (error) {
            console.error('Erreur lors de la suppression de la note:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserRating(movieId, userId) {
        const rating = await this.get(
            'SELECT * FROM ratings WHERE movie_id = ? AND user_id = ?',
            [movieId, userId]
        );
        return rating;
    }

    async getMovieRatings(movieId) {
        const ratings = await this.all('SELECT * FROM ratings WHERE movie_id = ?', [movieId]);
        return ratings;
    }

    async getAverageRating(movieId) {
        const result = await this.get(`
            SELECT AVG(rating) as average, COUNT(*) as count
            FROM ratings WHERE movie_id = ?
        `, [movieId]);

        if (!result || result.count === 0) return null;

        return {
            average: Math.round(result.average * 10) / 10,
            count: result.count
        };
    }

    async getTopRatedMovies(limit = 10) {
        const movies = await this.all(`
            SELECT m.*, AVG(r.rating) as avg_rating, COUNT(r.rating) as rating_count
            FROM movies m
            JOIN ratings r ON m.id = r.movie_id
            GROUP BY m.id
            HAVING rating_count >= 2
            ORDER BY avg_rating DESC, rating_count DESC
            LIMIT ?
        `, [limit]);

        return movies.map(movie => ({
            ...this.formatMovie(movie),
            rating: {
                average: Math.round(movie.avg_rating * 10) / 10,
                count: movie.rating_count
            }
        }));
    }

    async getUserRatings(userId) {
        const ratings = await this.all(`
            SELECT r.*, m.*
            FROM ratings r
            JOIN movies m ON r.movie_id = m.id
            WHERE r.user_id = ?
            ORDER BY r.rated_at DESC
        `, [userId]);

        return ratings.map(rating => ({
            movie: this.formatMovie(rating),
            rating: rating.rating,
            ratedAt: rating.rated_at
        }));
    }

    // === MÉTHODES POUR LES PARAMÈTRES ===

    async getSetting(key) {
        const setting = await this.get('SELECT value FROM settings WHERE key = ?', [key]);
        return setting ? setting.value : null;
    }

    async setSetting(key, value) {
        await this.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }

    async getSettings() {
        const settings = await this.all('SELECT * FROM settings');
        const result = {};
        settings.forEach(setting => {
            result[setting.key] = setting.value;
        });
        return result;
    }
}

module.exports = new DatabaseManager();
