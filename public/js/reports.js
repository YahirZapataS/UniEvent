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

document.addEventListener('DOMContentLoaded', () => {

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


function setupNavigationView() {
    if (!reportsNav) return;

    reportsNav.addEventListener('click', (e) => {
        const button = e.target.closest('.nav-button');
        if (!button) return;

        const targetId = button.dataset.target;
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.report-view').forEach(view => view.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(targetId).classList.add('active');

        if (targetId === 'history-view') {
            loadHistory(true);
        }
        if (targetId === 'graphics-view') {
            loadReportsData();
        }
    });
}



historyFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadHistory(false);
});

btnClearFilters.addEventListener('click', () => {
    historyFilterForm.reset();
    loadHistory(true);
});


/**
 * Carga el historial de solicitudes con los filtros aplicados.
 * @param {boolean} clearFilters
 */
async function loadHistory(clearFilters = false) {
    historyTableBody.innerHTML = '';
    historyMessage.textContent = 'Cargando historial...';

    try {
        const requestsRef = collection(db, 'solicitudes');
        const filters = [];



        const state = clearFilters ? '' : document.getElementById('filterState').value;

        const place = clearFilters ? '' : document.getElementById('place').value.trim();

        const dateFrom = clearFilters ? '' : document.getElementById('filterDateFrom').value;

        const dateTo = clearFilters ? '' : document.getElementById('filterDateTo').value;

        const activityType = clearFilters ? '' : document.getElementById('filterActivityType').value;


        if (state) {
            filters.push(where('state', '==', state));
        }
        if (place) {
            filters.push(where('place', '==', place));
        }
        if (activityType) {
            filters.push(where('activityType', '==', activityType));
        }


        if (dateFrom) {
            filters.push(where('date', '>=', dateFrom));
        }
        if (dateTo) {
            filters.push(where('date', '<=', dateTo));
        }


        filters.push(orderBy('date', 'asc'));
        filters.push(orderBy('startTime', 'asc'));


        const q = query(requestsRef, ...filters);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            historyMessage.textContent = 'No se encontraron solicitudes con los filtros aplicados.';
            return;
        }

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

async function loadReportsData() {

    const reportsGrid = document.querySelector('.reports-grid');

    if (reportsGrid) {
        reportsGrid.insertAdjacentHTML('afterbegin', '<h3 id="loading-message">Cargando datos de reportes...</h3>');
    }

    try {
        const requestsRef = collection(db, 'solicitudes');
        const snapshot = await getDocs(requestsRef);

        if (snapshot.empty) {
            reportsGrid.innerHTML = '<h3>No hay solicitudes registradas para generar reportes.</h3>';
            return;
        }

        const allRequests = snapshot.docs.map(doc => doc.data());
        const statusData = processStatusData(allRequests);
        renderStatusChart(statusData);

        const placeData = processPlaceData(allRequests);
        renderPlaceChart(placeData);

    } catch (error) {
        console.error("FATAL ERROR: Fallo al cargar reportes:", error);

        const errorMessage = `
            <h3>Error al cargar los reportes</h3>
            <p>Detalles: ${error.message}</p>
        `;

        if (reportsGrid) {
            reportsGrid.innerHTML = errorMessage;
        }
    } finally {
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

function processPlaceData(requests) {
    const placeCounts = {};

    requests.forEach(req => {
        const place = req.place || 'Lugar Desconocido';
        placeCounts[place] = (placeCounts[place] || 0) + 1;
    });

    const sortedPlaces = Object.entries(placeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); // Tomar solo el Top 5

    return {
        labels: sortedPlaces.map(([place]) => place),
        data: sortedPlaces.map(([, count]) => count)
    };
}

function renderStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
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
    statusChartInstance = new Chart(ctx, {
        type: 'pie',
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
                title: { display: false }
            }
        }
    });
}

function renderPlaceChart(data) {
    const ctx = document.getElementById('placeChart');
    if (!ctx) return;
    if (placeChartInstance) {
        placeChartInstance.destroy();
    }

    placeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Eventos Registrados',
                data: data.data,
                backgroundColor: '#5a67d8',
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

async function printReport() {
    const resultsTableBody = document.querySelector('#historyTable tbody');
    const resultsSection = document.getElementById('history-view');
    const title = 'Reporte de Historial de Uso de Espacios';

    if (!resultsTableBody || resultsTableBody.rows.length === 0) {
        Swal.fire({
            title: 'Atención',
            text: 'No hay resultados visibles en la tabla para generar el reporte.',
            icon: 'warning',
            confirmButtonColor: '#5a67d8'
        });
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
        const tableClone = resultsSection.cloneNode(true);
        const message = tableClone.querySelector('#historyMessage');
        if (message) message.remove();
        const canvas = await html2canvas(resultsSection, {
            scale: 2,
            logging: false,
            useCORS: true
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgWidth = 200;
        const pageHeight = pdf.internal.pageSize.height;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 10;
        pdf.setFontSize(16);
        pdf.text(title, 10, position);
        position += 10;
        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('Reporte_UniEvent_' + new Date().toISOString().slice(0, 10) + '.pdf');

        Swal.close();
        Swal.fire('PDF Generado', 'El reporte ha sido descargado exitosamente.', 'success');

    } catch (error) {
        console.error("Error al generar el PDF:", error);
        Swal.close();
        Swal.fire('Error', 'Hubo un problema al generar el PDF. Asegúrate de que la tabla sea visible.', 'error');
    }
}