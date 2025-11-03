// === INICIALIZAR PARSE AL PRINCIPIO DEL ARCHIVO (antes de cualquier uso) ===
Parse.initialize("S88jCtz1uP0qT7s0Fe1fp9aJzUB7YmjIuHd5o06p", "XlOB40PLJiE7LXcAL4rww2HM4ksg9u6YbEPGRhJz");
Parse.serverURL = 'https://parseapi.back4app.com/';

// === TODO EL CÓDIGO DENTRO DE DOMContentLoaded ===
document.addEventListener('DOMContentLoaded', () => {

    // === 0. PROTEGER PANEL Y PERFIL ===
    if (window.location.pathname.endsWith('panel.html') || window.location.pathname.endsWith('perfil.html')) {
        const currentUser = Parse.User.current();
        if (!currentUser) {
            window.location.href = 'login.html';
        }
    }

    // === 1.1. MOSTRAR IDENTIFICADOR DEL USUARIO ===
    const userIdElement = document.getElementById('user-id');
    if (userIdElement) {
        const currentUser = Parse.User.current();
        if (currentUser) {
            const username = currentUser.get('username');
            userIdElement.textContent = username || 'Sin ID';
        } else {
            userIdElement.textContent = 'No logueado';
        }
    }

    // === 1.2. MOSTRAR IDENTIFICADOR Y ESTADO DE ENCUESTA ===
    const surveyReminder = document.getElementById('survey-reminder');

    if (userIdElement || surveyReminder) {
        const currentUser = Parse.User.current();
        if (currentUser) {
            const username = currentUser.get('username');
            const encuestaCompletada = currentUser.get('encuesta') === true;

            if (userIdElement) {
                userIdElement.textContent = username || 'Sin ID';
            }

            if (surveyReminder) {
                if (encuestaCompletada) {
                    surveyReminder.style.display = 'none';
                } else {
                    surveyReminder.style.display = 'block';
                }
            }
        } else {
            if (userIdElement) userIdElement.textContent = 'No logueado';
            if (surveyReminder) surveyReminder.style.display = 'none';
        }
    }

    // === 1.3. ENVIAR ENCUESTA Y GUARDAR EN CLASE "Encuesta" ===
    document.getElementById('activation-survey')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const currentUser = Parse.User.current();
            if (!currentUser) throw new Error('No hay usuario logueado');

            // Crear objeto Encuesta
            const Encuesta = Parse.Object.extend("Encuesta");
            const encuesta = new Encuesta();

            // Guardar datos
            encuesta.set("autor", currentUser);
            encuesta.set("nombreArtistico", document.getElementById('artistic-name').value);
            encuesta.set("pais", document.getElementById('country').value);
            encuesta.set("diaNacimiento", parseInt(document.querySelector('[name="dia"]').value));
            encuesta.set("mesNacimiento", parseInt(document.querySelector('[name="mes"]').value));
            encuesta.set("anioNacimiento", parseInt(document.querySelector('[name="anio"]').value));
            encuesta.set("tituloObra", document.getElementById('work-title').value);
            encuesta.set("generoObra", document.getElementById('work-genre').value === 'otros'
                ? document.getElementById('other-genre').value
                : document.getElementById('work-genre').options[document.getElementById('work-genre').selectedIndex].text);
            encuesta.set("enlaceObra", document.getElementById('work-link').value);
            encuesta.set("sinopsis", document.getElementById('work-synopsis').value);
            encuesta.set("pdfEnlace", document.querySelector('[name="pdf"]')?.value || '');
            encuesta.set("fechaEnvio", new Date());

            // Guardar en Back4App
            await encuesta.save();

            // Marcar en _User que ha completado la encuesta
            currentUser.set("encuesta", true);
            await currentUser.save();

            alert('✅ ¡Encuesta enviada! Tu obra aparecerá en el panel.');
            window.location.href = 'panel.html';

        } catch (error) {
            console.error('Error al enviar encuesta:', error);
            alert('❌ Error al guardar. Por favor, inténtalo de nuevo.');
        }
    });

    // === 2. COOKIE BANNER ===
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('accept-cookies');
    if (banner && acceptBtn) {
        if (!localStorage.getItem('cookiesAccepted')) {
            banner.classList.remove('hidden');
        }
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            banner.classList.add('hidden');
        });
    }

    // === 3. TEMA (CAMBIO DE MODO OSCURO/PAPEL) ===
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const htmlEl = document.documentElement;
        const savedTheme = localStorage.getItem('theme') || 'dark';
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
    }

    // === 4. CERRAR SESIÓN ===
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await Parse.User.logOut();
            window.location.href = 'login.html';
        });
    }

    // === 5. CAMBIO DE CONTRASEÑA (solo en perfil.html) ===
    document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;
        const msg = document.getElementById('password-message');

        if (newPass !== confirmPass) {
            showError(msg, 'Las contraseñas no coinciden.');
            return;
        }

        try {
            const user = Parse.User.current();
            await Parse.User.logIn(user.get('username'), currentPass);
            user.setPassword(newPass);
            await user.save();
            alert('✅ Contraseña actualizada correctamente.');
            window.location.href = 'panel.html';
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            showError(msg, '❌ Contraseña actual incorrecta.');
        }
    });

    // === 6. MOSTRAR/OCULTAR GÉNERO "OTROS" (en encuesta.html) ===
    document.getElementById('work-genre')?.addEventListener('change', (e) => {
        const otherField = document.getElementById('other-genre-field');
        if (otherField) {
            otherField.style.display = e.target.value === 'otros' ? 'block' : 'none';
        }
    });

    // === 7. CARGAR OBRAS DESDE LA CLASE "Encuesta" ===
    const worksContainer = document.getElementById('works-container');
    if (worksContainer) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) throw new Error('No hay usuario');

            const Encuesta = Parse.Object.extend("Encuesta");
            const query = new Parse.Query(Encuesta);
            query.equalTo("autor", currentUser);
            query.descending("createdAt");
            const resultados = query.find();

            if (resultados.length === 0) {
                worksContainer.innerHTML = '<p class="no-works">Aún no has añadido ninguna obra. <a href="./encuesta.html">Rellena la encuesta</a> para comenzar.</p>';
                if (surveyReminder) surveyReminder.style.display = 'block';
            } else {
                worksContainer.innerHTML = resultados.map(obra => `
                <div class="work-card">
                    <h4>${obra.get('tituloObra')}</h4>
                    <p class="work-genre">${obra.get('generoObra')}</p>
                    <span class="work-status">Activa</span>
                    <a href="${obra.get('enlaceObra')}" target="_blank" class="work-link">Ver obra</a>
                </div>
            `).join('');
                if (surveyReminder) surveyReminder.style.display = 'none';
            }
        } catch (error) {
            console.error('Error al cargar obras:', error);
            worksContainer.innerHTML = '<p class="no-works">Error al cargar tus obras. <a href="./encuesta.html">Reintentar</a>.</p>';
        }
    }
    // === 8. INFORME DINÁMICO CON 3 FILTROS ===
    const monthlyData = [
        { month: "Enero", year: 2023, reach: 4200, clicks: 280, engagement: "6.2%", cpr: "0.55 €" },
        { month: "Febrero", year: 2023, reach: 4800, clicks: 310, engagement: "6.4%", cpr: "0.53 €" },
        { month: "Marzo", year: 2024, reach: 7200, clicks: 480, engagement: "6.6%", cpr: "0.51 €" },
        { month: "Enero", year: 2025, reach: 9800, clicks: 620, engagement: "6.3%", cpr: "0.52 €" },
        { month: "Febrero", year: 2025, reach: 10500, clicks: 710, engagement: "6.5%", cpr: "0.50 €" },
        { month: "Marzo", year: 2025, reach: 11200, clicks: 780, engagement: "6.7%", cpr: "0.49 €" },
        { month: "Abril", year: 2025, reach: 12450, clicks: 842, engagement: "6.8%", cpr: "0.47 €" }
    ];

    // Funciones auxiliares
    const getYearsWithData = () => [...new Set(monthlyData.map(m => m.year))].sort((a, b) => b - a);
    const getMonthsForYear = (year) => monthlyData.filter(m => m.year === year).map(m => ({ name: m.month, value: m.month }));
    const getQuartersForYear = (year) => {
        const months = monthlyData.filter(m => m.year === year).map(m => m.month);
        const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const idx = months.map(m => names.indexOf(m));
        const q = [];
        if (idx.some(i => i >= 0 && i <= 3)) q.push({ name: "Ene–Abr", v: "q1" });
        if (idx.some(i => i >= 4 && i <= 7)) q.push({ name: "May–Ago", v: "q2" });
        if (idx.some(i => i >= 8 && i <= 11)) q.push({ name: "Sep–Dic", v: "q3" });
        return q;
    };

    const calculateMetrics = (data) => {
        if (!data.length) return { reach: 0, clicks: 0, engagement: "0%", cpr: "0 €" };
        const r = data.reduce((s, m) => s + m.reach, 0);
        const c = data.reduce((s, m) => s + m.clicks, 0);
        return {
            reach: r,
            clicks: c,
            engagement: c / r > 0 ? (c / r * 100).toFixed(1) + "%" : "0%",
            cpr: c > 0 ? (r / c / 100).toFixed(2) + " €" : "0 €"
        };
    };

    const renderReport = (y, m = null, q = null) => {
        let data = monthlyData.filter(m => m.year === y);
        let title = y.toString();
        if (m) {
            data = data.filter(mm => mm.month === m);
            title = `${m} ${y}`;
        } else if (q) {
            const ranges = {
                q1: ["Enero", "Febrero", "Marzo", "Abril"],
                q2: ["Mayo", "Junio", "Julio", "Agosto"],
                q3: ["Septiembre", "Octubre", "Noviembre", "Diciembre"]
            };
            data = data.filter(mm => ranges[q].includes(mm.month));
            title = `${ranges[q][0]}–${ranges[q][3]} ${y}`;
        }
        const metrics = calculateMetrics(data);
        document.getElementById('report-content').innerHTML = `
            <h4 style="text-align:center; margin-bottom:1.5rem; color:var(--accent);">${title}</h4>
            <div class="stats-grid">
                <div class="stat-card"><h4>Alcance</h4><p class="stat-value">${metrics.reach.toLocaleString()}</p></div>
                <div class="stat-card"><h4>Clics</h4><p class="stat-value">${metrics.clicks.toLocaleString()}</p></div>
                <div class="stat-card"><h4>Engagement</h4><p class="stat-value">${metrics.engagement}</p></div>
                <div class="stat-card"><h4>Coste por resultado</h4><p class="stat-value">${metrics.cpr}</p></div>
            </div>
        `;
    };

    const initFilters = () => {
        const yearSelect = document.getElementById('filter-year');
        const monthSelect = document.getElementById('filter-month');
        const quarterSelect = document.getElementById('filter-quarter');
        if (!yearSelect || !monthSelect || !quarterSelect) return;

        const years = getYearsWithData();
        yearSelect.innerHTML = '';
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        });
        const defaultYear = Math.max(...years);
        yearSelect.value = defaultYear;

        const updateFilters = () => {
            const y = parseInt(yearSelect.value);
            // Meses
            monthSelect.innerHTML = '<option value="">Todos los meses</option>';
            getMonthsForYear(y).forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.value;
                opt.textContent = m.name;
                monthSelect.appendChild(opt);
            });
            // Cuatrimestres
            quarterSelect.innerHTML = '<option value="">Todos los cuatrimestres</option>';
            getQuartersForYear(y).forEach(q => {
                const opt = document.createElement('option');
                opt.value = q.v;
                opt.textContent = q.name;
                quarterSelect.appendChild(opt);
            });
            renderReport(y);
        };

        yearSelect.addEventListener('change', updateFilters);
        monthSelect.addEventListener('change', () => {
            const y = parseInt(yearSelect.value);
            const m = monthSelect.value || null;
            const q = quarterSelect.value || null;
            if (m) quarterSelect.value = "";
            renderReport(y, m, q ? q : null);
        });
        quarterSelect.addEventListener('change', () => {
            const y = parseInt(yearSelect.value);
            const q = quarterSelect.value || null;
            const m = monthSelect.value || null;
            if (q) monthSelect.value = "";
            renderReport(y, null, q);
        });

        updateFilters();
    };

    // Ejecutar filtros si están en el DOM
    if (document.getElementById('filter-year')) {
        initFilters();
    }
});

// === FUNCIONES AUXILIARES (FUERA DE DOMContentLoaded) ===
function updateThemeIcon(theme) {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const icon = button.querySelector('svg');
    if (!icon) return;
    if (theme === 'paper') {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
}

function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}