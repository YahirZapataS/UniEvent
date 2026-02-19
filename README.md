
# UniEvent

**Sistema de Gestión y Control de Espacios Académicos**

UniEvent es una plataforma web integral diseñada para la administración eficiente de auditorios y aulas académicas. Permite a los solicitantes reservar espacios mediante un calendario dinámico y ofrece a los administradores un panel de gestión robusto para aprobar, rechazar y monitorear eventos en tiempo real.

---

## Funcionalidades Principales

### Para Administradores

* **Panel de Gestión centralizado**: Visualización y filtrado de solicitudes pendientes, aprobadas, rechazadas y concluidas.
* **Control de Estados**: Aprobación o rechazo de solicitudes con notificaciones automáticas vía EmailJS.
* **Limpieza Automática**: El sistema marca automáticamente como "Concluidas" las actividades cuya fecha y hora de término ya han pasado.
* **Calendario Institucional**: Vista mensual de eventos confirmados integrada con FullCalendar.
* **Reportes y Exportación**: Generación de reportes históricos con filtros por estado, lugar y fecha, exportables a PDF.
* **Configuración del Sistema**: Ajuste dinámico del correo institucional del administrador y tiempos de anticipación para recordatorios.

### Para Solicitantes

* **Formulario de Solicitud Inteligente**: Validación de disponibilidad en tiempo real para evitar traslapes de horarios.
* **Calendario de Disponibilidad Visual**: Los días se iluminan con colores (verde, amarillo, rojo) según la carga de eventos programados.
* **Reglas de Reservación**: Restricción automática para fines de semana y horarios fuera del rango permitido (08:00 AM - 08:00 PM).

---

## Stack Tecnológico

* **Frontend**: HTML5, CSS3 (Variables, Flexbox, Grid) y JavaScript Vanilla (ES6 Modules).
* **Base de Datos y Autenticación**: Firebase Firestore y Firebase Auth.
* **Componentes Web**: Arquitectura modular con Custom Elements para elementos globales como el Sidebar.
* **Librerías Externas**:
* **FullCalendar**: Visualización de agenda.
* **SweetAlert2**: Modales interactivos y alertas de sistema.
* **EmailJS**: Motor de notificaciones por correo electrónico.
* **jsPDF / html2canvas**: Motor de generación de reportes en PDF.
* **Flatpickr**: Selector de fechas con lógica de disponibilidad.



---

## Estructura del Proyecto

```text
/
├── index.html              # Landing page principal
├── login.html              # Portal de acceso administrativo
├── forgot-password.html    # Recuperación de contraseña
├── requests.html           # Formulario público de solicitudes
├── css/
│   ├── dashboard.css       # Estilos unificados para paneles y tablas
│   └── loginStyle.css      # Estilos específicos de acceso
├── js/
│   ├── components/
│   │   └── MainSidebar.js  # Web Component dinámico del menú lateral
│   ├── modules/
│   │   ├── authGuard.js    # Guardia de seguridad para rutas protegidas
│   │   └── utils.js        # Funciones auxiliares (formato de fecha/tiempo)
│   ├── services/
│   │   └── firebaseConfig.js # Configuración central de Firebase
│   ├── dashboard.js        # Lógica del panel principal
│   └── ...                 # Scripts específicos por vista (reports, configuration)
└── views/                  # Vistas HTML secundarias del dashboard

```

---

## Seguridad y Buenas Prácticas

* **Clean Code**: Lógica modularizada para evitar la duplicación de funciones de formateo y validación.
* **Auth Guard**: Protección de rutas que impide el acceso a paneles administrativos sin una sesión activa de Firebase.
* **Recuperación Segura**: Implementación de flujo de recuperación de contraseña mediante correos verificados por Firebase.
* **Datos Sensibles**: Configuración centralizada para facilitar la migración a variables de entorno o configuraciones dinámicas desde base de datos.

---

## Instalación

1. Clona el repositorio.
2. Configura tus credenciales en `js/services/firebaseConfig.js`.
3. Asegúrate de inicializar EmailJS con tu `Public Key` en los archivos correspondientes.
4. Sirve el proyecto con un servidor local (ej. Live Server en VS Code).

---

### Próximos Pasos Sugeridos

* [ ] Implementar envío de recordatorios automáticos 15-30 minutos antes de cada evento.
* [ ] Integrar iconos SVG nítidos en todas las acciones de tabla para mejorar la estética institucional.

---

**UniEvent** - *Eficiencia y control en la palma de tu mano.*