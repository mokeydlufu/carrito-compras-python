<?php
define('API_URL', 'http://localhost:8000');
session_start();
$cart_id = $_SESSION['cart_id'] ?? null;

$cart_items = [];
$total = 0;

if ($cart_id) {
    $response = @file_get_contents(API_URL . '/cart/' . $cart_id);
    if ($response) {
        $cart_data = json_decode($response, true);
        $cart_items = $cart_data['items'] ?? [];
        foreach ($cart_items as $item) {
            $total += $item['precio'] * $item['cantidad'];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tienda Premium - Pago</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <script src="https://js.stripe.com/v3/"></script>
</head>

<body>
    <nav class="navbar">
        <div class="logo">🚀 TechStore</div>
        <div class="nav-links">
            <a href="index.php">Inicio</a>
        </div>
    </nav>

    <main class="container">
        <div class="checkout-page">
            <h2>Finalizar Compra</h2>

            <div class="checkout-layout">
                <div class="payment-methods">
                    <h3>Selecciona Método de Pago</h3>

                    <div class="method-selector">
                        <label class="radio-label">
                            <input type="radio" name="payment_method" value="TARJETA_SIMULADA" checked>
                            <span>💳 Tarjeta (Simulada)</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="payment_method" value="YAPE">
                            <span>🟣 Yape (Simulado)</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="payment_method" value="STRIPE">
                            <span>🌐 Stripe API (Real)</span>
                        </label>
                    </div>

                    <!-- cart_id oculto para que el JS lo use al pagar -->
                    <input type="hidden" id="cart-id" value="<?= htmlspecialchars($cart_id ?? '') ?>">
                    <div id="payment-message" style="margin-top: 15px; font-weight: bold;"></div>
                    <button id="btn-pay" class="btn btn-primary btn-block mt-4">Pagar Ahora</button>
                </div>

                <div class="checkout-summary">
                    <h3>Tu Pedido</h3>
                    <ul id="checkout-items-list" class="small-list">
                        <?php foreach ($cart_items as $item): ?>
                            <li>
                                <?= htmlspecialchars($item['nombre']) ?> x
                                <?= $item['cantidad'] ?>
                                — $
                                <?= number_format($item['precio'] * $item['cantidad'], 2) ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                    <div class="summary-total mt-4">
                        <span>Total:</span>
                        <span id="checkout-total">$
                            <?= number_format($total, 2) ?>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <script src="js/app.js"></script>
</body>

</html>