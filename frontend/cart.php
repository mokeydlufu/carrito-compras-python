<?php
define('API_URL', 'http://localhost:8000');

// Obtener items del carrito desde el backend
// El cart_id se guarda en una cookie de sesión PHP
session_start();
if (!isset($_SESSION['cart_id'])) {
    // Crear nuevo carrito en el backend
    $ch = curl_init(API_URL . '/cart');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([]));
    $result = curl_exec($ch);
    curl_close($ch);
    $cart = $result ? json_decode($result, true) : null;
    if ($cart && isset($cart['id'])) {
        $_SESSION['cart_id'] = $cart['id'];
    }
}

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
    <title>Tienda Premium - Carrito</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>

<body>
    <nav class="navbar">
        <div class="logo">🚀 TechStore</div>
        <div class="nav-links">
            <a href="index.php">Inicio</a>
            <a href="cart.php" class="cart-link">
                🛒 Carrito <span id="cart-count" class="badge"><?= count($cart_items) ?></span>
            </a>
        </div>
    </nav>

    <main class="container">
        <div class="cart-page">
            <h2>Tu Carrito de Compras</h2>

            <div class="cart-layout">
                <div class="cart-items" id="cart-items-container">
                    <?php if (empty($cart_items)): ?>
                        <div class="loading">Tu carrito está vacío. <a href="index.php">Ver productos</a></div>
                    <?php else: ?>
                        <?php foreach ($cart_items as $item): ?>
                            <div class="cart-item">
                                <div class="cart-item-info">
                                    <h4><?= htmlspecialchars($item['nombre']) ?></h4>
                                    <p>Cantidad: <?= $item['cantidad'] ?></p>
                                </div>
                                <div class="cart-item-price">
                                    $<?= number_format($item['precio'] * $item['cantidad'], 2) ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>

                <div class="cart-summary">
                    <h3>Resumen del Pedido</h3>
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span id="cart-subtotal">$<?= number_format($total, 2) ?></span>
                    </div>
                    <div class="summary-total">
                        <span>Total:</span>
                        <span id="cart-total">$<?= number_format($total, 2) ?></span>
                    </div>
                    <a href="checkout.php" class="btn btn-primary btn-block">Proceder al Pago</a>
                </div>
            </div>
        </div>
    </main>
    <script src="js/app.js"></script>
</body>

</html>