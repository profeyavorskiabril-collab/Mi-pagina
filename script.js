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
// CERRAR MENÚ AL HACER CLIC EN CUALQUIER PARTE
// ==========================================
document.addEventListener('click', function(evento) {
    const menu = document.querySelector('.nav-menu');
    const botonMenu = document.querySelector('.menu-hamburger'); // <--- REEMPLAZA CON LA CLASE DE TU BOTÓN DE HAMBURGUESA

    // Si el menú no existe en la página o no está activo, no hacemos nada
    if (!menu || !menu.classList.contains('active')) return;

    // Verificamos si el clic fue FUERA del menú y FUERA del botón que lo abre
    if (!menu.contains(evento.target) && (!botonMenu || !botonMenu.contains(evento.target))) {
        menu.classList.remove('active');
    }
});
// ==========================================================
// SENSOR DEL BOTÓN "ATRÁS" DEL CELULAR (CONECTADO A TU FUNCIÓN)
// ==========================================================
window.addEventListener('popstate', function(evento) {
    // Si el historial del teléfono tiene guardada una sección previa
    if (evento.state && evento.state.seccion) {
        
        // Activamos el escudo para que no se duplique el historial al volver atrás
        window.evitarPushState = true;
        
        // Llamamos a tu función para renderizar la pantalla anterior
        mostrarSeccion(evento.state.seccion);
        
        // Apagamos el escudo para futuros clics normales
        window.evitarPushState = false;
        
    } else {
        // Si vuelve al inicio del historial de la web, lo mandamos a la portada de la tienda
        window.evitarPushState = true;
        mostrarSeccion('inicio');
        window.evitarPushState = false;
    }
});

// Guardamos el estado inicial apenas el cliente entra a tu tienda por primera vez
// ==========================================
// 1. CONTROL DE SECCIONES Y DETECTOR MAESTRO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 🧠 REVISIÓN DE SEGURIDAD PRIMERO: Si viene del mail de recuperación, congelamos las rutas
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery") && hash.includes("access_token=")) {
        console.log("🔑 Retorno seguro detectado. Congelando secciones para cambiar contraseña.");
        window.evitarPushState = true;
        
        // Ejecutamos el detector para levantar el modal flotante inmediatamente

        return; // Detenemos el inicio común para que no tape el modal
    }

    // Si es una entrada común sin token, registramos el inicio normalmente
    const seccionInicial = window.location.hash ? window.location.hash.substring(1) : 'inicio';
    history.replaceState({ seccion: seccionInicial }, "", "#" + seccionInicial);
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
    const selectorOrden = document.getElementById('sort-select');
    const metodoOrden = selectorOrden ? selectorOrden.value : 'predeterminado';

    if (metodoOrden === 'precio-menor') {
        // Ordena de menor a mayor precio
        filtrados.sort((a, b) => parseFloat(a.precio || 0) - parseFloat(b.precio || 0));
    } else if (metodoOrden === 'precio-mayor') {
        // Ordena de mayor a menor precio
        filtrados.sort((a, b) => parseFloat(b.precio || 0) - parseFloat(a.precio || 0));
    } else if (metodoOrden === 'alfabetico-az') {
        // Ordena alfabéticamente de la A a la Z
        filtrados.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
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



function cambiarOrdenamiento() {
    renderizarProductos();
}


function filtrarCategoria(cat) {
    categoriaActual = cat; 
    subcategoriaActual = 'Todos';
    
    const t = document.getElementById('seccion-titulo');
    if (t) t.textContent = cat === 'Todos' ? 'Artículos en Exhibición' : `Catálogo: ${cat}`;
    
    mostrarSeccion('tienda');
    renderizarProductos();

    // 💡 CORRECCIÓN INTEGRADA:
    // Si la categoría es 'Figuras' y estamos en celular (pantalla chica), 
    // NO cerramos el menú para dejar que el submenú se abra en pantalla.
    if (cat === 'Figuras' && window.innerWidth <= 768) {
        // Buscamos el elemento contenedor de FIGURAS para ponerle la clase active y desplegarlo
        const botonFiguras = document.querySelector('.dropdown-toggle') || document.querySelector('.nav-menu a[href*="figuras"]');
        if (botonFiguras && botonFiguras.parentElement) {
            botonFiguras.parentElement.classList.toggle('active');
        }
    } else {
        // Para cualquier otra categoría común (o en computadora), cerramos el menú normalmente
        const menu = document.querySelector('.nav-menu');
        if (menu) menu.classList.remove('active');
    }
}

function filtrarSubcategoria(cat, subcat) {
    categoriaActual = cat; 
    subcategoriaActual = subcat;
    
    const t = document.getElementById('seccion-titulo');
    if (t) t.textContent = `${cat} ‣ ${subcat}`;
    
    mostrarSeccion('tienda');
    renderizarProductos();
    
    // Al hacer clic en la subcategoría final (Ej: Marvel, DC), ahí sí cerramos el menú por completo
    const menu = document.querySelector('.nav-menu');
    if (menu) menu.classList.remove('active');
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
    document.getElementById('view-exito-compra').classList.toggle('hidden', seccion !== 'exito-compra');
    document.getElementById('view-pedidos').classList.toggle('hidden', seccion !== 'pedidos');

    // 🎯 CONTROL INTEGRADO E INTELIGENTE PARA EL CARRITO
    const carritoSeccion = document.getElementById('view-carrito');
    const modoGuardado = localStorage.getItem("zen_theme");
    const esClaro = modoGuardado === "light" || modoGuardado === null;

    if (seccion === 'carrito') {
        actualizarCarritoUI();
        
        // Sincronizamos las clases del contenedor según el tema activo sin romper el body
        if (carritoSeccion) {
            if (esClaro) {
                carritoSeccion.classList.add("modo-claro-carrito");
                carritoSeccion.classList.add("light-mode");
            } else {
                carritoSeccion.classList.remove("modo-claro-carrito");
                carritoSeccion.classList.remove("light-mode");
            }
        }
    } else {
        // Para el resto de las secciones comunes
        if (esClaro) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }

    if (!window.evitarPushState) {
        history.pushState({ seccion: seccion }, "", "#" + seccion);
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
//======================CARRUCEL====================
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
    const menu = document.querySelector('.nav-menu');
        if (menu) menu.classList.remove('active');
}
function cerrarModalAuth() { document.getElementById('modal-auth').classList.remove('open'); }

function cambiarAuthTab(tab) {
    tipoAuthActual = tab;
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('auth-title').textContent = tab === 'login' ? 'Identificación' : 'Registro de Coleccionista';
    document.getElementById('btn-auth-submit').textContent = tab === 'login' ? 'Entrar' : 'Registrarse';
// Agrega esto dentro de tu función cambiarAuthTab(tab):
const helperRow = document.getElementById('auth-forget-row');
if (helperRow) {
    helperRow.style.display = tab === 'login' ? 'flex' : 'none';
}

}


async function procesarIdentificacionUsuario(e) {
    e.preventDefault();

    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const pass = document.getElementById('auth-pass').value;

    // INICIO DE SESIÓN CON SUPABASE AUTH
   
// INICIO DE SESIÓN CON SUPABASE AUTH
if (tipoAuthActual !== 'register') {
    try {

        // 1. Intentar ingresar normalmente.
        let ingreso = await window.supabase.auth.signInWithPassword({
            email: email,
            password: pass
        });

        // 2. Si no existe en Auth, intentar migrar la cuenta antigua.
        if (ingreso.error) {

            const respuestaMigracion = await fetch('/api/migrar-cuenta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: pass
                })
            });

           const textoMigracion = await respuestaMigracion.text();

let resultadoMigracion;

try {
    resultadoMigracion = JSON.parse(textoMigracion);
} catch (error) {
    console.error("RESPUESTA REAL DE MIGRACIÓN:", textoMigracion);
    throw new Error(
        "El servidor devolvió un error. Revisá la consola y los Logs de Vercel."
    );
}

            if (!respuestaMigracion.ok) {
                throw new Error(
                    resultadoMigracion.error ||
                    'No se pudo ingresar a la cuenta.'
                );
            }

            // 3. Volver a intentar el ingreso con la cuenta migrada.
            ingreso = await window.supabase.auth.signInWithPassword({
                email: email,
                password: pass
            });

            if (ingreso.error) throw ingreso.error;
        }

        // 4. Recuperar el perfil existente.
        const { data: perfil, error: perfilError } =
            await window.supabase
                .from('usuarios')
                .select('*')
                .eq('email', email)
                .maybeSingle();

        if (perfilError) throw perfilError;

        usuarioActivo = perfil || {
            email: email,
            rol: 'cliente',
            nombre: '',
            telefono: '',
            direccion: '',
            cp: '',
            favoritos: []
        };

        localStorage.removeItem('zen_sesion');
        localStorage.setItem(
            'zen_sesion',
            JSON.stringify(usuarioActivo)
        );

        aplicarInterfazUsuario();
        cerrarModalAuth();

        if (typeof sincronizarFavoritosAlIngresar === 'function') {
            sincronizarFavoritosAlIngresar();
        }

        alert('¡Ingreso exitoso! Bienvenido.');

    } catch (err) {
        console.error('Error de inicio de sesión:', err);
        alert(err.message || 'No se pudo iniciar sesión. Revisá tu correo y contraseña.');
    }

    return;
}

    

    // El registro lo adaptaremos al nuevo sistema de autenticación
   
    // REGISTRO DE NUEVO USUARIO
    try {
        const respuesta = await fetch('/api/registrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: pass
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.error || 'No se pudo crear la cuenta.');
        }

        // Iniciar sesión automáticamente después del registro.
        const { data: authData, error: authError } =
            await window.supabase.auth.signInWithPassword({
                email: email,
                password: pass
            });

        if (authError) throw authError;

        // Recuperar el perfil recién creado.
        const { data: perfil, error: perfilError } =
            await window.supabase
                .from('usuarios')
                .select('*')
                .eq('email', email)
                .maybeSingle();

        if (perfilError) throw perfilError;

        usuarioActivo = perfil || {
            email: email,
            rol: 'cliente',
            nombre: '',
            telefono: '',
            direccion: '',
            cp: '',
            favoritos: []
        };

        localStorage.removeItem('zen_sesion');
        localStorage.setItem(
            'zen_sesion',
            JSON.stringify(usuarioActivo)
        );

        aplicarInterfazUsuario();
        cerrarModalAuth();

        if (typeof sincronizarFavoritosAlIngresar === 'function') {
            sincronizarFavoritosAlIngresar();
        }

        alert('¡Tu cuenta fue creada correctamente! Bienvenido.');

    } catch (err) {
        console.error('Error de registro:', err);
        alert(err.message || 'No se pudo completar el registro.');
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

// ==========================================================
// ✉️ ENVIADOR DE CORREO DE RECUPERACIÓN ADAPTADO PARA VERCEL
// Variables globales de seguridad temporales en memoria
window.seguridadOTP_Generado = null;
window.usuarioOTP_IdActual = null;

// 1. FUNCIÓN MAESTRA: Verifica el usuario y despacha el correo seguro desde tu Gmail

async function manejarRecuperarContrasena() {
    const correo = document.getElementById('auth-email')
        .value.trim().toLowerCase();

    if (!correo) {
        alert("Ingresá tu correo electrónico.");
        return;
    }

    try {
        const respuesta = await fetch("/api/recuperar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: correo })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.error);
        }

        const { error } = await window.supabase.auth.resetPasswordForEmail(
            correo,
            {
                redirectTo: window.location.origin + "/?recuperar=1"
            }
        );

        if (error) throw error;

        alert("¡Solicitud enviada! Revisá tu correo.");

    } catch (error) {
        console.error(error);
        alert("No se pudo enviar el correo: " + error.message);
    }
}

// 2. FUNCIÓN DE FILTRO: Valida si el código que escribió el cliente es el correcto
function procesarValidacionOTP(e) {
    e.preventDefault();
    const codigoIngresado = document.getElementById('otp-input').value.trim();

    if (codigoIngresado === window.seguridadOTP_Generado) {
        console.log("🔓 Validación exitosa. Identidad confirmada.");
        
        // Cerramos la casilla del código y recién ahora abrimos el formulario de contraseña
        document.getElementById('modal-verificar-otp').classList.remove('open');
        document.getElementById('modal-restablecer-password').classList.add('open');
    } else {
        alert("❌ Código incorrecto. Verifica el mensaje enviado a tu mail e intenta de nuevo.");
    }
}

// 3. FUNCIÓN DE IMPACTO: Guarda la nueva contraseña en tu tabla de Supabase
async function procesarNuevaPassword(e) {
    e.preventDefault();
    const nuevaPassword = document.getElementById('new-password-input').value;
    
    if (nuevaPassword.trim().length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres por seguridad.");
        return;
    }

    try {
        // Impactamos la contraseña en tu tabla real usando el ID validado por el OTP
        const { error } = await window.supabase
            .from('usuarios')
            .update({ password: nuevaPassword })
            .eq('id', window.usuarioOTP_IdActual);

        if (error) throw error;

        alert("🔒 ¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tus datos nuevos.");
        
        // Limpiamos los tokens de la memoria por seguridad
        window.seguridadOTP_Generado = null;
        window.usuarioOTP_IdActual = null;
        
        document.getElementById('modal-restablecer-password').classList.remove('open');
        if (typeof mostrarSeccion === 'function') mostrarSeccion('inicio');
        
    } catch (err) {
        alert("Error al guardar en la base de datos: " + err.message);
    }
}

// ==========================================================================
// 🚀 MOTOR REAL DE ENVÍO DE CORREOS OTP VÍA RESEND (CÓDIGO DE AYER)
// ==========================================================================
async function enviarCorreoGmailOTP(destinatario, codigo) {
    try {
        console.log(`✈️ Conectando con Resend para enviar el código a ${destinatario}...`);

        // 🔥 PEGÁ ACÁ TU CLAVE DE RESEND (La que empieza con re_ que guardamos ayer)
        const RESEND_API_KEY = "re_BGSgE4GZ_APikkbhMWJ2y5kr5vobohpj2"; 

        // Llamamos directamente a la API oficial de Resend desde tu código
        const respuesta = await fetch("https://vercel.app", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "Zen & Zen <onboarding@resend.dev>", // Usamos el remitente gratuito de Resend
                to: destinatario,
                subject: "🔒 Código de verificación de Seguridad - Zen & Zen",
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px;">
                        <h2 style="color: #0b0617; text-align: center;">Verificación de Identidad</h2>
                        <p>Hola,</p>
                        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en la tienda <strong>Zen & Zen</strong>.</p>
                        <p>Tu código de seguridad temporal de 6 dígitos es:</p>
                        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 1.8rem; font-weight: bold; letter-spacing: 4px; color: #00ced1; border-radius: 4px; margin: 20px 0;">
                            ${codigo}
                        </div>
                        <p>Ingresa este número en la pantalla de la tienda para poder escribir tu nueva contraseña de coleccionista.</p>
                        <p style="font-size: 0.8rem; color: #64748b; margin-top: 30px;">Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
                    </div>
                `
            })
        });

        if (respuesta.ok) {
            console.log("✅ Correo enviado con éxito a través del motor de Resend.");
            return true;
        } else {
            const errorDatos = await respuesta.json();
            throw new Error(errorDatos.message || "Error desconocido del servidor de Resend.");
        }

    } catch (error) {
        console.error("❌ Error crítico en el motor de Resend:", error);
        alert("No se pudo despachar el correo: " + error.message);
        return false;
    }
}





async function logout() {
    // Cerrar sesión en Supabase Auth
    const { error } = await window.supabase.auth.signOut();

    if (error) {
        console.error("Error cerrando sesión:", error);
    }

    usuarioActivo = null;

    localStorage.removeItem('zen_sesion');

    // Vaciar carrito
    carrito = [];
    localStorage.removeItem('zen_carrito');

    // Limpiar correo y contraseña del formulario
    const email = document.getElementById('auth-email');
    const password = document.getElementById('auth-pass');

    if (email) email.value = '';
    if (password) password.value = '';

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

    // 🎯 CORRECCIÓN DIRECTA: Usamos 'p' que ya contiene toda la información del artículo
    if (p && typeof mostrarToastAviso === 'function') {
        // Lanzamos la notificación pasando el nombre de tu Funko o rareza
        mostrarToastAviso(p.titulo);
    }
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

//FAVORITOS
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

        // ==========================================================
        // CORRECCIÓN MULTI-FOTO: Extraemos solo la primera imagen para el carrito
        // ==========================================================
        let miniaturaPortada = item.imagen;
        if (item.imagen && item.imagen.includes(',')) {
            miniaturaPortada = item.imagen.split(',')[0]; // Tomamos la primera imagen limpia
        }

        container.innerHTML += `
            <div class="cart-custom-item-row">
                <!-- 1. Foto del Artículo (Corregida con la variable dinámica) -->
                <div class="cart-item-media">
                    <img src="${miniaturaPortada}" alt="${item.titulo}">
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
                    mensajeEnvio = `📍 Envío calculated para CP: ${cp}.`;
                }
            } 
            // 3. Evaluamos si eligió MOTO
            else if (selector.value === 'moto') {
                if (cp >= 1601 && cp <= 1675) {
                    costoEnvio = 2500; 
                    if (infoTexto) infoTexto.style.display = "none";
                } else {
                    costoEnvio = 5000; 
                    mensajeEnvio = ` ⚠️ No hay motomensajería en tu zona (CP: ${cp}).`;
                    if (infoTexto) infoTexto.style.display = "block"; 
                }
            }
        }
    } else {
        costoEnvio = 0;
        if (infoTexto) infoTexto.style.display = "none";
    }

    // 3. Monto final
    let totalFinal = subtotal + costoEnvio;

    // 4. Inyectar textos en el HTML con el formato regional de puntos (.toLocaleString)
    if (infoTexto) infoTexto.textContent = mensajeEnvio;
    
    if (document.getElementById('cart-subtotal')) {
        document.getElementById('cart-subtotal').textContent = `$${subtotal.toLocaleString('es-AR')}`;
    }
    
    if (document.getElementById('cart-shipping-cost')) {
        document.getElementById('cart-shipping-cost').textContent = costoEnvio === 0 ? "Gratis" : `$${costoEnvio.toLocaleString('es-AR')}`;
    }
    
    if (document.getElementById('cart-total-final')) {
        document.getElementById('cart-total-final').textContent = `$${totalFinal.toLocaleString('es-AR')}`;
    }
}

async function finalizarOrdenWhatsApp() {
    if (!usuarioActivo) { alert("Iniciá sesión para continuar."); abrirModalAuth(); return; }
    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }

    const selectorEntrega = document.getElementById('metodo-entrega-select');
    const valorEntrega = selectorEntrega ? selectorEntrega.value : "retiro_estacion";
    
    // Conseguimos el texto exacto del punto de encuentro elegido
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
        metodoEntregaFinal = `🤝 Punto de Encuentro: ${puntoEncuentroElegido.replace('🏃‍♂️ ', '')} *(A coordinar día y horario por privado)*`;
    }

    const subtotalTexto = document.getElementById('cart-subtotal')?.textContent || "\$0";
    const envioTexto = document.getElementById('cart-shipping-cost')?.textContent || "\$0";
    const totalFinalTexto = document.getElementById('cart-total-final')?.textContent || subtotalTexto;

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

        btnAceptar.onclick = async () => {
            modalConfirmar.classList.add('hidden');

            if (typeof mostrarAlertaZen === 'function') {
                mostrarAlertaZen("¡Procesando tu pedido! Abriendo WhatsApp...", "success");
            }

            let idPedidoGenerado = "S/N";

            try {
                // 1. Simplificamos el carrito para enviarlo limpio en formato JSON a tu tabla
                const listaProductosSimplificada = carrito.map(item => ({
                    titulo: item.titulo,
                    precio: item.precio
                }));

                // Limpiamos los símbolos de moneda para enviar el total como número puro
                const totalNumerico = parseFloat(totalFinalTexto.replace(/[^0-9.-]+/g, "")) || 0;

                // 2. Preparamos el objeto estructurado para Supabase
                const nuevoPedido = {
                    cliente_email: usuarioActivo.email,
                    productos_comprados: listaProductosSimplificada,
                    total: totalNumerico,
                    estado: 'Pendiente'
                };

                // 3. RESPALDO AUTOMÁTICO EN LA NUBE: Registramos el pedido en Supabase
                const { data, error: dbError } = await window.supabase
                    .from('pedidos')
                    .insert([nuevoPedido])
                    .select();

                if (dbError) throw dbError;

                // Si Supabase procesó todo bien, extraemos el ID autoincremental de la fila
                if (data && data.length > 0) {
                    idPedidoGenerado = data[0].id;
                }

            } catch (err) {
                console.error("Error al guardar el pedido de respaldo en Supabase:", err.message);
                // No frenamos el flujo de WhatsApp del usuario, permitimos que continúe con ID "S/N"
            }

            // 4. Armado final del cuerpo del mensaje incluyendo el ID obtenido
            let mensaje = `👑 *ORDEN - ZEN & ZEN (Pedido #${idPedidoGenerado})* 👑\n\n`;
            mensaje += `📧 *Comprador:* ${usuarioActivo.email}\n`;
            mensaje += `💳 *Pago:* ${metodoPago}\n`;
            mensaje += `📦 *Entrega:* ${metodoEntregaFinal}\n`;
            
            if (usuarioActivo.nombre) mensaje += `👤 *Nombre:* ${usuarioActivo.nombre}\n`;
            if (usuarioActivo.telefono) mensaje += `📞 *Teléfono:* ${usuarioActivo.telefono}\n`;
            
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
console.log("MENSAJE ANTES DE WHATSAPP:", mensaje);
console.log("CODIFICACIÓN:", [...mensaje].map(c => c.codePointAt(0).toString(16)));
            // 5. Redirección oficial y limpieza absoluta del Carrito Local
            const linkFinal = "https://wa.me/" + miNumeroReal + "?text=" + encodeURIComponent(mensaje);
            window.open(linkFinal, '_blank');
            console.log("ENLACE WHATSAPP:", linkFinal);
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

async function alternarFavorito(elementoBoton, idProducto) {

    if (!usuarioActivo || !usuarioActivo.email) {
        alert("Iniciá sesión para guardar favoritos.");
        return;
    }

    if (!usuarioActivo.favoritos) {
        usuarioActivo.favoritos = [];
    }

    const idString = String(idProducto).trim();
    const yaEsFavorito = usuarioActivo.favoritos.some(
        id => String(id).trim() === idString
    );

    const favoritosAnteriores = [...usuarioActivo.favoritos];

    if (yaEsFavorito) {
        usuarioActivo.favoritos = usuarioActivo.favoritos.filter(
            id => String(id).trim() !== idString
        );
    } else {
        usuarioActivo.favoritos.push(idString);
    }

    elementoBoton.classList.toggle(
        'activo',
        usuarioActivo.favoritos.some(id => String(id).trim() === idString)
    );

    try {
        const { error } = await window.supabase
            .from('usuarios')
            .update({ favoritos: usuarioActivo.favoritos })
            .eq('email', usuarioActivo.email);

        if (error) throw error;

        localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));

        console.log("Favoritos guardados correctamente en Supabase.");

        if (
            document.getElementById('view-favoritos') &&
            !document.getElementById('view-favoritos').classList.contains('hidden')
        ) {
            mostrarFavoritos();
        }

    } catch (error) {
        usuarioActivo.favoritos = favoritosAnteriores;

        elementoBoton.classList.toggle(
            'activo',
            favoritosAnteriores.some(id => String(id).trim() === idString)
        );

        console.error("Error guardando favoritos:", error);
        alert("No se pudieron guardar los favoritos. Intentá nuevamente.");
    }
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
     const imagenPrincipal = String(item.imagen || '').split(',')[0].trim();
    console.log("IMAGEN EN FAVORITOS:", item.imagen);
            grid.innerHTML += `
                <div class="product-card" onclick="event.stopPropagation(); verDetalleProducto('${item.id}')">
                   <img src="${imagenPrincipal}" alt="${item.titulo}" onerror="this.src='placeholder.jpg'">
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
// ==========================================================      caja.style.setProperty('background-color', 'rgba(11, 14, 20, 0.85)', 'important');
document.addEventListener("DOMContentLoaded", () => {
    const themeBtn = document.getElementById("theme-toggle-btn");
    if (!themeBtn) return;

    // Función auxiliar para las cajas de despacho de la tienda
    const ajustarCajaDespachoDinamica = (isLight) => {
        const cajasNegras = document.querySelectorAll('[style*="background: rgba(11, 14, 20"], [style*="background-color: rgba(11, 14, 20"]');
        cajasNegras.forEach(caja => {
            if (caja.closest('#view-carrito')) return; // El nuevo carrito se maneja nativamente por CSS

            if (isLight) {
                caja.style.setProperty('background', '#f1f5f9', 'important');
                caja.style.setProperty('background-color', '#f1f5f9', 'important');
                caja.style.setProperty('color', '#1e293b', 'important');
                caja.style.setProperty('border', '1px solid #cbd5e1', 'important');
            } else {
                caja.style.setProperty('background', 'rgba(11, 14, 20, 0.85)', 'important');
                caja.style.setProperty('color', '#ffffff', 'important');
                caja.style.setProperty('border', 'none', 'important');
            }
        });
    };

    // Al cargar la página por primera vez
    const modoGuardado = localStorage.getItem("zen_theme");
    if (modoGuardado === "light" || modoGuardado === null) {
        document.body.classList.add("light-mode");
        setTimeout(() => ajustarCajaDespachoDinamica(true), 100);
    } else {
        document.body.classList.remove("light-mode");
        setTimeout(() => ajustarCajaDespachoDinamica(false), 100);
    }

   themeBtn.addEventListener("click", () => {
    const esModoClaro = document.body.classList.toggle("light-mode");
    const carritoSeccion = document.getElementById('view-carrito');
    
    if (esModoClaro) {
        localStorage.setItem("zen_theme", "light");
        ajustarCajaDespachoDinamica(true);
        console.log("☀️ Modo Claro Activado en la tienda");
        
        // 🎯 Activamos el entorno aislado exclusivo para el carrito
        if (carritoSeccion) {
            carritoSeccion.classList.add("modo-claro-carrito");
        }
    } else {
        localStorage.setItem("zen_theme", "dark");
        ajustarCajaDespachoDinamica(false);
        console.log("🌙 Modo Oscuro Activado");
        
        // 🌙 Volvemos al modo oscuro original quitando la clase
        if (carritoSeccion) {
            carritoSeccion.classList.remove("modo-claro-carrito");
        }
    }
});

    // Parche por si se redibuja la sección al interactuar con el ícono
    const btnCarrito = document.querySelector('.cart-icon') || document.getElementById('user-status');
    if (btnCarrito) {
        btnCarrito.addEventListener('click', () => {
            setTimeout(() => {
                const actualmenteClaro = document.body.classList.contains("light-mode");
                ajustarCajaDespachoDinamica(actualmenteClaro);
            }, 150);
        });
    }
});
function toggleProfileMenu(event) {
    event.stopPropagation();

    const menu = document.querySelector('.profile-dropdown');
    menu.classList.toggle('active');
}

document.addEventListener('click', function(event) {
    const profile = document.querySelector('.profile-desktop');

    if (profile && !profile.contains(event.target)) {
        profile.querySelector('.profile-dropdown').classList.remove('active');
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
// ==========================================
// NOTIFICACIÓN FLOTANTE (TOAST) DE ÉXITO
// ==========================================
function mostrarToastAviso(tituloProducto) {
    // 1. Buscamos si ya existe un contenedor de toasts, si no, lo creamos
    let contenedorToast = document.getElementById('toast-container');
    if (!contenedorToast) {
        contenedorToast = document.createElement('div');
        contenedorToast.id = 'toast-container';
        document.body.appendChild(contenedorToast);
    }

    // 2. Creamos la estructura de la notificación individual
    const toast = document.createElement('div');
    toast.className = 'toast-notification success';

    // Inyectamos un diseño limpio con un icono de check sólido
    toast.innerHTML = 
        '<div class="toast-icon">✓</div>' +
        '<div class="toast-body">' +
            '<strong>¡Agregado al carrito!</strong>' +
            '<p>' + tituloProducto + '</p>' +
        '</div>';

    // 3. Añadimos el nuevo toast al contenedor flotante
    contenedorToast.appendChild(toast);

    // 4. Animación de salida y remoción automática a los 3 segundos
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        // Esperamos a que termine la animación CSS para borrar el elemento del DOM
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// 💥 TRUCO MAESTRO: Sobreescribimos el alert viejo del navegador
// Esto hace que todo tu código viejo pase a verse hermoso al instante sin cambiar nada más
window.alert = function(mensaje) {
    mostrarAlertaZen(mensaje, 'info');
};
// ==========================================================
// HISTORIAL DE PEDIDOS DINÁMICO DESDE SUPABASE
// ==========================================================
async function traerHistorialPedidos() {
    if (!usuarioActivo || !usuarioActivo.email) {
        alert("Debes iniciar sesión para ver tu historial de pedidos 🔒");
        mostrarSeccion('inicio');
        return;
    }

    const container = document.getElementById('contenedor-historial-pedidos');
    const spinner = document.getElementById('pedidos-cargando');
    if (!container) return;

    container.innerHTML = "";
    if (spinner) spinner.style.display = "block";

    try {
        const { data: listaPedidos, error } = await window.supabase
            .from('pedidos')
            .select('*')
            .eq('cliente_email', usuarioActivo.email)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (spinner) spinner.style.display = "none";

        if (!listaPedidos || listaPedidos.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#aaa; padding:30px;">Aún no has realizado ningún pedido en la tienda.</p>';
            return;
        }

        listaPedidos.forEach(pedido => {
            const fecha = new Date(pedido.created_at).toLocaleDateString('es-AR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const productos = Array.isArray(pedido.productos_comprados) 
                ? pedido.productos_comprados 
                : JSON.parse(pedido.productos_comprados || "[]");

            let listaNombresHtml = "";
            productos.forEach(p => {
                // 🎯 CLASE AGREGADA: 'pedido-item-name' para controlar el color del texto del producto
                listaNombresHtml += `<li class="pedido-item-name" style="font-size:0.9rem; margin-bottom:4px;">• ${p.titulo}</li>`;
            });

            const tarjeta = document.createElement('div');
            // 🎯 CLASE AGREGADA: 'pedido-historial-card' para el fondo de la tarjeta
            tarjeta.className = 'pedido-historial-card';
            tarjeta.style.cssText = "background:#11121a; border:1px solid #222; padding:15px; border-radius:8px; display:flex; flex-direction:column; gap:10px;";

            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222; padding-bottom:8px;">
                    <span class="pedido-card-header" style="color:#888; font-size:0.85rem;">Pedido #${pedido.id} - ${fecha}</span>
                    <span class="badge-estado" style="background:rgba(0,240,255,0.1); color:#00f0ff; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">
                        ${pedido.estado || 'Procesado'}
                    </span>
                </div>
                <ul style="list-style:none; padding:0; margin:0;">
                    ${listaNombresHtml}
                </ul>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; font-weight:bold;">
                    <span class="pedido-card-total-label" style="color:#aaa; font-size:0.9rem;">Total:</span>
                    <!-- 🎯 CLASE AGREGADA: 'total-precio-oro' para blindar tu color dorado -->
                    <span class="total-precio-oro" style="color: var(--color-oro, #ffd700) !important; font-size:1.1rem;">$${Number(pedido.total).toLocaleString('es-AR')}</span>
                </div>
            `;
            container.appendChild(tarjeta);
        });

    } catch (err) {
        if (spinner) spinner.style.display = "none";
        console.error("Error al traer historial:", err.message);
        container.innerHTML = '<p style="text-align:center; color:#ff4444;">No se pudo cargar el historial de pedidos.</p>';
    }
}


// Función puente para el menú de navegación
function mostrarMisPedidos() {
    mostrarSeccion('pedidos'); // Prende la vista cambiándole las clases .hidden
    traerHistorialPedidos();   // Carga los datos de Supabase al instante
}

// ==========================================================================
// 🕹️ PROCESADOR INTEGRADO DE ZOOM LUPA Y LIGHTBOX NATIVO
// ==========================================================================

function ejecutarZoomLupa(e) {
    // Si estamos en celular, cancelamos la lupa
    if (window.innerWidth <= 768) return;

    const img = document.getElementById("detail-img");
    const lens = document.getElementById("detail-zoom-lens");

    if (!img || !lens || !img.src) return;

    lens.style.visibility = "visible";

    // Configuramos la imagen de fondo de la lupa con el mismo archivo de Supabase
    lens.style.backgroundImage = `url('${img.src}')`;
    
    // Nivel de zoom (3x aumentado)
    const factorZoom = 3;
    lens.style.backgroundSize = `${img.width * factorZoom}px ${img.height * factorZoom}px`;

    // Calculamos las coordenadas del mouse respecto a la imagen
    const rect = img.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Ajustamos los límites para que el lente no se salga de la foto
    let posX = x - (lens.offsetWidth / 2);
    let posY = y - (lens.offsetHeight / 2);

    if (posX < 0) posX = 0;
    if (posX > img.width - lens.offsetWidth) posX = img.width - lens.offsetWidth;
    if (posY < 0) posY = 0;
    if (posY > img.height - lens.offsetHeight) posY = img.height - lens.offsetHeight;

    // Movemos físicamente la cajita de la lupa
    lens.style.left = `${posX}px`;
    lens.style.top = `${posY}px`;

    // Desplazamos el fondo de la imagen de forma inversa para centrar el aumento
    const cx = (posX + (lens.offsetWidth / 2)) * factorZoom - (lens.offsetWidth / 2);
    const cy = (posY + (lens.offsetHeight / 2)) * factorZoom - (lens.offsetHeight / 2);
    lens.style.backgroundPosition = `-${cx}px -${cy}px`;
}

function ocultarZoomLupa() {
    const lens = document.getElementById("detail-zoom-lens");
    if (lens) lens.style.visibility = "hidden";
}

// --- CONTROL DE PANTALLA COMPLETA ---
function abrirLightboxColeccion() {
    const srcImg = document.getElementById("detail-img")?.src;
    const lightbox = document.getElementById("lightbox-enlargement");
    const lightboxImg = document.getElementById("lightbox-img");

    if (!srcImg || !lightbox || !lightboxImg) return;

    lightboxImg.src = srcImg;
    lightbox.style.display = "flex";
}

function cerrarLightboxColeccion() {
    const lightbox = document.getElementById("lightbox-enlargement");
    if (lightbox) lightbox.style.display = "none";
}

// Vinculamos de forma segura el evento de clic apenas se monte la vista detallada

document.addEventListener("DOMContentLoaded", () => {
    
    const imgPrincipal = document.getElementById("detail-img");

    if (imgPrincipal) {
        imgPrincipal.addEventListener("click", () => {
            abrirLightboxColeccion();
        });
    }
});


// Detectar cuando el usuario llega desde el enlace de recuperación
window.supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
        document
            .getElementById("modal-restablecer-password")
            .classList.add("open");
    }
});


// Guardar la nueva contraseña en Supabase
async function procesarNuevaPassword(event) {
    event.preventDefault();

    const nueva = document.getElementById("new-password-input").value;
    const confirmar = document.getElementById("confirm-password-input").value;

    if (nueva.length < 8) {
        alert("La contraseña debe tener al menos 8 caracteres.");
        return;
    }

    if (nueva !== confirmar) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    try {
        const { error } = await window.supabase.auth.updateUser({
            password: nueva
        });

        if (error) throw error;

        await window.supabase.auth.signOut();

        localStorage.removeItem("zen_sesion");

        document
            .getElementById("modal-restablecer-password")
            .classList.remove("open");

        document.getElementById("form-restablecer-password").reset();

        alert("¡Contraseña actualizada! Ya podés iniciar sesión.");

    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        alert("No se pudo actualizar la contraseña: " + error.message);
    }
}