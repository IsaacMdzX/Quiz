// 1. Datos iniciales de los participantes
let participantes = [
    { id: 1, nombre: "Carlos Flores", puntos: 0 },
    { id: 2, nombre: "Ana Martínez", puntos: 0 },
    { id: 3, nombre: "Luis Pérez", puntos: 0 },
    { id: 4, nombre: "Sofía Rodríguez", puntos: 0 }
];

// 2. Banco de preguntas con su nivel de dificultad
const bancoPreguntas = [
    { id: 1, dificultad: "Facil", pregunta: "¿Qué significa HTML?", respuesta: "HyperText Markup Language" },
    { id: 2, dificultad: "Facil", pregunta: "¿Qué lenguaje se usa para dar estilos a una web?", respuesta: "CSS" },
    { id: 3, dificultad: "Medio", pregunta: "¿Cómo se declara una variable constante en JS?", respuesta: "Usando 'const'" },
    { id: 4, dificultad: "Medio", pregunta: "¿Qué método de JS añade un elemento al final de un Array?", respuesta: ".push()" },
    { id: 5, dificultad: "Dificil", pregunta: "¿Qué es el Event Loop en JavaScript?", respuesta: "El mecanismo que maneja la ejecución de código asíncrono." },
    { id: 6, dificultad: "Dificil", pregunta: "¿Cuál es la diferencia entre '==' y '==='?", respuesta: "'==' compara solo valor, '===' compara valor y tipo de dato." }
];

// 3. Función para renderizar y ordenar el Tablero de Posiciones
function renderizarTablero() {
    const tbody = document.getElementById('tbody-leaderboard');
    if (!tbody) return; // Protección por si el HTML no ha cargado

    // Ordenar el arreglo de mayor a menor puntaje
    participantes.sort((a, b) => b.puntos - a.puntos);
    
    // Limpiar la tabla antes de volver a llenarla
    tbody.innerHTML = ''; 

    participantes.forEach((p, index) => {
        const posicion = index + 1;
        let claseTop = '';
        
        // Asignar clases especiales para el podio (colores en CSS)
        if (posicion === 1) claseTop = 'top-1';
        else if (posicion === 2) claseTop = 'top-2';
        else if (posicion === 3) claseTop = 'top-3';

        const fila = document.createElement('tr');
        fila.className = `fila-participante ${claseTop}`;
        
        // NOTA: Asegúrate de mantener estas comillas invertidas (``)
        fila.innerHTML = `
            <td><strong>#${posicion}</strong></td>
            <td>${p.nombre}</td>
            <td><strong>${p.puntos} pts</strong></td>
            <td>
                <input type="number" id="pts-${p.id}" value="10" step="5">
                <button onclick="modificarPuntos(${p.id}, true)">+</button>
                <button onclick="modificarPuntos(${p.id}, false)" style="background:#e74c3c;">-</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// 4. Función para sumar o restar puntos
function modificarPuntos(id, esSuma) {
    const inputCantidad = document.getElementById(`pts-${id}`);
    const cantidad = parseInt(inputCantidad.value) || 0;

    // Buscar al participante seleccionado y actualizar sus puntos
    participantes = participantes.map(p => {
        if (p.id === id) {
            if (esSuma) {
                p.puntos += cantidad;
            } else {
                p.puntos -= cantidad;
                if (p.puntos < 0) p.puntos = 0; // Evita que baje de 0 puntos
            }
        }
        return p;
    });

    // Volver a renderizar el tablero con las nuevas posiciones calculadas
    renderizarTablero();
}

// 5. Función para mostrar y filtrar las preguntas
function renderizarPreguntas() {
    const contenedor = document.getElementById('contenedor-preguntas');
    const filtro = document.getElementById('filtro');
    
    if (!contenedor || !filtro) return; // Protección por si el HTML no ha cargado
    
    const valorFiltro = filtro.value;
    contenedor.innerHTML = '';

    bancoPreguntas.forEach(pregunta => {
        // Si hay filtro activo y no coincide con la dificultad, se lo salta
        if (valorFiltro !== 'Todas' && pregunta.dificultad !== valorFiltro) return;

        const tarjeta = document.createElement('div');
        tarjeta.className = `tarjeta-pregunta ${pregunta.dificultad}`;
        tarjeta.innerHTML = `
            <p><span class="badge ${pregunta.dificultad}">${pregunta.dificultad.toUpperCase()}</span></p>
            <h3>${pregunta.pregunta}</h3>
            <details>
                <summary style="cursor:pointer; color:#3498db;">Ver Respuesta Correcta</summary>
                <p style="margin-top: 10px; color:#555; font-style: italic;">${pregunta.respuesta}</p>
            </details>
        `;
        contenedor.appendChild(tarjeta);
    });
}

// 6. Inicialización segura cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    renderizarTablero();
    renderizarPreguntas();
});