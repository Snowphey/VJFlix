const fs = require('fs').promises;
const path = require('path');

class DataManager {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data');
        this.watchlistPath = path.join(this.dataPath, 'watchlist.json');
        this.watchedlistPath = path.join(this.dataPath, 'watchedlist.json');
        this.settingsPath = path.join(this.dataPath, 'settings.json');
        
        this.data = {
            watchlist: [],
            watchedlist: [],
            settings: { listChannelId: null, listMessageId: null },
            nextId: 1
        };
        
        this.ensureDataDirectory();
        this.loadData();
    }

    async ensureDataDirectory() {
        try {
            await fs.access(this.dataPath);
        } catch {
            await fs.mkdir(this.dataPath, { recursive: true });
        }
    }

    async loadData() {
        try {
            const watchlistData = await fs.readFile(this.watchlistPath, 'utf8');
            const loadedWatchlist = JSON.parse(watchlistData);
            
            // Migration: convertir les anciens titres en objets avec ID
            if (loadedWatchlist.length > 0 && typeof loadedWatchlist[0] === 'string') {
                this.data.watchlist = loadedWatchlist.map((title, index) => ({
                    id: index + 1,
                    title: title,
                    addedAt: new Date().toISOString(),
                    addedBy: null
                }));
            } else {
                // S'assurer que tous les films ont le champ addedBy
                this.data.watchlist = loadedWatchlist.map(movie => ({
                    ...movie,
                    addedBy: movie.addedBy || null
                }));
            }
        } catch {
            this.data.watchlist = [];
        }

        try {
            const watchedlistData = await fs.readFile(this.watchedlistPath, 'utf8');
            const loadedWatchedlist = JSON.parse(watchedlistData);
            
            // Migration: convertir les anciens titres en objets avec ID
            if (loadedWatchedlist.length > 0 && typeof loadedWatchedlist[0] === 'string') {
                this.data.watchedlist = loadedWatchedlist.map((title, index) => ({
                    id: this.data.watchlist.length + index + 1,
                    title: title,
                    watchedAt: new Date().toISOString(),
                    addedBy: null
                }));
            } else {
                // S'assurer que tous les films ont le champ addedBy
                this.data.watchedlist = loadedWatchedlist.map(movie => ({
                    ...movie,
                    addedBy: movie.addedBy || null
                }));
            }
        } catch {
            this.data.watchedlist = [];
        }

        try {
            const settingsData = await fs.readFile(this.settingsPath, 'utf8');
            this.data.settings = { ...this.data.settings, ...JSON.parse(settingsData) };
        } catch {
            this.data.settings = { listChannelId: null, listMessageId: null };
        }

        // Réorganiser les IDs au chargement pour s'assurer de la cohérence
        this.reorganizeIds();
    }

    async saveData() {
        // Réorganiser les IDs pour qu'ils soient consécutifs de 1 à N
        this.reorganizeIds();
        
        await fs.writeFile(this.watchlistPath, JSON.stringify(this.data.watchlist, null, 2));
        await fs.writeFile(this.watchedlistPath, JSON.stringify(this.data.watchedlist, null, 2));
        await fs.writeFile(this.settingsPath, JSON.stringify(this.data.settings, null, 2));
    }

    reorganizeIds() {
        // Réorganiser la watchlist
        this.data.watchlist.forEach((movie, index) => {
            movie.id = index + 1;
        });
        
        // Réorganiser la watchedlist en gardant la continuité
        let nextId = this.data.watchlist.length + 1;
        this.data.watchedlist.forEach((movie, index) => {
            movie.id = nextId + index;
        });
        
        // Mettre à jour nextId
        this.data.nextId = this.data.watchlist.length + this.data.watchedlist.length + 1;
    }

    // Méthodes pour la watchlist
    addMovie(title, user = null) {
        // Vérifier si le film existe déjà
        const exists = this.data.watchlist.some(movie => movie.title.toLowerCase() === title.toLowerCase());
        if (exists) return false;

        // Le nouvel ID sera toujours le prochain disponible dans la watchlist
        const newId = this.data.watchlist.length + 1;
        const movie = {
            id: newId,
            title: title,
            addedAt: new Date().toISOString(),
            addedBy: user ? {
                id: user.id,
                username: user.username,
                displayName: user.displayName || user.username
            } : null
        };
        
        this.data.watchlist.push(movie);
        return movie;
    }

    removeMovie(id) {
        const index = this.data.watchlist.findIndex(movie => movie.id === parseInt(id));
        if (index !== -1) {
            const removed = this.data.watchlist.splice(index, 1)[0];
            return removed;
        }
        return null;
    }

    removeMovieByTitle(title) {
        const index = this.data.watchlist.findIndex(movie => movie.title.toLowerCase() === title.toLowerCase());
        if (index !== -1) {
            const removed = this.data.watchlist.splice(index, 1)[0];
            return removed;
        }
        return null;
    }

    getMovieById(id) {
        return this.data.watchlist.find(movie => movie.id === parseInt(id));
    }

    getMovieByTitle(title) {
        return this.data.watchlist.find(movie => movie.title.toLowerCase() === title.toLowerCase());
    }

    // Méthodes pour les films vus
    markAsWatched(id) {
        const movie = this.getMovieById(id);
        if (!movie) return null;

        // Sauvegarder les informations du film original
        const originalTitle = movie.title;
        const originalAddedAt = movie.addedAt;
        const originalAddedBy = movie.addedBy || null;

        // Retirer de la watchlist AVANT de réorganiser
        this.removeMovie(id);

        // Calculer le nouvel ID pour la watchedlist
        const newWatchedId = this.data.watchlist.length + this.data.watchedlist.length + 1;

        // Créer l'entrée pour les films vus
        const watchedMovie = {
            id: newWatchedId,
            title: originalTitle,
            addedAt: originalAddedAt,
            addedBy: originalAddedBy,
            watchedAt: new Date().toISOString()
        };

        // Ajouter à la liste des films vus
        this.data.watchedlist.push(watchedMovie);

        // La réorganisation se fera lors du saveData()
        return { ...watchedMovie, title: originalTitle };
    }

    markAsWatchedByTitle(title) {
        const movie = this.getMovieByTitle(title);
        if (!movie) return null;
        return this.markAsWatched(movie.id);
    }

    markAsUnwatched(id) {
        // Trouver le film dans la liste des films vus
        const watchedIndex = this.data.watchedlist.findIndex(movie => movie.id === parseInt(id));
        if (watchedIndex === -1) return null;

        const movie = this.data.watchedlist[watchedIndex];
        
        // Retirer de la liste des films vus
        this.data.watchedlist.splice(watchedIndex, 1);
        
        // Remettre dans la watchlist avec un nouvel ID
        const backToWatchlist = {
            id: this.data.watchlist.length + 1, // Nouveau ID consécutif
            title: movie.title,
            addedAt: movie.addedAt,
            addedBy: movie.addedBy || null // Préserver l'info de qui a ajouté le film
        };
        
        this.data.watchlist.push(backToWatchlist);
        
        // La réorganisation se fera lors du saveData()
        return backToWatchlist;
    }

    getWatchedMovieById(id) {
        return this.data.watchedlist.find(movie => movie.id === parseInt(id));
    }

    // Getters
    getWatchlist() {
        return [...this.data.watchlist];
    }

    getWatchedlist() {
        return [...this.data.watchedlist];
    }

    getSettings() {
        return { ...this.data.settings };
    }

    // Méthodes utilitaires
    getRandomMovies(count) {
        if (this.data.watchlist.length < count) return null;
        const shuffled = [...this.data.watchlist].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // Setters pour les settings
    setListChannelId(channelId) {
        this.data.settings.listChannelId = channelId;
    }

    setListMessageId(messageId) {
        this.data.settings.listMessageId = messageId;
    }
}

module.exports = new DataManager();
