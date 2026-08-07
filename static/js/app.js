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
        TARJETA_SIMULADA: 'Tarjeta de crÃ©dito o dÃ©bito',
        YAPE: 'Yape',
        STRIPE: 'Stripe',
        PAYPAL: 'PayPal',
        MERCADOPAGO: 'Mercado Pago'
    }[methodLabel] || 'MÃ©todo de pago';

    const noteEl = document.getElementById('payment-note');
    const selectedEl = document.getElementById('selected-method');
    const detailsEl = document.getElementById('payment-details');
    const flowBox = document.getElementById('payment-flow-box');
    const flowText = document.getElementById('payment-flow-text');
    const stepBadge = document.getElementById('payment-step-badge');

    if (selectedEl) selectedEl.textContent = selectedMethodText;
    if (noteEl) {
        noteEl.textContent = {
            TARJETA_SIMULADA: 'Este checkout estÃ¡ en modo demostraciÃ³n. Para un pago real con tarjeta, debes usar datos reales y completar la verificaciÃ³n en la pasarela autorizada.',
            YAPE: 'Este checkout estÃ¡ en modo demostraciÃ³n. Para un pago real, debes usar tu cuenta real de Yape y completar la verificaciÃ³n en la app.',
            STRIPE: 'Si vas a usar una cuenta real, inicia sesiÃ³n en Stripe y completa el pago desde la pasarela con datos reales.',
            PAYPAL: 'Si vas a usar una cuenta real, inicia sesiÃ³n en PayPal y completa el pago desde la pasarela con datos reales.',
            MERCADOPAGO: 'Si vas a usar una cuenta real, inicia sesiÃ³n en Mercado Pago y completa el pago desde la pasarela con datos reales.'
        }[methodLabel] || 'Elige un mÃ©todo para ver las instrucciones.';
    }
    if (detailsEl && flowBox && flowText && stepBadge) {
        const content = {
            TARJETA_SIMULADA: {
                step: 'Paso 2 Â· ValidaciÃ³n',
                text: 'Se validarÃ¡ el pedido y se solicitarÃ¡ la informaciÃ³n de la tarjeta en el flujo de prueba.'
            },
            YAPE: {
                step: 'Paso 2 Â· ValidaciÃ³n',
                text: 'Se prepararÃ¡ la orden para completar el pago con Yape y confirmar la transferencia.'
            },
            STRIPE: {
                step: 'Paso 2 Â· Pasarela',
                text: 'Se intentarÃ¡ abrir el flujo de Stripe con datos reales si tienes credenciales configuradas.'
            },
            PAYPAL: {
                step: 'Paso 2 Â· Pasarela',
                text: 'Se abrirÃ¡ la experiencia de PayPal para completar el pago en modo prueba o real.'
            },
            MERCADOPAGO: {
                step: 'Paso 2 Â· Pasarela',
                text: 'Se intentarÃ¡ iniciar el pago en Mercado Pago con la cuenta y credenciales correspondientes.'
            }
        }[methodLabel] || {
            step: 'Paso 1 Â· SelecciÃ³n',
            text: 'Selecciona un mÃ©todo de pago para comenzar el proceso.'
        };

        stepBadge.textContent = content.step;
        flowText.innerHTML = `
            <strong>${selectedMethodText}</strong><br>
            <span>${content.text}</span>
        `;
        flowBox.style.background = methodLabel === 'STRIPE' || methodLabel === 'PAYPAL' || methodLabel === 'MERCADOPAGO'
            ? 'linear-gradient(135deg, #eff6ff, #f8fafc)'
            : '#f8fafc';
    }
}

function getShippingData() {
    const fields = [
        { id: 'shipping-name', key: 'nombre', label: 'Nombre completo' },
        { id: 'shipping-email', key: 'email', label: 'Correo electrÃ³nico' },
        { id: 'shipping-address', key: 'direccion', label: 'DirecciÃ³n' },
        { id: 'shipping-city', key: 'ciudad', label: 'Ciudad' },
        { id: 'shipping-postal', key: 'postal', label: 'CÃ³digo postal' }
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
// INICIALIZACIÃ“N
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
    if (document.getElementById('cart-items-container')) renderCartPage();
    if (document.getElementById('checkout-items-list')) {
        setupCheckout();
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Pago sandbox',
                text: 'Al elegir Stripe, PayPal o Mercado Pago, el sistema intentarÃ¡ abrir el flujo real de prueba si tienes credenciales configuradas.',
                icon: 'info',
                confirmButtonText: 'Entendido',
                timer: 6000,
                timerProgressBar: true
            });
        }
    }

    // Estilar radios de checkout
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
            const count = data.items.reduce((sum, i) => sum + i.cantidad, 0);
            document.querySelectorAll('#cart-count').forEach(el => el.textContent = count || 0);
        }
    } catch (e) { }
}

// ================================================
// PÃGINA DE INICIO â€” CATÃLOGO
// ================================================
async function loadProducts(query = '') {
    const box = document.getElementById('products-container');
    try {
        const url = query ? `/api/products/?q=${encodeURIComponent(query)}` : '/api/products/';
        const res = await fetch(url);
        const products = await res.json();
        box.innerHTML = '';

        if (!products.length) {
            box.innerHTML = `<div class="empty-state"><div class="emoji">ðŸ“¦</div><h3>Sin productos disponibles</h3><p>El catÃ¡logo estÃ¡ vacÃ­o por el momento.</p></div>`;
            return;
        }

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${p.imagen || 'https://via.placeholder.com/280x180?text=Imagen'}"
                     class="product-img" alt="${p.nombre}">
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
        box.innerHTML = '<div class="empty-state"><div class="emoji">âš ï¸</div><h3>Error al cargar</h3><p>No se pudo conectar con el servidor.</p></div>';
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

    document.getElementById('cancel-edit').style.display = 'none';
    document.getElementById('cancel-edit').addEventListener('click', () => {
        form.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('cancel-edit').style.display = 'none';
    });
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
        document.getElementById('product-id').value = '';
    }
}

async function deleteProduct(id) {
    const confirm = await Swal.fire({
        title: 'Eliminar producto',
        text: 'Â¿Deseas eliminar este producto del catÃ¡logo?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'SÃ­, eliminar',
        cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

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
            title: 'Â¡Agregado al carrito!',
            text: `${nombre} fue aÃ±adido exitosamente.`,
            timer: 1800,
            showConfirmButton: false,
            background: '#fff',
            color: '#1e293b',
            iconColor: '#16a34a',
        });
    } catch (e) {
        Swal.fire({
            icon: 'error', title: 'Error',
            text: 'No se pudo agregar el producto.',
            background: '#fff', color: '#1e293b'
        });
    }
}

// ================================================
// RENDERIZAR CARRITO
// ================================================
async function renderCartPage() {
    const box = document.getElementById('cart-items-container');
    try {
        const res = await fetch(`/api/cart/${CART_ID}`);
        const data = await res.json();

        box.innerHTML = '';

        if (!data.items || data.items.length === 0) {
            box.innerHTML = `
                <div class="empty-state">
                    <div class="emoji">ðŸ›’</div>
                    <h3>Tu carrito estÃ¡ vacÃ­o</h3>
                    <p>Agrega productos desde el <a href="/">catÃ¡logo</a>.</p>
                </div>`;

            // Actualizar totales en cero
            updateCartTotals(0);
            return;
        }

        data.items.forEach(item => {
            box.innerHTML += `
                <div class="cart-item">
                    <img src="${item.imagen || 'https://via.placeholder.com/88x72'}"
                         class="cart-item-img" alt="${item.nombre}">
                    <div class="cart-item-detail">
                        <h4>${item.nombre}</h4>
                        <p class="cart-item-desc">Precio unitario: ${formatSoles(item.precio)}</p>
                        <div class="cart-item-price">${formatSoles(item.subtotal)}</div>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn-danger-text" onclick="removeFromCart(${item.product_id})">Quitar</button>
                        <div class="qty-control">
                            <button class="qty-btn" onclick="changeQty(${item.product_id}, ${item.cantidad - 1})">âˆ’</button>
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
        box.innerHTML = '<div class="empty-state"><div class="emoji">âš ï¸</div><h3>Error al cargar</h3></div>';
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

// ================================================
// CAMBIAR CANTIDAD
// ================================================
async function changeQty(productId, newQty) {
    if (newQty <= 0) return removeFromCart(productId);

    await fetch(`/api/cart/${CART_ID}/update/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: newQty })
    });
    renderCartPage();
}

// ================================================
// QUITAR DEL CARRITO
// ================================================
async function removeFromCart(id) {
    await fetch(`/api/cart/${CART_ID}/remove/${id}`, { method: 'DELETE' });
    renderCartPage();
}

// ================================================
// CHECKOUT - PAGO FINAL
// ================================================
function showPaymentModal(title, body, progress) {
    const modal = document.getElementById('payment-modal');
    const titleEl = document.getElementById('payment-modal-title');
    const bodyEl = document.getElementById('payment-modal-body');
    const progressEl = document.getElementById('payment-modal-progress');
    if (!modal || !titleEl || !bodyEl || !progressEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = body;
    progressEl.textContent = progress;
    modal.style.display = 'flex';
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.style.display = 'none';
}

async function setupCheckout() {
    try {
        const res = await fetch(`/api/cart/${CART_ID}`);
        const data = await res.json();

        const listEl = document.getElementById('checkout-items-list');
        listEl.innerHTML = '';

        if (!data.items || data.items.length === 0) {
            Swal.fire({
                icon: 'warning', title: 'Carrito vacÃ­o',
                text: 'No hay productos en tu carrito.',
                background: '#fff', color: '#1e293b',
                confirmButtonColor: '#2563eb'
            }).then(() => window.location.href = '/');
            return;
        }

        data.items.forEach(i => {
            listEl.innerHTML += `
                <div class="checkout-item-card">
                    <img src="${i.imagen || 'https://via.placeholder.com/72'}"
                         class="checkout-mini-img" alt="${i.nombre}">
                    <div class="checkout-item-info">
                        <h4>${i.nombre}</h4>
                        <p>${i.cantidad} unidad(es) Â· ${formatSoles(i.precio)}</p>
                    </div>
                    <div class="checkout-item-price">
                        ${formatSoles(i.subtotal)}
                    </div>
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
        if (countEl) {
            const itemsCount = data.items.reduce((sum, item) => sum + item.cantidad, 0);
            countEl.textContent = itemsCount;
        }

        updateCartBadge();

    } catch (e) {
        console.error(e);
    }

    document.getElementById('btn-pay').addEventListener('click', async () => {
        const btn = document.getElementById('btn-pay');
        const method = document.querySelector('input[name="metodo_pago"]:checked').value;
        const msgDiv = document.getElementById('payment-message');
        const shippingData = getShippingData();

        if (!shippingData) {
            Swal.fire({ icon: 'error', title: 'Datos incompletos', text: 'Completa todos los datos de envÃ­o antes de pagar.' });
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Abriendo pasarela...';

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

        btn.disabled = false;
        btn.textContent = 'Confirmar pago';
    });
}

// ================================================
// YAPE
// ================================================
async function handleYapePayment(shippingData, msgDiv) {
    const total = document.getElementById('checkout-total').textContent;
    const confirm = await Swal.fire({
        title: 'Pago con Yape',
        html: `
            <p>Escanea este cÃ³digo QR con tu app de Yape para pagar <strong>${total}</strong></p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=YAPE_FAKE_QR" style="margin: 20px auto; border-radius: 8px;">
            <p style="color: #64748b; font-size: 0.9em;">(Esto es una simulaciÃ³n del modo sandbox)</p>
        `,
        confirmButtonText: 'Ya YapeÃ©',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: 'Verificando...', allowOutsideClick: false });
        Swal.showLoading();
        await procesarBackend('YAPE', shippingData, msgDiv);
    }
}

// ================================================
// TARJETA SIMULADA
// ================================================
async function handleMockCardPayment(shippingData, msgDiv) {
    const confirm = await Swal.fire({
        title: 'Ingresa tu tarjeta',
        html: `
            <div style="text-align: left;">
                <label>NÃºmero de Tarjeta</label>
                <input type="text" class="swal2-input" placeholder="0000 0000 0000 0000" maxlength="19">
                <div style="display: flex; gap: 10px;">
                    <div style="flex:1;">
                        <label>Vencimiento</label>
                        <input type="text" class="swal2-input" placeholder="MM/AA" maxlength="5">
                    </div>
                    <div style="flex:1;">
                        <label>CVV</label>
                        <input type="text" class="swal2-input" placeholder="123" maxlength="3">
                    </div>
                </div>
            </div>
        `,
        confirmButtonText: 'Pagar con Tarjeta',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: 'Procesando cargo...', allowOutsideClick: false });
        Swal.showLoading();
        await procesarBackend('TARJETA_SIMULADA', shippingData, msgDiv);
    }
}

// ================================================
// STRIPE ELEMENTS (REAL SANDBOX)
// ================================================
async function handleStripePayment(shippingData, msgDiv) {
    Swal.fire({ title: 'Conectando con Stripe...', allowOutsideClick: false });
    Swal.showLoading();

    try {
        const confRes = await fetch('/api/config/stripe');
        const confData = await confRes.json();
        const stripe = Stripe(confData.public_key);

        msgDiv.innerHTML = 'Generando orden segura...';
        const orderRes = await fetch('/api/checkout/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_id: CART_ID, metodo: 'STRIPE', shipping: shippingData })
        });
        const orderData = await orderRes.json();
        if (!orderData.success) throw new Error(orderData.detail || orderData.error || 'Fallo al crear orden Stripe');

        const clientSecret = orderData.payment_result.client_secret;
        const orderId = orderData.order_id;
        Swal.close();

        const elements = stripe.elements();
        const cardElement = elements.create('card', {
            style: { base: { fontSize: '16px', color: '#1e293b', '::placeholder': { color: '#aab7c4' } } }
        });

        await Swal.fire({
            title: 'Pago seguro con Stripe',
            html: `
                <div style="text-align: left; margin-bottom: 20px;">
                    <p style="margin-bottom: 15px; font-size: 0.9em; color:#64748b;">
                        Ingresa una tarjeta de pruebas de Stripe (ej: 4242 4242...).
                    </p>
                    <div id="stripe-card-mount" style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;"></div>
                </div>
            `,
            confirmButtonText: 'Autorizar pago real (Sandbox)',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            allowOutsideClick: false,
            didOpen: () => {
                cardElement.mount('#stripe-card-mount');
            },
            preConfirm: async () => {
                Swal.showLoading();
                const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
                    payment_method: { card: cardElement }
                });

                if (error) {
                    Swal.showValidationMessage(error.message);
                    return false;
                }

                await fetch(`/api/checkout/confirm/${orderId}`, { method: 'POST' });
                return true;
            }
        });

        localStorage.removeItem('cart_id');
        await Swal.fire({
            icon: 'success',
            title: 'Â¡Pago Exitoso con Stripe!',
            html: `<b>Orden #${orderId} confirmada</b>`
        });
        window.location.href = '/';

    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
}

// ================================================
// PAYPAL SANDBOX
// ================================================
async function handlePayPalPayment(shippingData, msgDiv) {
    Swal.fire({
        title: 'Procesando con PayPal',
        text: 'Si no tienes credenciales reales, el sistema seguirÃ¡ con un pago de demostraciÃ³n en modo sandbox.',
        allowOutsideClick: false
    });
    Swal.showLoading();
    await procesarBackend('PAYPAL', shippingData, msgDiv, false);
}

// ================================================
// MERCADO PAGO SANDBOX
// ================================================
async function handleMercadoPagoPayment(shippingData, msgDiv) {
    Swal.fire({
        title: 'Procesando con Mercado Pago',
        text: 'Se intentarÃ¡ crear un pago real en sandbox si tienes el access token configurado; si no, se usarÃ¡ un modo demo seguro.',
        allowOutsideClick: false
    });
    Swal.showLoading();
    await procesarBackend('MERCADOPAGO', shippingData, msgDiv, true);
}

// ================================================
// PROCESADO MOCK (YAPE Y TARJETA)
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
                    icon: 'info',
                    title: 'Redirigiendo a Mercado Pago',
                    text: 'SerÃ¡s enviado a la pasarela para completar el pago.',
                    confirmButtonText: 'Continuar'
                });
                window.location.href = redirectUrl;
                return;
            }

            localStorage.removeItem('cart_id');
            await Swal.fire({
                icon: 'success',
                title: 'Â¡Pago Exitoso!',
                html: `
                    <b>Orden #${data.order_id} confirmada</b><br>
                    <small style="color:#64748b">ID TransacciÃ³n: ${data.payment_result.transaction_id || ''}</small>
                `
            });
            window.location.href = '/';
        } else {
            const errorText = data.payment_result?.mensaje || data.payment_result?.error || data.detail || 'Fallo';
            Swal.fire({ icon: 'error', title: 'Pago rechazado', text: errorText });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error de conexiÃ³n', text: 'Upss. Algo fallÃ³ en la red.' });
    }
}
