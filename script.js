// ==========================================
// 1. CONFIGURACIÓN GLOBALES Y SUPABASE
// ==========================================
const SUPABASE_URL = "https://xyfrahshzeeftlnleazd.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnJhaHNoemVlZnRsbmxlYXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDA0MDAsImV4cCI6MjEwNjgxNjQwMH0.ihFCqFpASz9hV7knqMt_87OR59KGJqkH4AoQB88Y8JM"; 

let productos = [];
let usuariosRegistrados = JSON.parse(localStorage.getItem('zen_usuarios')) || [];
let usuarioActivo = JSON.parse(localStorage.getItem('zen_sesion')) || null;
let carrito = JSON.parse(localStorage.getItem('zen_carrito')) || [];

let tipoAuthActual = 'login';
let indiceSlideActual = 0;
let categoriaActual = 'Todos';
let subcategoriaActual = 'Todos';

// Inicialización del cliente de base de datos (UNA SOLA DECLARACIÓN)
// CORREGIDO: No usamos "let" ni "const". Asignamos el cliente directo al objeto global existente.
if (window.supabase && window.supabase.createClient) {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
function renderizarTienda() {
    // Al principio o al final de tu lógica que dibuja los productos en #products-grid:
    const spinnerTienda = document.getElementById('tienda-cargando');
    if (spinnerTienda) {
        spinnerTienda.style.display = 'none'; // Se apaga cuando los productos ya están listos
    }
    
    // ... Tu forEach actual de productos ...
}

// ==========================================================
// ARRANQUE AUTOMÁTICO DE LA TIENDA (ÚNICO ARRANQUE MAESTRO)
// ==========================================================
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Iniciando arranque maestro de Zen & Zen de forma segura...");

    // 1. Inicializar Supabase si hace falta
    if (window.supabase && window.supabase.createClient && typeof window.supabase.from !== 'function') {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    
    // 2. Enlazamos los formularios primero para asegurar que los botones respondan siempre
    const formPerfil = document.getElementById('perfil-form');
    if (formPerfil) formPerfil.addEventListener('submit', guardarDatosPerfil);

    const formAdmin = document.getElementById('product-form');
    if (formAdmin) formAdmin.addEventListener('submit', agregarProductoAdmin);

    // 🌟 AGREGADO AQUÍ ADENTRO DEL PASO 2: Enlazamos de forma segura el formulario de login
    const formAuth = document.getElementById('auth-form');
    if (formAuth) formAuth.addEventListener('submit', procesarIdentificacionUsuario);

    // 3. BLINDAJE INTERNO: Activamos el buscador de forma segura dentro del flujo principal
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        console.log("🔍 Buscador detectado y activado correctamente.");
        searchInput.addEventListener('input', (e) => {
            const texto = e.target.value.toLowerCase();
            document.querySelectorAll('.product-card').forEach(tarjeta => {
                const tituloEl = tarjeta.querySelector('.product-title');
                if (tituloEl) {
                    const titulo = tituloEl.textContent.toLowerCase();
                    tarjeta.style.display = titulo.includes(texto) ? "flex" : "none";
                }
            });
        });
    }

    // 4. Sincronizamos los favoritos del usuario desde la nube
    if (typeof sincronizarFavoritosAlIngresar === 'function') {
        await sincronizarFavoritosAlIngresar();
    }

    // 5. Cargamos los datos asincrónicos de los productos desde la nube
    try {
        await traerProductosDesdeNube();
    } catch (e) {
        console.warn("No se pudieron cargar los productos en el arranque:", e.message);
    }
    
    // 6. Aplicamos la interfaz de usuario activa si inició sesión
    if (usuarioActivo) {
        try {
            aplicarInterfazUsuario();
        } catch (e) {
            console.warn("No se pudo aplicar la interfaz de usuario:", e.message);
        }
    }

    // 7. Renderizamos el carrito si tenía artículos guardados
    if (carrito.length > 0 && typeof actualizarCarritoVisual === 'function') {
        actualizarCarritoVisual();
    }
});


// ==========================================
// 2. CONEXIÓN Y CARGA DEL CATÁLOGO
// ==========================================
async function traerProductosDesdeNube() {
    try {
        if (!supabase) throw new Error("Servidor no inicializado");
        const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
        if (error) throw error;
        productos = data || [];
    } catch (err) {
        console.warn("Error de conexión, usando catálogo vacío:", err.message);
        productos = [];
    }
    renderizarProductos();
}
function renderizarProductos() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtrados = productos.filter(p => {
        if (parseInt(p.stock) === -1) return false;
        const cumpleCat = (categoriaActual === 'Todos' || p.categoria === categoriaActual);
        const cumpleSub = (subcategoriaActual === 'Todos' || p.subcategoria.toLowerCase() === subcategoriaActual.toLowerCase());
        return cumpleCat && cumpleSub;
    });

    const spinnerTienda = document.getElementById('tienda-cargando');

    if (filtrados.length === 0) {
        if (spinnerTienda) spinnerTienda.style.display = 'none';
        grid.innerHTML = '<p style="padding:40px; color:#aaa; grid-column:1/-1; text-align:center;">El catálogo está vacío o las piezas se encuentran reservadas.</p>';
        return;
    }

    filtrados.forEach(p => {
        // ==========================================================
        // CORRECCIÓN DINÁMICA: Extraemos solo la primera foto para el catálogo
        // ==========================================================
        let imagenPortada = p.imagen;
        if (p.imagen && p.imagen.includes(',')) {
            imagenPortada = p.imagen.split(',')[0]; // Tomamos la primera URL limpia
        }

        const card = document.createElement('div');
        card.classList.add('product-card');
        card.onclick = () => abrirDetalleProducto(p.id);
        
        if (parseInt(p.stock) === 0) {
            card.innerHTML += `<div class="reservado-badge">🔒 Reservado</div>`;
        }

        // Lógica inteligente de verificación de favoritos
        let esFavorito = false;
        if (typeof usuarioActivo !== 'undefined' && usuarioActivo && usuarioActivo.favoritos) {
            esFavorito = usuarioActivo.favoritos.map(id => String(id).trim()).includes(String(p.id).trim());
        }

        // Usamos tu clase '.activo' si el producto ya está en favoritos
        const claseActivo = esFavorito ? 'activo' : '';

        // INYECTAMOS TU ESTRUCTURA PREMIUM UTILIZANDO 'imagenPortada'
        card.innerHTML += `
            <div class="product-card-media-wrapper">
                <img src="${imagenPortada}" loading="lazy">
                
                <!-- Botón de Favorito con tu estilo .btn-favorito -->
                <button class="btn-favorito ${claseActivo}" 
                        onclick="event.stopPropagation(); toggleFavoritoDesdeGrid('${p.id}')" 
                        title="${esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                    <svg class="icono-corazon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-title">${p.titulo}</h3>
                <p class="product-price">$${Number(p.precio).toLocaleString('es-AR')}</p>
                <div class="product-tags-footer">
                    <span class="tag-condition">${p.condicion}</span>
                </div>
            </div>`;
            
        grid.appendChild(card);
    });
    if (spinnerTienda) {
        spinnerTienda.style.display = 'none';
    }
}

// ==========================================================
// 🛡️ ESCUDO INTELIGENTE: PREVENIR SALTO AUTOMÁTICO A FAVORITOS
// ==========================================================
// Creamos una variable global en la memoria de la página para frenar el desvío
window.bloquearSaltoFavoritos = false;

function toggleFavoritoDesdeGrid(productoId) {
    if (typeof usuarioActivo === 'undefined' || !usuarioActivo) {
        if (typeof abrirModalAuth === 'function') abrirModalAuth();
        return;
    }

    const favoritosUsuario = usuarioActivo.favoritos.map(id => String(id).trim());
    const idBuscado = String(productoId).trim();
    
    // 🎯 ACTIVAMOS EL ESCUDO: Avisamos que estamos operando desde la grilla principal
    window.bloquearSaltoFavoritos = true;

    // Interceptamos y modificamos temporalmente tu función nativa de navegación
    const funcionNavegarOriginal = window.mostrarSeccion || window.cambiarSeccion || window.navegar;
    
    const interceptorNavegacion = function(seccion) {
        // SI EL SISTEMA INTENTA MANDARTE A FAVORITOS, LO DETENEMOS AQUÍ
        if (seccion === 'favoritos' && window.bloquearSaltoFavoritos) {
            console.log("🛡️ Escudo Zen: Salto automático a favoritos bloqueado con éxito.");
            return; // Bloquea la ejecución y te deja en la misma pantalla
        }
        // Si es cualquier otra sección, la deja pasar normalmente
        if (typeof funcionNavegarOriginal === 'function') {
            funcionNavegarOriginal(seccion);
        }
    };

    // Aplicamos el interceptor en todas las variantes de nombres de navegación que maneje tu tienda
    if (window.mostrarSeccion) window.mostrarSeccion = interceptorNavegacion;
    if (window.cambiarSeccion) window.cambiarSeccion = interceptorNavegacion;
    if (window.navegar) window.navegar = interceptorNavegacion;

    // Procesamos la baja o el alta en tus favoritos de Supabase de forma normal
    if (favoritosUsuario.includes(idBuscado)) {
        usuarioActivo.favoritos = usuarioActivo.favoritos.filter(id => String(id).trim() !== idBuscado);
        if (typeof eliminarDeFavoritos === 'function') {
            eliminarDeFavoritos(productoId);
        } else if (typeof quitarFavorito === 'function') {
            quitarFavorito(productoId);
        }
    } else {
        if (typeof agregarAFavoritos === 'function') agregarAFavoritos(productoId);
        else if (typeof agregarFavorito === 'function') agregarFavorito(productoId);
        else {
            usuarioActivo.favoritos.push(productoId);
            if (typeof actualizarFavoritosUI === 'function') actualizarFavoritosUI();
        }
    }

    // Volvemos a dibujar tus productos en caliente para actualizar los corazones vectoriales
    if (typeof renderizarProductos === 'function') renderizarProductos(); 
    else if (typeof renderProducts === 'function') renderProducts();

    // ⏳ APAGAMOS EL ESCUDO: Le damos 400ms para que pasen todos los procesos asíncronos de Supabase
    setTimeout(() => {
        window.bloquearSaltoFavoritos = false;
        // Restauramos tu función de navegación original para que el menú de arriba siga funcionando perfecto
        if (window.mostrarSeccion) window.mostrarSeccion = funcionNavegarOriginal;
        if (window.cambiarSeccion) window.cambiarSeccion = funcionNavegarOriginal;
        if (window.navegar) window.navegar = funcionNavegarOriginal;
    }, 400);
}




function filtrarCategoria(cat) {
    categoriaActual = cat; subcategoriaActual = 'Todos';
    const t = document.getElementById('seccion-titulo');
    if (t) t.textContent = cat === 'Todos' ? 'Artículos en Exhibición' : `Catálogo: ${cat}`;
    mostrarSeccion('tienda');
    renderizarProductos();
        // Cierra el menú lateral automáticamente al hacer clic en una categoría
document.querySelector('.nav-menu').classList.remove('active');
}

function filtrarSubcategoria(cat, subcat) {
    categoriaActual = cat; subcategoriaActual = subcat;
    const t = document.getElementById('seccion-titulo');
    if (t) t.textContent = `${cat} ‣ ${subcat}`;
    mostrarSeccion('tienda');
    renderizarProductos();
    // Cierra el menú lateral automáticamente al hacer clic en una categoría
document.querySelector('.nav-menu').classList.remove('active');
}

function mostrarSeccion(seccion) {
    document.getElementById('view-inicio').classList.toggle('hidden', seccion !== 'inicio');
    document.getElementById('view-tienda').classList.toggle('hidden', seccion !== 'tienda');
    document.getElementById('view-vender').classList.toggle('hidden', seccion !== 'vender');
    document.getElementById('view-perfil').classList.toggle('hidden', seccion !== 'perfil');
    document.getElementById('view-carrito').classList.toggle('hidden', seccion !== 'carrito');
    document.getElementById('view-favoritos').classList.toggle('hidden', seccion !== 'favoritos');
    document.getElementById('view-detalle').classList.toggle('hidden', seccion !== 'detalle');
    document.getElementById('sobre-nosotros-section').classList.toggle('hidden', seccion !== 'nosotros');
    // 🌟 NUEVO: Controlamos de forma limpia la pantalla de éxito al comprar
    document.getElementById('view-exito-compra').classList.toggle('hidden', seccion !== 'exito-compra');

// 🎯 EL LUGAR CORRECTO: Llamamos al escudo inmediatamente si el usuario entró al carrito
if (seccion === 'carrito') {
 
    actualizarCarritoUI();
        document.body.classList.remove('light-mode');
    
} else {
    // Si va a otra sección, revisamos el localStorage para devolverle el modo claro si correspondía
    const modoGuardado = localStorage.getItem("zen_theme");
    if (modoGuardado === "light" || modoGuardado === null) {
        document.body.classList.add('light-mode');
    }
}
}

// ==========================================================
// 🛡️ ESCUDO NATIVO: ANULADOR DE MODO CLARO DENTRO DEL CARRITO
// ==========================================================
function forzarCarritoSiempreOscuro() {
    const carritoSeccion = document.getElementById('view-carrito');
    if (!carritoSeccion) return;

    // 1. Le quitamos la clase light-mode a la sección completa para que use tu CSS oscuro original
    carritoSeccion.classList.remove('light-mode');
    
    // 2. Le prohibimos la entrada al modo claro a CUALQUIER elemento interno o tarjeta inyectada
    const todosLosSubelementos = carritoSeccion.querySelectorAll('*');
    todosLosSubelementos.forEach(elemento => {
        elemento.classList.remove('light-mode');
    });

    // 3. Forzamos los colores base de tu búnker nocturno por código directo
    carritoSeccion.style.setProperty('background', '#0b0e14', 'important');
    carritoSeccion.style.setProperty('background-color', '#0b0e14', 'important');
    carritoSeccion.style.setProperty('color', '#ffffff', 'important');

    console.log("🔒 Escudo Zen: Se anuló el modo claro dentro del carrito con éxito.");
}

function cambiarSlide(dir) {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;
    indiceSlideActual += dir;
    if (indiceSlideActual >= carousel.children.length) indiceSlideActual = 0;
    if (indiceSlideActual < 0) indiceSlideActual = carousel.children.length - 1;
    carousel.style.transform = `translateX(-${indiceSlideActual * 50}%)`;
}
setInterval(() => cambiarSlide(1), 6000);
// ==========================================
// FUNCIONES DE CONTROL DE MODAL AUTH
// ==========================================
function abrirModalAuth() {
    if (usuarioActivo) mostrarSeccion('perfil');
    else document.getElementById('modal-auth').classList.add('open');
}
function cerrarModalAuth() { document.getElementById('modal-auth').classList.remove('open'); }

function cambiarAuthTab(tab) {
    tipoAuthActual = tab;
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('auth-title').textContent = tab === 'login' ? 'Identificación' : 'Registro de Coleccionista';
    document.getElementById('btn-auth-submit').textContent = tab === 'login' ? 'Entrar' : 'Registrarse';
}

// 🌟 FUNCIÓN DE ACCIÓN AUTOMÁTICA DEL LOGIN (Separada para evitar colisiones)
async function procesarIdentificacionUsuario(e) {
    e.preventDefault();
    
    // Forzamos minúsculas y limpiamos espacios para evitar fallas de tipeo
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const pass = document.getElementById('auth-pass').value;

    if (tipoAuthActual === 'register') {
        try {
            if (usuariosRegistrados.some(u => u.email === email)) { alert("Correo ya registrado."); return; }
            
            const nuevoUsuario = { email, pass, nombre: "", telefono: "", direccion: "", cp: "", rol: "cliente" };
            usuariosRegistrados.push(nuevoUsuario);
            localStorage.setItem('zen_usuarios', JSON.stringify(usuariosRegistrados));
            
            if (window.supabase && typeof window.supabase.from === 'function') {
                const { error } = await window.supabase.from('usuarios').insert([{ email, password: pass, rol: "cliente" }]);
                if (error) throw error;
            }
            alert("¡Cuenta creada! Ya podés ingresar.");
            cambiarAuthTab('login');
        } catch (err) { alert("Error al registrarse en la nube: " + err.message); }
    } else {
        // --- PROCESO DE INICIO DE SESIÓN CORREGIDO ---
        let usuarioEncontrado = null;

        // 1. Intentamos validar y traer todos los datos reales desde Supabase
        if (window.supabase && typeof window.supabase.from === 'function') {
            try {
                const { data, error } = await window.supabase
                    .from('usuarios')
                    .select('*') 
                    .eq('email', email)
                    .eq('password', pass)
                    .maybeSingle(); 
                
                if (data) {
                    usuarioEncontrado = data; 
                }
            } catch (err) {
                console.warn("Fallo consulta en la nube, intentando verificar LocalStorage...", err.message);
            }
        }

        // 2. Si no hay internet o falló Supabase, usamos el respaldo de LocalStorage
        if (!usuarioEncontrado) {
            const existeLocal = usuariosRegistrados.find(u => u.email === email && (u.pass === pass || u.password === pass));
            if (existeLocal) {
                usuarioEncontrado = { 
                    email: existeLocal.email, 
                    rol: existeLocal.rol || "cliente",
                    nombre: existeLocal.nombre || "",
                    telefono: existeLocal.telefono || "",
                    direccion: existeLocal.direccion || "",
                    cp: existeLocal.cp || "",
                    favoritos: existeLocal.favoritos || []
                };
            }
        }

        // 3. Si encontramos las credenciales en cualquiera de los dos lados, iniciamos sesión de forma segura
        if (usuarioEncontrado) {
            localStorage.removeItem('zen_sesion');
            usuarioActivo = usuarioEncontrado; 
            localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
            
            aplicarInterfazUsuario();
            cerrarModalAuth();
            
            // 🌟 NUEVO: Si el usuario tenía favoritos cargados en Supabase, los forzamos en pantalla de una
            if (typeof sincronizarFavoritosAlIngresar === 'function') {
                sincronizarFavoritosAlIngresar();
            }

            alert(`¡Ingreso exitoso! Bienvenido.`);
        } else { 
            alert("Datos incorrectos. Revisá tu correo y contraseña."); 
        }
    }
}

function aplicarInterfazUsuario() {
    if (!usuarioActivo) return;
    
    const btn = document.getElementById('user-status');
    if (btn) btn.textContent = `👤 Mi Perfil (${usuarioActivo.email.split('@')[0]})`;
    
    // CONTROL DE SEGURIDAD REAL: Evaluamos el rol devuelto por Supabase
    const navVender = document.getElementById('nav-vender');
    if (navVender) {
        if (usuarioActivo.rol === "admin") {
            navVender.classList.remove('hidden'); // Muestra la pestaña solo si su rol es admin
        } else {
            navVender.classList.add('hidden');    // Lo oculta para clientes generales
        }
    }
    
    cargarDatosPerfilEnFormulario();
}

function cargarDatosPerfilEnFormulario() {
    if (!usuarioActivo) return;

    // 🌟 TRUCO RESOLUTIVO: Buscamos cualquier etiqueta que contenga la palabra "Correo Electrónico"
    let emailContenedor = document.getElementById('user-profile-email');
    
    // Si el ID no existía, lo buscamos recorriendo los elementos de texto del perfil
    if (!emailContenedor) {
        const etiquetas = document.querySelectorAll('.form-section p, .form-section span, .form-section div, .form-section label');
        for (let el of etiquetas) {
            if (el.innerText.includes('Correo Electrónico:')) {
                emailContenedor = el;
                break;
            }
        }
    }

    // Si logramos encontrar la etiqueta (ya sea por ID o por el texto)
    if (emailContenedor) {
        const emailReal = usuarioActivo.email || usuarioActivo.correo || (usuarioActivo.user ? usuarioActivo.user.email : '');
        
        // Sobreescribimos el texto completo con el email del usuario activo
        emailContenedor.innerHTML = `<strong>Correo Electrónico:</strong> ${emailReal ? emailReal : "No especificado"}`;
    }

    // Llenamos los casilleros de los formularios (esto ya te funcionaba perfecto)
    if(document.getElementById('perf-nombre')) document.getElementById('perf-nombre').value = usuarioActivo.nombre || "";
    if(document.getElementById('perf-telefono')) document.getElementById('perf-telefono').value = usuarioActivo.telefono || "";
    if(document.getElementById('perf-direccion')) document.getElementById('perf-direccion').value = usuarioActivo.direccion || "";
    if(document.getElementById('perf-cp')) document.getElementById('perf-cp').value = usuarioActivo.cp || "";
}


async function guardarDatosPerfil(e) {
    e.preventDefault();
    if (!usuarioActivo) { alert("No hay una sesión activa."); return; }
    
    // 1. Guardamos los datos de los inputs directo en el objeto de la sesión activa
    usuarioActivo.nombre = document.getElementById('perf-nombre').value;
    usuarioActivo.telefono = document.getElementById('perf-telefono').value;
    usuarioActivo.direccion = document.getElementById('perf-direccion').value;
    usuarioActivo.cp = document.getElementById('perf-cp').value;
    
    // Guardamos la sesión actualizada en el LocalStorage
    localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
    
    try {
        // 2. Enviamos la actualización limpia a Supabase
        if (window.supabase && typeof window.supabase.from === 'function') {
            const { error } = await window.supabase.from('usuarios')
                .update({ 
                    nombre: usuarioActivo.nombre, 
                    telefono: usuarioActivo.telefono,
                    direccion: usuarioActivo.direccion,
                    cp: usuarioActivo.cp
                })
                .eq('email', usuarioActivo.email);
            
            if (error) throw error;
        }
        alert("¡Perfil guardado con éxito en la nube!");
        mostrarSeccion('inicio');
    } catch (err) { 
        alert("Error al guardar en Supabase: " + err.message); 
    }
}



function logout() {
     usuarioActivo = null;
    localStorage.removeItem('zen_sesion');

    // 2. Vaciamos el carrito por seguridad
    carrito = [];
    localStorage.removeItem('zen_carrito');

    alert("Sesión cerrada correctamente.");
    mostrarSeccion('inicio');
}
// ==========================================
// 4. DETALLES, CARRITO Y PASARELA WHATSAPP
// ==========================================
// 4. DETALLES, CARRITO Y PASARELA WHATSAPP
function abrirDetalleProducto(id) {
    if (document.getElementById('view-favoritos')) {
        document.getElementById('view-favoritos').classList.add('hidden');
    }
    const p = productos.find(item => item.id === id);
    if (!p) return;

    // SEPARACIÓN DINÁMICA: Rompemos el texto de las imágenes por sus comas
    let fotosDisponibles = [];
    if (p.imagen) {
        fotosDisponibles = p.imagen.includes(',') ? p.imagen.split(',') : [p.imagen];
    }
    
    // Respaldo por si abrís un artículo viejo de tu base de datos anterior
    if (p.imagen_2 && !fotosDisponibles.includes(p.imagen_2)) fotosDisponibles.push(p.imagen_2);
    if (p.imagen_3 && !fotosDisponibles.includes(p.imagen_3)) fotosDisponibles.push(p.imagen_3);

    // 1. Inyectar la información en los elementos correspondientes
    document.getElementById('detail-img').src = fotosDisponibles[0] || ""; // La primera siempre es la principal
    document.getElementById('detail-title').textContent = p.titulo;
    document.getElementById('detail-category').textContent = p.subcategoria;
    document.getElementById('detail-condition').textContent = p.condicion;
    document.getElementById('detail-escala').textContent = `Escala ${p.escala || '1:64'}`;
    document.getElementById('detail-price').textContent = `$${p.precio}`;
    document.getElementById('detail-desc').textContent = p.descripcion || "Sin descripción adicional.";
    
    const stockSpan = document.getElementById('detail-stock');
    if (stockSpan) {
        stockSpan.textContent = parseInt(p.stock) === 0 ? "Pieza Reservada (Alguien la está gestionando)" : "¡Pieza única disponible!";
        stockSpan.style.color = parseInt(p.stock) === 0 ? "#ff9900" : "#00f0ff";
    }

    // 2. Renderizar la galería de miniaturas interactiva (INFINITAS FOTOS)
    const thumbContainer = document.getElementById('detail-thumbnails');
    if (thumbContainer) {
        thumbContainer.innerHTML = '';

        if (fotosDisponibles.length > 1) {
            fotosDisponibles.forEach((fotoUrl) => {
                if (fotoUrl.trim() !== "") {
                    const imgThumb = document.createElement('img');
                    imgThumb.src = fotoUrl.trim();
                    imgThumb.classList.add('thumb-item');
                    imgThumb.onclick = () => {
                        document.getElementById('detail-img').src = fotoUrl.trim();
                    };
                    thumbContainer.appendChild(imgThumb);
                }
            });
        }
    }
    // ==========================================================
    // CONTROL DE FAVORITOS ENLAZADO POR EMAIL A SUPABASE
    // ==========================================================
    const btnFav = document.getElementById('btn-detail-fav');
    if (btnFav) {
        if (!usuarioActivo) {
            btnFav.classList.remove('activo');
        } else {
            let listaFavs = usuarioActivo.favoritos || [];
            if (typeof listaFavs === 'string') {
                listaFavs = listaFavs ? listaFavs.split(',') : [];
            }
            if (listaFavs.includes(p.id) || listaFavs.includes(p.id.toString())) {
                btnFav.classList.add('activo');
            } else {
                btnFav.classList.remove('activo');
            }
        }

        btnFav.onclick = async () => {
            if (!usuarioActivo || !usuarioActivo.email) {
                alert("Debes iniciar sesión para guardar productos en tus favoritos 🔒");
                btnFav.classList.remove('activo');
                return;
            }

            let listaFavs = usuarioActivo.favoritos || [];
            if (typeof listaFavs === 'string') {
                listaFavs = listaFavs ? listaFavs.split(',') : [];
            }

            const seVuelveActivo = btnFav.classList.toggle('activo');
            const idProductoString = p.id.toString();

            if (seVuelveActivo) {
                if (!listaFavs.includes(idProductoString)) listaFavs.push(idProductoString);
            } else {
                listaFavs = listaFavs.filter(idFav => idFav !== idProductoString);
            }

            try {
                const { error } = await supabase
                    .from('usuarios') 
                    .update({ favoritos: listaFavs }) 
                    .eq('email', usuarioActivo.email); 

                if (error) throw error;

                usuarioActivo.favoritos = listaFavs;
                localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
                console.log("¡Éxito! Favorito guardado en Supabase para el correo:", usuarioActivo.email);

            } catch (error) {
                btnFav.classList.toggle('activo');
                console.error("Error al guardar en Supabase:", error.message);
                alert("Hubo un problema al guardar tus favoritos in la base de datos.");
            }
        };
    }

    // ==========================================================
    // NUEVO PASO 3 RECUPERADO: MANEJAR EL BOTÓN DE COMPRA
    // ==========================================================
    const btnCompra = document.getElementById('btn-detail-add');
    if (btnCompra) {
        if (parseInt(p.stock) === 0) {
            btnCompra.textContent = "Artículo Reservado 🚫"; 
            btnCompra.disabled = true; 
            btnCompra.style.background = "#555";
        } else {
            btnCompra.textContent = "Añadir al carrito"; 
            btnCompra.disabled = false; 
            btnCompra.style.background = "var(--color-violeta)";
            
            btnCompra.onclick = () => agregarAlCarrito(p.id); 
        }
    }

    // ==========================================================
    // NUEVA INYECCIÓN: RENDERIZAR VIDEO DE FORMA SEGURA
    // ==========================================================
    renderizarVideoProducto(p); // Le pasamos 'p' que contiene toda la info de Supabase

    // 4. CAMBIO CLAVE: Cambiar de vista por completo como lo hace el carrito
    mostrarSeccion('detalle');
}



// Ya no necesitas abrir modales flotantes, esta función puede quedar vacía o borrarse
function cerrarModalDetail() { 
    mostrarSeccion('tienda'); 
}

function cerrarModalDetail() { document.getElementById('modal-detail').classList.remove('open'); }
function toggleCarrito() { mostrarSeccion('carrito'); }

function agregarAlCarrito(id) {
    const p = productos.find(item => item.id === id);
    if (!p) return;
    
    // Verificamos si ya está sumado a la orden
    if (carrito.some(item => item.id === id || item.id === id.toString())) { 
        alert("Esta pieza única ya está en tu orden de compra."); 
        return; 
    }
    
    // Guardamos el objeto completo del producto en el carrito
    carrito.push(p);
    
    // GUARDADO PERSISTENTE: Resguardamos el carrito en el navegador para que no se borre al recargar
    localStorage.setItem('zen_carrito', JSON.stringify(carrito));
    
    // Ejecutamos la actualización visual del carrito
    if (typeof actualizarCarritoUI === 'function') {
        actualizarCarritoUI();
    } else if (typeof actualizarCarritoVisual === 'function') {
        actualizarCarritoVisual();
    }
    

    calcularTotalPedido();
}


// Asegurate de dejar la función de cierre vacía para que si se llama desde otra parte no rompa nada:
function cerrarModalDetail() { 
    // Queda vacía por seguridad para evitar errores de elementos nulos
}


// ==========================================================
// CONTROL INTERACTIVO DEL CARRITO DE COMPRAS
// ==========================================================

function quitarDelCarrito(index) { 
    carrito.splice(index, 1); 
    actualizarCarritoUI(); 
}

function actualizarCarritoUI() {
    document.getElementById('cart-count').textContent = carrito.length;
    const container = document.getElementById('seccion-carrito-items');
    if (!container) return;
    container.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        container.innerHTML = '<h3 style="text-align:center; padding:20px; color:#aaa;">Tu carrito de Zen & Zen está vacío</h3>';
     
        document.getElementById('resumen-total').textContent = `$0`;
        return;
    }

    // Recorremos el carrito inyectando la nueva estructura profesional, limpia y elástica
    carrito.forEach((item, index) => {
        total += item.precio;
        container.innerHTML += `
            <div class="cart-custom-item-row">
                <!-- 1. Foto del Artículo -->
                <div class="cart-item-media">
                    <img src="${item.imagen}" alt="${item.titulo}">
                </div>
                
                <!-- 2. Información del Artículo (Arreglado el montado de textos) -->
                <div class="cart-item-details">
                    <h4 class="cart-item-main-title">${item.titulo}</h4>
                    <p class="cart-item-main-price">$${Number(item.precio).toLocaleString('es-AR')}</p>
                </div>
                
                <!-- 3. Botón de Eliminar (Mantenemos tu tacho de Basura SVG nativo) -->
                <button type="button" class="cart-item-del-btn" onclick="quitarDelCarrito(${index})" title="Eliminar de la orden">
                    <svg class="icon-trash-vector" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>`;
    });

    // Formateamos también los subtotales del resumen final con puntos divisores
 
    document.getElementById('resumen-total').textContent = `$${total.toLocaleString('es-AR')}`;
    
    // Guardamos de forma persistente para que no se borre al recargar en GitHub Pages
    localStorage.setItem('zen_carrito', JSON.stringify(carrito));
    
    // Ejecutamos tu función de cálculos automáticos por Código Postal (CP)
    calcularTotalPedido();
}



// ==========================================================
// CÁLCULO AUTOMÁTICO SEGÚN EL CÓDIGO POSTAL (CP) DEL USUARIO
// ==========================================================
function calcularTotalPedido() {
    // 1. Calcular subtotal de los Funkos
    let subtotal = 0;
    carrito.forEach(producto => {
        let precioLimpio = parseFloat(producto.precio || producto.price || 0);
        subtotal += precioLimpio;
    });

    const selector = document.getElementById('metodo-entrega-select');
    const infoTexto = document.getElementById('shipping-info-text');
    let costoEnvio = 0;
    let mensajeEnvio = "";

if (selector && (selector.value === 'envio' || selector.value === 'moto')) {
    // 1. Validamos si el usuario inició sesión y tiene un código postal guardado
    if (!usuarioActivo || !usuarioActivo.cp) {
        if (infoTexto) infoTexto.style.display = "block";
        mensajeEnvio = "⚠️ Completa tu Código Postal en tu Perfil para calcular.";
        costoEnvio = 4500; // Costo base/promedio si no hay CP ingresado
    } else {
        // Convertimos el CP a número entero una sola vez para usarlo en ambos métodos
        const cp = parseInt(usuarioActivo.cp);

        // 2. Evaluamos si eligió ENVÍO (Correo Argentino)
        if (selector.value === 'envio') {
            if (infoTexto) infoTexto.style.display = "block";

            if (cp >= 1000 && cp <= 1499) {
                costoEnvio = 3200; // Capital Federal (CABA)
                mensajeEnvio = `📍 Envío Local detectado (CABA - CP: ${cp}).`;
            } else if (cp >= 1600 && cp <= 1999) {
                costoEnvio = 3900; // GBA / Provincia de Buenos Aires cercana
                mensajeEnvio = `📍 Envío Regional detectado (Buenos Aires - CP: ${cp}).`;
            } else if ((cp >= 2000 && cp <= 3999) || (cp >= 5000 && cp <= 8999)) {
                costoEnvio = 5800; // Provincias del Interior
                mensajeEnvio = `📍 Envío Nacional Interior detectado (CP: ${cp}).`;
            } else if (cp >= 9000 && cp <= 9999) {
                costoEnvio = 7200; // Patagonia / Zonas Extremas
                mensajeEnvio = `📍 Envío Nacional Zona Extrema detectado (Patagonia - CP: ${cp}).`;
            } else {
                costoEnvio = 5000; // Tarifa plana de respaldo
                mensajeEnvio = `📍 Envío calculado para CP: ${cp}.`;
            }
        } 
        // 3. Evaluamos si eligió MOTO
        else if (selector.value === 'moto') {
            // Nota: El rango 1601 a 1675 corresponde a Zona Norte de GBA (no CABA)
            if (cp >= 1601 && cp <= 1675) {
                costoEnvio = 2500; 
                
                if (infoTexto) infoTexto.style.display = "none"; // O "block" si querés mostrar el mensajeEnvio
            } else {
                costoEnvio = 5000; 
                mensajeEnvio = ` ⚠️ No hay motomensajería en tu zona (CP: ${cp}).`;
                if (infoTexto) infoTexto.style.display = "block"; // Activamos cartel para mostrar el error de zona
            }
        }
    }
} else {
    // Si el valor es cualquiera de los retiros de Garín, el costo de envío es 0
    costoEnvio = 0;
    if (infoTexto) infoTexto.style.display = "none";
}

    // 3. Monto final
    let totalFinal = subtotal + costoEnvio;

    // 4. Inyectar textos en el HTML
    if (infoTexto) infoTexto.textContent = mensajeEnvio;
    if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').textContent = `$${subtotal}`;
    if (document.getElementById('cart-shipping-cost')) document.getElementById('cart-shipping-cost').textContent = costoEnvio === 0 ? "Gratis" : `$${costoEnvio}`;
    if (document.getElementById('cart-total-final')) document.getElementById('cart-total-final').textContent = `$${totalFinal}`;
        // ==========================================================


}
async function finalizarOrdenWhatsApp() {
    if (!usuarioActivo) { alert("Iniciá sesión para continuar."); abrirModalAuth(); return; }
    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }

    const selectorEntrega = document.getElementById('metodo-entrega-select');
    const valorEntrega = selectorEntrega ? selectorEntrega.value : "retiro_estacion";
    
    // Conseguimos el texto exacto del punto de encuentro elegido (ej: "🏃‍♂️ Retiro: Estación de Garín (Gratis)")
    const puntoEncuentroElegido = selectorEntrega ? selectorEntrega.options[selectorEntrega.selectedIndex].text : "Punto a coordinar";

    // ==========================================================
    // VALIDACIÓN DE SEGURIDAD: SOLO SI ELIGE ENVÍO POR CORREO
    // ==========================================================
    if (valorEntrega === 'envio') {
        let camposFaltantes = [];
        
        if (!usuarioActivo.nombre || usuarioActivo.nombre.trim() === "") camposFaltantes.push("Nombre");
        if (!usuarioActivo.direccion || usuarioActivo.direccion.trim() === "") camposFaltantes.push("Dirección de entrega");
        if (!usuarioActivo.cp || usuarioActivo.cp.trim() === "") camposFaltantes.push("Código Postal");
        if (!usuarioActivo.telefono || usuarioActivo.telefono.trim() === "") camposFaltantes.push("Teléfono de contacto");

        if (camposFaltantes.length > 0) {
            alert(`⚠️ Para procesar el envío por Correo Argentino, necesitas completar los siguientes datos en tu perfil:\n\n• ${camposFaltantes.join('\n• ')}`);
            mostrarSeccion('perfil'); 
            return; 
        }
    }

    // ==========================================================
    // PROCESAMIENTO DE LA ORDEN
    // ==========================================================
    const metodoPago = document.getElementById('checkout-metodo-pago')?.value || "A coordinar";
    const miNumeroReal = "5491125417546"; 
    const infoTexto = document.getElementById('shipping-info-text')?.textContent || "";

    // Estructuramos el método de entrega de forma inteligente para el mensaje
    let metodoEntregaFinal = "";
    if (valorEntrega === 'envio') {
        metodoEntregaFinal = `🚚 Correo Argentino (${infoTexto.replace('📍 ', '')})`;
    } else {
        // Si eligió un punto en Garín, limpia los emojis del texto para el reporte
        metodoEntregaFinal = `🤝 Punto de Encuentro: ${puntoEncuentroElegido.replace('🏃‍♂️ ', '')} *(A coordinar día y horario por privado)*`;
    }

    const subtotalTexto = document.getElementById('cart-subtotal')?.textContent || "\$0";
    const envioTexto = document.getElementById('cart-shipping-cost')?.textContent || "\$0";
    const totalFinalTexto = document.getElementById('cart-total-final')?.textContent || subtotalTexto;

    // Armado del cuerpo del mensaje de WhatsApp
    let mensaje = `👑 *ORDEN - ZEN & ZEN* 👑\n\n`;
    mensaje += `📧 *Comprador:* ${usuarioActivo.email}\n`;
    mensaje += `💳 *Pago:* ${metodoPago}\n`;
    mensaje += `📦 *Entrega:* ${metodoEntregaFinal}\n`;
    
    if (usuarioActivo.nombre) mensaje += `👤 *Nombre:* ${usuarioActivo.nombre}\n`;
    if (usuarioActivo.telefono) mensaje += `📞 *Teléfono:* ${usuarioActivo.telefono}\n`;
    
    // Solo si es envío por correo sumamos los datos postales detallados al texto
    if (valorEntrega === 'envio') {
        mensaje += `📍 *Dirección de Envío:* ${usuarioActivo.direccion}\n`;
        mensaje += `📮 *Código Postal:* ${usuarioActivo.cp}\n`;
    }
    
    mensaje += `\n📦 *Artículos solicitados:*\n`;
    
    for (const item of carrito) {
        mensaje += `• ${item.titulo} -> *$${item.precio}*\n`;
    }

    mensaje += `\n-------------------------\n`;
    mensaje += `💰 *Subtotal:* ${subtotalTexto}\n`;
    mensaje += `🚚 *Costo Envío:* ${envioTexto}\n`;
    mensaje += `💵 *TOTAL NETO:* *${totalFinalTexto}*\n`;

    // ==========================================================
    // 🚀 INTERCEPTOR PREMIUM: CONFIRMACIÓN ESTÉTICA DE COMPRA
    // ==========================================================
    const modalConfirmar = document.getElementById('modal-confirmar-compra');
    const btnAceptar = document.getElementById('btn-aceptar-pedido');
    const btnCancelar = document.getElementById('btn-cancelar-pedido');

    if (modalConfirmar && btnAceptar && btnCancelar) {
        modalConfirmar.classList.remove('hidden');

        btnCancelar.onclick = () => {
            modalConfirmar.classList.add('hidden');
        };

        btnAceptar.onclick = () => {
            modalConfirmar.classList.add('hidden');

            if (typeof mostrarAlertaZen === 'function') {
                mostrarAlertaZen("¡Procesando tu pedido! Abriendo WhatsApp...", "success");
            }

            const linkFinal = "https://wa.me" + miNumeroReal + "?text=" + encodeURIComponent(mensaje);
            window.open(linkFinal, '_blank');
            
            carrito = []; 
            localStorage.removeItem('zen_carrito'); 
            if (typeof actualizarCarritoUI === 'function') actualizarCarritoUI(); 
            
            const cartCount = document.getElementById('cart-count');
            if (cartCount) cartCount.innerText = '0';

            mostrarSeccion('exito-compra');
        };
    }

}
function renderizarVideoProducto(producto) {
    const videoContainer = document.getElementById('detail-video-container');
    const videoContent = document.getElementById('detail-video-content');
    
    // Si no existen los elementos en el HTML, frenamos para evitar errores en la consola
    if (!videoContent || !videoContainer) return;
    
    // Limpiamos cualquier reproductor o botón anterior
    videoContent.innerHTML = "";

    // Si el producto no tiene un video cargado en Supabase, ocultamos toda la sección
    if (!producto || !producto.video_url || producto.video_url.trim() === "") {
        videoContainer.style.setProperty("display", "none", "important");
        return;
    }

    const videoUrl = producto.video_url.trim();

    // FORZAMOS A MOSTRAR EL CONTENEDOR EN LA FICHA DE DETALLES
    videoContainer.style.setProperty("display", "block", "important");

    // Inyectamos el reproductor de video nativo de HTML5 usando concatenación limpia
    videoContent.innerHTML = 
        '<div class="video-native-wrapper" style="width: 100%; border-radius: 8px; overflow: hidden; background: #000; margin-top: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">' +
            '<video controls style="width: 100%; max-height: 450px; display: block;" playsinline>' +
                '<source src="' + videoUrl + '" type="video/mp4">' +
                '<source src="' + videoUrl + '" type="video/webm">' +
                '<source src="' + videoUrl + '" type="video/ogg">' +
                'Tu navegador no soporta la reproducción de videos nativos.' +
            '</video>' +
        '</div>';
}



// ==========================================
// 5. PANEL DE ADMINISTRADOR
// ==========================================
// FUNCIÓN AUXILIAR: Sube un archivo al storage y devuelve su URL pública (o vacío si no hay archivo)
async function subirFotosAStorage(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || input.files.length === 0) return []; // Devuelve un array vacío si no hay fotos

    const urlsPromesas = Array.from(input.files).map(async (archivo) => {
        const extension = archivo.name.split('.').pop();
        const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;

        const { data, error } = await window.supabase
            .storage
            .from('imagenes-productos')
            .upload(nombreArchivo, archivo);

        if (error) throw new Error(`Error al subir imagen (${archivo.name}): ${error.message}`);

        const { data: urlData } = window.supabase
            .storage
            .from('imagenes-productos')
            .getPublicUrl(nombreArchivo);

        return urlData.publicUrl;
    });

    // Espera a que todas las imágenes se suban en paralelo
    return Promise.all(urlsPromesas);
}
// FUNCIÓN AUXILIAR UNIFICADA: Sube CUALQUIER archivo (imagen o video) al Storage de Supabase
async function subirArchivoAStorage(archivo) {
    if (!archivo) return "";

    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;

    const { data, error } = await window.supabase
        .storage
        .from('imagenes-productos') 
        .upload(nombreArchivo, archivo);

    if (error) throw new Error(`Error al subir archivo (${archivo.name}): ${error.message}`);

    const { data: urlData } = window.supabase
        .storage
        .from('imagenes-productos')
        .getPublicUrl(nombreArchivo);

    return urlData.publicUrl;
}
// FUNCIÓN PRINCIPAL DEL ADMINISTRADOR (COMPLETAMENTE DINÁMICA)
async function agregarProductoAdmin(e) {
    e.preventDefault();
    if (!usuarioActivo || usuarioActivo.rol !== 'admin') {
        alert("Acceso denegado.");
        return;
    }
    if (!window.supabase || typeof window.supabase.from !== 'function') { 
        alert("Base de datos desconectada."); 
        return; 
    }

    try {
        // 1. Procesar y subir todas las imágenes seleccionadas
        const inputImagenes = document.getElementById('prod-images');
        let urlsSubidas = [];
        
        if (inputImagenes && inputImagenes.files && inputImagenes.files.length > 0) {
            const promesasFotos = Array.from(inputImagenes.files).map(foto => subirArchivoAStorage(foto));
            urlsSubidas = await Promise.all(promesasFotos);
        }

        if (urlsSubidas.length === 0) { 
            alert("Por favor, selecciona al menos la foto principal."); 
            return; 
        }

        // UNIFICACIÓN DINÁMICA: Juntamos todas las URLs en un solo texto separado por comas
        const cadenaImagenesDinamica = urlsSubidas.join(',');

        // 2. Procesar y subir el archivo de video
        const inputVideo = document.getElementById('prod-video');
        let urlVideoPublica = null;

        if (inputVideo && inputVideo.files && inputVideo.files.length > 0) {
            urlVideoPublica = await subirArchivoAStorage(inputVideo.files[0]);
        }

        // 3. Armar el objeto final para la base de datos
        const nuevo = {
            titulo: document.getElementById('prod-title').value,
            precio: parseFloat(document.getElementById('prod-price').value),
            categoria: document.getElementById('prod-category').value,
            subcategoria: document.getElementById('prod-subcategory').value,
            escala: document.getElementById('prod-escala').value,
            condicion: document.getElementById('prod-condition').value,
            stock: 1, 
            
            // GUARDADO INTELIGENTE: Guardamos el bloque completo en tu columna de siempre
            imagen: cadenaImagenesDinamica, 
            
            imagen_2: null, // Ya no las necesitamos, las dejamos en null
            imagen_3: null, 
            video_url: urlVideoPublica || null,  
            descripcion: document.getElementById('prod-desc').value
        };

        // 4. Insertar el artículo completo en la tabla 'productos'
        const { error: dbError } = await window.supabase.from('productos').insert([nuevo]);
        if (dbError) throw dbError;

        await traerProductosDesdeNube();
        document.getElementById('product-form').reset();
        mostrarSeccion('inicio');
        alert("¡Rareza publicada con éxito con su galería dinámica y video! 🎉");

    } catch (err) { 
        alert("Supabase rechazó la carga: " + err.message); 
    }
}

//FAVORITOS-------------------

//FAVORITOS-------------------

function alternarFavorito(elementoBoton, idProducto) {
    elementoBoton.classList.toggle('activo');
    const estaActivo = elementoBoton.classList.contains('activo');

    // 🌟 NUEVO: Aseguramos que la sesión tenga el array de favoritos listo
    if (!usuarioActivo) {
        console.warn("⚠️ Debes iniciar sesión para guardar favoritos.");
        return;
    }
    if (!usuarioActivo.favoritos) {
        usuarioActivo.favoritos = [];
    }

    // 🌟 NUEVO: Forzamos el ID a String para que coincida con tu Supabase (["3","2"])
    const idString = String(idProducto);

    if (estaActivo) {
        // Si no está en el array local, lo agregamos
        if (!usuarioActivo.favoritos.includes(idString)) {
            usuarioActivo.favoritos.push(idString);
        }
    } else {
        // Si lo desmarcó, lo quitamos del array local
        usuarioActivo.favoritos = usuarioActivo.favoritos.filter(favId => String(favId) !== idString);
    }

    // 🌟 NUEVO: Guardamos el estado actual en el LocalStorage para no perderlo al recargar
    localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));

    // Tu fetch actual a la API queda exactamente igual
    fetch('/api/favoritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            idProducto: idProducto, 
            accion: estaActivo ? 'agregar' : 'quitar' 
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Favoritos sincronizados en la Base de Datos");
        // Opcional: Si el usuario está parado en la pantalla de favoritos y desmarca uno, 
        // podés revivir la función para que desaparezca la tarjeta al instante:
        if (document.getElementById('view-favoritos') && !document.getElementById('view-favoritos').classList.contains('hidden')) {
            mostrarFavoritos();
        }
    });
}

// ==========================================================
// DETECTOR AUTOMÁTICO DE INICIO DE SESIÓN PARA FAVORITOS
// ==========================================================
async function sincronizarFavoritosAlIngresar() {
    // 1. Verificamos si hay una sesión activa en tu variable global y si tiene email
    if (usuarioActivo && usuarioActivo.email) {
        try {
            // 2. Vamos directamente a Supabase a buscar la columna 'favoritos' de este correo
            const { data: usuarioBD, error } = await supabase
                .from('usuarios')
                .select('favoritos')
                .eq('email', usuarioActivo.email)
                .single();

            if (error) throw error;

            if (usuarioBD) {
                // 3. Si encontramos los favoritos en la nube, los inyectamos en tu sesión actual
                let favsBD = usuarioBD.favoritos || [];
                
                // Si por alguna razón vino como texto plano, lo convertimos a arreglo
                if (typeof favsBD === 'string') {
                    favsBD = favsBD ? favsBD.split(',') : [];
                }

                // Actualizamos tu variable global con los datos reales de la base de datos
                usuarioActivo.favoritos = favsBD;
                
                // Guardamos la actualización en el almacenamiento de tu navegador
                localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
                console.log("⭐ Favoritos sincronizados desde Supabase con éxito al iniciar sesión.");
            }
        } catch (err) {
            console.error("Error al sincronizar favoritos desde la nube:", err.message);
        }
    }
}

// Ejecutamos la sincronización de inmediato si el usuario ya tenía la sesión abierta al recargar la página


// Interceptamos cuando el usuario hace clic en el botón de 'Entrar' para actualizar sus favoritos un segundo después
const btnAuthSubmit = document.getElementById('btn-auth-submit');
if (btnAuthSubmit) {
    btnAuthSubmit.addEventListener('click', () => {
        // Le damos 1.5 segundos de tiempo a tu función nativa de Login para que guarde los datos en 'usuarioActivo'
        setTimeout(() => {
            sincronizarFavoritosAlIngresar();
        }, 1500);
    });
}
function mostrarFavoritos() {
        // Cierra el menú lateral automáticamente al hacer clic en una categoría
document.querySelector('.nav-menu').classList.remove('active');
    mostrarSeccion('favoritos'); 

    const grid = document.getElementById('favoritos-grid');
    const msgVacio = document.getElementById('fav-vacio');
    const contadorFav = document.getElementById('fav-count');
    const spinnerFav = document.getElementById('fav-cargando'); // 🌟 Capturamos spinner
    
    if (!grid) return;
    grid.innerHTML = ''; 
    
    // 🌟 1. Prendemos el spinner de favoritos antes de evaluar nada
    if (spinnerFav) spinnerFav.style.display = 'flex';
    if (msgVacio) msgVacio.style.display = 'none';

    // Le damos un mini respiro asíncrono simulado de 300ms para que la animación se luzca y limpie
    setTimeout(() => {
        
        // 🌟 2. Apagamos el spinner porque ya procesamos los datos
        if (spinnerFav) spinnerFav.style.display = 'none';

        if (!usuarioActivo || !usuarioActivo.favoritos || usuarioActivo.favoritos.length === 0) {
            if (msgVacio) msgVacio.style.display = 'block';
            if (contadorFav) contadorFav.innerText = '0 artículos';
            return;
        }

        const favoritosUsuario = usuarioActivo.favoritos.map(id => String(id).trim());
        const productosFavoritos = productos.filter(item => favoritosUsuario.includes(String(item.id).trim()));
        
        if (contadorFav) contadorFav.innerText = `${productosFavoritos.length} artículos`;

        if (productosFavoritos.length === 0) {
            if (msgVacio) msgVacio.style.display = 'block';
            return;
        }

                // Dibuja tus tarjetas
productosFavoritos.forEach(item => {
            grid.innerHTML += `
                <div class="product-card" onclick="verDetalleProducto('${item.id}')">
                    <img src="${item.imagen}" alt="${item.titulo}" onerror="this.src='placeholder.jpg'">
                    <div class="product-info">
                        <h3 class="product-title">${item.titulo}</h3>
                        <p class="product-price">$${Number(item.precio).toLocaleString('es-AR')}</p>
                        
                        <!-- Contenedor inferior exclusivo para el botón de remover -->
                        <div class="product-tags-footer" onclick="event.stopPropagation();">
                            <button class="btn-fav-remove-premium" onclick="eliminarDeFavoritos('${item.id}')" title="Quitar de favoritos">
                                💔 Eliminar
                            </button>
                        </div>
                    </div>
                </div>`;
        });

    }, 300); // 300 milisegundos de delay estético
    actualizarCarritoUI();
}

async function eliminarDeFavoritos(id) {
    console.log("Intentando eliminar ID de favoritos:", id);
    
    if (!usuarioActivo || !usuarioActivo.favoritos) {
        console.error("No hay un usuario activo o la lista no existe.");
        return;
    }
    
    const idString = String(id).trim();

    // 1. Lo quitamos del array local del usuario en el frontend
    usuarioActivo.favoritos = usuarioActivo.favoritos.filter(favId => String(favId).trim() !== idString);
    
    // 2. Guardamos la actualización en el LocalStorage del navegador para mantener la sesión al día
    localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));

    // 3. Buscamos el botón de corazón correspondiente en la tienda para apagarlo visualmente también allá
    // Nota: Esto busca un botón que tenga la función alternarFavorito con el ID del producto
    const botonesTienda = document.querySelectorAll(`[onclick*="alternarFavorito"][onclick*="${idString}"]`);
    botonesTienda.forEach(btn => btn.classList.remove('activo'));

    // 4. Sincronizamos en tiempo real con Supabase para actualizar tu columna de favoritos
    if (usuarioActivo.email) {
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ favoritos: usuarioActivo.favoritos }) // Le mandamos el array nuevo sin el ID eliminado
                .eq('email', usuarioActivo.email);

            if (error) throw error;
            console.log("⭐ Eliminado con éxito de Supabase.");
        } catch (err) {
            console.error("Error al guardar la eliminación en la nube:", err.message);
        }
    }

    // 5. Refrescamos la pantalla de favoritos inmediatamente para que la tarjeta desaparezca de la vista
    mostrarFavoritos();
}
// ==========================================================
// 🌓 CONTROLADOR DE TEMA CON AISLAMIENTO DE RAÍZ EN EL CARRITO
document.addEventListener("DOMContentLoaded", () => {

    const themeBtn = document.getElementById("theme-toggle-btn");
    if (!themeBtn) return;

    // Función auxiliar para las cajas de despacho (Excluyendo el carrito)
    const ajustarCajaDespachoDinamica = (isLight) => {
        const cajasNegras = document.querySelectorAll('[style*="background: rgba(11, 14, 20"], [style*="background-color: rgba(11, 14, 20"]');
        cajasNegras.forEach(caja => {
            // 🛡️ Si la caja está dentro del carrito, NO LA TOCAMOS. Se queda oscura de fábrica.
            if (caja.closest('#view-carrito')) return;

            if (isLight) {
                caja.style.setProperty('background', '#f1f5f9', 'important');
                caja.style.setProperty('background-color', '#f1f5f9', 'important');
                caja.style.setProperty('color', '#1e293b', 'important');
                caja.style.setProperty('border', '1px solid #cbd5e1', 'important');
                document.getElementById('view-carrito').style = "background-color: red !important;"
            } else {
                caja.style.setProperty('background', 'rgba(11, 14, 20, 0.85)', 'important');
                caja.style.setProperty('background-color', 'rgba(11, 14, 20, 0.85)', 'important');
                caja.style.setProperty('color', '#ffffff', 'important');
                caja.style.setProperty('border', 'none', 'important');
            }
        });
    };

    // 🎯 EL CANDADO DEFINITIVO: Le prohíbe al carrito el Modo Claro usando atributos nativos
    const forzarCarritoSiempreOscuro = () => {
        const carritoSeccion = document.getElementById('view-carrito');
        if (carritoSeccion) {
            carritoSeccion.classList.remove('light-mode'); // Rompe la herencia clara
            carritoSeccion.setAttribute('data-theme', 'dark'); // Fuerza al navegador a leerlo como oscuro
            carritoSeccion.style.setProperty('background', '#0b0e14', 'important'); // Le clava su fondo negro original
            carritoSeccion.style.setProperty('background-color', '#0b0e14', 'important');
            carritoSeccion.style.setProperty('color', '#ffffff', 'important');
             carritoSeccion.style = "background-color: white;"
        }
    };

    const modoGuardado = localStorage.getItem("zen_theme");
    
    // 1. Configuración al cargar la tienda por primera vez
    if (modoGuardado === "light" || modoGuardado === null) {
        document.body.classList.add("light-mode");
        setTimeout(() => {
            ajustarCajaDespachoDinamica(true);
            forzarCarritoSiempreOscuro(); // Escudo activo desde el primer segundo
        }, 100);
    } else {
        document.body.classList.remove("light-mode");
        setTimeout(() => forzarCarritoSiempreOscuro(), 100);
    }

    // 2. Control interactivo al hacer clic en el botón 🌓
    themeBtn.addEventListener("click", () => {
        const esModoClaro = document.body.classList.toggle("light-mode");
        const carritoSeccion = document.getElementById('view-carrito');
        

       
        if (carritoSeccion) {
            

            forzarCarritoSiempreOscuro(); // Nos aseguramos de mantenerlo oscuro
        
        }
        if (esModoClaro) {
            localStorage.setItem("zen_theme", "light");
            ajustarCajaDespachoDinamica(true);
            forzarCarritoSiempreOscuro(); // Bloqueamos el modo claro en caliente
            console.log("☀️ Modo Claro Activado en la tienda");
            
        } else {
            localStorage.setItem("zen_theme", "dark");
            
            ajustarCajaDespachoDinamica(false);
            forzarCarritoSiempreOscuro(); // Nos aseguramos de mantenerlo oscuro
            console.log("🌙 Modo Oscuro Activado");
            

           
        }
    
        const carritoVisible = !document.getElementById('view-carrito').classList.contains('hidden');
    if (carritoVisible) {
        document.body.classList.remove('light-mode');
    }
    });

    // 3. Parche de seguridad por si el carrito se vuelve a dibujar al agregar productos
    const btnCarrito = document.querySelector('.cart-icon') || document.getElementById('user-status');
    if (btnCarrito) {
        btnCarrito.addEventListener('click', () => {
            setTimeout(() => {
                forzarCarritoSiempreOscuro();
                const actualmenteClaro = document.body.classList.contains("light-mode");
                // 🛠️ CORREGIDO AQUÍ: Agregamos la "l" que faltaba en la variable para eliminar el error
                ajustarCajaDespachoDinamica(actualmenteClaro);
            }, 150);
        });
    }
});

// Busca el botón en tu HTML y haz que navegue de forma nativa a tu nueva sección
function mostrarInfo(){
document.querySelector('.nav-menu').classList.remove('active');
        
        // Llamas a tu función del sistema (usa el nombre exacto de tu función, ej: cambiarSeccion o mostrarVista)
    mostrarSeccion('nosotros'); 


}// ==========================================================
// 🔔 SISTEMA DE NOTIFICACIONES PREMIUM (TOASTS) - ZEN & ZEN
// ==========================================================
function mostrarAlertaZen(mensaje, tipo = 'info') {
    // 1. Buscamos o creamos el contenedor maestro en la pantalla
    let contenedor = document.getElementById('zen-toast-container');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'zen-toast-container';
        document.body.appendChild(contenedor);
    }

    // 2. Creamos la tarjeta de la notificación
    const toast = document.createElement('div');
    toast.className = `zen-toast-card zen-toast-${tipo}`;
    
    // Elegimos el emoji según el tipo de mensaje
    let emoji = '🔔';
    if (tipo === 'success' || mensaje.toLowerCase().includes('guardado') || mensaje.toLowerCase().includes('éxito')) emoji = '❤️';
    if (tipo === 'error' || mensaje.toLowerCase().includes('error') || mensaje.toLowerCase().includes('iniciá')) emoji = '⚠️';

    toast.innerHTML = `
        <span class="zen-toast-icon">${emoji}</span>
        <p class="zen-toast-text">${mensaje}</p>
    `;

    // 3. Lo metemos en la pantalla
    contenedor.appendChild(toast);

    // 4. Animación de salida y borrado automático a los 3.5 segundos
    setTimeout(() => {
        toast.classList.add('zen-toast-fadeout');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// 💥 TRUCO MAESTRO: Sobreescribimos el alert viejo del navegador
// Esto hace que todo tu código viejo pase a verse hermoso al instante sin cambiar nada más
window.alert = function(mensaje) {
    mostrarAlertaZen(mensaje, 'info');
};
