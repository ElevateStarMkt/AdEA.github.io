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

    // === 3. CARGAR OBRAS DESDE "Obras" Y BOTÓN DE AÑADIR ===
    const worksContainer = document.getElementById('works-container');
    const addWorkSection = document.getElementById('add-work-section');
    const addWorkBtn = document.getElementById('add-work-btn');
    const upgradeWorkBtn = document.getElementById('upgrade-work-btn');

    if (worksContainer && currentUser) {
        (async () => {
            try {
                // 1. Obtener el plan del usuario
                let rawPlan = currentUser.get('plan') || 'Básico';
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

                // 2. Definir límites de obras por plan
                const limits = {
                    "Básico": 3,
                    "Prime": 4,
                    "Supremo": 6,
                    "Legado": 9
                };
                const maxWorks = limits[userPlan] || 3; // Por defecto, 3

                // 3. Obtener obras SOLO de la clase "Obras"
                const Obra = Parse.Object.extend("Obras"); // Asumiendo que la clase se llama "Obras"

                const queryObras = new Parse.Query(Obra);
                queryObras.equalTo("autor", currentUser); // Filtrar por autor logueado
                queryObras.descending("createdAt"); // Ordenar por creación, más reciente primero

                const obrasResult = await queryObras.find();

                const activeWorksCount = obrasResult.length; // Contar solo obras de la clase "Obras"

                // 4. Renderizar obras en el contenedor
                if (activeWorksCount === 0) {
                    worksContainer.innerHTML = '<p class="no-works">Aún no has añadido ninguna obra. <a href="./encuesta.html">Rellena la encuesta</a> para comenzar.</p>';
                } else {
                    // Asumiendo que la clase "Obras" tiene campos como titulo, genero, enlace, etc.
                    worksContainer.innerHTML = obrasResult.map(obra => {
                        const titulo = obra.get('titulo') || obra.get('tituloObra') || 'Sin título'; // Ajusta según tu esquema
                        const genero = obra.get('genero') || obra.get('generoObra') || 'Sin género'; // Ajusta según tu esquema
                        const enlace = obra.get('enlace') || obra.get('enlaceObra') || '#'; // Ajusta según tu esquema
                        // Añade otros campos según tu estructura de 'Obras', como sinopsis, pdfEnlace, etc.
                        return `
                        <div class="work-card">
                            <h4>${titulo}</h4>
                            <p class="work-genre">${genero}</p>
                            <span class="work-status">Activa</span>
                            <a href="${enlace}" target="_blank" class="work-link">Ver obra</a>
                        </div>
                    `;
                    }).join('');
                }

                // 5. Cargar nombre artístico desde la clase "Obras" o como antes
                let nombreArtistico = 'un autor';
                // Si tienes un campo 'nombreArtistico' en la clase "Obras", cámbialo aquí
                // Por ejemplo: nombreArtistico = obrasResult[0]?.get('nombreArtistico') || nombreArtistico;

                // Si no, puedes seguir obteniéndolo de la encuesta más reciente si es necesario
                // const Encuesta = Parse.Object.extend("Encuesta");
                // const queryEncuesta = new Parse.Query(Encuesta);
                // queryEncuesta.equalTo("autor", currentUser);
                // queryEncuesta.descending("createdAt");
                // const ultimaEncuesta = await queryEncuesta.first();
                // if (ultimaEncuesta) {
                //     nombreArtistico = ultimaEncuesta.get('nombreArtistico') || nombreArtistico;
                // }

                // O simplemente dejarlo como está si ya está en el usuario o no es crítico para el botón
                // Si lo necesitas, asegúrate de obtenerlo de la fuente correcta.

                // 6. Configurar y mostrar/ocultar botón de añadir obra o upgrade
                if (addWorkSection) {
                    if (activeWorksCount < maxWorks) {
                        // Mostrar botón para añadir obra
                        if (addWorkBtn) {
                            addWorkBtn.href = `https://t.me/adea_oficial?text=Soy%20${encodeURIComponent(nombreArtistico)}%20y%20me%20gustaría%20añadir%20una%20obra`;
                            addWorkBtn.style.display = 'inline-block'; // Mostrar
                        }
                        if (upgradeWorkBtn) upgradeWorkBtn.style.display = 'none'; // Ocultar
                    } else {
                        // Mostrar botón de upgrade
                        if (addWorkBtn) addWorkBtn.style.display = 'none'; // Ocultar
                        if (upgradeWorkBtn) upgradeWorkBtn.style.display = 'inline-block'; // Mostrar
                    }
                    addWorkSection.style.display = 'block'; // Mostrar la sección entera
                }
            } catch (error) {
                console.error('Error al cargar obras o configurar botón:', error);
                worksContainer.innerHTML = '<p class="no-works">Error al cargar. <a href="./encuesta.html">Reintentar</a>.</p>';
                if (addWorkSection) addWorkSection.style.display = 'none';
            }
        })();
    } else {
        // Si no está en panel o no hay usuario, ocultar la sección
        if (addWorkSection) addWorkSection.style.display = 'none';
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

    // === 9. FILTROS DE INFORME (panel.html) - CARGA DESDE BACK4APP ===
    if (document.getElementById('report-content')) {
        const currentUser = Parse.User.current();
        if (!currentUser) {
            console.error("Usuario no autenticado. No se pueden cargar estadísticas.");
            document.getElementById('report-content').innerHTML = '<p class="no-works">Error: Acceso no autorizado.</p>';
            return;
        }

        const yearSelect = document.getElementById('filter-year');
        const monthSelect = document.getElementById('filter-month');
        const quarterSelect = document.getElementById('filter-quarter');
        const reportContent = document.getElementById('report-content');

        if (!yearSelect || !monthSelect || !quarterSelect) {
            console.error("Falta un elemento de filtro en el DOM.");
            return;
        }

        // Definir monthNames globalmente en este scope
        const monthNames = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        // Cargar años con datos
        async function loadYears() {
            try {
                const Estadisticas = Parse.Object.extend("Estadisticas");
                const query = new Parse.Query(Estadisticas);
                query.equalTo("autor", currentUser);
                query.ascending("anio");
                const results = await query.find();

                const uniqueYears = [...new Set(results.map(e => e.get("anio")))].sort((a, b) => b - a);

                yearSelect.innerHTML = '';
                uniqueYears.forEach(y => {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = y;
                    yearSelect.appendChild(opt);
                });

                if (uniqueYears.length > 0) {
                    yearSelect.value = uniqueYears[0];
                    updateMonthsAndQuarters(uniqueYears[0]);
                } else {
                    reportContent.innerHTML = '<p class="no-works">No hay datos de estadísticas disponibles aún.</p>';
                }
            } catch (error) {
                console.error("Error al cargar años:", error);
                reportContent.innerHTML = '<p class="no-works">Error al cargar los años disponibles.</p>';
            }
        }

        // Actualizar meses y cuatrimestres para el año seleccionado
        async function updateMonthsAndQuarters(year) {
            try {
                const Estadisticas = Parse.Object.extend("Estadisticas");
                const query = new Parse.Query(Estadisticas);
                query.equalTo("autor", currentUser);
                query.equalTo("anio", year);
                const results = await query.find();

                const meses = [...new Set(results.map(e => e.get("mes")))];

                // Meses
                monthSelect.innerHTML = '<option value="">Todos los meses</option>';
                meses.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = monthNames[m];
                    monthSelect.appendChild(opt);
                });

                // Cuatrimestres (Q1: Ene-Abr, Q2: May-Ago, Q3: Sep-Dic)
                quarterSelect.innerHTML = '<option value="">Todos los cuatrimestres</option>';
                if (meses.some(m => m >= 1 && m <= 4)) {
                    const opt = document.createElement('option');
                    opt.value = "q1";
                    opt.textContent = "Ene–Abr";
                    quarterSelect.appendChild(opt);
                }
                if (meses.some(m => m >= 5 && m <= 8)) {
                    const opt = document.createElement('option');
                    opt.value = "q2";
                    opt.textContent = "May–Ago";
                    quarterSelect.appendChild(opt);
                }
                if (meses.some(m => m >= 9 && m <= 12)) {
                    const opt = document.createElement('option');
                    opt.value = "q3";
                    opt.textContent = "Sep–Dic";
                    quarterSelect.appendChild(opt);
                }
            } catch (error) {
                console.error("Error al actualizar meses/cuatrimestres:", error);
            }
        }

        // === CARGA DE GRÁFICOS ===
        let chartAges = null;
        let chartPlatforms = null;

        // Función para renderizar gráficos
        function renderCharts(agesData, platformsData) {
            const ctxAges = document.getElementById('chartAgesCanvas');
            const ctxPlatforms = document.getElementById('chartPlatformsCanvas');

            if (!ctxAges || !ctxPlatforms) {
                console.warn("No se encontraron canvas para los gráficos.");
                return;
            }

            // Destruir gráficos anteriores si existen
            if (chartAges) chartAges.destroy();
            if (chartPlatforms) chartPlatforms.destroy();

            // Gráfico de Edades
            chartAges = new Chart(ctxAges, {
                type: 'bar',
                data: {
                    labels: Object.keys(agesData),
                    datasets: [{
                        label: 'Porcentaje',
                        data: Object.values(agesData),
                        backgroundColor: 'rgba(184, 92, 56, 0.7)',
                        borderColor: 'var(--accent)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    }
                }
            });

            // Gráfico de Plataformas
            chartPlatforms = new Chart(ctxPlatforms, {
                type: 'bar',
                data: {
                    labels: Object.keys(platformsData),
                    datasets: [{
                        label: 'Porcentaje',
                        data: Object.values(platformsData),
                        backgroundColor: 'rgba(58, 47, 32, 0.7)',
                        borderColor: 'var(--text)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    }
                }
            });
        }

        // Modificar la función loadStats para incluir audiencia
        async function loadStats(year, month = null, quarter = null) {
            try {
                const Estadisticas = Parse.Object.extend("Estadisticas");
                const query = new Parse.Query(Estadisticas);
                query.equalTo("autor", currentUser);
                query.equalTo("anio", year);

                if (month) {
                    query.equalTo("mes", month);
                } else if (quarter) {
                    if (quarter === "q1") query.greaterThanOrEqualTo("mes", 1).lessThanOrEqualTo("mes", 4);
                    if (quarter === "q2") query.greaterThanOrEqualTo("mes", 5).lessThanOrEqualTo("mes", 8);
                    if (quarter === "q3") query.greaterThanOrEqualTo("mes", 9).lessThanOrEqualTo("mes", 12);
                }

                query.ascending("mes");

                const results = await query.find();

                if (results.length === 0) {
                    reportContent.innerHTML = '<p class="no-works">No hay estadísticas para este periodo.</p>';
                    // Limpiar gráficos si no hay datos
                    if (chartAges) chartAges.destroy();
                    if (chartPlatforms) chartPlatforms.destroy();
                    return;
                }

                // Sumar valores si hay múltiples meses
                const data = results.reduce((acc, e) => {
                    acc.impresiones += e.get("impresiones") || 0;
                    acc.alcanceTotal += e.get("alcanceTotal") || 0;
                    acc.alcanceUnico += e.get("alcanceUnico") || 0;
                    acc.clicksEnLink += e.get("clicksEnLink") || 0;
                    acc.costoPorClic = e.get("costoPorClic") || 0;
                    acc.CPM = e.get("CPM") || 0;

                    // Sumar audiencia
                    const edades = e.get("audienciaEdades") || {};
                    for (const [rango, valor] of Object.entries(edades)) {
                        acc.audienciaEdades[rango] = (acc.audienciaEdades[rango] || 0) + valor;
                    }

                    const plataformas = e.get("audienciaPlataformas") || {};
                    for (const [plataforma, valor] of Object.entries(plataformas)) {
                        acc.audienciaPlataformas[plataforma] = (acc.audienciaPlataformas[plataforma] || 0) + valor;
                    }

                    return acc;
                }, {
                    impresiones: 0,
                    alcanceTotal: 0,
                    alcanceUnico: 0,
                    clicksEnLink: 0,
                    costoPorClic: 0,
                    CPM: 0,
                    audienciaEdades: {},
                    audienciaPlataformas: {}
                });

                // Calcular CTR
                const ctr = data.impresiones > 0 ? (data.clicksEnLink / data.impresiones * 100).toFixed(2) + "%" : "0%";

                // Mostrar estadísticas
                let title = `${year}`;
                if (month) title = `${monthNames[month]} ${year}`;
                else if (quarter) {
                    const qText = quarterSelect.options[quarterSelect.selectedIndex]?.text || "cuatrimestre";
                    title = `${qText} ${year}`;
                } else {
                    title = `Todos los meses ${year}`;
                }

                reportContent.innerHTML = `
            <h4 style="text-align:center; margin-bottom:1.5rem; color:var(--accent);">${title}</h4>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Impresiones</h4>
                    <p class="stat-value">${data.impresiones.toLocaleString()}</p>
                </div>
                <div class="stat-card">
                    <h4>Alcance Total</h4>
                    <p class="stat-value">${data.alcanceTotal.toLocaleString()}</p>
                </div>
                <div class="stat-card">
                    <h4>Alcance Único</h4>
                    <p class="stat-value">${data.alcanceUnico.toLocaleString()}</p>
                </div>
                <div class="stat-card">
                    <h4>CTR</h4>
                    <p class="stat-value">${ctr}</p>
                </div>
                <div class="stat-card">
                    <h4>Clics en Link</h4>
                    <p class="stat-value">${data.clicksEnLink.toLocaleString()}</p>
                </div>
                <div class="stat-card">
                    <h4>Costo por Clic</h4>
                    <p class="stat-value">${data.costoPorClic.toFixed(2)} €</p>
                </div>
                <div class="stat-card">
                    <h4>CPM</h4>
                    <p class="stat-value">${data.CPM.toFixed(2)} €</p>
                </div>
            </div>
        `;

                // Renderizar gráficos
                renderCharts(data.audienciaEdades, data.audienciaPlataformas);

            } catch (error) {
                console.error("Error al cargar estadísticas:", error);
                reportContent.innerHTML = '<p class="no-works">Error al cargar las estadísticas.</p>';
            }
        }

        // Eventos de cambio en filtros
        yearSelect.addEventListener('change', (e) => {
            updateMonthsAndQuarters(parseInt(e.target.value));
            loadStats(parseInt(e.target.value));
        });

        monthSelect.addEventListener('change', (e) => {
            const year = parseInt(yearSelect.value);
            const month = e.target.value ? parseInt(e.target.value) : null;
            quarterSelect.value = "";
            loadStats(year, month);
        });

        quarterSelect.addEventListener('change', (e) => {
            const year = parseInt(yearSelect.value);
            const quarter = e.target.value || null;
            monthSelect.value = "";
            loadStats(year, null, quarter);
        });

        // Cargar años al inicio
        loadYears();
    }

    // === 11. PERFIL: DESCARGAR DATOS ===
    const downloadDataBtn = document.getElementById('download-data-btn');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', async () => {
            try {
                const user = Parse.User.current();
                if (!user) throw new Error('Usuario no autenticado');

                // Recuperar datos del usuario
                const userData = {
                    username: user.get('username'),
                    email: user.get('email'),
                    autorinflu: user.get('autorinflu'),
                    plan: user.get('plan'),
                    createdAt: user.get('createdAt'),
                    updatedAt: user.get('updatedAt')
                };

                // Recuperar datos de Encuesta (si es autor)
                let encuestasData = [];
                if (userData.autorinflu === 'autor') {
                    const Encuesta = Parse.Object.extend("Encuesta");
                    const query = new Parse.Query(Encuesta);
                    query.equalTo("autor", user);
                    query.descending("createdAt");
                    const encuestas = await query.find();
                    encuestasData = encuestas.map(e => ({
                        nombreArtistico: e.get('nombreArtistico'),
                        pais: e.get('pais'),
                        tituloObra: e.get('tituloObra'),
                        generoObra: e.get('generoObra'),
                        enlaceObra: e.get('enlaceObra'),
                        sinopsis: e.get('sinopsis'),
                        fechaEnvio: e.get('fechaEnvio'),
                        createdAt: e.createdAt,
                        updatedAt: e.updatedAt
                    }));
                }

                // Combinar datos
                const fullData = {
                    userInfo: userData,
                    encuestas: encuestasData
                };

                // Convertir a JSON
                const dataStr = JSON.stringify(fullData, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

                // Crear enlace y simular clic
                const exportFileDefaultName = `datos_adea_${user.get('username')}.json`;

                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();

                showToast('✅ Datos descargados correctamente.');
            } catch (error) {
                console.error('Error al descargar datos:', error);
                showToast('❌ Error al descargar tus datos. Inténtalo de nuevo.');
            }
        });
    }

    // === 12. PERFIL: CAMBIO DE CORREO ===
    const emailForm = document.getElementById('change-email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPass = document.getElementById('current-password-email').value;
            const newEmail = document.getElementById('new-email').value;
            const msg = document.getElementById('email-message');

            if (!newEmail.includes('@')) {
                showError(msg, 'Por favor, introduce un correo electrónico válido.');
                return;
            }

            try {
                const user = Parse.User.current();
                // Validar credenciales
                await Parse.User.logIn(user.get('username'), currentPass);
                // Cambiar correo
                user.set('email', newEmail);
                await user.save();
                showToast('✅ Correo electrónico actualizado correctamente.');
                emailForm.reset(); // Limpiar el formulario
            } catch (error) {
                console.error('Error al cambiar correo:', error);
                showError(msg, '❌ Contraseña actual incorrecta o error al actualizar.');
            }
        });
    }

    // === 13. PERFIL: VISUALIZACIÓN Y EDICIÓN DE DATOS ===
    const userInfoDisplay = document.getElementById('user-info-display');
    const editUserInfoForm = document.getElementById('edit-user-info-form');
    const editUserInfoBtn = document.getElementById('edit-user-info-btn');
    const saveUserInfoBtn = document.getElementById('save-user-info-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editUsername = document.getElementById('edit-username');
    const editNombreArtistico = document.getElementById('edit-nombre-artistico');
    const editPais = document.getElementById('edit-pais');
    const editAutorinflu = document.getElementById('edit-autorinflu');

    if (editUserInfoBtn && userInfoDisplay) {
        let encuestaObjeto = null; // Para almacenar el objeto Encuesta a editar

        // Función para cargar y mostrar los datos
        const cargarYMostrarDatos = async () => {
            try {
                const user = Parse.User.current();
                if (!user) return;

                // Mostrar datos básicos del usuario
                userInfoDisplay.innerHTML = `
                    <p><strong>Nombre de usuario:</strong> ${user.get('username') || 'No disponible'}</p>
                    <p><strong>Correo electrónico:</strong> ${user.get('email') || 'No disponible'}</p>
                    <p><strong>Tipo de usuario:</strong> ${user.get('autorinflu') || 'No definido'}</p>
                    <p><strong>Plan actual:</strong> ${user.get('plan') || 'Básico'}</p>
                `;

                // Intentar cargar datos de Encuesta si es autor
                if (user.get('autorinflu') === 'autor') {
                    const Encuesta = Parse.Object.extend("Encuesta");
                    const query = new Parse.Query(Encuesta);
                    query.equalTo("autor", user);
                    query.descending("createdAt");
                    encuestaObjeto = await query.first(); // Obtiene la última encuesta

                    if (encuestaObjeto) {
                        userInfoDisplay.innerHTML += `
                            <p><strong>Nombre artístico:</strong> ${encuestaObjeto.get('nombreArtistico') || 'No definido'}</p>
                            <p><strong>País:</strong> ${encuestaObjeto.get('pais') || 'No definido'}</p>
                        `;
                    } else {
                        userInfoDisplay.innerHTML += `<p><strong>Nombre artístico:</strong> No disponible (no has completado la encuesta)</p>`;
                        userInfoDisplay.innerHTML += `<p><strong>País:</strong> No disponible (no has completado la encuesta)</p>`;
                    }
                }
            } catch (error) {
                console.error('Error al cargar datos para mostrar:', error);
                userInfoDisplay.innerHTML = '<p>Error al cargar la información.</p>';
            }
        };

        // Cargar datos al inicio
        cargarYMostrarDatos();

        // Evento: Botón "Editar"
        editUserInfoBtn.addEventListener('click', async () => {
            const user = Parse.User.current();
            if (!user) return;

            // Ocultar vista y mostrar formulario de edición
            userInfoDisplay.style.display = 'none';
            editUserInfoForm.style.display = 'block';
            // Ocultar el botón "Editar información" para evitar solapamiento
            editUserInfoBtn.style.display = 'none';

            // Cargar valores actuales en el formulario de edición
            editUsername.value = user.get('username') || '';
            editAutorinflu.value = user.get('autorinflu') || ''; // Este campo sigue estando en el form pero es 'disabled'

            if (user.get('autorinflu') === 'autor' && encuestaObjeto) {
                editNombreArtistico.value = encuestaObjeto.get('nombreArtistico') || '';
                editPais.value = encuestaObjeto.get('pais') || '';
            } else {
                // Si no hay encuesta o no es autor, dejar campos vacíos o deshabilitar si es necesario
                editNombreArtistico.value = '';
                editPais.value = '';
            }
        });

        // Evento: Botón "Guardar cambios"
        saveUserInfoBtn.addEventListener('click', async () => {
            const user = Parse.User.current();
            if (!user) return;

            try {
                // Actualizar solo los campos de Parse.User si es necesario (en este caso, solo username si estuviera permitido)
                // Actualizar campos de Encuesta (nombreArtistico, pais)
                if (user.get('autorinflu') === 'autor' && encuestaObjeto) {
                    encuestaObjeto.set('nombreArtistico', editNombreArtistico.value.trim());
                    encuestaObjeto.set('pais', editPais.value.trim());
                    await encuestaObjeto.save();
                    showToast('✅ Información actualizada correctamente.');
                } else if (user.get('autorinflu') === 'autor' && !encuestaObjeto) {
                    showToast('⚠️ No se puede editar. Primero debes completar la encuesta.');
                    return; // No continuar si no hay encuesta para editar
                }

                // Recargar la vista y ocultar el formulario
                await cargarYMostrarDatos(); // Recarga los datos mostrados
                userInfoDisplay.style.display = 'block';
                editUserInfoForm.style.display = 'none';
                // Mostrar nuevamente el botón "Editar información"
                editUserInfoBtn.style.display = 'inline-block'; // o 'block', dependiendo del estilo original

            } catch (error) {
                console.error('Error al guardar datos:', error);
                showToast('❌ Error al guardar los cambios. Inténtalo de nuevo.');
            }
        });

        // Evento: Botón "Cancelar"
        cancelEditBtn.addEventListener('click', () => {
            userInfoDisplay.style.display = 'block';
            editUserInfoForm.style.display = 'none';
            // Mostrar nuevamente el botón "Editar información"
            editUserInfoBtn.style.display = 'inline-block'; // o 'block', dependiendo del estilo original
        });
    }

    // === 14. PERFIL: ELIMINAR CUENTA ===
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const deleteModal = document.getElementById('delete-confirmation-modal');
    const confirmUsername = document.getElementById('confirm-username');
    const confirmPassword = document.getElementById('confirm-password');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            deleteModal.classList.remove('hidden');
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.classList.add('hidden');
            confirmUsername.value = '';
            confirmPassword.value = '';
        });
    }

    // Manejar el envío del formulario de confirmación de eliminación
    const deleteAccountConfirmationForm = document.getElementById('delete-account-confirmation-form');
    if (deleteAccountConfirmationForm) {
        deleteAccountConfirmationForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevenir recarga de página

            const user = Parse.User.current();
            if (!user) return;

            const inputUsername = confirmUsername.value.trim();
            const inputPassword = confirmPassword.value; // Se obtiene del campo del formulario

            // Validar que coincidan los campos
            if (inputUsername !== user.get('username')) {
                showToast('❌ El nombre de usuario no coincide.', 'error');
                return;
            }

            try {
                // Intentar login con credenciales ingresadas para confirmar identidad
                await Parse.User.logIn(inputUsername, inputPassword);

                const tipoUsuario = user.get('autorinflu');

                if (tipoUsuario === 'autor') {
                    // Si es autor, redirigir a Telegram
                    const nombreArtistico = user.get('nombreArtistico') || 'un autor'; // Fallback si no está en User
                    // Intentar obtener el nombre artístico de la última encuesta si no está en User
                    if (!nombreArtistico || nombreArtistico === 'un autor') {
                        const Encuesta = Parse.Object.extend("Encuesta");
                        const query = new Parse.Query(Encuesta);
                        query.equalTo("autor", user);
                        query.descending("createdAt");
                        const ultimaEncuesta = await query.first();
                        if (ultimaEncuesta) {
                            nombreArtistico = ultimaEncuesta.get('nombreArtistico') || nombreArtistico;
                        }
                    }
                    const mensaje = `Soy ${encodeURIComponent(nombreArtistico)} y quiero cancelar mi suscripción`;
                    window.open(`https://t.me/adea_oficial?text=${mensaje}`, '_blank');
                    deleteModal.classList.add('hidden');
                    deleteAccountConfirmationForm.reset(); // Limpiar el formulario
                } // Si es influencer, cambiar estado a inactivo en lugar de eliminar
                else if (tipoUsuario === 'influencer') {
                    user.set('situacion', false); // Asumiendo que tienes un campo 'activo' booleano
                    await user.save();
                    showToast('✅ Tu cuenta ha sido desactivada.', 'success');
                    setTimeout(() => {
                        Parse.User.logOut(); // Cerrar sesión
                        window.location.href = 'login.html'; // Redirigir al login
                    }, 2000);
                } else {
                    showToast('❌ Tipo de usuario desconocido.', 'error');
                }
            } catch (error) {
                console.error('Error al confirmar eliminación:', error);
                showToast('❌ Contraseña incorrecta o error de autenticación.', 'error');
            }
        });
    }

    // === FIN DEL DOCUMENT READY ===


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