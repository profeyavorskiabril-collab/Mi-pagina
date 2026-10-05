// ==========================================
// 1. BASE DE DATOS LOCAL AUTOMÁTICA
// ==========================================
let productos = [
    { 
        id: 1, 
        titulo: "Marvel Legends Iron Man (Model 09) Retro", 
        precio: 35, 
        categoria: "Figuras", 
        subcategoria: "Marvel Legends",
        condicion: "Cerrado / Mint",
        stock: 1,
        imagen: "https://unsplash.com", 
        descripcion: "Figura articulada de la línea retro de Marvel Comics. Blíster cerrado en perfectas condiciones, tarjeta impecable sin dobleces." 
    },
    { 
        id: 2, 
        titulo: "Hot Wheels Nissan Skyline GT-R (R34) RLC", 
        precio: 160, 
        categoria: "Hot Wheels", 
        subcategoria: "Red Line Club",
        condicion: "Cerrado / Mint",
        stock: 1,
        imagen: "https://unsplash.com", 
        descripcion: "Edición ultra limitada de Red Line Club. Pintura Spectraflame violeta premium, llantas de goma Real Riders y capó abatible." 
    },
    { 
        id: 3, 
        titulo: "Star Wars Black Series Darth Vader", 
        precio: 55, 
        categoria: "Figuras", 
        subcategoria: "Star Wars",
        condicion: "Near Mint",
        stock: 1,
        imagen: "https://unsplash.com", 
        descripcion: "Figura premium escala de 6 pulgadas de Hasbro. Caja original con mínimos detalles por almacenamiento en estantería." 
    }
];

// LISTAS LOCALES CON MEMORIA (localStorage)
let usuariosRegistrados = JSON.parse(localStorage.getItem('zen_usuarios')) || [];
let usuarioActivo = JSON.parse(localStorage.getItem('zen_sesion')) || null;
let carrito = [];

let tipoAuthActual = 'login';
let indiceSlideActual = 0;
let categoriaActual = 'Todos';
let subcategoriaActual = 'Todos';

// AL CARGAR LA PÁGINA
document.addEventListener("DOMContentLoaded", () => {
    renderizarProductos();
    if (usuarioActivo) {
        aplicarInterfazUsuario();
        cargarDatosPerfilEnFormulario();
    }
    
    // Escuchar el formulario de añadir productos
    const formAdmin = document.getElementById('product-form');
    if (formAdmin) { formAdmin.addEventListener('submit', agregarProductoAdmin); }

    // Escuchar el formulario del Perfil
    const formPerfil = document.getElementById('perfil-form');
    if (formPerfil) { formPerfil.addEventListener('submit', guardarDatosPerfil); }
});

// ==========================================
// 2. RENDERIZAR ARTÍCULOS EN LA GRILLA
// ==========================================
function renderizarProductos() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtrados = productos.filter(p => {
        const cumpleCat = (categoriaActual === 'Todos' || p.categoria === categoriaActual);
        const cumpleSub = (subcategoriaActual === 'Todos' || p.subcategoria.toLowerCase() === subcategoriaActual.toLowerCase());
        return cumpleCat && cumpleSub;
    });

    if (filtrados.length === 0) {
        grid.innerHTML = '<p style="padding:40px; color:#aaa; grid-column:1/-1; text-align:center;">No hay piezas disponibles en esta sección.</p>';
        return;
    }

    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        card.onclick = () => abrirDetalleProducto(p.id);

        if (p.stock === 0) {
            const badge = document.createElement('div');
            badge.classList.add('sold-out-badge');
            badge.textContent = "Vendido";
            card.appendChild(badge);
        }

        card.innerHTML += `
            <img src="${p.imagen}">
            <div class="product-info">
                <h3 class="product-title">${p.titulo}</h3>
                <p class="product-price">$${p.precio}</p>
                <div style="display:flex; gap:5px; margin-top:auto;">
                    <span class="tag-category">${p.subcategoria}</span>
                    <span class="tag-condition">${p.condicion}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}


// BUSCADOR EN TIEMPO REAL
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
function mostrarSeccion(seccion) {
    document.getElementById('view-inicio').classList.toggle('hidden', seccion !== 'inicio');
    document.getElementById('view-tienda').classList.toggle('hidden', seccion !== 'tienda');
    document.getElementById('view-vender').classList.toggle('hidden', seccion !== 'vender');
    document.getElementById('view-perfil').classList.toggle('hidden', seccion !== 'perfil');
    document.getElementById('view-carrito').classList.toggle('hidden', seccion !== 'carrito');
    
    // Si entramos a la sección carrito, forzamos que se redibuje con los valores actuales
    if (seccion === 'carrito') {
        actualizarCarritoUI();
    }
}

function filtrarCategoria(cat) {
    categoriaActual = cat;
    subcategoriaActual = 'Todos';
    
    // Cambiamos el título dentro de la tienda
    const tituloSeccion = document.getElementById('seccion-titulo');
    if (tituloSeccion) {
        tituloSeccion.textContent = cat === 'Todos' ? 'Artículos en Exhibición' : `Catálogo: ${cat}`;
    }
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(cat) || (cat === 'Todos' && btn.textContent === 'Todos'));
    });
    
    mostrarSeccion('tienda'); // 👈 AHORA SÍ: Te manda directo a la sección de ventas
    renderizarProductos();
}

function filtrarSubcategoria(cat, subcat) {
    categoriaActual = cat;
    subcategoriaActual = subcat;
    
    const tituloSeccion = document.getElementById('seccion-titulo');
    if (tituloSeccion) {
        tituloSeccion.textContent = `${cat} ‣ ${subcat}`;
    }
    
    mostrarSeccion('tienda'); // 👈 AHORA SÍ: Te manda directo a la sección de ventas
    renderizarProductos();
}

// CONTROL DEL CARRUSEL DE IMÁGENES
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
// 3. SISTEMA DE LOGIN, REGISTRO Y PERFIL
// ==========================================
function abrirModalAuth() {
    if (usuarioActivo) {
        // Si ya está logueado, al tocar su nombre va directo a ver/editar su perfil
        mostrarSeccion('perfil');
    } else {
        document.getElementById('modal-auth').classList.add('open');
    }
}
function cerrarModalAuth() { document.getElementById('modal-auth').classList.remove('open'); }

function cambiarAuthTab(tab) {
    tipoAuthActual = tab;
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('auth-title').textContent = tab === 'login' ? 'Identificación' : 'Registro de Coleccionista';
    document.getElementById('btn-auth-submit').textContent = tab === 'login' ? 'Entrar' : 'Registrarse';
}

document.getElementById('auth-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    if (tipoAuthActual === 'register') {
        if (usuariosRegistrados.some(u => u.email === email)) {
            alert("Este correo ya tiene cuenta registrada.");
            return;
        }
        // Creamos el usuario en la lista con sus campos de datos de envío en blanco
        usuariosRegistrados.push({ email, pass, nombre: "", telefono: "", direccion: "", cp: "" });
        localStorage.setItem('zen_usuarios', JSON.stringify(usuariosRegistrados));
        alert("¡Cuenta creada con éxito! Ya podés ingresar.");
        cambiarAuthTab('login');
    } else {
        const existe = usuariosRegistrados.find(u => u.email === email && u.pass === pass);
        // Cuenta de administrador maestro o cuenta de usuario válida en el registro
        if ((email === "admin@zen.com" && pass === "1234") || existe) {
            usuarioActivo = { email: email };
            localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
            aplicarInterfazUsuario();
            cargarDatosPerfilEnFormulario();
            cerrarModalAuth();
            alert("¡Ingreso exitoso!");
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    }
});
function logout() {
    if (confirm("¿Querés cerrar sesión en Zen & Zen?")) {
        localStorage.removeItem('zen_sesion');
        location.reload(); // Recarga la página y vuelve a mostrar "Iniciar Sesión"
    }
}
function aplicarInterfazUsuario() {
    const userBtn = document.getElementById('user-status');
    userBtn.textContent = `👤 Mi Perfil (${usuarioActivo.email.split('@')[0]})`;
    
    if (usuarioActivo.email === "admin@zen.com") {
        document.getElementById('nav-vender').classList.remove('hidden');
    }
}

// CARGA LOS DATOS GUARDADOS DE LOCALSTORAGE EN LOS CAMPOS DEL PERFIL
function cargarDatosPerfilEnFormulario() {
    const displayEmail = document.getElementById('perf-email-display');
    if (displayEmail) displayEmail.textContent = usuarioActivo.email;
    
    const datosUsuario = usuariosRegistrados.find(u => u.email === usuarioActivo.email);
    if (datosUsuario) {
        document.getElementById('perf-nombre').value = datosUsuario.nombre || "";
        document.getElementById('perf-telefono').value = datosUsuario.telefono || "";
        document.getElementById('perf-direccion').value = datosUsuario.direccion || "";
        document.getElementById('perf-cp').value = datosUsuario.cp || "";
    }
}

// ACCIÓN DE GUARDAR LOS DATOS EN LA CUENTA DEL CLIENTE
function guardarDatosPerfil(e) {
    e.preventDefault();
    if (!usuarioActivo) return;

    const index = usuariosRegistrados.findIndex(u => u.email === usuarioActivo.email);
    
    if (index !== -1) {
        usuariosRegistrados[index].nombre = document.getElementById('perf-nombre').value;
        usuariosRegistrados[index].telefono = document.getElementById('perf-telefono').value;
        usuariosRegistrados[index].direccion = document.getElementById('perf-direccion').value;
        usuariosRegistrados[index].cp = document.getElementById('perf-cp').value;
        
        localStorage.setItem('zen_usuarios', JSON.stringify(usuariosRegistrados));
        alert("¡Datos de envío guardados de forma segura!");
        mostrarSeccion('inicio');
        aplicarInterfazUsuario();
    } else {
        alert("Los datos de la cuenta de administrador global no se pueden alterar.");
        mostrarSeccion('inicio');
    }
}

function logout() {
    if (confirm("¿Querés cerrar sesión en Zen & Zen?")) {
        localStorage.removeItem('zen_sesion');
        location.reload();
    }
}

// ==========================================
// 4. MODAL DETALLE Y CARRITO WHATSAPP
// ==========================================
function abrirDetalleProducto(id) {
    const p = productos.find(item => item.id === id);
    if (!p) return;

    document.getElementById('detail-img').src = p.imagen;
    document.getElementById('detail-title').textContent = p.titulo;
    document.getElementById('detail-category').textContent = p.subcategoria;
    document.getElementById('detail-condition').textContent = p.condicion;
    document.getElementById('detail-price').textContent = `$${p.precio}`;
    document.getElementById('detail-desc').textContent = p.descripcion;

    const btn = document.getElementById('btn-detail-add');
    if (p.stock === 0) {
        btn.textContent = "Agotado";
        btn.disabled = true;
        btn.style.background = "#555";
    } else {
        btn.textContent = "Añadir a la Orden";
        btn.disabled = false;
        btn.style.background = "var(--color-violeta)";
        btn.onclick = () => agregarAlCarrito(p.id);
    }
    document.getElementById('modal-detail').classList.add('open');
}

function cerrarModalDetail() { document.getElementById('modal-detail').classList.remove('open'); }
function toggleCarrito() { document.getElementById('sidebar-cart').classList.toggle('open'); }

function agregarAlCarrito(id) {
    const p = productos.find(item => item.id === id);
    if (carrito.some(item => item.id === id)) {
        alert("Ya tenés esta pieza en tu lista de reserva.");
        return;
    }
    carrito.push(p);
    actualizarCarritoUI();
    cerrarModalDetail();
}

function quitarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

function actualizarCarritoUI() {
    // Actualizar el número del globito rojo del menú superior
    document.getElementById('cart-count').textContent = carrito.length;
    
    const container = document.getElementById('seccion-carrito-items');
    const layoutWrapper = document.getElementById('carrito-layout-wrapper');
    if (!container) return;
    
    container.innerHTML = '';
    let total = 0;

    // Si el carrito está vacío, mostramos un cartel estético ocupando la pantalla
    if (carrito.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px;">
                <p style="font-size: 48px; margin-bottom: 10px;">🛒</p>
                <h3 style="color: #fff; margin-bottom: 10px;">Tu carrito de Zen & Zen está vacío</h3>
                <p style="color: #aaa; margin-bottom: 20px;">No dejes pasar los mejores Hot Wheels y figuras antes de que se agoten.</p>
            </div>
        `;
        document.getElementById('resumen-subtotal').textContent = `$0`;
        document.getElementById('resumen-total').textContent = `$0`;
        return;
    }

    // Inyectar cada producto agregado con su respectiva foto y botón de remover
    carrito.forEach((item, index) => {
        total += item.precio;
        container.innerHTML += `
            <div class="cart-item" style="display: flex; align-items: center; justify-content: space-between; background: #0b0e14; padding: 15px; border-radius: 8px; border: 1px solid #2a3447; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <img src="${item.imagen}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid #3a4454;">
                    <div>
                        <h4 style="color:#fff; font-size:16px; margin-bottom:5px;">${item.titulo}</h4>
                        <p style="font-size: 13px; color: #aaa; margin-bottom: 4px;">Línea: <span style="color: var(--color-cian);">${item.subcategoria}</span> | Estado: <span style="color:#4caf50;">${item.condicion}</span></p>
                        <h4 style="color: var(--color-oro); font-size:18px;">$${item.precio}</h4>
                    </div>
                </div>
                <button class="btn-remove-item" onclick="quitarDelCarrito(${index})" style="background: #cc0000; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    Eliminar
                </button>
            </div>
        `;
    });

    // Actualizar números de resumen
    document.getElementById('resumen-subtotal').textContent = `$${total}`;
    document.getElementById('resumen-total').textContent = `$${total}`;

    // Dibujar datos del cliente en el mini bloque de envío
    const resumenEnvio = document.getElementById('resumen-datos-envio');
    if (usuarioActivo) {
        const datosEnvio = usuariosRegistrados.find(u => u.email === usuarioActivo.email) || {};
        if (datosEnvio.nombre) {
            resumenEnvio.innerHTML = `
                👤 <strong>Nombre:</strong> ${datosEnvio.nombre}<br>
                📞 <strong>Teléfono:</strong> ${datosEnvio.telefono}<br>
                📍 <strong>Dirección:</strong> ${datosEnvio.direccion}<br>
                📮 <strong>C.P.:</strong> ${datosEnvio.cp}
            `;
        } else {
            resumenEnvio.innerHTML = `⚠️ <span style="color: var(--color-oro);">No cargaste tus datos de envío.</span> Podés procesar la orden igual, o hacer <a href="#" onclick="mostrarSeccion('perfil')" style="color:var(--color-cian); text-decoration:underline;">clic acá para completarlos</a>.`;
        }
    } else {
        resumenEnvio.innerHTML = `🔑 <a href="#" onclick="abrirModalAuth()" style="color:var(--color-cian); text-decoration:underline;">Iniciá sesión aquí</a> para adjuntar tu dirección de envío automáticamente.`;
    }
}
function finalizarOrdenWhatsApp() {
    if (!usuarioActivo) {
        alert("Por favor, iniciá sesión para poder confirmar tu reserva de piezas coleccionables.");
        abrirModalAuth();
        return;
    }
    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }

    const datosEnvio = usuariosRegistrados.find(u => u.email === usuarioActivo.email) || {};
    const metodoPago = document.getElementById('checkout-metodo-pago').value;

    let telefonoComercial = "54911XXXXXXXX"; // 👈 ACÁ: Recordá colocar tu número de WhatsApp real con código de país
    let mensaje = `👑 *¡NUEVA ORDEN DE RESERVA - ZEN & ZEN!* 👑\n\n`;
    mensaje += `📧 *Comprador:* ${usuarioActivo.email}\n`;
    
    if (datosEnvio.nombre) {
        mensaje += `👤 *Nombre:* ${datosEnvio.nombre}\n📞 *Contacto:* ${datosEnvio.telefono}\n📍 *Destino:* ${datosEnvio.direccion} (CP: ${datosEnvio.cp})\n`;
    } else {
        mensaje += `📍 *Envío:* _(Coordinar dirección por chat)_\n`;
    }
    
    mensaje += `💳 *Método de Pago:* ${metodoPago}\n\n`;
    mensaje += `📦 *Artículos Solicitados (Piezas Únicas):*\n`;
    
    let total = 0;
    carrito.forEach(item => {
        mensaje += `• ${item.titulo} [${item.condicion}] -> *$${item.precio}*\n`;
        total += item.precio;
        
        // Descontamos stock local
        let original = productos.find(p => p.id === item.id);
        if (original) original.stock = 0;
    });

    mensaje += `\n💰 *VALOR TOTAL:* *$${total}*\n\n🏁 _Quedo a la espera de los datos de pago para confirmar la compra._`;
    
    // Abrir la API oficial de WhatsApp en pestaña limpia
    window.open(`https://whatsapp.com{telefonoComercial}&text=${encodeURIComponent(mensaje)}`, '_blank');

    // Limpiar carrito local
    carrito = [];
    actualizarCarritoUI();
    renderizarProductos();
    mostrarSeccion('inicio');
    alert("¡Pedido generado! Te redirigimos a WhatsApp para coordinar el pago.");
}

function procesarCompraDirecta() {
    if (!usuarioActivo) {
        alert("Iniciá sesión para poder reservar las piezas.");
        abrirModalAuth();
        return;
    }
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    // Buscamos si el usuario guardó datos en su ficha de perfil
    const datosEnvio = usuariosRegistrados.find(u => u.email === usuarioActivo.email) || {};

    let telefonoComercial = "54911XXXXXXXX"; // 👈 ACÁ: Poné tu celular real con código de país
    let mensaje = `👋 ¡Hola Zen & Zen! Hay una nueva reserva desde la web:\n`;
    mensaje += `📧 *Usuario:* ${usuarioActivo.email}\n`;
    
    if (datosEnvio.nombre) {
        mensaje += `👤 *Nombre:* ${datosEnvio.nombre}\n📞 *Teléfono:* ${datosEnvio.telefono}\n📍 *Dirección de Envío:* ${datosEnvio.direccion} (CP: ${datosEnvio.cp})\n`;
    } else {
        mensaje += `⚠️ _(El usuario todavía no cargó su dirección en su perfil de la tienda)_\n`;
    }
    
    mensaje += `\n📦 *Piezas Únicas Solicitadas:*\n`;
    let total = 0;

    carrito.forEach(item => {
        mensaje += `▪️ ${item.titulo} [${item.condicion}] - $${item.precio}\n`;
        total += item.precio;
        let original = productos.find(p => p.id === item.id);
        if (original) original.stock = 0; // Se marca vendido localmente
    });

    mensaje += `\n💰 *Total de la orden:* $${total}\n🏁 Quedo a la espera de los datos para realizar la transferencia/pago.`;
    
    window.open(`https://whatsapp.com{telefonoComercial}&text=${encodeURIComponent(mensaje)}`, '_blank');

    carrito = [];
    actualizarCarritoUI();
    renderizarProductos();
    toggleCarrito();
}

// PANEL ADMIN: SUBIR PRODUCTOS
function agregarProductoAdmin(e) {
    e.preventDefault();
    const nuevo = {
        id: productos.length + 1,
        titulo: document.getElementById('prod-title').value,
        precio: parseFloat(document.getElementById('prod-price').value),
        categoria: document.getElementById('prod-category').value,
        subcategoria: document.getElementById('prod-subcategory').value,
        condicion: document.getElementById('prod-condition').value,
        stock: 1,
        imagen: document.getElementById('prod-img').value,
        descripcion: document.getElementById('prod-desc').value
    };
    productos.push(nuevo);
    renderizarProductos();
    document.getElementById('product-form').reset();
    mostrarSeccion('inicio');
    alert("¡Rareza añadida con éxito al catálogo!");
}
