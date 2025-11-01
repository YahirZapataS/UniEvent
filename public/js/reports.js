import { db, auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btnClose = document.getElementById('cerrarSesion');
const reportsGrid = document.querySelector('.reports-grid');
const reportsNav = document.querySelector('.reports-nav');
const historyFilterForm = document.getElementById('historyFilterForm');
const historyTableBody = document.querySelector('#historyTable tbody');
const historyMessage = document.getElementById('historyMessage');
const btnClearFilters = document.getElementById('btnClearFilters');
const btnPrintReport = document.getElementById('btnPrintReport');
let statusChartInstance = null;
let placeChartInstance = null;

btnClose.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("Error al cerrar sesión:", error);
    });
});

// 1. Enlazar la carga de reportes al evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Esperando autenticación...");

    // 2. Iniciar la verificación de autenticación
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            loadReportsData();
            setupNavigationView();
        }
    });
});

btnPrintReport.addEventListener('click', printReport);

// =====================================================================
// NAVEGACIÓN Y TABS
// =====================================================================

function setupNavigationView() {
    if (!reportsNav) return;

    reportsNav.addEventListener('click', (e) => {
        const button = e.target.closest('.nav-button');
        if (!button) return;

        const targetId = button.dataset.target;

        // Remover 'active' de todos los botones y vistas
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.report-view').forEach(view => view.classList.remove('active'));

        // Añadir 'active' al botón y vista seleccionados
        button.classList.add('active');
        document.getElementById(targetId).classList.add('active');

        // Si cambiamos a la vista de historial, recargamos los datos
        if (targetId === 'history-view') {
            loadHistory(true);
        }
        // Si cambiamos a gráficos, aseguramos que se rendericen (por si se perdieron)
        if (targetId === 'graphics-view') {
            loadReportsData(); // Renderizar sin recargar datos si ya existen
        }
    });
}


// =====================================================================
// LÓGICA DE HISTORIAL Y FILTROS
// =====================================================================

historyFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadHistory(false); // Cargar con filtros
});

btnClearFilters.addEventListener('click', () => {
    historyFilterForm.reset();
    loadHistory(true); // Cargar sin filtros
});


/**
 * Carga el historial de solicitudes con los filtros aplicados.
 * @param {boolean} clearFilters - Si es true, ignora los valores del formulario y carga todo.
 */
async function loadHistory(clearFilters = false) {
    historyTableBody.innerHTML = '';
    historyMessage.textContent = 'Cargando historial...';

    try {
        const requestsRef = collection(db, 'solicitudes');
        const filters = [];

        // Obtener valores de los filtros
        const state = clearFilters ? '' : document.getElementById('filterState').value;
        const place = clearFilters ? '' : document.getElementById('filterPlace').value.trim();
        const dateFrom = clearFilters ? '' : document.getElementById('filterDateFrom').value;
        const dateTo = clearFilters ? '' : document.getElementById('filterDateTo').value;
        const activityType = clearFilters ? '' : document.getElementById('filterActivityType').value;

        // 1. Aplicar filtros WHERE
        if (state) {
            filters.push(where('state', '==', state));
        }
        if (place) {
            // Firestore no soporta LIKE, pero soporta startsWith (para búsquedas exactas)
            // Para búsqueda parcial, usaríamos un índice de texto completo, pero aquí usamos igualdad:
            filters.push(where('place', '==', place));
        }
        if (activityType) {
            filters.push(where('activityType', '==', activityType));
        }

        // 2. Aplicar filtros de FECHA (Requiere índice)
        // Usaremos el campo 'date' (YYYY-MM-DD) para el rango
        if (dateFrom) {
            filters.push(where('date', '>=', dateFrom));
        }
        if (dateTo) {
            filters.push(where('date', '<=', dateTo));
        }

        // 3. Ordenar (Más reciente primero por fecha del evento, no de registro)
        filters.push(orderBy('date', 'asc'));
        filters.push(orderBy('startTime', 'asc'));

        // Construir la consulta
        const q = query(requestsRef, ...filters);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            historyMessage.textContent = 'No se encontraron solicitudes con los filtros aplicados.';
            return;
        }

        // 4. Rellenar la tabla
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const row = historyTableBody.insertRow();

            row.innerHTML = `
                <td>${data.title} ${data.name}</td>
                <td>${data.activityName} (${data.activityType})</td>
                <td>${data.place}</td>
                <td>${data.date}</td>
                <td>${data.startTime}</td>
                <td>${data.endTime}</td>
                <td><span class="status-${data.state.toLowerCase()}">${data.state}</span></td>
            `;
        });

        historyMessage.textContent = `Se encontraron ${snapshot.size} solicitudes.`;

    } catch (error) {
        console.error("Error al cargar historial con filtros:", error);
        historyMessage.textContent = 'Error al cargar el historial. Revise las reglas de seguridad o los índices de Firebase.';
    }
}

// =====================================================================
// LÓGICA DE CARGA Y AUTENTICACIÓN (Corregida)
// =====================================================================
/**
 * Carga todos los datos de solicitudes y los procesa para los reportes.
 */
async function loadReportsData() {
    console.log("Iniciando consulta de datos a Firestore...");

    const reportsGrid = document.querySelector('.reports-grid');

    // 1. Mostrar estado de carga (Creamos un mensaje simple sin manipular toda la cuadrícula)
    if (reportsGrid) {
        reportsGrid.insertAdjacentHTML('afterbegin', '<h3 id="loading-message">Cargando datos de reportes...</h3>');
    }

    try {
        const requestsRef = collection(db, 'solicitudes');
        const snapshot = await getDocs(requestsRef);

        // 2. Comprobar si hay datos
        if (snapshot.empty) {
            reportsGrid.innerHTML = '<h3>No hay solicitudes registradas para generar reportes.</h3>';
            return;
        }

        const allRequests = snapshot.docs.map(doc => doc.data());

        // 3. Procesar y renderizar (Las referencias a los canvas están seguras en el DOM)
        const statusData = processStatusData(allRequests);
        renderStatusChart(statusData);

        const placeData = processPlaceData(allRequests);
        renderPlaceChart(placeData);

    } catch (error) {
        // Manejo de errores de Firebase o de la conexión
        console.error("FATAL ERROR: Fallo al cargar reportes:", error);

        const errorMessage = `
            <h3>❌ Error al cargar los reportes</h3>
            <p>Detalles: ${error.message}</p>
        `;

        if (reportsGrid) {
            reportsGrid.innerHTML = errorMessage; // Reemplazar aquí si hay error FATAL
        }
    } finally {
        // 4. Limpiar mensaje de carga después de intentar renderizar
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        document.addEventListener('DOMContentLoaded', loadReportsData);
    }
});

/**
 * Agrupa las solicitudes por su estado.
 */
function processStatusData(requests) {
    const counts = {
        'Pendiente': 0,
        'Aceptada': 0,
        'Rechazada': 0,
        'Concluida': 0
    };

    requests.forEach(req => {
        if (counts.hasOwnProperty(req.state)) {
            counts[req.state]++;
        }
    });
    return counts;
}

/**
 * Agrupa las solicitudes por lugar y selecciona los Top 5.
 */
function processPlaceData(requests) {
    const placeCounts = {};

    requests.forEach(req => {
        const place = req.place || 'Lugar Desconocido';
        placeCounts[place] = (placeCounts[place] || 0) + 1;
    });

    // Convertir a array, ordenar y tomar los Top 5
    const sortedPlaces = Object.entries(placeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); // Tomar solo el Top 5

    return {
        labels: sortedPlaces.map(([place]) => place),
        data: sortedPlaces.map(([, count]) => count)
    };
}


// =====================================================================
// FUNCIONES DE RENDERIZADO DE GRÁFICOS (Chart.js)
// =====================================================================

function renderStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    // **CORRECCIÓN: Destruir la instancia anterior si existe**
    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    const colors = {
        'Pendiente': '#ffc107',
        'Aceptada': '#28a745',
        'Rechazada': '#dc3545',
        'Concluida': '#6c757d'
    };
    const labels = Object.keys(data);
    const chartData = Object.values(data);
    const backgroundColors = labels.map(label => colors[label]);

    // **Almacenar la nueva instancia**
    statusChartInstance = new Chart(ctx, {
        type: 'pie', // Gráfico de pastel
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Solicitudes',
                data: chartData,
                backgroundColor: backgroundColors,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: false } // Desactivar si el título ya está en el <h3>
            }
        }
    });
}

function renderPlaceChart(data) {
    const ctx = document.getElementById('placeChart');
    if (!ctx) return;

    // **CORRECCIÓN: Destruir la instancia anterior si existe**
    if (placeChartInstance) {
        placeChartInstance.destroy();
    }

    // **Almacenar la nueva instancia**
    placeChartInstance = new Chart(ctx, {
        type: 'bar', // Gráfico de barras
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Eventos Registrados',
                data: data.data,
                backgroundColor: '#5a67d8', // Color morado/azul para las barras
                borderColor: '#3c47a5',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cantidad de Eventos' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

const { jsPDF } = window.jspdf;

/**
 * Genera un PDF del Historial Completo (título y tabla de resultados).
 */
async function printReport() {
    const resultsSection = document.getElementById('resultsSection');
    const title = 'Reporte de Historial de Uso de Espacios';

    if (!resultsSection || historyTableBody.children.length === 0) {
        Swal.fire('Atención', 'No hay resultados en la tabla para imprimir.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Generando PDF...',
        html: 'Por favor, espera. El proceso puede tardar unos segundos.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 1. Clonar el elemento de la tabla para manipularlo si es necesario (evitar modificar el DOM real)
        const tableClone = resultsSection.cloneNode(true);
        // Ocultar el mensaje de conteo en el PDF
        const message = tableClone.querySelector('#historyMessage');
        if (message) message.remove();

        // 2. Usar html2canvas para renderizar la tabla como una imagen
        const canvas = await html2canvas(resultsSection, { // <-- Usamos el elemento REAL
            scale: 2, 
            logging: false,
            useCORS: true // Agregamos useCORS por si hay alguna imagen o recurso externo.
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' retrato, 'mm' unidades, 'a4' tamaño

        const imgWidth = 200;
        const pageHeight = pdf.internal.pageSize.height;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 10; // Margen superior

        // 3. Añadir título del reporte
        pdf.setFontSize(16);
        pdf.text(title, 10, position);
        position += 10; // Espacio después del título

        // 4. Agregar la imagen de la tabla al PDF
        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // 5. Manejar múltiples páginas si el contenido es demasiado largo
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // 6. Descargar el archivo
        pdf.save('Reporte_UniEvent_' + new Date().toISOString().slice(0, 10) + '.pdf');

        Swal.close();
        Swal.fire('PDF Generado', 'El reporte ha sido descargado exitosamente.', 'success');

    } catch (error) {
        console.error("Error al generar el PDF:", error);
        Swal.close();
        Swal.fire('Error', 'Hubo un problema al generar el PDF. Asegúrate de que la tabla sea visible.', 'error');
    }
}