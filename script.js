// ==========================================
// 1. DECLARACIÓN DE VARIABLES GLOBALES
// ==========================================
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "sb_publishable_noDrdShWvDR8wRsJi0w-nA_q1lB0HLq";

let productos = [];
let usuariosRegistrados = JSON.parse(localStorage.getItem('zen_usuarios')) || [];
let usuarioActivo = JSON.parse(localStorage.getItem('zen_sesion')) || null;
let carrito = [];

let tipoAuthActual = 'login';
let indiceSlideActual = 0;
let categoriaActual = 'Todos';
let subcategoriaActual = 'Todos';

// Inicialización limpia de Supabase
let supabase = null;
if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ARRANQUE DE LA APLICACIÓN
document.addEventListener("DOMContentLoaded", async () => {
    // Intento de reconexión por si la red tardó en cargar la librería
    if (!supabase && window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    
    await traerProductosDesdeNube();
    if (usuarioActivo) aplicarInterfazUsuario();
    
    const formAdmin = document.getElementById('product-form');
    if (formAdmin) formAdmin.addEventListener('submit', agregarProductoAdmin);

    const formPerfil = document.getElementById('perfil-form');
    if (formPerfil) formPerfil.addEventListener('submit', guardarDatosPerfil);
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
        console.warn("Error de conexión:", err.message);
        productos = [];
    }
    renderizarProductos();
}

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
        grid.innerHTML = '<p style="padding:40px; color:#aaa; grid-column:1/-1; text-align:center;">El catálogo está vacío. ¡Iniciá sesión como admin para cargar tus primeros artículos!</p>';
        return;
    }

    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        card.onclick = () => abrirDetalleProducto(p.id);
        if (parseInt(p.stock) === 0) card.innerHTML += `<div class="sold-out-badge">Vendido</div>`;

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
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    if (tipoAuthActual === 'register') {
        try {
            if (usuariosRegistrados.some(u => u.email === email)) { alert("Correo ya registrado."); return; }
            usuariosRegistrados.push({ email, pass, nombre: "", telefono: "", direccion: "", cp: "" });
            localStorage.setItem('zen_usuarios', JSON.stringify(usuariosRegistrados));
            if (supabase) await supabase.from('usuarios').insert([{ email, password: pass }]);
            alert("¡Cuenta creada! Ya podés ingresar.");
            cambiarAuthTab('login');
        } catch (err) { alert("Error al registrarse: " + err.message); }
    } else {
        const existe = usuariosRegistrados.find(u => u.email === email && u.pass === pass);
        if ((email === "admin@zen.com" && pass === "1234") || existe) {
            usuarioActivo = { email };
            localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
            aplicarInterfazUsuario();
            cerrarModalAuth();
            alert("¡Ingreso exitoso!");
        } else { alert("Datos incorrectos."); }
    }
});

function aplicarInterfazUsuario() {
    const btn = document.getElementById('user-status');
    if (btn) btn.textContent = `👤 Mi Perfil (${usuarioActivo.email.split('@')})`;
    if (usuarioActivo.email === "admin@zen.com") document.getElementById('nav-vender').classList.remove('hidden');
    cargarDatosPerfilEnFormulario();
}

function cargarDatosPerfilEnFormulario() {
    const d = usuariosRegistrados.find(u => u.email === usuarioActivo.email);
    if (d) {
        if(document.getElementById('perf-nombre')) document.getElementById('perf-nombre').value = d.nombre || "";
        if(document.getElementById('perf-telefono')) document.getElementById('perf-telefono').value = d.telefono || "";
        if(document.getElementById('perf-direccion')) document.getElementById('perf-direccion').value = d.direccion || "";
        if(document.getElementById('perf-cp')) document.getElementById('perf-cp').value = d.cp || "";
    }
}

function guardarDatosPerfil(e) {
    e.preventDefault();
    const idx = usuariosRegistrados.findIndex(u => u.email === usuarioActivo.email);
    if (idx !== -1) {
        usuariosRegistrados[idx].nombre = document.getElementById('perf-nombre').value;
        usuariosRegistrados[idx].telefono = document.getElementById('perf-telefono').value;
        usuariosRegistrados[idx].direccion = document.getElementById('perf-direccion').value;
        usuariosRegistrados[idx].cp = document.getElementById('perf-cp').value;
        localStorage.setItem('zen_usuarios', JSON.stringify(usuariosRegistrados));
        if (supabase) supabase.from('usuarios').update({ nombre: usuariosRegistrados[idx].nombre, direccion: usuariosRegistrados[idx].direccion }).eq('email', usuarioActivo.email);
        alert("¡Perfil guardado!");
        mostrarSeccion('inicio');
    }
}

function logout() {
    localStorage.removeItem('zen_sesion');
    location.reload();
}

// ==========================================
// 4. DETALLES, CARRITO Y PASARELA WHATSAPP
// ==========================================
function abrirDetalleProducto(id) {
    const p = productos.find(item => item.id === id);
if (!p) return;
document.getElementById('detail-img').src = p.imagen;
document.getElementById('detail-title').textContent = p.titulo;
document.getElementById('detail-category').textContent = p.subcategoria;
document.getElementById('detail-condition').textContent = p.condicion;
document.getElementById('detail-price').textContent = $${p.precio};
document.getElementById('detail-desc').textContent = p.descripcion;
const btn = document.getElementById('btn-detail-add');
if (parseInt(p.stock) === 0) {
btn.textContent = "Agotado"; btn.disabled = true; btn.style.background = "#555";
} else {
btn.textContent = "Añadir a la Orden"; btn.disabled = false; btn.style.background = "var(--color-violeta)";
btn.onclick = () => agregarAlCarrito(p.id);
}
document.getElementById('modal-detail').classList.add('open');
}
function cerrarModalDetail() { document.getElementById('modal-detail').classList.remove('open'); }
function toggleCarrito() { mostrarSeccion('carrito'); }
function agregarAlCarrito(id) {
const p = productos.find(item => item.id === id);
if (carrito.some(item => item.id === id)) { alert("Ya está en tu orden de compra."); return; }
carrito.push(p);
cerrarModalDetail();
actualizarCarritoUI();
}
function quitarDelCarrito(index) { carrito.splice(index, 1); actualizarCarritoUI(); }
function actualizarCarritoUI() {
document.getElementById('cart-count').textContent = carrito.length;
const container = document.getElementById('seccion-carrito-items');
if (!container) return;
container.innerHTML = '';
let total = 0;
if (carrito.length === 0) {
container.innerHTML = 'Tu carrito de Zen & Zen está vacío';
document.getElementById('resumen-subtotal').textContent = $0;
document.getElementById('resumen-total').textContent = $0;
return;
}
carrito.forEach((item, index) => {
total += item.precio;
container.innerHTML +=  <div class="cart-item" style="display:flex; justify-content:space-between; background:#0b0e14; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #2a3447;"> <div style="display:flex; gap:15px; align-items:center;"> <img src="${item.imagen}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;"> <div><h4 style="color:#fff;">${item.titulo}</h4><p style="color:var(--color-oro); font-weight:bold;">$${item.precio}</p></div> </div> <button onclick="quitarDelCarrito(${index})" style="background:#cc0000; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Quitar</button> </div>;
});
document.getElementById('resumen-subtotal').textContent = $${total};
document.getElementById('resumen-total').textContent = $${total};
}
function finalizarOrdenWhatsApp() {
if (!usuarioActivo) { alert("Iniciá sesión para continuar."); abrirModalAuth(); return; }
if (carrito.length === 0) return;
const d = usuariosRegistrados.find(u => u.email === usuarioActivo.email) || {};
const metodoPago = document.getElementById('checkout-metodo-pago').value;
let telefono = "54911XXXXXXXX";
let mensaje = 👑 *ORDEN - ZEN & ZEN* 👑\n\n📧 *Comprador:* ${usuarioActivo.email}\n💳 *Pago:* ${metodoPago}\n;
if (d.nombre) mensaje += 👤 *Nombre:* ${d.nombre}\n📍 *Destino:* ${d.direccion}\n;
mensaje += \n📦 *Artículos:*\n;
carrito.forEach(item => {
mensaje += • ${item.titulo} -> *$${item.precio}*\n;
if (supabase) supabase.from('productos').update({ stock: 0 }).eq('id', item.id);
});
window.open(https://whatsapp.com{telefono}&text=${encodeURIComponent(mensaje)}, '_blank');
carrito = []; actualizarCarritoUI(); traerProductosDesdeNube(); mostrarSeccion('inicio');
}
async function agregarProductoAdmin(e) {
e.preventDefault();
if (!supabase) { alert("Base de datos desconectada."); return; }
const nuevo = {
titulo: document.getElementById('prod-title').value,
precio: parseFloat(document.getElementById('prod-price').value),
categoria: document.getElementById('prod-category').value,
subcategoria: document.getElementById('prod-subcategory').value,
escala: document.getElementById('prod-escala').value,
condicion: document.getElementById('prod-condition').value,
stock: 1,
imagen: document.getElementById('prod-img').value,
imagen_2: document.getElementById('prod-img2').value || "",
imagen_3: document.getElementById('prod-img3').value || "",
descripcion: document.getElementById('prod-desc').value
};
try {
const { error } = await supabase.from('productos').insert([nuevo]);
if (error) throw error;
await traerProductosDesdeNube();
document.getElementById('product-form').reset();
mostrarSeccion('inicio');
alert("¡Rareza publicada con éxito en la nube!");
} catch (err) { alert("Supabase rechazó la carga: " + err.message); }
}
