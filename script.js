// ==========================================
// 1. CONFIGURACIÓN Y CONEXIÓN CON SUPABASE
// ==========================================
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "sb_publishable_noDrdShWvDR8wRsJi0w-nA_q1lB0HLq";

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let productos = [];
let usuarioActivo = JSON.parse(localStorage.getItem('zen_sesion')) || null;
let carrito = [];

let tipoAuthActual = 'login';
let indiceSlideActual = 0;
let categoriaActual = 'Todos';
let subcategoriaActual = 'Todos';

document.addEventListener("DOMContentLoaded", async () => {
    await traerProductosDesdeNube();
    if (usuarioActivo) {
        await aplicarInterfazUsuario();
    }
    const formAdmin = document.getElementById('product-form');
    if (formAdmin) formAdmin.addEventListener('submit', agregarProductoAdmin);

    const formPerfil = document.getElementById('perfil-form');
    if (formPerfil) formPerfil.addEventListener('submit', guardarDatosPerfil);
});

// LEER TU INVENTARIO DE LA NUBE EN TIEMPO REAL
async function traerProductosDesdeNube() {
    try {
        if (!supabase) throw new Error("Supabase no inicializado.");
        
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        // Inyección inicial automática si tu tabla nueva de Supabase está totalmente vacía
        if (!data || data.length === 0) {
            productos = [
                { id: 1, titulo: "Marvel Legends Iron Man (Model 09) Retro", precio: 35, categoria: "Figuras", subcategoria: "Marvel Legends", escala: "6 pulgadas", condicion: "Cerrado / Mint", stock: 1, imagen: "https://unsplash.com", imagen_2: "", imagen_3: "", descripcion: "Figura articulada de la línea retro de Marvel Comics." },
                { id: 2, titulo: "Hot Wheels Nissan Skyline GT-R (R34) RLC", precio: 160, categoria: "Hot Wheels", subcategoria: "Red Line Club", escala: "1:64", condicion: "Cerrado / Mint", stock: 1, imagen: "https://unsplash.com", imagen_2: "", imagen_3: "", descripcion: "Edición ultra limitada de Red Line Club con pintura Spectraflame violeta." }
            ];
            await supabase.from('productos').insert(productos);
        } else {
            productos = data;
        }
    } catch (err) {
        console.error("Error al sincronizar inventario:", err.message);
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
                <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:auto;">
                    <span class="tag-category">${p.subcategoria}</span>
                    <span class="tag-category" style="background:#0e121a; color:var(--color-cian); border:1px solid var(--color-cian);">${p.escala || '1:64'}</span>
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
// 3. REGISTRO GLOBAL Y LOGIN (SUPABASE)
// ==========================================
function abrirModalAuth() {
    if (usuarioActivo) { mostrarSeccion('perfil'); } 
    else { document.getElementById('modal-auth').classList.add('open'); }
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
    const emailInput = document.getElementById('auth-email').value;
    const passInput = document.getElementById('auth-pass').value;

    if (tipoAuthActual === 'register') {
        try {
            // Revisamos en internet si el correo ya existe en tu tabla de Supabase
            const { data: verif } = await supabase.from('usuarios').select('email').eq('email', emailInput);
            if (verif && verif.length > 0) {
                alert("Este correo electrónico ya está registrado en Zen & Zen.");
                return;
            }
            // Guardamos el nuevo usuario directo en la nube de Supabase
            const { error } = await supabase.from('usuarios').insert([{ 
                email: emailInput, password: passInput, nombre: "", telefono: "", direccion: "", cp: "" 
            }]);
            if (error) throw error;
            alert("¡Cuenta de coleccionista creada con éxito! Ya podés ingresar.");
            cambiarAuthTab('login');
        } catch (err) { alert("Error al registrarse: " + err.message); }
    } else {
        try {
            // Cuenta de administrador maestro fija por seguridad
            if (emailInput === "admin@zen.com" && passInput === "1234") {
                usuarioActivo = { email: emailInput };
                localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
                await aplicarInterfazUsuario();
                cerrarModalAuth();
                alert("¡Ingreso exitoso como Administrador!");
                return;
            }
            // Login real buscando las credenciales en tu tabla de usuarios de internet
            const { data: user, error } = await supabase.from('usuarios').select('*').eq('email', emailInput).eq('password', passInput);
            if (error) throw error;
            if (user && user.length > 0) {
                usuarioActivo = { email: emailInput };
                localStorage.setItem('zen_sesion', JSON.stringify(usuarioActivo));
                await aplicarInterfazUsuario();
                cerrarModalAuth();
                alert("¡Ingreso exitoso!");
            } else { alert("Correo electrónico o contraseña incorrectos."); }
        } catch (err) { alert("Error al iniciar sesión: " + err.message); }
    }
});

async function aplicarInterfazUsuario() {
    const userBtn = document.getElementById('user-status');
    if (userBtn) userBtn.textContent = `👤 Mi Perfil (${usuarioActivo.email.split('@')[0]})`;
    if (usuarioActivo.email === "admin@zen.com") {
        document.getElementById('nav-vender').classList.remove('hidden');
    }
    await cargarDatosPerfilEnFormulario();
}

async function cargarDatosPerfilEnFormulario() {
    const displayEmail = document.getElementById('perf-email-display');
    if (displayEmail) displayEmail.textContent = usuarioActivo.email;
    try {
        const { data } = await supabase.from('usuarios').select('*').eq('email', usuarioActivo.email);
        if (data && data.length > 0) {
            document.getElementById('perf-nombre').value = data[0].nombre || "";
            document.getElementById('perf-telefono').value = data[0].telefono || "";
            document.getElementById('perf-direccion').value = data[0].direccion || "";
            document.getElementById('perf-cp').value = data[0].cp || "";
        }
    } catch (err) { console.error("Error al traer datos de perfil:", err.message); }
}

async function guardarDatosPerfil(e) {
    e.preventDefault();
    if (!usuarioActivo) return;
    try {
        const upd = {
            nombre: document.getElementById('perf-nombre').value,
            telefono: document.getElementById('perf-telefono').value,
            direccion: document.getElementById('perf-direccion').value,
            cp: document.getElementById('perf-cp').value
        };
        const { error } = await supabase.from('usuarios').update(upd).eq('email', usuarioActivo.email);
        if (error) throw error;
        alert("¡Datos de envío guardados en tu cuenta global con éxito!");
        mostrarSeccion('inicio');
    } catch (err) { alert("Error al guardar perfil: " + err.message); }
}

function logout() {
    if (confirm("¿Querés cerrar sesión en Zen & Zen?")) {
        localStorage.removeItem('zen_sesion');
        location.reload();
    }
}
// ==========================================
// 4. DETALLES Y PASARELA DE CARRITO WHATSAPP
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
        alert("Ya tenés esta pieza en tu lista.");
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

async function actualizarCarritoUI() {
    document.getElementById('cart-count').textContent = carrito.length;
    const container = document.getElementById('seccion-carrito-items');
    if (!container) return;
    container.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        container.innerHTML = '<h3 style="text-align:center; padding:20px; color:#aaa;">Tu carrito está vacío</h3>';
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
                    <div>
                        <h4 style="color:#fff;">${item.titulo}</h4>
                        <p style="color:var(--color-oro); font-weight:bold;">$${item.precio}</p>
                    </div>
                </div>
                <button onclick="quitarDelCarrito(${index})" style="background:#cc0000; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Quitar</button>
            </div>
        `;
    });

    document.getElementById('resumen-subtotal').textContent = `$${total}`;
    document.getElementById('resumen-total').textContent = `$${total}`;

    const resumenEnvio = document.getElementById('resumen-datos-envio');
    if (usuarioActivo) {
        try {
            const { data } = await supabase.from('usuarios').select('*').eq('email', usuarioActivo.email);
            if (data && data.length > 0 && data[0].nombre) {
                resumenEnvio.innerHTML = `幕 <strong>${data[0].nombre}</strong><br>📍 ${data[0].direccion}`;
            } else {
                resumenEnvio.innerHTML = `⚠️ Completá tu perfil para añadir dirección de despacho.`;
            }
        } catch (err) { resumenEnvio.innerHTML = `⚠️ Error al cargar dirección.`; }
    } else {
        resumenEnvio.innerHTML = `🔑 Iniciá sesión para cargar tus datos de envío automáticamente.`;
    }
}

// CHECKOUT ANTIDUPLICADOS CON TRANSACCIÓN GLOBAL
async function finalizarOrdenWhatsApp() {
    if (!usuarioActivo) { alert("Iniciá sesión para continuar."); abrirModalAuth(); return; }
    if (carrito.length === 0) return;

    alert("Verificando disponibilidad inmediata en el servidor...");

    try {
        const { data: stockReal } = await supabase.from('productos').select('id, titulo, stock');

        for (let item of carrito) {
            let verificado = stockReal.find(dbProd => dbProd.id === item.id);
            if (verificado && parseInt(verificado.stock) === 0) {
                alert(`⚠️ ¡Rareza agotada! El artículo "${item.titulo}" fue adquirido por otro coleccionista hace segundos. Lo removeremos del carrito.`);
                carrito = carrito.filter(c => c.id !== item.id);
                actualizarCarritoUI();
                await traerProductosDesdeNube();
                return;
            }
        }

        // Bajamos el stock en Supabase uno por uno
        for (let item of carrito) {
            await supabase.from('productos').update({ stock: 0 }).eq('id', item.id);
        }

        // Jalamos la dirección del usuario desde Supabase para el mensaje
        const { data: userCloud } = await supabase.from('usuarios').select('*').eq('email', usuarioActivo.email);
        const datosEnvio = userCloud && userCloud.length > 0 ? userCloud[0] : {};
        const metodoPago = document.getElementById('checkout-metodo-pago').value;
        let telefono = "54911XXXXXXXX"; // Cambiá por tu WhatsApp real comercial
        
        let mensaje = `👑 *ORDEN GLOBAL - ZEN & ZEN* 👑\n\n📧 *Coleccionista:* ${usuarioActivo.email}\n💳 *Forma de Pago:* ${metodoPago}\n`;
        if (datosEnvio.nombre) {
            mensaje += `👤 *Nombre:* ${datosEnvio.nombre}\n📞 *Contacto:* ${datosEnvio.telefono}\n📍 *Despacho:* ${datosEnvio.direccion} (CP: ${datosEnvio.cp})\n`;
        }
        
        mensaje += `\n📦 *Artículos Reservados (Stock Removido):*\n`;
        let total = 0;
        carrito.forEach(item => {
            mensaje += `• ${item.titulo} [${item.escala || '1:64'}] -> *$${item.precio}*\n`;
            total += item.precio;
        });
        mensaje += `\n💰 *TOTAL DE LA ORDEN:* *$${total}*`;

        window.open(`https://whatsapp.com{telefono}&text=${encodeURIComponent(mensaje)}`, '_blank');
        
        carrito = [];
        actualizarCarritoUI();
        await traerProductosDesdeNube();
        mostrarSeccion('inicio');
        alert("¡Pedido completado! Las piezas han quedado bloqueadas en la nube.");
    } catch (err) { alert("Error en el checkout: " + err.message); }
}

// 5. PANEL ADMINISTRADOR - SUBIR PRODUCTO DIRECTO A LA NUBE
async function agregarProductoAdmin(e) {
    e.preventDefault();
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
        alert("¡Nueva rareza agregada a la base de datos de Supabase exitosamente!");
    } catch (err) { alert("Error al inyectar producto: " + err.message); }
}
