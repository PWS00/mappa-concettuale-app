// Seleziona tutti gli elementi del DOM all'inizio
const fileInput = document.getElementById('pdf-upload');
const generateBtn = document.getElementById('generate-btn');
const fileNameSpan = document.getElementById('file-name');
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('results-container');

// Aggiunge un listener per l'evento 'change' sull'input del file
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileNameSpan.textContent = fileInput.files[0].name;
        generateBtn.disabled = false; // <-- ATTIVA IL PULSANTE
    } else {
        fileNameSpan.textContent = 'Nessun file selezionato';
        generateBtn.disabled = true; // <-- DISATTIVA IL PULSANTE
    }
});

// Aggiunge un listener per il click sul pulsante di generazione
generateBtn.addEventListener('click', async () => {
    if (fileInput.files.length === 0) {
        alert("Per favore, seleziona un file PDF.");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    // Mostra il loader e pulisce i risultati precedenti
    loader.classList.remove('hidden');
    resultsContainer.innerHTML = '';
    generateBtn.disabled = true;

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Errore sconosciuto durante la generazione.' }));
             throw new Error(errorData.detail || 'Errore nella generazione delle mappe.');
        }

        const data = await response.json();
        
        renderMap(data.main_map.title, data.main_map.dot, resultsContainer);
        data.sub_maps.forEach(subMap => {
            renderMap(subMap.title, subMap.dot, resultsContainer);
        });

    } catch (error) {
        resultsContainer.innerHTML = `<p class="error"><strong>Oops!</strong> ${error.message}</p>`;
    } finally {
        // Nasconde il loader e riattiva il pulsante
        loader.classList.add('hidden');
        generateBtn.disabled = false;
    }
});

// Funzione per renderizzare una mappa
function renderMap(title, dot, container) {
    if (!dot || !dot.trim().startsWith('digraph')) {
        console.error(`Codice DOT non valido per "${title}":`, dot);
        const errorContainer = document.createElement('div');
        errorContainer.className = 'map-container';
        errorContainer.innerHTML = `<h2>${title}</h2><p class="error">L'AI non ha generato una mappa valida per questo argomento.</p>`;
        container.appendChild(errorContainer);
        return;
    }
    
    const viz = new Viz();
    const mapContainer = document.createElement('div');
    mapContainer.className = 'map-container';
    
    const mapTitle = document.createElement('h2');
    mapTitle.textContent = title;
    mapContainer.appendChild(mapTitle);

    viz.renderSVGElement(dot)
        .then(element => {
            mapContainer.appendChild(element);
            container.appendChild(mapContainer);
        })
        .catch(error => {
            console.error(error);
            mapContainer.innerHTML += `<p class="error">Impossibile renderizzare la mappa per "${title}".</p>`;
            container.appendChild(mapContainer);
        });
}
