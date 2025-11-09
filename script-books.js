// === INICIALIZAR PARSE ===
const Parse = window.Parse;
Parse.initialize("S88jCtz1uP0qT7s0Fe1fp9aJzUB7YmjIuHd5o06p", "XlOB40PLJiE7LXcAL4rww2HM4ksg9u6YbEPGRhJz");
Parse.serverURL = 'https://parseapi.back4app.com/';

// === VARIABLES GLOBALES ===
let allBooks = [];

// === FUNCIONES AUXILIARES ===
function updateThemeIcon(theme) {
    const button = document.getElementById('theme-toggle');
    if (!button || !button.querySelector('svg')) return;
    const icon = button.querySelector('svg');
    icon.innerHTML = theme === 'paper'
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
}

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="close-btn" aria-label="Cerrar">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    const closeBtn = toast.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });

    if (duration > 0) {
        setTimeout(() => {
            if (toast.classList.contains('show')) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, 300);
            }
        }, duration);
    }
}

// === INICIO DEL DOM ===
document.addEventListener('DOMContentLoaded', () => {
    // === TEMA ===
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const htmlEl = document.documentElement;
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'paper') {
            htmlEl.setAttribute('data-theme', 'paper');
            updateThemeIcon('paper');
        }
        themeToggle.addEventListener('click', () => {
            const newTheme = htmlEl.getAttribute('data-theme') === 'dark' ? 'paper' : 'dark';
            htmlEl.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    // === MODAL ===
    const modal = document.getElementById('book-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const bookGrid = document.getElementById('books-grid');
    const buyLink = document.getElementById('book-buy-link'); // Botón de compra

    // === BUSCADOR ===
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
            searchClearBtn.style.display = 'flex'; // Mostrar botón de limpiar
        } else {
            searchClearBtn.style.display = 'none'; // Ocultar botón de limpiar
        }
        filterBooks(query);
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        filterBooks(''); // Mostrar todos los libros
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // Opcional: Puedes enfocar el primer resultado o simplemente filtrar
            filterBooks(searchInput.value.trim().toLowerCase());
        }
    });

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // === CARGAR LIBROS ===
    async function loadBooks() {
        try {
            bookGrid.innerHTML = '<div class="loading">Cargando libros...</div>';

            const Obras = Parse.Object.extend("Obras");
            const query = new Parse.Query(Obras);
            // query.equalTo("estado", "publicado"); // Comentado si no se usa
            query.descending("createdAt");
            const results = await query.find();

            if (results.length === 0) {
                bookGrid.innerHTML = '<p class="no-books">No hay libros publicados aún.</p>';
                allBooks = []; // Vaciar array si no hay resultados
                return;
            }

            allBooks = results; // Guardar todos los libros en la variable global
            displayBooks(results); // Mostrar todos inicialmente

        } catch (error) {
            console.error('Error al cargar libros:', error);
            bookGrid.innerHTML = '<p class="error">No se pudieron cargar los libros. Intenta más tarde.</p>';
            showToast('❌ No se pudieron cargar los libros. Verifica tu conexión.', 'error');
            console.log('No se pudieron cargar los libros. Verifica tu conexión', error); // Corregido
        }
    }

    // === FILTRAR LIBROS ===
    function filterBooks(query) {
        if (!query) {
            displayBooks(allBooks);
            return;
        }

        const filteredBooks = allBooks.filter(obra => {
            const objectId = obra.id.toLowerCase();
            // --- CORRECCIÓN AQUÍ ---
            const titulo = String(obra.get('titulo') || '').toLowerCase();
            const nombreArtistico = String(obra.get('nombreArtistico') || '').toLowerCase(); // Asumiendo este campo existe
            const genero = String(obra.get('genero') || '').toLowerCase();
            // --- CORRECCIÓN AQUÍ ---
            const otrosGenerosArray = obra.get('otrosGeneros') || []; // Asumiendo este campo es un Array
            // Aseguramos que sea un array de strings
            const otrosGenerosString = otrosGenerosArray.map(g => String(g)).join(' ').toLowerCase(); // Convertir array a string para búsqueda

            // Buscar en cualquiera de los campos
            return objectId.includes(query) ||
                titulo.includes(query) ||
                nombreArtistico.includes(query) ||
                genero.includes(query) ||
                otrosGenerosString.includes(query);
        });

        displayBooks(filteredBooks);
    }

    // === MOSTRAR LIBROS (actualizado para reutilizar) ===
    function displayBooks(booksToShow) {
        bookGrid.innerHTML = ''; // Limpiar grid

        if (booksToShow.length === 0) {
            bookGrid.innerHTML = '<p class="no-books">No se encontraron libros con ese criterio.</p>';
            return;
        }

        booksToShow.forEach(obra => {
            const bookCard = document.createElement('div');
            bookCard.className = 'card book-card';
            bookCard.innerHTML = `
                <div class="card-content">
                    <p class="book-id">ID: ${obra.id}</p>
                    <span class="genre-label">Género:</span>
                    <span class="genre-tag">${obra.get('genero') || 'No especificado'}</span>
                </div>
            `;
            bookCard.addEventListener('click', () => openBookModal(obra));
            bookGrid.appendChild(bookCard);
        });
    }

    // === ABRIR MODAL CON DETALLES ===
    async function openBookModal(obra) {
        // Incrementar clickVerGeneral
        try {
            obra.increment("clickVerGeneral", 1);
            await obra.save();
            console.log(`[Contador] clickVerGeneral incrementado para ${obra.id}`);
        } catch (error) {
            console.warn(`[Contador] No se pudo incrementar clickVerGeneral para ${obra.id}:`, error);
        }

        // Mostrar detalles en el modal
        document.getElementById('book-title').textContent = `ID: ${obra.id}`;
        // No se cambia el "Género:" porque es texto fijo en HTML, solo el valor del tag
        document.getElementById('book-genre').textContent = obra.get('genero') || 'No especificado';
        document.getElementById('book-synopsis').textContent = obra.get('sinopsis') || 'Sinopsis no disponible';
        buyLink.href = obra.get('enlace') || '#';

        // Asociar el objeto Parse con el botón de compra para incrementar el contador después
        buyLink.onclick = (e) => {
            // Si el enlace es inválido, no hacer nada
            if (buyLink.href === '#' || !obra.get('enlace')) {
                e.preventDefault();
                return;
            }
            // Incrementar clickComprar en el evento click del botón
            incrementarContadorCompra(obra.id);
        };

        modal.style.display = 'block';
    }

    // === FUNCIÓN PARA INCREMENTAR CONTADOR DE COMPRA ===
    async function incrementarContadorCompra(objectId) {
        try {
            const Obras = Parse.Object.extend("Obras");
            const obra = Obras.createWithoutData(objectId);
            obra.increment("clickComprar", 1);
            await obra.save();
            console.log(`[Contador] clickComprar incrementado para ${objectId}`);
        } catch (error) {
            console.warn(`[Contador] No se pudo incrementar clickComprar para ${objectId}:`, error);
        }
    }


    // === INICIAR ===
    loadBooks();
});