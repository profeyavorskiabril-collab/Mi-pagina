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

// ARRANQUE AUTOMÁTICO DE LA TIENDA (ORDEN SEGURO DE FORMULARIOS)
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Inicializar Supabase si hace falta
    if (window.supabase && window.supabase.createClient && typeof window.supabase.from !== 'function') {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    
    // 2. CORREGIDO: Enlazamos los formularios primero para asegurar que los botones respondan siempre
    const formPerfil = document.getElementById('perfil-form');
    if (formPerfil) formPerfil.addEventListener('submit', guardarDatosPerfil);

    const formAdmin = document.getElementById('product-form');
    if (formAdmin) formAdmin.addEventListener('submit', agregarProductoAdmin);

    // 3. Después cargamos los datos asincrónicos de la nube
    try {
        await traerProductosDesdeNube();
    } catch (e) {
        console.warn("No se pudieron cargar los productos en el arranque:", e.message);
    }
    
    if (usuarioActivo) {
        try {
            aplicarInterfazUsuario();
        } catch (e) {
            console.warn("No se pudo aplicar la interfaz de usuario:", e.message);
        }
    }
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
        // 🔴 CONTROL DE OCULTAR: Si el stock es -1 (Vendido definitivo), lo dejamos fuera de la lista pública
        if (parseInt(p.stock) === -1) return false;

        const cumpleCat = (categoriaActual === 'Todos' || p.categoria === categoriaActual);
        const cumpleSub = (subcategoriaActual === 'Todos' || p.subcategoria.toLowerCase() === subcategoriaActual.toLowerCase());
        return cumpleCat && cumpleSub;
    });

    if (filtrados.length === 0) {
        grid.innerHTML = '<p style="padding:40px; color:#aaa; grid-column:1/-1; text-align:center;">El catálogo está vacío o las piezas se encuentran reservadas.</p>';
        return;
    }

    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        card.onclick = () => abrirDetalleProducto(p.id);
        
        // 🟡 CARTEL DE RESERVADO EN LA TARJETA
// BUSCÁ ESTO EN RENDERIZARPRODUCTOS Y REEMPLAZALO POR:
if (parseInt(p.stock) === 0) {
    card.innerHTML += `<div class="reservado-badge">🔒 Reservado</div>`;
}


        card.innerHTML += `
            <img src="${p.imagen}">
            <div class="product-info">
                <h3 class="product-title">${p.titulo}</h3>
                <p class="product-price">$${p.precio}</p>
                <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:auto;">
                    <span class="tag-category">${p.subcategoria}</span>
                    <span class="tag-category" style="background:#0e121a; color:var(--color-cian); border:1px solid var(--color-cian);">${p.escala || '1:64'}</span>
                    <span class="tag-condition">${p.condicion}</span>
                </div>
            </div>`;
        grid.appendChild(card);
    });
}


function filtrarCategoria(cat) {
    categoriaActual = cat; subcategoriaActual = 'Todos';
    const t = document.getElementById('seccion-titulo');
    if (t) t.textContent = cat === 'Todos' ? 'Artículos en Exhibición' : `Catálogo: ${cat}`;
    mostrarSeccion('tienda');
    renderizarProductos();
}

function filtrarSubcategoria(cat, subcat) {
    categoriaActual = cat; subcategoriaActual = subcat;
    const t = document.getElementById('seccion-titulo');
    if (t) t.textContent = `${cat} ‣ ${subcat}`;
    mostrarSeccion('tienda');
    renderizarProductos();
}

function mostrarSeccion(seccion) {
    document.getElementById('view-inicio').classList.toggle('hidden', seccion !== 'inicio');
    document.getElementById('view-tienda').classList.toggle('hidden', seccion !== 'tienda');
    document.getElementById('view-vender').classList.toggle('hidden', seccion !== 'vender');
    document.getElementById('view-perfil').classList.toggle('hidden', seccion !== 'perfil');
    document.getElementById('view-carrito').classList.toggle('hidden', seccion !== 'carrito');
    
    // NUEVO: Agregamos el control de la pantalla de detalles completos
    document.getElementById('view-detalle').classList.toggle('hidden', seccion !== 'detalle');
    
    if (seccion === 'carrito') actualizarCarritoUI();
}


const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase();
        document.querySelectorAll('.product-card').forEach(tarjeta => {
            const titulo = tarjeta.querySelector('.product-title').textContent.toLowerCase();
            tarjeta.style.display = titulo.includes(texto) ? "flex" : "none";
        });
    });
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
// 3. REGISTRO, LOGIN Y PERFILES
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

document.getElementById('auth-form').addEventListener('submit', async function(e) {
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
                    .select('*') // Trae campos clave: email, password, rol, favoritos, etc.
                    .eq('email', email)
                    .eq('password', pass)
                    .maybeSingle(); // Usamos maybeSingle para evitar excepciones si no encuentra nada
                
                if (data) {
                    // CORRECCIÓN 1: Asignamos a 'usuarioEncontrado' para que el flujo continúe con éxito
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
            // CORRECCIÓN 2: Limpiamos residuos de sesiones anteriores para evitar bloqueos en el segundo login
            localStorage.removeItem('zen_sesion');
            
            // Pasamos el objeto completo (con rol de admin y favoritos si venían de la nube)
            usuarioActivo = usuarioEncontrado; 
            
            // Resguardamos en la sesión local del navegador
            localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
            
            aplicarInterfazUsuario();
            cerrarModalAuth();
            alert(`¡Ingreso exitoso! Bienvenido.`);
        } else { 
            alert("Datos incorrectos. Revisá tu correo y contraseña."); 
        }
    }
});


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
    // Si no hay un usuario con sesión activa, no hacemos nada
    if (!usuarioActivo) return;

    // Llenamos los casilleros directamente con los datos reales que vinieron de la nube
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
function abrirDetalleProducto(id) {
    const p = productos.find(item => item.id === id);
    if (!p) return;

    // 1. Inyectar la información en los elementos correspondientes
    document.getElementById('detail-img').src = p.imagen;
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

    // 2. Renderizar la galería de miniaturas interactiva
    const thumbContainer = document.getElementById('detail-thumbnails');
    if (thumbContainer) {
        thumbContainer.innerHTML = '';
        const fotosDisponibles = [p.imagen];
        if (p.imagen_2) fotosDisponibles.push(p.imagen_2);
        if (p.imagen_3) fotosDisponibles.push(p.imagen_3);

        if (fotosDisponibles.length > 1) {
            fotosDisponibles.forEach((fotoUrl) => {
                const imgThumb = document.createElement('img');
                imgThumb.src = fotoUrl;
                imgThumb.classList.add('thumb-item');
                imgThumb.onclick = () => {
                    document.getElementById('detail-img').src = fotoUrl;
                };
                thumbContainer.appendChild(imgThumb);
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
                alert("Hubo un problema al guardar tus favoritos en la base de datos.");
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
            btnCompra.textContent = "Añadir a la Orden 🛒"; 
            btnCompra.disabled = false; 
            btnCompra.style.background = "var(--color-violeta)";
            
            // Le asignamos dinámicamente la función de compra para este producto
            btnCompra.onclick = () => agregarAlCarrito(p.id); 
        }
    }

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
    
    alert(`¡${p.titulo} añadido a la orden con éxito!`);
}


// Asegurate de dejar la función de cierre vacía para que si se llama desde otra parte no rompa nada:
function cerrarModalDetail() { 
    // Queda vacía por seguridad para evitar errores de elementos nulos
}


function quitarDelCarrito(index) { carrito.splice(index, 1); actualizarCarritoUI(); }

function actualizarCarritoUI() {
    document.getElementById('cart-count').textContent = carrito.length;
    const container = document.getElementById('seccion-carrito-items');
    if (!container) return;
    container.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        container.innerHTML = '<h3 style="text-align:center; padding:20px; color:#aaa;">Tu carrito de Zen & Zen está vacío</h3>';
        document.getElementById('resumen-subtotal').textContent = `$0`;
        document.getElementById('resumen-total').textContent = `$0`;
        return;
    }

    carrito.forEach((item, index) => {
        total += item.precio;
        container.innerHTML += `
            <div class="cart-item" style="display:flex; justify-content:space-between; background:#0b0e14; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #2a3447;">
                <div style="display:flex; gap:15px; align-items:center;">
                    <img src="${item.imagen}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
                    <div><h4 style="color:#fff;">${item.titulo}</h4><p style="color:var(--color-oro); font-weight:bold;">$${item.precio}</p></div>
                </div>
                <button onclick="quitarDelCarrito(${index})" style="background:#cc0000; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Quitar</button>
            </div>`;
    });
    document.getElementById('resumen-subtotal').textContent = `$${total}`;
    document.getElementById('resumen-total').textContent = `$${total}`;
    localStorage.setItem('zen_carrito', JSON.stringify(carrito));
}
async function finalizarOrdenWhatsApp() {
    if (!usuarioActivo) { alert("Iniciá sesión para continuar."); abrirModalAuth(); return; }
    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }

    const metodoPago = document.getElementById('checkout-metodo-pago')?.value || "A coordinar";
    const miNumeroReal = "5491125417546"; 
    
    let mensaje = `👑 *ORDEN - ZEN & ZEN* 👑\n\n`;
    mensaje += `📧 *Comprador:* ${usuarioActivo.email}\n`;
    mensaje += `💳 *Pago:* ${metodoPago}\n`;
    
    if (usuarioActivo.nombre) mensaje += `👤 *Nombre:* ${usuarioActivo.nombre}\n`;
    if (usuarioActivo.direccion) mensaje += `📍 *Destino:* ${usuarioActivo.direccion}\n`;
    
    mensaje += `\n📦 *Artículos solicitados:*\n`;
    
    // CORREGIDO: Solo armamos el texto para el mensaje, ya no tocamos Supabase aquí
    for (const item of carrito) {
        mensaje += `• ${item.titulo} -> *$${item.precio}*\n`;
    }

    const linkFinal = "https://wa.me/" + miNumeroReal + "?text=" + encodeURIComponent(mensaje);
    console.log("LINK GENERADO:", linkFinal);
    window.open(linkFinal, '_blank');
    
    // Limpieza de la interfaz local
    carrito = []; 
    if (typeof actualizarCarritoUI === 'function') actualizarCarritoUI(); 
    mostrarSeccion('inicio');
}

// ==========================================
// 5. PANEL DE ADMINISTRADOR
// ==========================================
// FUNCIÓN AUXILIAR: Sube un archivo al storage y devuelve su URL pública (o vacío si no hay archivo)
async function subirFotoAStorage(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || input.files.length === 0) return ""; // Si no hay foto seleccionada, devuelve texto vacío

    const archivo = input.files[0];
    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;

    const { data, error } = await window.supabase
        .storage
        .from('imagenes-productos')
        .upload(nombreArchivo, archivo);

    if (error) throw new Error(`Error al subir ${inputId}: ${error.message}`);

    const { data: urlData } = window.supabase
        .storage
        .from('imagenes-productos')
        .getPublicUrl(nombreArchivo);

    return urlData.publicUrl;
}

// FUNCIÓN PRINCIPAL DE ADMINISTRACIÓN (ACTUALIZADA PARA 3 IMÁGENES)
async function agregarProductoAdmin(e) {
    e.preventDefault();
    if (!window.supabase || typeof window.supabase.from !== 'function') { alert("Base de datos desconectada."); return; }

    try {
        // 1. Subir las 3 fotos en paralelo al Storage usando la función auxiliar
        const urlFoto1 = await subirFotoAStorage('prod-img');
        const urlFoto2 = await subirFotoAStorage('prod-img2');
        const urlFoto3 = await subirFotoAStorage('prod-img3');
const archivo = input.files[0];
const extension = archivo.name.split('.').pop(); // ❌ Si pones archivo[0].name aquí da error

        // La primera foto siempre es obligatoria para la miniatura
        if (!urlFoto1) { alert("Por favor, selecciona al menos la foto principal."); return; }

        // 2. Armar el objeto del nuevo producto con las URLs generadas automáticamente
        const nuevo = {
            titulo: document.getElementById('prod-title').value,
            precio: parseFloat(document.getElementById('prod-price').value),
            categoria: document.getElementById('prod-category').value,
            subcategoria: document.getElementById('prod-subcategory').value,
            escala: document.getElementById('prod-escala').value,
            condicion: document.getElementById('prod-condition').value,
            stock: 1, 
            imagen: urlFoto1,      // Guardamos la foto principal
            imagen_2: urlFoto2,    // Guardamos la segunda (o queda "" si el usuario no eligió ninguna)
            imagen_3: urlFoto3,    // Guardamos la tercera (o queda "" si el usuario no eligió ninguna)
            descripcion: document.getElementById('prod-desc').value
        };

        // 3. Insertar el artículo completo en la tabla 'productos'
        const { error: dbError } = await window.supabase.from('productos').insert([nuevo]);
        if (dbError) throw dbError;

        // 4. Refrescar la tienda y resetear el formulario
        await traerProductosDesdeNube();
        document.getElementById('product-form').reset();
        mostrarSeccion('inicio');
        alert("¡Rareza publicada con todas sus imágenes con éxito!");

    } catch (err) { 
        alert("Supabase rechazó la carga: " + err.message); 
    }
}

//FAVORITOS-------------------

function alternarFavorito(elementoBoton, idProducto) {
    elementoBoton.classList.toggle('activo');
    const estaActivo = elementoBoton.classList.contains('activo');

    // En lugar de localStorage, envías el dato a tu base de datos mediante tu API
    fetch('/api/favoritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            idProducto: idProducto, 
            accion: estaActivo ? 'agregar' : 'quitar' 
        })
    })
    .then(res => res.json())
    .then(data => console.log("Favoritos sincronizados en la Base de Datos"));
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
document.addEventListener("DOMContentLoaded", sincronizarFavoritosAlIngresar);

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
