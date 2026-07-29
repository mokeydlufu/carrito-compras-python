// URL del Backend FastAPI (Python)
const API_BASE = 'http://localhost:8000';

// Utilidad UUID para identificar carrito
function getCartId() {
    let cid = localStorage.getItem('cart_id');
    if (!cid) {
        cid = 'cart_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cart_id', cid);
    }
    return cid;
}

const CART_ID = getCartId();

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();

    if (document.getElementById('products-container')) loadProducts();
    if (document.getElementById('cart-items-container')) renderCartPage();
    if (document.getElementById('payment-message')) setupCheckout();
});

async function updateCartBadge() {
    try {
        const res = await fetch(`${API_BASE}/cart/${CART_ID}`);
        if (res.ok) {
            const data = await res.json();
            const count = data.items.reduce((sum, i) => sum + i.cantidad, 0);
            const badge = document.getElementById('cart-count');
            if (badge) badge.textContent = count;
        }
    } catch (e) { }
}

async function loadProducts() {
    const box = document.getElementById('products-container');
    try {
        const res = await fetch(`${API_BASE}/products/`);
        const products = await res.json();
        box.innerHTML = '';
        products.forEach(p => {
            box.innerHTML += `
               <div class="product-card">
                   <img src="${p.imagen}" class="product-img">
                   <div class="product-info">
                       <h3>${p.nombre}</h3>
                       <p class="product-desc">${p.descripcion}</p>
                       <div class="product-footer">
                           <span class="price">$${p.precio.toFixed(2)}</span>
                           <button class="btn btn-primary" onclick="addToCart(${p.id})">Agregar</button>
                       </div>
                   </div>
               </div>
            `;
        });
    } catch (e) {
        box.innerHTML = '<p>Error cargando productos. ¿Está corriendo el backend?</p>';
    }
}

async function addToCart(id) {
    await fetch(`${API_BASE}/cart/${CART_ID}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: id, cantidad: 1 })
    });
    updateCartBadge();
    alert('¡Producto agregado al carrito!');
}

async function renderCartPage() {
    const box = document.getElementById('cart-items-container');
    try {
        const res = await fetch(`${API_BASE}/cart/${CART_ID}`);
        const data = await res.json();

        box.innerHTML = '';
        if (data.items.length === 0) {
            box.innerHTML = '<p>Tu carrito está vacío. <a href="index.php">Ver productos</a></p>';
        } else {
            data.items.forEach(i => {
                box.innerHTML += `
                    <div class="cart-item">
                        <img src="${i.imagen}" class="cart-item-img">
                        <div class="cart-item-info">
                            <div><b>${i.nombre}</b></div>
                            <div style="color:var(--text-muted)">$${i.precio} x ${i.cantidad}</div>
                        </div>
                        <button class="btn btn-danger" onclick="removeFromCart(${i.product_id})">❌</button>
                    </div>
                `;
            });
        }
        document.getElementById('cart-subtotal').textContent = `$${data.total.toFixed(2)}`;
        document.getElementById('cart-total').textContent = `$${data.total.toFixed(2)}`;
    } catch (e) {
        box.innerHTML = '<p>Error cargando carrito.</p>';
    }
}

async function removeFromCart(id) {
    await fetch(`${API_BASE}/cart/${CART_ID}/remove/${id}`, { method: 'DELETE' });
    renderCartPage();
    updateCartBadge();
}

function setupCheckout() {
    fetch(`${API_BASE}/cart/${CART_ID}`).then(r => r.json()).then(data => {
        const ul = document.getElementById('checkout-items-list');
        if (ul) {
            ul.innerHTML = '';
            data.items.forEach(i => {
                ul.innerHTML += `<li><span>${i.cantidad}x ${i.nombre}</span> <span>$${(i.precio * i.cantidad).toFixed(2)}</span></li>`;
            });
        }
        const totalEl = document.getElementById('checkout-total');
        if (totalEl) totalEl.textContent = `$${data.total.toFixed(2)}`;
    });

    document.getElementById('btn-pay').addEventListener('click', async () => {
        const btn = document.getElementById('btn-pay');
        const msg = document.getElementById('payment-message');
        const method = document.querySelector('input[name="payment_method"]:checked').value;

        btn.disabled = true;
        btn.textContent = 'Procesando...';

        try {
            const res = await fetch(`${API_BASE}/checkout/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart_id: CART_ID, metodo: method })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                msg.innerHTML = `<span style="color:var(--success)">¡Pago exitoso! Orden ID: ${data.order_id}<br>TxID: ${data.payment_result.transaction_id}</span>`;
                btn.style.display = 'none';
                localStorage.removeItem('cart_id');
                setTimeout(() => window.location.href = 'index.php', 5000);
            } else {
                msg.innerHTML = `<span style="color:var(--danger)">Error: ${JSON.stringify(data.detail || data.error)}</span>`;
                btn.disabled = false;
                btn.textContent = 'Intentar de Nuevo';
            }
        } catch (e) {
            msg.innerHTML = `<span style="color:var(--danger)">Error de conexión con el backend.</span>`;
            btn.disabled = false;
        }
    });
}
