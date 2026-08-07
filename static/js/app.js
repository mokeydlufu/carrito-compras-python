// ================================================
// UTILIDADES
// ================================================
const IGV_RATE = 0.18;
const ENVIO = 15.00;

function getCartId() {
    let cid = localStorage.getItem('cart_id');
    if (!cid) {
        cid = 'cart_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cart_id', cid);
    }
    return cid;
}

const CART_ID = getCartId();

function formatSoles(amount) {
    return 'S/. ' + parseFloat(amount).toFixed(2);
}

function updatePaymentInfo() {
    const selectedMethod = document.querySelector('input[name="metodo_pago"]:checked');
    const methodLabel = selectedMethod?.value || 'TARJETA_SIMULADA';

    const selectedMethodText = {
        TARJETA_SIMULADA: 'Tarjeta de credito o debito',
        YAPE: 'Yape',
        STRIPE: 'Stripe',
        PAYPAL: 'PayPal',
        MERCADOPAGO: 'Mercado Pago'
    }[methodLabel] || 'Metodo de pago';

    const noteEl = document.getElementById('payment-note');
    const selectedEl = document.getElementById('selected-method');
    const detailsEl = document.getElementById('payment-details');
    const flowBox = document.getElementById('payment-flow-box');
    const flowText = document.getElementById('payment-flow-text');
    const stepBadge = document.getElementById('payment-step-badge');

    if (selectedEl) selectedEl.textContent = selectedMethodText;
    if (noteEl) {
        noteEl.textContent = {
            TARJETA_SIMULADA: 'Este checkout esta en modo demostracion. Los datos de tarjeta son simulados.',
            YAPE: 'Se abrira un QR de Yape para simular el pago.',
            STRIPE: 'Seras enviado a la pagina oficial de Stripe Sandbox para completar el pago.',
            PAYPAL: 'Si tienes credenciales reales, se procesara con PayPal; de lo contrario usara modo demo.',
            MERCADOPAGO: 'Si tienes acceso token real, se procesara con Mercado Pago; de lo contrario usara modo demo.'
        }[methodLabel] || 'Elige un metodo para ver las instrucciones.';
    }
    if (detailsEl && flowBox && flowText && stepBadge) {
        const content = {
            TARJETA_SIMULADA: { step: 'Paso 2 - Validacion', text: 'Se validara el pedido y se solicitara la informacion de la tarjeta en el flujo de prueba.' },
            YAPE: { step: 'Paso 2 - Validacion', text: 'Se preparara la orden para completar el pago con Yape.' },
            STRIPE: { step: 'Paso 2 - Pasarela', text: 'Seras redirigido a Stripe Checkout para completar el pago con tarjeta real.' },
            PAYPAL: { step: 'Paso 2 - Pasarela', text: 'Se abrira la experiencia de PayPal para completar el pago.' },
            MERCADOPAGO: { step: 'Paso 2 - Pasarela', text: 'Se iniciara el pago en Mercado Pago con la cuenta correspondiente.' }
        }[methodLabel] || { step: 'Paso 1 - Seleccion', text: 'Selecciona un metodo de pago para comenzar.' };

        stepBadge.textContent = content.step;
        flowText.innerHTML = `<strong>${selectedMethodText}</strong><br><span>${content.text}</span>`;
        flowBox.style.background = ['STRIPE', 'PAYPAL', 'MERCADOPAGO'].includes(methodLabel)
            ? 'linear-gradient(135deg, #eff6ff, #f8fafc)'
            : '#f8fafc';
    }
}

function getShippingData() {
    const fields = [
        { id: 'shipping-name', key: 'nombre' },
        { id: 'shipping-email', key: 'email' },
        { id: 'shipping-address', key: 'direccion' },
        { id: 'shipping-city', key: 'ciudad' },
        { id: 'shipping-postal', key: 'postal' }
    ];
    const data = {};
    for (const field of fields) {
        const el = document.getElementById(field.id);
        if (!el) return null;
        const value = el.value.trim();
        if (!value) return null;
        data[field.key] = value;
    }
    return data;
}

// ================================================
// INICIALIZACION
// ================================================
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();

    if (document.getElementById('products-container')) {
        loadProducts();
        setupProductForm();

        const searchInput = document.getElementById('catalog-search');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    loadProducts(e.target.value.trim());
                }, 300);
            });
        }
    }

    if (document.getElementById('cart-items-container')) {
        renderCartPage();
    }

    if (document.getElementById('checkout-items-list')) {
        setupCheckout();
    }

    document.querySelectorAll('input[name="metodo_pago"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.method-opt').forEach(el => el.classList.remove('selected'));
            radio.closest('.method-opt').classList.add('selected');
            updatePaymentInfo();
        });
    });
    updatePaymentInfo();
});

// ================================================
// BADGE DEL CARRITO
// ================================================
async function updateCartBadge() {
    try {
        const res = await fetch(`/api/cart/${CART_ID}`);
        if (res.ok) {
            const data = await res.json();
            const count = data.items ? data.items.reduce((sum, i) => sum + i.cantidad, 0) : 0;
            document.querySelectorAll('#cart-count').forEach(el => el.textContent = count || 0);
        }
    } catch (e) { }
}

// ================================================
// PAGINA DE INICIO - CATALOGO
// ================================================
async function loadProducts(query = '') {
    const box = document.getElementById('products-container');
    if (!box) return;
    box.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;">Cargando productos...</div>';

    try {
        const url = query ? `/api/products/?q=${encodeURIComponent(query)}` : '/api/products/';
        const res = await fetch(url);

        if (!res.ok) throw new Error('Error de servidor: ' + res.status);

        const products = await res.json();
        box.innerHTML = '';

        if (!products.length) {
            box.innerHTML = `<div class="empty-state"><div class="emoji">📦</div><h3>Sin productos disponibles</h3><p>El catalogo esta vacio por el momento.</p></div>`;
            return;
        }

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${p.imagen || 'https://via.placeholder.com/280x180?text=Imagen'}" class="product-img" alt="${p.nombre}">
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <p class="product-desc">${p.descripcion || ''}</p>
                    <div class="product-footer">
                        <div class="price"><span>S/.</span> ${parseFloat(p.precio).toFixed(2)}</div>
                        <div class="product-actions">
                            <button class="btn btn-primary" onclick="addToCart(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">Agregar</button>
                            <button class="btn" onclick="startEditProduct(${p.id})">Editar</button>
                            <button class="btn-danger-text" onclick="deleteProduct(${p.id})">Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
            box.appendChild(card);
        });
    } catch (e) {
        box.innerHTML = `<div class="empty-state"><div class="emoji">⚠️</div><h3>Error al cargar</h3><p>No se pudo conectar con el servidor.<br><small>${e.message}</small></p></div>`;
    }
}

async function setupProductForm() {
    const form = document.getElementById('product-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = document.getElementById('product-id').value;
        const payload = {
            nombre: document.getElementById('product-name').value,
            descripcion: document.getElementById('product-description').value,
            precio: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value, 10),
            imagen: document.getElementById('product-image').value
        };

        const url = id ? `/api/products/${id}` : '/api/products/';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            form.reset();
            document.getElementById('product-id').value = '';
            const cancelBtn = document.getElementById('cancel-edit');
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (typeof closeProductModal === 'function') closeProductModal();
            loadProducts();
            Swal.fire({ icon: 'success', title: id ? 'Producto actualizado' : 'Producto creado', timer: 1600, showConfirmButton: false });
        } else {
            const data = await res.json().catch(() => ({}));
            Swal.fire({ icon: 'error', title: 'Error', text: data.detail || 'No se pudo guardar el producto.' });
        }
    });

    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
        cancelBtn.addEventListener('click', () => {
            form.reset();
            document.getElementById('product-id').value = '';
            cancelBtn.style.display = 'none';
        });
    }
}

async function startEditProduct(id) {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) return;
    const product = await res.json();
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.nombre;
    document.getElementById('product-description').value = product.descripcion || '';
    document.getElementById('product-price').value = product.precio;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-image').value = product.imagen || '';
    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    if (typeof openProductModal === 'function') openProductModal();
    document.getElementById('product-name').focus();
}

// ================================================
// MODAL DE PRODUCTOS
// ================================================
function openProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.add('show');
}
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.classList.remove('show');
        const form = document.getElementById('product-form');
        if (form) form.reset();
        const pid = document.getElementById('product-id');
        if (pid) pid.value = '';
    }
}

async function deleteProduct(id) {
    const result = await Swal.fire({
        title: 'Eliminar producto',
        text: '¿Deseas eliminar este producto del catalogo?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Si, eliminar',
        cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
        loadProducts();
        Swal.fire({ icon: 'success', title: 'Producto eliminado', timer: 1400, showConfirmButton: false });
    } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el producto.' });
    }
}

// ================================================
// AGREGAR AL CARRITO
// ================================================
async function addToCart(id, nombre) {
    try {
        const res = await fetch(`/api/cart/${CART_ID}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: id, cantidad: 1 })
        });

        if (!res.ok) throw new Error();

        updateCartBadge();
        Swal.fire({
            icon: 'success',
            title: '¡Agregado al carrito!',
            text: `${nombre} fue anadido exitosamente.`,
            timer: 1800,
            showConfirmButton: false,
            iconColor: '#16a34a',
        });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar el producto.' });
    }
}

// ================================================
// RENDERIZAR CARRITO
// ================================================
async function renderCartPage() {
    const box = document.getElementById('cart-items-container');
    if (!box) return;
    try {
        const res = await fetch(`/api/cart/${CART_ID}`);
        const data = await res.json();

        box.innerHTML = '';

        if (!data.items || data.items.length === 0) {
            box.innerHTML = `
                <div class="empty-state">
                    <div class="emoji">🛒</div>
                    <h3>Tu carrito esta vacio</h3>
                    <p>Agrega productos desde el <a href="/">catalogo</a>.</p>
                </div>`;
            updateCartTotals(0);
            return;
        }

        data.items.forEach(item => {
            box.innerHTML += `
                <div class="cart-item">
                    <img src="${item.imagen || 'https://via.placeholder.com/88x72'}" class="cart-item-img" alt="${item.nombre}">
                    <div class="cart-item-detail">
                        <h4>${item.nombre}</h4>
                        <p class="cart-item-desc">Precio unitario: ${formatSoles(item.precio)}</p>
                        <div class="cart-item-price">${formatSoles(item.subtotal)}</div>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn-danger-text" onclick="removeFromCart(${item.product_id})">Quitar</button>
                        <div class="qty-control">
                            <button class="qty-btn" onclick="changeQty(${item.product_id}, ${item.cantidad - 1})">−</button>
                            <span class="qty-num">${item.cantidad}</span>
                            <button class="qty-btn" onclick="changeQty(${item.product_id}, ${item.cantidad + 1})">+</button>
                        </div>
                    </div>
                </div>
            `;
        });

        updateCartTotals(data.total);
        updateCartBadge();

    } catch (e) {
        box.innerHTML = '<div class="empty-state"><div class="emoji">⚠️</div><h3>Error al cargar</h3></div>';
    }
}

function updateCartTotals(baseTotal) {
    const igv = baseTotal * IGV_RATE;
    const total = baseTotal + ENVIO;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatSoles(val); };
    set('cart-subtotal', baseTotal);
    set('cart-igv', igv);
    set('cart-total', total);
}

async function changeQty(productId, newQty) {
    if (newQty <= 0) return removeFromCart(productId);
    await fetch(`/api/cart/${CART_ID}/update/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: newQty })
    });
    renderCartPage();
}

async function removeFromCart(id) {
    await fetch(`/api/cart/${CART_ID}/remove/${id}`, { method: 'DELETE' });
    renderCartPage();
}

// ================================================
// CHECKOUT - PAGO FINAL
// ================================================
async function setupCheckout() {
    try {
        const res = await fetch(`/api/cart/${CART_ID}`);
        const data = await res.json();

        const listEl = document.getElementById('checkout-items-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!data.items || data.items.length === 0) {
            Swal.fire({
                icon: 'warning', title: 'Carrito vacio',
                text: 'No hay productos en tu carrito.',
                confirmButtonColor: '#2563eb'
            }).then(() => window.location.href = '/');
            return;
        }

        data.items.forEach(i => {
            listEl.innerHTML += `
                <div class="checkout-item-card">
                    <img src="${i.imagen || 'https://via.placeholder.com/72'}" class="checkout-mini-img" alt="${i.nombre}">
                    <div class="checkout-item-info">
                        <h4>${i.nombre}</h4>
                        <p>${i.cantidad} unidad(es) · ${formatSoles(i.precio)}</p>
                    </div>
                    <div class="checkout-item-price">${formatSoles(i.subtotal)}</div>
                </div>
            `;
        });

        const igv = data.total * IGV_RATE;
        const totalFinal = data.total + ENVIO;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatSoles(val); };
        set('checkout-subtotal', data.total);
        set('checkout-igv', igv);
        set('checkout-total', totalFinal);

        const countEl = document.getElementById('checkout-items-count');
        if (countEl) countEl.textContent = data.items.reduce((sum, item) => sum + item.cantidad, 0);

        updateCartBadge();

    } catch (e) {
        console.error('Error cargando checkout:', e);
    }

    const btnPay = document.getElementById('btn-pay');
    if (!btnPay) return;

    btnPay.addEventListener('click', async () => {
        const method = document.querySelector('input[name="metodo_pago"]:checked')?.value;
        const msgDiv = document.getElementById('payment-message');
        const shippingData = getShippingData();

        if (!shippingData) {
            Swal.fire({ icon: 'error', title: 'Datos incompletos', text: 'Completa todos los datos de envio antes de pagar.' });
            return;
        }

        btnPay.disabled = true;
        btnPay.textContent = 'Abriendo pasarela...';

        if (method === 'YAPE') {
            await handleYapePayment(shippingData, msgDiv);
        } else if (method === 'TARJETA_SIMULADA') {
            await handleMockCardPayment(shippingData, msgDiv);
        } else if (method === 'STRIPE') {
            await handleStripePayment(shippingData, msgDiv);
        } else if (method === 'PAYPAL') {
            await handlePayPalPayment(shippingData, msgDiv);
        } else if (method === 'MERCADOPAGO') {
            await handleMercadoPagoPayment(shippingData, msgDiv);
        }

        btnPay.disabled = false;
        btnPay.textContent = 'Confirmar pago';
    });
}

// ================================================
// YAPE
// ================================================
async function handleYapePayment(shippingData, msgDiv) {
    const total = document.getElementById('checkout-total')?.textContent || '';
    const result = await Swal.fire({
        title: 'Pago con Yape',
        html: `
            <p>Escanea este codigo QR con tu app de Yape para pagar <strong>${total}</strong></p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=YAPE_TECHSTORE_DEMO" style="margin: 20px auto; border-radius: 8px; display:block;">
            <p style="color: #64748b; font-size: 0.9em;">(Simulacion modo sandbox)</p>
        `,
        confirmButtonText: 'Ya Yapee',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
        Swal.fire({ title: 'Verificando...', allowOutsideClick: false });
        Swal.showLoading();
        await procesarBackend('YAPE', shippingData, msgDiv);
    }
}

// ================================================
// TARJETA SIMULADA
// ================================================
async function handleMockCardPayment(shippingData, msgDiv) {
    const result = await Swal.fire({
        title: 'Ingresa tu tarjeta',
        html: `
            <div style="text-align: left;">
                <label style="display:block;margin-bottom:4px;font-size:0.85em;color:#64748b;">Numero de Tarjeta</label>
                <input type="text" class="swal2-input" placeholder="0000 0000 0000 0000" maxlength="19" style="width:90%;margin:0 0 12px 0;">
                <div style="display: flex; gap: 10px;">
                    <div style="flex:1;">
                        <label style="display:block;margin-bottom:4px;font-size:0.85em;color:#64748b;">Vencimiento</label>
                        <input type="text" class="swal2-input" placeholder="MM/AA" maxlength="5" style="width:90%;margin:0;">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block;margin-bottom:4px;font-size:0.85em;color:#64748b;">CVV</label>
                        <input type="text" class="swal2-input" placeholder="123" maxlength="3" style="width:90%;margin:0;">
                    </div>
                </div>
            </div>
        `,
        confirmButtonText: 'Pagar con Tarjeta',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
        Swal.fire({ title: 'Procesando cargo...', allowOutsideClick: false });
        Swal.showLoading();
        await procesarBackend('TARJETA_SIMULADA', shippingData, msgDiv);
    }
}

// ================================================
// STRIPE CHECKOUT (REAL SANDBOX - PAGINA OFICIAL)
// ================================================
async function handleStripePayment(shippingData, msgDiv) {
    Swal.fire({ title: 'Redirigiendo a Stripe...', allowOutsideClick: false });
    Swal.showLoading();
    try {
        const originUrl = window.location.origin;
        const orderRes = await fetch('/api/checkout/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cart_id: CART_ID,
                metodo: 'STRIPE',
                shipping: shippingData,
                origin: originUrl
            })
        });
        const orderData = await orderRes.json();

        if (!orderData.success) {
            throw new Error(orderData.detail || orderData.error || 'Fallo al inicializar Stripe');
        }

        const checkoutUrl = orderData.payment_result?.checkout_url;
        if (checkoutUrl) {
            localStorage.removeItem('cart_id');
            window.location.href = checkoutUrl;
        } else {
            throw new Error('No se genero el enlace de Stripe.');
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error con Stripe', text: e.message });
    }
}

// ================================================
// PAYPAL SANDBOX
// ================================================
async function handlePayPalPayment(shippingData, msgDiv) {
    Swal.fire({ title: 'Procesando con PayPal', text: 'Conectando con la pasarela...', allowOutsideClick: false });
    Swal.showLoading();
    await procesarBackend('PAYPAL', shippingData, msgDiv, false);
}

// ================================================
// MERCADO PAGO SANDBOX
// ================================================
async function handleMercadoPagoPayment(shippingData, msgDiv) {
    Swal.fire({ title: 'Procesando con Mercado Pago', text: 'Conectando con la pasarela...', allowOutsideClick: false });
    Swal.showLoading();
    await procesarBackend('MERCADOPAGO', shippingData, msgDiv, true);
}

// ================================================
// PROCESADO BACKEND (YAPE, TARJETA, PAYPAL, MP)
// ================================================
async function procesarBackend(method, shippingData, msgDiv, redirectToGateway = false) {
    try {
        const res = await fetch('/api/checkout/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_id: CART_ID, metodo: method, shipping: shippingData })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            const redirectUrl = data.payment_result?.redirect_url;
            if (redirectToGateway && redirectUrl) {
                localStorage.removeItem('cart_id');
                await Swal.fire({
                    icon: 'info', title: 'Redirigiendo a pasarela',
                    text: 'Seras enviado para completar el pago.',
                    confirmButtonText: 'Continuar'
                });
                window.location.href = redirectUrl;
                return;
            }

            localStorage.removeItem('cart_id');
            await Swal.fire({
                icon: 'success',
                title: '¡Pago Exitoso!',
                html: `<b>Orden #${data.order_id} confirmada</b><br><small style="color:#64748b">ID Transaccion: ${data.payment_result?.transaction_id || ''}</small>`
            });
            window.location.href = '/';
        } else {
            const errorText = data.payment_result?.mensaje || data.payment_result?.error || data.detail || 'Fallo en el pago';
            Swal.fire({ icon: 'error', title: 'Pago rechazado', text: errorText });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error de conexion', text: 'No se pudo completar el pago. Intenta nuevamente.' });
    }
}
