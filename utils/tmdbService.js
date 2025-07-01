// Service pour The Movie Database (TMDb)
// Remplace le service OMDB avec une meilleure recherche et tolérance aux fautes

class TMDbService {
    constructor() {
        try {
            const config = require('../config.json');
            this.apiKey = config.tmdbApiKey || process.env.TMDB_API_KEY || '';
        } catch {
            this.apiKey = process.env.TMDB_API_KEY || '';
        }
        this.baseUrl = 'https://api.themoviedb.org/3';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    async searchMovie(title, year = null) {
        if (!this.apiKey) {
            throw new Error('Clé API TMDb non configurée');
        }

        try {
            let url = `${this.baseUrl}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(title)}`;
            if (year) {
                url += `&year=${year}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                return null;
            }

            // Retourner le premier résultat le plus pertinent
            return await this.getMovieDetails(data.results[0].id);
        } catch (error) {
            console.error('Erreur lors de la recherche TMDb:', error);
            return null;
        }
    }

    async searchMultipleMovies(title, limit = 10, year = null) {
        if (!this.apiKey) {
            throw new Error('Clé API TMDb non configurée');
        }

        try {
            let url = `${this.baseUrl}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(title)}`;
            if (year) {
                url += `&year=${year}`;
            }
            const response = await fetch(url);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                return [];
            }

            return data.results.slice(0, limit).map(movie => ({
                tmdbId: movie.id,
                title: movie.title,
                originalTitle: movie.original_title,
                year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
                poster: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : null,
                backdrop: movie.backdrop_path ? `${this.imageBaseUrl}${movie.backdrop_path}` : null,
                type: 'movie',
                plot: movie.overview,
                tmdbRating: movie.vote_average || null,
                popularity: movie.popularity || null,
                voteCount: movie.vote_count || null,
                releaseDate: movie.release_date || null,
                adult: movie.adult || false,
                genreIds: movie.genre_ids || [],
                originalLanguage: movie.original_language || null,
                video: movie.video || false,
                // Garder aussi les données brutes au cas où
                rawData: movie
            }));
        } catch (error) {
            console.error('Erreur lors de la recherche multiple TMDb:', error);
            return [];
        }
    }

    async getMovieDetails(tmdbId) {
        if (!this.apiKey) {
            throw new Error('Clé API TMDb non configurée');
        }

        try {
            const url = `${this.baseUrl}/movie/${tmdbId}?api_key=${this.apiKey}&append_to_response=credits,external_ids`;
            const response = await fetch(url);
            const data = await response.json();

            return this.formatMovieData(data);
        } catch (error) {
            console.error('Erreur lors de la récupération des détails TMDb:', error);
            return null;
        }
    }

    formatMovieData(data) {
        const director = data.credits?.crew?.find(person => person.job === 'Director');
        const actors = data.credits?.cast?.slice(0, 5).map(actor => actor.name) || [];

        return {
            tmdbId: data.id,
            title: data.title,
            originalTitle: data.original_title,
            year: data.release_date ? new Date(data.release_date).getFullYear() : null,
            director: director?.name || null,
            actors: actors,
            plot: data.overview || null,
            poster: data.poster_path ? `${this.imageBaseUrl}${data.poster_path}` : null,
            tmdbRating: data.vote_average || null,
            runtime: data.runtime ? `${data.runtime} min` : null,
            genre: data.genres?.map(g => g.name) || [],
            released: data.release_date || null,
            type: 'movie',
            popularity: data.popularity,
            voteCount: data.vote_count,
            budget: data.budget || null,
            revenue: data.revenue || null,
            spokenLanguages: data.spoken_languages?.map(lang => lang.english_name) || [],
            productionCountries: data.production_countries?.map(country => country.name) || []
        };
    }

    // Recherche avec tolérance aux fautes de frappe améliorée
    async searchWithSuggestions(title, year = null) {
        try {
            // Recherche normale d'abord
            const exactMatch = await this.searchMovie(title, year);
            if (exactMatch) {
                return {
                    exactMatch: exactMatch,
                    suggestions: []
                };
            }

            // Si pas de résultat exact, chercher des suggestions
            const suggestions = await this.searchMultipleMovies(title, 8);
            
            // Si toujours pas de résultats, essayer des variations du titre
            if (suggestions.length === 0) {
                const alternatives = this.generateAlternativeSearchTerms(title);
                for (const alternative of alternatives.slice(1)) { // Skip le premier qui est le titre original
                    const altSuggestions = await this.searchMultipleMovies(alternative, 5);
                    if (altSuggestions.length > 0) {
                        return {
                            exactMatch: null,
                            suggestions: altSuggestions,
                            usedAlternative: alternative
                        };
                    }
                }
            }
            
            return {
                exactMatch: null,
                suggestions: suggestions
            };
        } catch (error) {
            console.error('Erreur lors de la recherche avec suggestions:', error);
            return {
                exactMatch: null,
                suggestions: []
            };
        }
    }

    // Génère des variantes du titre pour améliorer la recherche
    generateAlternativeSearchTerms(title) {
        const alternatives = [title];
        
        // Supprimer les articles courants
        const withoutArticles = title
            .replace(/^(the|le|la|les|un|une|des)\s+/i, '')
            .replace(/\s+(the|le|la|les|un|une|des)$/i, '');
        if (withoutArticles !== title) {
            alternatives.push(withoutArticles);
        }

        // Remplacer les caractères spéciaux
        const normalized = title
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ñ]/g, 'n')
            .replace(/[ç]/g, 'c');
        if (normalized !== title) {
            alternatives.push(normalized);
        }

        // Supprimer la ponctuation
        const noPunctuation = title.replace(/[^\w\s]/g, '');
        if (noPunctuation !== title) {
            alternatives.push(noPunctuation);
        }

        return [...new Set(alternatives)]; // Supprimer les doublons
    }
}

module.exports = new TMDbService();
