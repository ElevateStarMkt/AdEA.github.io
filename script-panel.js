// === INICIALIZAR PARSE (BACK4APP) ===
const Parse = window.Parse;
Parse.initialize("S88jCtz1uP0qT7s0Fe1fp9aJzUB7YmjIuHd5o06p", "XlOB40PLJiE7LXcAL4rww2HM4ksg9u6YbEPGRhJz");
Parse.serverURL = 'https://parseapi.back4app.com/';

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

document.addEventListener('DOMContentLoaded', () => {



    // === 0. PROTEGER PANEL Y PERFIL ===
    if (window.location.pathname.endsWith('panel.html') || window.location.pathname.endsWith('perfil.html')) {
        const currentUser = Parse.User.current();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
    }

    // === 1. MOSTRAR IDENTIFICADOR Y ESTADO DE ENCUESTA ===
    const userIdElement = document.getElementById('user-id');
    const surveyReminder = document.getElementById('survey-reminder');
    const currentUser = Parse.User.current();

    if (currentUser) {
        // Mostrar ID del usuario
        if (userIdElement) {
            userIdElement.textContent = currentUser.get('username') || 'Sin ID';
        }

        // Mostrar/ocultar recordatorio de encuesta
        if (surveyReminder) {
            surveyReminder.style.display = currentUser.get('encuesta') === true ? 'none' : 'block';
        }
    } else {
        if (userIdElement) userIdElement.textContent = 'No logueado';
        if (surveyReminder) surveyReminder.style.display = 'none';
    }

    // === 2. ENVIAR ENCUESTA A CLASE "Encuesta" ===
    const surveyForm = document.getElementById('activation-survey');
    if (surveyForm) {
        surveyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const user = Parse.User.current();
                if (!user) throw new Error('No logueado');

                const Encuesta = Parse.Object.extend("Encuesta");
                const encuesta = new Encuesta();

                // Datos de la encuesta
                encuesta.set("autor", user);
                encuesta.set("nombreArtistico", document.getElementById('artistic-name').value.trim());
                encuesta.set("pais", document.getElementById('country').value);
                encuesta.set("diaNacimiento", parseInt(document.getElementById('birth-day').value));
                encuesta.set("mesNacimiento", parseInt(document.getElementById('birth-month').value));
                encuesta.set("anioNacimiento", parseInt(document.getElementById('birth-year').value));
                encuesta.set("tituloObra", document.getElementById('work-title').value.trim());
                encuesta.set("generoObra", document.getElementById('work-genre').value === 'otros'
                    ? document.getElementById('other-genre').value.trim()
                    : document.getElementById('work-genre').options[document.getElementById('work-genre').selectedIndex].text);
                encuesta.set("enlaceObra", document.getElementById('work-link').value.trim());
                encuesta.set("sinopsis", document.getElementById('work-synopsis').value.trim());
                encuesta.set("pdfEnlace", document.querySelector('[name="pdfEnlace"]')?.value.trim() || '');
                encuesta.set("fechaEnvio", new Date());

                // Establecer ACL explícita
                const acl = new Parse.ACL(user);
                encuesta.setACL(acl);

                // Guardar en Back4App
                await encuesta.save();

                // Marcar usuario como encuestado
                user.set("encuesta", true);
                await user.save();

                showToast('✅ ¡Encuesta enviada! Tu obra aparecerá en el panel.');
                window.location.href = 'panel.html';
            } catch (error) {
                console.error('Error al enviar encuesta:', error);
                showToast('❌ Error al guardar. Verifica tu conexión y permisos.');
            }
        });
    }

    // === 3. CARGAR OBRAS DESDE "Encuesta" ===
    const worksContainer = document.getElementById('works-container');
    if (worksContainer && currentUser) {
        (async () => {
            try {
                const Encuesta = Parse.Object.extend("Encuesta");
                const query = new Parse.Query(Encuesta);
                query.equalTo("autor", currentUser);
                query.descending("createdAt");
                const obras = await query.find();

                if (obras.length === 0) {
                    worksContainer.innerHTML = '<p class="no-works">Aún no has añadido ninguna obra. <a href="./encuesta.html">Rellena la encuesta</a> para comenzar.</p>';
                } else {
                    worksContainer.innerHTML = obras.map(obra => `
                        <div class="work-card">
                            <h4>${obra.get('tituloObra')}</h4>
                            <p class="work-genre">${obra.get('generoObra')}</p>
                            <span class="work-status">Activa</span>
                            <a href="${obra.get('enlaceObra')}" target="_blank" class="work-link">Ver obra</a>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Error al cargar obras:', error);
                worksContainer.innerHTML = '<p class="no-works">Error al cargar. <a href="./encuesta.html">Reintentar</a>.</p>';
            }
        })();
    }

    // === 10. CARGAR INVERSIÓN ACUMULADA, PLAN ACTUAL Y ESCALADO ===
    if (currentUser && (document.getElementById('investment-text') || document.querySelector('.plans-grid'))) {
        (async () => {
            try {
                // 1. Obtener plan y tipo de suscripción
                let rawPlan = currentUser.get('plan') || 'Básico';
                let tipoSuscripcion = currentUser.get('mensualanual') || 'mensual'; // 'mensual' o 'anual'

                // Normalizar plan
                const normalizePlan = (plan) => {
                    if (!plan) return 'Básico';
                    return plan
                        .trim()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/basico/i, 'Básico')
                        .replace(/prime/i, 'Prime')
                        .replace(/supremo/i, 'Supremo')
                        .replace(/legado/i, 'Legado');
                };

                const userPlan = normalizePlan(rawPlan);
                const esAnual = tipoSuscripcion.toLowerCase() === 'anual';

                // 2. Fechas y cálculo de inversión
                const Encuesta = Parse.Object.extend("Encuesta");
                const query = new Parse.Query(Encuesta);
                query.equalTo("autor", currentUser);
                query.ascending("fechaEnvio");
                const primeraEncuesta = await query.first();

                let fechaInicio = null;
                let mesesTranscurridos = 0;

                if (primeraEncuesta) {
                    fechaInicio = primeraEncuesta.get('fechaEnvio');
                    if (fechaInicio) {
                        const hoy = new Date();
                        const inicio = new Date(fechaInicio);
                        mesesTranscurridos = (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth());
                        if (hoy.getDate() < inicio.getDate()) mesesTranscurridos--;
                        mesesTranscurridos = Math.max(0, mesesTranscurridos);
                    }
                }

                // 3. Definir planes (mensual)
                const planesMensual = {
                    "Básico": 40,
                    "Prime": 90,
                    "Supremo": 150,
                    "Legado": 250
                };
                const ordenPlanes = ["Básico", "Prime", "Supremo", "Legado"];

                const mensualidad = planesMensual[userPlan] || 40;
                const inversionMensual = mensualidad * 0.75;
                const inversionTotal = inversionMensual * (mesesTranscurridos + 1);

                // 4. Mostrar inversión acumulada
                const investmentText = document.getElementById('investment-text');
                if (investmentText) {
                    let fechaFormateada = "enero de 2025";
                    if (fechaInicio) {
                        const opciones = { year: 'numeric', month: 'long' };
                        fechaFormateada = fechaInicio.toLocaleDateString('es-ES', opciones);
                    }
                    investmentText.innerHTML = `
                    Desde <strong>${fechaFormateada}</strong>, hemos invertido 
                    <strong>${inversionTotal.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })} €</strong> en la promoción de tus obras.
                `;
                }

                // 5. Mostrar planes con precios correctos
                const planesGrid = document.querySelector('.plans-grid');
                if (planesGrid) {
                    planesGrid.innerHTML = ordenPlanes.map(plan => {
                        const precioBase = planesMensual[plan] || 0;
                        const precio = esAnual ? precioBase * 11 : precioBase;
                        const unidad = esAnual ? 'año' : 'mes';
                        const esActual = userPlan === plan;

                        return `
                        <div class="plan-item ${esActual ? 'current' : 'inactive'}">
                            <h4>${plan}</h4>
                            <p>${precio} €/${unidad}</p>
                            ${esActual ? '<span class="current-badge">Tu plan actual</span>' : ''}
                        </div>
                    `;
                    }).join('');
                }

                // 6. Sugerencia de escalado
                const idxActual = ordenPlanes.indexOf(userPlan);
                const siguientePlan = idxActual < ordenPlanes.length - 1 ? ordenPlanes[idxActual + 1] : null;
                const upgradeSuggestion = document.querySelector('.upgrade-suggestion');

                if (upgradeSuggestion && siguientePlan) {
                    const precioSiguiente = esAnual ? planesMensual[siguientePlan] * 11 : planesMensual[siguientePlan];
                    const unidad = esAnual ? 'año' : 'mes';
                    upgradeSuggestion.innerHTML = `
                    <p>¿Quieres escalar? El plan <strong>${siguientePlan}</strong> ofrece segmentación avanzada.</p>
                    <a href="https://t.me/adea_oficial?text=Hola, me interesa escalar a ${siguientePlan}"
                       class="btn btn-secondary">Consultar</a>
                `;
                } else if (upgradeSuggestion) {
                    // Usuario en plan "Legado" → mensaje personalizado
                    upgradeSuggestion.innerHTML = `
        <p>¿Quieres aumentar la inversión? Contacta con nosotros y personaliza tu plan.</p>
        <a href="https://t.me/adea_oficial?text=Hola, quiero personalizar mi plan Legado"
           class="btn btn-secondary">Consultar</a>
    `;
                }

            } catch (error) {
                console.error('Error al cargar inversión, plan o sugerencia de escalado:', error);
            }
        })();
    }

    // === 4. COOKIE BANNER ===
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

    // === 5. TEMA (MODO OSCURO/PAPEL) ===
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



    // === 6. CERRAR SESIÓN ===
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await Parse.User.logOut();
            window.location.href = 'login.html';
        });
    }

    // === 7. CAMBIO DE CONTRASEÑA (perfil.html) ===
    const pwdForm = document.getElementById('change-password-form');
    if (pwdForm) {
        pwdForm.addEventListener('submit', async (e) => {
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
                showToast('✅ Contraseña actualizada correctamente.');
                window.location.href = 'panel.html';
            } catch (error) {
                console.error('Error al cambiar contraseña:', error);
                showError(msg, '❌ Contraseña actual incorrecta.');
            }
        });
    }

    // === 8. MOSTRAR/OCULTAR GÉNERO "OTROS" (encuesta.html) ===
    const genreSelect = document.getElementById('work-genre');
    if (genreSelect) {
        genreSelect.addEventListener('change', (e) => {
            const otherField = document.getElementById('other-genre-field');
            if (otherField) {
                otherField.style.display = e.target.value === 'otros' ? 'block' : 'none';
            }
        });
    }

    // === 9. FILTROS DE INFORME (panel.html) ===
    if (document.getElementById('filter-year')) {
        const monthlyData = [
            { month: "Enero", year: 2023, reach: 4200, clicks: 280, engagement: "6.2%", cpr: "0.55 €" },
            { month: "Febrero", year: 2023, reach: 4800, clicks: 310, engagement: "6.4%", cpr: "0.53 €" },
            { month: "Marzo", year: 2024, reach: 7200, clicks: 480, engagement: "6.6%", cpr: "0.51 €" },
            { month: "Enero", year: 2025, reach: 9800, clicks: 620, engagement: "6.3%", cpr: "0.52 €" },
            { month: "Febrero", year: 2025, reach: 10500, clicks: 710, engagement: "6.5%", cpr: "0.50 €" },
            { month: "Marzo", year: 2025, reach: 11200, clicks: 780, engagement: "6.7%", cpr: "0.49 €" },
            { month: "Abril", year: 2025, reach: 12450, clicks: 842, engagement: "6.8%", cpr: "0.47 €" }
        ];

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
                monthSelect.innerHTML = '<option value="">Todos los meses</option>';
                getMonthsForYear(y).forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.value;
                    opt.textContent = m.name;
                    monthSelect.appendChild(opt);
                });
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

        initFilters();
    }
});

// === FUNCIONES AUXILIARES ===
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