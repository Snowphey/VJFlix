// Test complet du système de gestion des IDs
// Ce script valide tous les scénarios d'usage du bot Discord VJFlix

const dataManager = require('../utils/dataManager');

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async run() {
        console.log('🧪 Tests du système de gestion des IDs - VJFlix Bot\n');
        
        for (const { name, testFn } of this.tests) {
            try {
                console.log(`▶️  ${name}`);
                await testFn();
                console.log(`✅ ${name} - PASSÉ\n`);
                this.passed++;
            } catch (error) {
                console.log(`❌ ${name} - ÉCHOUÉ: ${error.message}\n`);
                this.failed++;
            }
        }
        
        console.log(`📊 Résultats: ${this.passed} tests réussis, ${this.failed} tests échoués`);
        if (this.failed === 0) {
            console.log('🎉 Tous les tests sont passés ! Le système est fonctionnel.');
        }
    }
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
    
    assertArrayEquals(arr1, arr2, message) {
        const json1 = JSON.stringify(arr1.sort());
        const json2 = JSON.stringify(arr2.sort());
        if (json1 !== json2) {
            throw new Error(`${message}\nAttendu: ${json2}\nObtenu: ${json1}`);
        }
    }
}

async function runTests() {
    const test = new TestRunner();
    
    // Reset des données pour les tests
    await resetData();
    
    test.test('Ajout de films avec IDs consécutifs', async () => {
        dataManager.addMovie('Film 1');
        dataManager.addMovie('Film 2');
        dataManager.addMovie('Film 3');
        await dataManager.saveData();
        
        const watchlist = dataManager.getWatchlist();
        test.assert(watchlist.length === 3, 'Devrait avoir 3 films');
        test.assertArrayEquals(
            watchlist.map(m => m.id),
            [1, 2, 3],
            'Les IDs devraient être consécutifs de 1 à 3'
        );
    });
    
    test.test('Suppression et réorganisation des IDs', async () => {
        // Partir avec 3 films (ID 1, 2, 3)
        dataManager.removeMovie(2); // Retirer le film avec ID 2
        await dataManager.saveData();
        
        const watchlist = dataManager.getWatchlist();
        test.assert(watchlist.length === 2, 'Devrait avoir 2 films après suppression');
        test.assertArrayEquals(
            watchlist.map(m => m.id),
            [1, 2],
            'Les IDs devraient être réorganisés en 1, 2'
        );
        test.assertArrayEquals(
            watchlist.map(m => m.title),
            ['Film 1', 'Film 3'],
            'Les films restants devraient être Film 1 et Film 3'
        );
    });
    
    test.test('Marquer comme vu et réorganisation', async () => {
        // Partir avec 2 films (ID 1, 2)
        dataManager.markAsWatched(1);
        await dataManager.saveData();
        
        const watchlist = dataManager.getWatchlist();
        const watchedlist = dataManager.getWatchedlist();
        
        test.assert(watchlist.length === 1, 'La watchlist devrait avoir 1 film');
        test.assert(watchedlist.length === 1, 'La watchedlist devrait avoir 1 film');
        test.assert(watchlist[0].id === 1, 'Le film restant devrait avoir l\'ID 1');
        test.assert(watchedlist[0].id === 2, 'Le film vu devrait avoir l\'ID 2');
    });
    
    test.test('Marquer comme non-vu et réorganisation', async () => {
        // Partir avec 1 film dans watchlist (ID 1) et 1 dans watchedlist (ID 2)
        const watchedMovies = dataManager.getWatchedlist();
        dataManager.markAsUnwatched(watchedMovies[0].id);
        await dataManager.saveData();
        
        const watchlist = dataManager.getWatchlist();
        const watchedlist = dataManager.getWatchedlist();
        
        test.assert(watchlist.length === 2, 'La watchlist devrait avoir 2 films');
        test.assert(watchedlist.length === 0, 'La watchedlist devrait être vide');
        test.assertArrayEquals(
            watchlist.map(m => m.id),
            [1, 2],
            'Les IDs de la watchlist devraient être 1, 2'
        );
    });
    
    test.test('Scénario complexe avec multiples opérations', async () => {
        // Reset et scenario complexe
        await resetData();
        
        // Ajouter 5 films
        ['A', 'B', 'C', 'D', 'E'].forEach(title => dataManager.addMovie(`Film ${title}`));
        await dataManager.saveData();
        
        // Marquer B et D comme vus
        dataManager.markAsWatched(2); // Film B
        dataManager.markAsWatched(4); // Film D (qui devient ID 3 après suppression de B)
        await dataManager.saveData();
        
        // Supprimer Film A
        dataManager.removeMovie(1);
        await dataManager.saveData();
        
        // Vérifier l'état final
        const watchlist = dataManager.getWatchlist();
        const watchedlist = dataManager.getWatchedlist();
        
        test.assert(watchlist.length === 2, 'Watchlist devrait avoir 2 films (C, E)');
        test.assert(watchedlist.length === 2, 'Watchedlist devrait avoir 2 films (B, D)');
        test.assertArrayEquals(
            watchlist.map(m => m.id),
            [1, 2],
            'IDs watchlist devraient être consécutifs'
        );
        test.assertArrayEquals(
            watchedlist.map(m => m.id),
            [3, 4],
            'IDs watchedlist devraient suivre la watchlist'
        );
    });
    
    test.test('Migration des anciennes données (chaînes simples)', async () => {
        // Simuler d'anciennes données (avant la migration)
        const fs = require('fs').promises;
        const path = require('path');
        
        // Créer des fichiers avec l'ancien format
        await fs.writeFile(
            path.join(__dirname, '..', 'data', 'watchlist.json'),
            JSON.stringify(['Film Ancien 1', 'Film Ancien 2'])
        );
        await fs.writeFile(
            path.join(__dirname, '..', 'data', 'watchedlist.json'),
            JSON.stringify(['Film Vu Ancien'])
        );
        
        // Recharger le dataManager
        const DataManager = require('../utils/dataManager');
        await DataManager.loadData();
        
        const watchlist = DataManager.getWatchlist();
        const watchedlist = DataManager.getWatchedlist();
        
        test.assert(watchlist.length === 2, 'Migration watchlist');
        test.assert(watchedlist.length === 1, 'Migration watchedlist');
        test.assert(typeof watchlist[0] === 'object' && watchlist[0].id === 1, 'Format migré watchlist');
        test.assert(typeof watchedlist[0] === 'object' && watchedlist[0].id === 3, 'Format migré watchedlist');
        
        await DataManager.saveData();
    });
    
    await test.run();
}

async function resetData() {
    const fs = require('fs').promises;
    const path = require('path');
    
    const emptyWatchlist = [];
    const emptyWatchedlist = [];
    const defaultSettings = { listChannelId: null, listMessageId: null };
    
    await fs.writeFile(path.join(__dirname, '..', 'data', 'watchlist.json'), JSON.stringify(emptyWatchlist, null, 2));
    await fs.writeFile(path.join(__dirname, '..', 'data', 'watchedlist.json'), JSON.stringify(emptyWatchedlist, null, 2));
    await fs.writeFile(path.join(__dirname, '..', 'data', 'settings.json'), JSON.stringify(defaultSettings, null, 2));
    
    // Recharger les données
    await dataManager.loadData();
}

// Exécuter les tests
runTests().catch(console.error);
