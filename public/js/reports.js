import { db, auth } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Referencias a elementos
const historyFilterForm = document.getElementById('historyFilterForm');
const historyTableBody = document.getElementById('historyTableBody');
const historyMessage = document.getElementById('historyMessage');
const btnClearFilters = document.getElementById('btnClearFilters');
const btnPrintReport = document.getElementById('btnPrintReport');

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            loadHistory(true); // Carga inicial sin filtros
        }
    });
});

// Eventos
historyFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadHistory(false);
});

btnClearFilters.addEventListener('click', () => {
    historyFilterForm.reset();
    loadHistory(true);
});

btnPrintReport.addEventListener('click', printReport);

async function loadHistory(clearFilters = false) {
    historyTableBody.innerHTML = '';
    historyMessage.style.display = 'block';
    historyMessage.textContent = 'Buscando registros...';

    try {
        const requestsRef = collection(db, 'solicitudes');
        let filters = [];

        if (!clearFilters) {
            const state = document.getElementById('filterState').value;
            const place = document.getElementById('place').value;
            const dateFrom = document.getElementById('filterDateFrom').value;
            const dateTo = document.getElementById('filterDateTo').value;

            if (state) filters.push(where('state', '==', state));
            if (place) filters.push(where('place', '==', place));
            if (dateFrom) filters.push(where('date', '>=', dateFrom));
            if (dateTo) filters.push(where('date', '<=', dateTo));
        }

        // Ordenamiento (Requiere índice compuesto en Firebase si usas múltiples filtros)
        const q = query(requestsRef, ...filters, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            historyMessage.textContent = 'No se encontraron solicitudes con los filtros aplicados.';
            return;
        }

        historyMessage.style.display = 'none';

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const row = historyTableBody.insertRow();
            // Usamos las clases de estado de dashboard.css para el color
            const stateClass = `status-${data.state.toLowerCase()}`;

            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.activityName}</td>
                <td>${data.place}</td>
                <td>${data.date}</td>
                <td>${data.startTime}</td>
                <td>${data.endTime}</td>
                <td><span class="status-badge ${stateClass}">${data.state}</span></td>
            `;
        });

    } catch (error) {
        console.error("Error al cargar historial:", error);
        historyMessage.textContent = 'Error al cargar los datos. Verifique los índices de Firestore.';
    }
}

// Lógica de impresión PDF simplificada
async function printReport() {
    const table = document.getElementById('historyTable');
    if (historyTableBody.rows.length === 0) {
        Swal.fire('Error', 'No hay datos para exportar', 'warning');
        return;
    }

    Swal.fire({
        title: 'Generando Reporte',
        text: 'Espere un momento...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const canvas = await html2canvas(table, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        pdf.setFontSize(18);
        pdf.text('Reporte Histórico UniEvent', 14, 20);
        pdf.setFontSize(10);
        pdf.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth() - 28;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 14, 35, pdfWidth, pdfHeight);
        pdf.save(`Reporte_UniEvent_${new Date().getTime()}.pdf`);
        
        Swal.close();
    } catch (e) {
        Swal.fire('Error', 'No se pudo generar el PDF', 'error');
    }
}