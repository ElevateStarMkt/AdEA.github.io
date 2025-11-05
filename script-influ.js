// === INICIALIZAR PARSE ===
const Parse = window.Parse;
Parse.initialize("S88jCtz1uP0qT7s0Fe1fp9aJzUB7YmjIuHd5o06p", "XlOB40PLJiE7LXcAL4rww2HM4ksg9u6YbEPGRhJz");
Parse.serverURL = 'https://parseapi.back4app.com/';

// === FUNCIONES AUXILIARES ===
function updateThemeIcon(theme) {
    const button = document.getElementById('theme-toggle');
    if (!button || !button.querySelector('svg')) return;
    const icon = button.querySelector('svg');
    icon.innerHTML = theme === 'paper'
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
}

function normalizeTelegram(handle) {
    const trimmed = handle.trim();
    return trimmed ? (trimmed.startsWith('@') ? trimmed : `@${trimmed}`) : trimmed;
}

// === ✅ CONTADOR GLOBAL (usando objectId fijo) ===
async function incrementarContadorGlobal(campo) {
    try {
        const Contador = Parse.Object.extend("Contadores");
        const obj = Contador.createWithoutData("9tNR3Y8JDL"); // tu objectId
        obj.increment(campo, 1);
        await obj.save();
    } catch (error) {
        console.warn(`[Contador] No se pudo incrementar ${campo}:`, error);
        // No bloqueamos el flujo principal por un fallo en el contador
    }
}

/**
 * Muestra un toast personalizado
 * @param {string} message - Mensaje a mostrar
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Tipo de toast
 * @param {number} [duration=4000] - Duración en ms (0 = permanente hasta cerrar)
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Toast container not found. Add <div id="toast-container"></div> before </body>');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="close-btn" aria-label="Cerrar">&times;</button>
    `;

    container.appendChild(toast);

    // Mostrar animación
    setTimeout(() => toast.classList.add('show'), 10);

    // Cerrar al hacer clic en ×
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });

    // Cerrar automáticamente
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

    // === CAMPOS CONDICIONALES ===
    const otrosCheck = document.getElementById('genero-otros-check');
    const otrosField = document.getElementById('genero-otros-field');
    if (otrosCheck && otrosField) {
        otrosCheck.addEventListener('change', (e) => {
            otrosField.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    const susSelect = document.getElementById('suscripcion-futura');
    const susOtroField = document.getElementById('suscripcion-otro-field');
    if (susSelect && susOtroField) {
        susSelect.addEventListener('change', (e) => {
            susOtroField.style.display = e.target.value === 'Otro' ? 'block' : 'none';
        });
    }

    // === ENVIAR ENCUESTA ===
    const form = document.getElementById('influencer-survey');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const generos = Array.from(form.querySelectorAll('input[name="genero"]:checked'));
        if (generos.length === 0) {
            showToast('⚠️ Selecciona al menos un género literario.');
            return;
        }

        try {
            // --- Preparar datos ---
            const Influencer = Parse.Object.extend("Influencer");
            const influ = new Influencer();

            influ.set("nombre", document.getElementById('nombre').value.trim());
            influ.set("apellidos", document.getElementById('apellidos').value.trim());
            influ.set("telegram", normalizeTelegram(document.getElementById('telegram').value));
            influ.set("direccion", document.getElementById('direccion').value.trim());
            influ.set("telefono", document.getElementById('telefono').value.trim());
            influ.set("fechaNacimiento", new Date(document.getElementById('nacimiento').value));
            influ.set("email", document.getElementById('email').value.trim().toLowerCase());

            influ.set("instagram", document.getElementById('instagram').value.trim());
            influ.set("tiktok", document.getElementById('tiktok').value.trim());
            influ.set("otrasRRSS", document.getElementById('otras-rrss').value.trim() || '');

            let generosFavoritos = generos.map(cb => cb.value);
            if (otrosCheck?.checked) {
                const otro = document.getElementById('genero-otros-text')?.value.trim();
                if (otro) generosFavoritos.push(otro);
            }
            influ.set("generosFavoritos", generosFavoritos);

            influ.set("permitePublicidad", document.getElementById('publi-libros').value);
            influ.set("permiteEnvioLibros", document.getElementById('recibir-libros').value);

            const interesSuscripcion = document.getElementById('suscripcion-futura').value;
            influ.set("interesSuscripcion", interesSuscripcion);
            if (interesSuscripcion === 'Otro') {
                influ.set("comentarioSuscripcion", document.getElementById('suscripcion-otro-text')?.value.trim() || '');
            }

            influ.set("fechaEnvio", new Date());
            influ.set("estado", "pendiente");

            // --- ✅ 1. Guardar encuesta ---
            await influ.save();

            // --- ✅ 2. Incrementar contador DE FORMA ASÍNCRONA (no bloqueante) ---
            incrementarContadorGlobal('encuestaInfluSubmit');

            // --- Éxito ---
            showToast('✅ ¡Gracias! Revisaremos tu solicitud y te contactaremos pronto.');
            form.reset();
            if (otrosField) otrosField.style.display = 'none';
            if (susOtroField) susOtroField.style.display = 'none';

        } catch (error) {
            console.error('Error al enviar encuesta:', error);
            showToast('❌ No se pudo enviar. Verifica tu conexión e inténtalo de nuevo.');
        }
    });
});