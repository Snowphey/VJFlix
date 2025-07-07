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
                watched BOOLEAN DEFAULT FALSE,
                watched_at DATETIME,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by_id TEXT,
                added_by_username TEXT,
                added_by_display_name TEXT
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

            // Table des envies de regarder
            `CREATE TABLE IF NOT EXISTS watch_desires (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                movie_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                desire_rating INTEGER NOT NULL CHECK (desire_rating >= 0 AND desire_rating <= 5),
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
            'CREATE INDEX IF NOT EXISTS idx_movies_watched ON movies (watched)',
            'CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings (movie_id)',
            'CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings (user_id)',
            'CREATE INDEX IF NOT EXISTS idx_watch_desires_movie_id ON watch_desires (movie_id)',
            'CREATE INDEX IF NOT EXISTS idx_watch_desires_user_id ON watch_desires (user_id)'
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
                    budget, revenue, spoken_languages, production_countries, watched,
                    added_by_id, added_by_username, added_by_display_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                false, // watched = false par défaut
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

            // Supprimer toutes les références au film
            // 1. Supprimer les notations
            await this.run('DELETE FROM ratings WHERE movie_id = ?', [id]);
            
            // 2. Supprimer le film (qui contient maintenant les données de watchlist)
            await this.run('DELETE FROM movies WHERE id = ?', [id]);

            return { 
                success: true, 
                movie: this.formatMovie(movie),
                message: `Film "${movie.title}" retiré de la watchlist et supprimé de la base de données`
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
        const movies = await this.all('SELECT * FROM movies ORDER BY added_at DESC LIMIT ? OFFSET ?', [limit, offset]);
        return movies.map(movie => this.formatMovie(movie));
    }

    async getMoviesNotInWatchlist(offset = 0, limit = 20) {
        // Cette méthode n'est plus nécessaire car tous les films sont dans la watchlist
        // Renvoyons une liste vide pour la compatibilité
        return [];
    }

    async searchMoviesNotInWatchlist(query) {
        // Cette méthode n'est plus nécessaire car tous les films sont dans la watchlist
        // Renvoyons une liste vide pour la compatibilité
        return [];
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
            watched: Boolean(movie.watched),
            watchedAt: movie.watched_at,
            addedAt: movie.added_at,
            addedBy: movie.added_by_id ? {
                id: movie.added_by_id,
                username: movie.added_by_username,
                displayName: movie.added_by_display_name
            } : null
        };
    }

    async getUnwatchedMovies(offset = 0, limit = 20) {
        const movies = await this.all(`
            SELECT * FROM movies 
            WHERE watched = FALSE
            ORDER BY added_at ASC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        return movies.map(movie => this.formatMovie(movie));
    }

    async getWatchedMovies(offset = 0, limit = 20) {
        const movies = await this.all(`
            SELECT * FROM movies 
            WHERE watched = TRUE
            ORDER BY watched_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        return movies.map(movie => this.formatMovie(movie));
    }

    async searchUnwatchedMovies(query) {
        const movies = await this.all(`
            SELECT * FROM movies 
            WHERE watched = FALSE
            AND (title LIKE ? OR director LIKE ? OR actors LIKE ?)
            ORDER BY title
        `, [`%${query}%`, `%${query}%`, `%${query}%`]);

        return movies.map(movie => this.formatMovie(movie));
    }

    async searchWatchedMovies(query) {
        const movies = await this.all(`
            SELECT * FROM movies 
            WHERE watched = TRUE
            AND (title LIKE ? OR director LIKE ? OR actors LIKE ?)
            ORDER BY title
        `, [`%${query}%`, `%${query}%`, `%${query}%`]);

        return movies.map(movie => this.formatMovie(movie));
    }

    // === MÉTHODES POUR MARQUER LES FILMS COMME VUS/NON VUS ===

    async markAsWatched(movieId, user = null) {
        try {
            // Vérifier si le film existe
            const movie = await this.get('SELECT * FROM movies WHERE id = ?', [movieId]);
            if (!movie) return null;

            // Mettre à jour le statut du film
            await this.run(`
                UPDATE movies 
                SET watched = TRUE, watched_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [movieId]);

            // Récupérer le film mis à jour
            const updatedMovie = await this.get('SELECT * FROM movies WHERE id = ?', [movieId]);
            return this.formatMovie(updatedMovie);
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

            // Mettre à jour le statut du film
            await this.run(`
                UPDATE movies 
                SET watched = FALSE, watched_at = NULL
                WHERE id = ?
            `, [movieId]);

            // Récupérer le film mis à jour
            const updatedMovie = await this.get('SELECT * FROM movies WHERE id = ?', [movieId]);
            return this.formatMovie(updatedMovie);
        } catch (error) {
            console.error('Erreur lors du marquage comme non-vu:', error);
            return null;
        }
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

    // === MÉTHODES POUR LES NOTES D'ENVIE ===

    async rateMovieDesire(movieId, userId, desireRating) {
        try {
            if (desireRating < 0 || desireRating > 5) {
                return { success: false, reason: 'invalid_rating' };
            }

            const movie = await this.get('SELECT id FROM movies WHERE id = ?', [movieId]);
            if (!movie) {
                return { success: false, reason: 'movie_not_found' };
            }

            await this.run(`
                INSERT OR REPLACE INTO watch_desires (movie_id, user_id, desire_rating)
                VALUES (?, ?, ?)
            `, [movieId, userId, desireRating]);

            return { success: true };
        } catch (error) {
            console.error('Erreur lors de la notation de l\'envie:', error);
            return { success: false, error: error.message };
        }
    }

    async removeUserDesireRating(movieId, userId) {
        try {
            const movie = await this.get('SELECT id FROM movies WHERE id = ?', [movieId]);
            if (!movie) {
                return { success: false, reason: 'movie_not_found' };
            }

            const rating = await this.get(
                'SELECT * FROM watch_desires WHERE movie_id = ? AND user_id = ?',
                [movieId, userId]
            );

            if (!rating) {
                return { success: false, reason: 'rating_not_found' };
            }

            await this.run('DELETE FROM watch_desires WHERE movie_id = ? AND user_id = ?', [movieId, userId]);
            return { success: true };
        } catch (error) {
            console.error('Erreur lors de la suppression de la note d\'envie:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserDesireRating(movieId, userId) {
        const rating = await this.get(
            'SELECT * FROM watch_desires WHERE movie_id = ? AND user_id = ?',
            [movieId, userId]
        );
        return rating;
    }

    async getMovieDesireRatings(movieId) {
        const ratings = await this.all('SELECT * FROM watch_desires WHERE movie_id = ?', [movieId]);
        return ratings;
    }

    async getAverageDesireRating(movieId) {
        const result = await this.get(`
            SELECT AVG(desire_rating) as average, COUNT(*) as count
            FROM watch_desires WHERE movie_id = ?
        `, [movieId]);

        if (!result || result.count === 0) return null;

        return {
            average: Math.round(result.average * 10) / 10,
            count: result.count
        };
    }

    async getMostDesiredMovies(limit = 10) {
        const movies = await this.all(`
            SELECT m.*, AVG(wd.desire_rating) as avg_desire_rating, COUNT(wd.desire_rating) as desire_count
            FROM movies m
            JOIN watch_desires wd ON m.id = wd.movie_id
            WHERE m.watched = FALSE
            GROUP BY m.id
            HAVING desire_count >= 1
            ORDER BY avg_desire_rating DESC, desire_count DESC
            LIMIT ?
        `, [limit]);

        return movies.map(movie => ({
            ...this.formatMovie(movie),
            desireRating: {
                average: Math.round(movie.avg_desire_rating * 10) / 10,
                count: movie.desire_count
            }
        }));
    }

    async getUserDesireRatings(userId) {
        const ratings = await this.all(`
            SELECT wd.*, m.*
            FROM watch_desires wd
            JOIN movies m ON wd.movie_id = m.id
            WHERE wd.user_id = ?
            ORDER BY wd.rated_at DESC
        `, [userId]);

        return ratings.map(rating => ({
            movie: this.formatMovie(rating),
            desireRating: rating.desire_rating,
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
