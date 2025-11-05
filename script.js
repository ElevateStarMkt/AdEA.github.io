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

// Scroll suave
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Datos de los planes (solo precio mensual)
const plans = [
    { id: 1, name: "Básico", monthly: 40 },
    { id: 2, name: "Prime", monthly: 90 },
    { id: 3, name: "Supremo", monthly: 150 },
    { id: 4, name: "Legado", monthly: 250 }
];

// Renderizar planes
function renderPlans(cycle = 'monthly') {
    const grid = document.getElementById('pricing-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Mapeo de planes con sus IDs de SubLaunch
    const plans = [
        { id: 1, name: "Básico", monthlyId: 1, annualId: 5 },
        { id: 2, name: "Prime", monthlyId: 2, annualId: 6 },
        { id: 3, name: "Supremo", monthlyId: 3, annualId: 7 },
        { id: 4, name: "Legado", monthlyId: 4, annualId: 8 }
    ];

    plans.forEach(plan => {
        const monthlyPrice = [40, 90, 150, 250][plan.id - 1];
        const annualPrice = monthlyPrice * 11; // 11 meses = 12 con 1 gratis

        const price = cycle === 'monthly' ? monthlyPrice : annualPrice;
        const investment = monthlyPrice * 0.75; // ✅ SIEMPRE el 75% del precio mensual base

        // URLs de SubLaunch
        const monthlyUrl = `https://sublaunch.com/adeaoficial/checkout?price=${plan.monthlyId}`;
        const annualUrl = `https://sublaunch.com/adeaoficial/checkout?price=${plan.annualId}`;
        const checkoutUrl = cycle === 'monthly' ? monthlyUrl : annualUrl;

        const card = document.createElement('div');
        card.className = 'plan-card';
        card.innerHTML = `
            <h3 class="plan-name">${plan.name}</h3>
            <div class="plan-price">${price.toFixed(2)} €</div>
            ${cycle === 'annual' ? `<span class="plan-equivalent">Equivale a: ${(annualPrice / 12).toFixed(2)} €/mes</span>` : ''}
            <div class="plan-investment">
                Inversión en campañas:<br>
                <strong>${investment.toFixed(2)} €/${cycle === 'monthly' ? 'mes' : 'mes<br> (promedio)'}</strong>
            </div>
            <div class="plan-buttons">
                <a href="${checkoutUrl}" target="_blank" rel="noopener" class="btn btn-primary">
                    ${cycle === 'monthly' ? 'Suscripción mensual' : 'Suscripción anual'}
                </a>
            </div>
            ${cycle === 'annual' ? `<p class="plan-note">11 meses pagados, 12º gratis</p>` : ''}
        `;
        grid.appendChild(card);
    });
}

// Toggle entre mensual y anual
document.getElementById('toggle-monthly').addEventListener('click', () => {
    document.getElementById('toggle-monthly').classList.add('active');
    document.getElementById('toggle-annual').classList.remove('active');
    renderPlans('monthly');
});

document.getElementById('toggle-annual').addEventListener('click', () => {
    document.getElementById('toggle-annual').classList.add('active');
    document.getElementById('toggle-monthly').classList.remove('active');
    renderPlans('annual');
});

// Render inicial
renderPlans('monthly');

// Cookie consent (frontend-only)
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Parse (Back4App)
    Parse.initialize("S88jCtz1uP0qT7s0Fe1fp9aJzUB7YmjIuHd5o06p", "XlOB40PLJiE7LXcAL4rww2HM4ksg9u6YbEPGRhJz");
    Parse.serverURL = 'https://parseapi.back4app.com/';
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('accept-cookies');

    // Mostrar solo si no se ha aceptado
    if (!localStorage.getItem('cookiesAccepted')) {
        banner.classList.remove('hidden');
    }

    acceptBtn.addEventListener('click', () => {
        localStorage.setItem('cookiesAccepted', 'true');
        banner.classList.add('hidden');
        // Opcional: disparar GTM si no se había cargado
    });
});

// Actualización dinámica de meta tags según parámetro 'start'
function updateMetaTags() {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');

    if (!startParam) return;

    const planMap = {
        'básico_monthly': { title: 'Plan Básico - AdEA', desc: 'Promoción literaria anónima desde 40€/mes. 75% en campañas reales.' },
        'prime_monthly': { title: 'Plan Prime - AdEA', desc: 'Promoción avanzada para escritores serios. 67,50€/mes en campañas.' },
        'supremo_monthly': { title: 'Plan Supremo - AdEA', desc: 'Máxima visibilidad por género literario. 112,50€/mes en publicidad.' },
        'legado_monthly': { title: 'Plan Legado - AdEA', desc: 'Estrategia premium para obras destinadas al legado. 187,50€/mes en campañas.' }
    };

    const cleanKey = startParam.replace('_annual', '_monthly'); // tratamos igual
    const meta = planMap[cleanKey];

    if (meta) {
        document.title = meta.title + ' — AdEA';
        let descTag = document.querySelector('meta[name="description"]');
        if (descTag) {
            descTag.setAttribute('content', meta.desc);
        }
    }
}

// Ejecutar al cargar
updateMetaTags();

// Gestión de tema
const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

// Cargar tema guardado
const savedTheme = localStorage.getItem('theme') || 'paper';
if (savedTheme === 'paper') {
    htmlEl.setAttribute('data-theme', 'paper');
    updateThemeIcon('paper');
}

themeToggle.addEventListener('click', () => {
    const current = htmlEl.getAttribute('data-theme') || 'dark';
    const newTheme = current === 'dark' ? 'paper' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('svg');
    if (theme === 'paper') {
        // Sol (modo claro)
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
        // Luna (modo oscuro)
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
}