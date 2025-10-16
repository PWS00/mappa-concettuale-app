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
        generateBtn.disabled = false;
    } else {
        fileNameSpan.textContent = 'Nessun file selezionato';
        generateBtn.disabled = true;
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
            
            // --- NUOVO CODICE PER IL DOWNLOAD ---
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Salva come PNG';
            downloadBtn.className = 'download-btn';

            downloadBtn.onclick = () => {
                // 1. Ottieni l'SVG come stringa di testo
                const svgData = new XMLSerializer().serializeToString(element);

                // 2. Crea un elemento <canvas> in memoria
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 3. Crea un'immagine dall'SVG
                const img = new Image();
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                
                img.onload = () => {
                    // 4. Imposta le dimensioni del canvas e disegna l'immagine
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // 5. Crea un link temporaneo per avviare il download
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png'); // Converte il canvas in PNG
                    a.download = `${title.replace(/\s+/g, '_')}_mappa.png`; // Crea un nome per il file
                    
                    // 6. Simula il click sul link e poi lo rimuove
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            };
            
            mapContainer.appendChild(downloadBtn);
            // --- FINE NUOVO CODICE ---

            container.appendChild(mapContainer);
        })
        .catch(error => {
            console.error(error);
            mapContainer.innerHTML += `<p class="error">Impossibile renderizzare la mappa per "${title}".</p>`;
            container.appendChild(mapContainer);
        });
}
