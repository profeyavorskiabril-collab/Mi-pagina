// ==========================================
// 1. CONFIGURACIÓN Y CONEXIÓN CON SUPABASE
// ==========================================
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "sb_publishable_noDrdShWvDR8wRsJi0w-nA_q1lB0HLq";

// Conexión segura e inicialización del cliente global
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Estados globales de la tienda
let productos = [];
let usuariosRegistrados = JSON.parse(localStorage.getItem('zen_usuarios')) || [];
let usuarioActivo = JSON.parse(localStorage.getItem('zen_sesion')) || null;
let carrito = [];

let tipoAuthActual = 'login';
let indiceSlideActual = 0;
let categoriaActual = 'Todos';
let subcategoriaActual = 'Todos';

// ARRANQUE AUTOMÁTICO
document.addEventListener("DOMContentLoaded", async () => {
    await traerProductosDesdeNube();
    if (usuarioActivo) {
        aplicarInterfazUsuario();
        cargarDatosPerfilEnFormulario();
    }
    const formAdmin = document.getElementById('product-form');
    if (formAdmin) formAdmin.addEventListener('submit', agregarProductoAdmin);

    const formPerfil = document.getElementById('perfil-form');
    if (formPerfil) formPerfil.addEventListener('submit', guardarDatosPerfil);
});

// DESCARGAR ARTÍCULOS DE LA NUBE
async function traerProductosDesdeNube() {
    try {
        if (!supabase) throw new Error("La librería de Supabase no está cargada correctamente en el HTML.");
        
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            productos = [
                { id: 1, titulo: "Marvel Legends Iron Man (Model 09) Retro", precio: 35, categoria: "Figuras", subcategoria: "Marvel Legends", condicion: "Cerrado / Mint", stock: 1, imagen: "https://unsplash.com", descripcion: "Figura articulada de la línea retro de Marvel Comics." },
                { id: 2, titulo: "Hot Wheels Nissan Skyline GT-R (R34) RLC", precio: 160, categoria: "Hot Wheels", subcategoria: "Red Line Club", condicion: "Cerrado / Mint", stock: 1, imagen: "https://unsplash.com", descripcion: "Edición ultra limitada de Red Line Club con pintura Spectraflame violeta." },
                { id: 3, titulo: "Star Wars Black Series Darth Vader", precio: 55, categoria: "Figuras", subcategoria: "Star Wars", condicion: "Near Mint", stock: 1, imagen: "https://unsplash.com", descripcion: "Figura premium escala de 6 pulgadas de Hasbro." }
            ];
            await supabase.from('productos').insert(productos);
        } else {
            productos = data;
        }
    } catch (err) {
        console.error("Usando productos locales de respaldo:", err.message);
        productos = [
            { id: 1, titulo: "Marvel Legends Iron Man (Model 09) Retro", precio: 35, categoria: "Figuras", subcategoria: "Marvel Legends", condicion: "Cerrado / Mint", stock: 1, imagen: "https://unsplash.com", descripcion: "Figura de respaldo." },
            { id: 2, titulo: "Hot Wheels Nissan Skyline GT-R (R34) RLC", precio: 160, categoria: "Hot Wheels", subcategoria: "Red Line Club", condicion: "Cerrado / Mint", stock: 1, imagen: "https://unsplash.com", descripcion: "Auto de respaldo." }
        ];
    }
    renderizarProductos();
}

// CONSTRUIR LAS TARJETAS VISUALES
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

        if (parseInt(p.stock) === 0) {
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

function filtrarCategoria(cat) {
    categoriaActual = cat;
    subcategoriaActual = 'Todos';
    const titulo = document.getElementById('seccion-titulo');
    if (titulo) titulo.textContent = cat === 'Todos' ? 'Artículos en Exhibición' : `Catálogo: ${cat}`;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(cat) || (cat === 'Todos' && btn.textContent === 'Todos'));
    });
    mostrarSeccion('tienda');
    renderizarProductos();
}

function filtrarSubcategoria(cat, subcat) {
    categoriaActual = cat;
    subcategoriaActual = subcat;
    const titulo = document.getElementById('seccion-titulo');
    if (titulo) titulo.textContent = `${cat} ‣ ${subcat}`;
    mostrarSeccion('tienda');
    renderizarProductos();
}

// BÚSQUEDA FLUIDA
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
    if (seccion === 'carrito') actualizarCarritoUI();
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
// 3. SISTEMA DE LOGIN, REGISTRO Y PERFIL
// ==========================================
function abrirModalAuth() {
    if (usuarioActivo) {
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
        usuariosRegistrados.push({ email, pass, nombre: "", telefono: "", direccion: "", cp: "" });
        localStorage.setItem('zen_usuarios', JSON.stringify(usuariosRegistrados));
        alert("¡Cuenta creada con éxito! Ya podés ingresar.");
        cambiarAuthTab('login');
    } else {
        const existe = usuariosRegistrados.find(u => u.email === email && u.pass === pass);
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

function aplicarInterfazUsuario() {
    const userBtn = document.getElementById('user-status');
    if (userBtn) {
        userBtn.textContent = `👤 Mi Perfil (${usuarioActivo.email.split('@')[0]})`;
    }
    if (usuarioActivo.email === "admin@zen.com") {
        const navVender = document.getElementById('nav-vender');
        if (navVender) navVender.classList.remove('hidden');
    }
}

function cargarDatosPerfilEnFormulario() {
    const displayEmail = document.getElementById('perf-email-display');
    if (displayEmail) displayEmail.textContent = usuarioActivo.email;
    
    const datosUsuario = usuariosRegistrados.find(u => u.email === usuarioActivo.email);
    if (datosUsuario) {
        if (document.getElementById('perf-nombre')) document.getElementById('perf-nombre').value = datosUsuario.nombre || "";
        if (document.getElementById('perf-telefono')) document.getElementById('perf-telefono').value = datosUsuario.telefono || "";
        if (document.getElementById('perf-direccion')) document.getElementById('perf-direccion').value = datosUsuario.direccion || "";
        if (document.getElementById('perf-cp')) document.getElementById('perf-cp').value = datosUsuario.cp || "";
    }
}

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
// 4. MODAL DETALLE Y CONTROL DE CARRITO
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
    if (!btn) return;

    if (parseInt(p.stock) === 0) {
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
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.textContent = Math.max(0, carrito.length);
    
    const container = document.getElementById('seccion-carrito-items');
    if (!container) return;
    container.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px;">
                <p style="font-size: 48px; margin-bottom: 10px;">🛒</p>
                <h3 style="color: #fff; margin-bottom: 10px;">Tu carrito de Zen & Zen está vacío</h3>
                <p style="color: #aaa; margin-bottom: 20px;">No dejes pasar los mejores Hot Wheels antes de que se agoten.</p>
            </div>
        `;
        if(document.getElementById('resumen-subtotal')) document.getElementById('resumen-subtotal').textContent = `$0`;
        if(document.getElementById('resumen-total')) document.getElementById('resumen-total').textContent = `$0`;
        return;
    }

    carrito.forEach((item, index) => {
        total += item.precio;
        container.innerHTML += `
            <div class="cart-item" style="display: flex; align-items: center; justify-content: space-between; background: #0b0e14; padding: 15px; border-radius: 8px; border: 1px solid #2a3447; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <img src="${item.imagen}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid #3a4454;">
                    <div>
                        <h4 style="color:#fff; font-size:16px; margin-bottom:5px;">${item.titulo}</h4>
                        <p style="font-size: 13px; color: #aaa;">Línea: <span style="color: var(--color-cian);">${item.subcategoria}</span></p>
                        <h4 style="color: var(--color-oro); font-size:18px;">$${item.precio}</h4>
                    </div>
                </div>
                <button class="btn-remove-item" onclick="quitarDelCarrito(${index})" style="background: #cc0000; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    Eliminar
                </button>
            </div>
        `;
    });

    if(document.getElementById('resumen-subtotal')) document.getElementById('resumen-subtotal').textContent = `$${total}`;
    if(document.getElementById('resumen-total')) document.getElementById('resumen-total').textContent = `$${total}`;

    const resumenEnvio = document.getElementById('resumen-datos-envio');
    if (!resumenEnvio) return;
    if (usuarioActivo) {
        const datosEnvio = usuariosRegistrados.find(u => u.email === usuarioActivo.email) || {};
        if (datosEnvio.nombre) {
            resumenEnvio.innerHTML = `👤 <strong>Nombre:</strong> ${datosEnvio.nombre}<br>📍 <strong>Dirección:</strong> ${datosEnvio.direccion}<br>📮 <strong>C.P.:</strong> ${datosEnvio.cp}`;
        } else {
            resumenEnvio.innerHTML = `⚠️ No cargaste tus datos de envío. Podés hacer <a href="#" onclick="mostrarSeccion('perfil')" style="color:var(--color-cian); text-decoration:underline;">clic acá para completarlos</a>.`;
        }
    } else {
        resumenEnvio.innerHTML = `🔑 <a href="#" onclick="abrirModalAuth()" style="color:var(--color-cian); text-decoration:underline;">Iniciá sesión</a> para adjuntar tu dirección de envío.`;
    }
}

// ==========================================
// 5. CHECKOUT UNIFICADO EN LA NUBE Y ADMIN
// ==========================================
async function finalizarOrdenWhatsApp() {
    if (!usuarioActivo) {
        alert("Iniciá sesión para poder confirmar tu reserva.");
        abrirModalAuth();
        return;
    }
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

alert("Verificando disponibilidad de las piezas en el servidor...");
try {
if (!supabase) throw new Error("Base de datos sin inicializar.");
const { data: stockReal, error: errorStock } = await supabase
.from('productos')
.select('id, titulo, stock');
if (errorStock) throw errorStock;
for (let item of carrito) {
let verificado = stockReal.find(dbProd => dbProd.id === item.id);
if (verificado && parseInt(verificado.stock) === 0) {
alert(⚠️ ¡Lo sentimos! La pieza "${item.titulo}" fue reservada por otro coleccionista hace unos instantes. Se removerá de tu carrito.);
carrito = carrito.filter(c => c.id !== item.id);
actualizarCarritoUI();
await traerProductosDesdeNube();
return;
}
}
for (let item of carrito) {
await supabase
.from('productos')
.update({ stock: 0 })
.eq('id', item.id);
}
const datosEnvio = usuariosRegistrados.find(u => u.email === usuarioActivo.email) || {};
const metodoPago = document.getElementById('checkout-metodo-pago').value;
let telefonoComercial = "54911XXXXXXXX";
let mensaje = 👑 *¡NUEVA ORDEN DE RESERVA - ZEN & ZEN!* 👑\n\n;
mensaje += 📧 *Comprador:* ${usuarioActivo.email}\n;
if (datosEnvio.nombre) {
mensaje += 👤 *Nombre:* ${datosEnvio.nombre}\n📞 *Contacto:* ${datosEnvio.telefono}\n📍 *Destino:* ${datosEnvio.direccion} (CP: ${datosEnvio.cp})\n;
}
mensaje += 💳 *Método de Pago:* ${metodoPago}\n\n;
mensaje += 📦 *Artículos Asegurados:*\n;
let total = 0;
carrito.forEach(item => {
mensaje += • ${item.titulo} -> *$${item.precio}*\n;
total += item.precio;
});
mensaje += \n💰 *VALOR TOTAL:* *$${total}*\n\n🏁 _Redirigido desde la web. Espero tus datos para abonar la reserva._;
window.open(https://whatsapp.com{telefonoComercial}&text=${encodeURIComponent(mensaje)}, '_blank');
carrito = [];
actualizarCarritoUI();
await traerProductosDesdeNube();
mostrarSeccion('inicio');
alert("¡Artículos reservados con éxito en el servidor global!");
} catch (err) {
alert("Ocurrió un error al procesar la transacción: " + err.message);
}
}
async function agregarProductoAdmin(e) {
e.preventDefault();
const nuevoProd = {
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
try {
if (!supabase) throw new Error("Base de datos sin conectar.");
const { error } = await supabase.from('productos').insert([nuevoProd]);
if (error) throw error;
await traerProductosDesdeNube();
document.getElementById('product-form').reset();
mostrarSeccion('inicio');
alert("¡Rareza publicada exitosamente en el servidor global!");
} catch (err) {
alert("Error al subir el producto: " + err.message);
}
}