<?php
// Configuración del backend
define('API_URL', 'http://localhost:8000');

// Obtener productos desde el backend Python
$response = @file_get_contents(API_URL . '/products');
$products = $response ? json_decode($response, true) : [];
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tienda Premium - Catálogo</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>

<body>
    <nav class="navbar">
        <div class="logo">� Carrito Web</div>
        <div class="nav-links">
            <a href="index.php">Catálogo</a>
            <a href="cart.php" class="cart-link">Carrito</a>
            <a href="checkout.php">Checkout</a>
        </div>
    </nav>

    <main class="container">
        <section class="hero-store">
            <div>
                <span class="eyebrow">Compra fácil</span>
                <h1>Explora nuestro catálogo de productos</h1>
                <p>Selecciona y agrega tus productos favoritos al carrito. El proceso de pago se completa con FastAPI y PHP juntos.</p>
            </div>
            <div class="hero-actions">
                <a href="cart.php" class="btn btn-secondary">Ver carrito</a>
                <a href="checkout.php" class="btn btn-primary">Ir a pago</a>
            </div>
        </section>

        <div class="products-grid" id="products-container">
            <?php if (empty($products)): ?>
                <div class="loading">No se pudieron cargar los productos. ¿Está corriendo el backend?</div>
            <?php else: ?>
                <?php foreach ($products as $product): ?>
                    <article class="product-card">
                        <img src="<?= htmlspecialchars($product['imagen']) ?>" alt="<?= htmlspecialchars($product['nombre']) ?>">
                        <div class="product-info">
                            <h3><?= htmlspecialchars($product['nombre']) ?></h3>
                            <p class="product-desc"><?= htmlspecialchars($product['descripcion']) ?></p>
                            <div class="product-footer">
                                <span class="price">$<?= number_format($product['precio'], 2) ?></span>
                                <button class="btn btn-primary" onclick="addToCart(<?= $product['id'] ?>)">Agregar</button>
                            </div>
                        </div>
                    </article>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>

    <footer>
        <p>&copy; 2026 Carrito Web. Backend FastAPI · Frontend PHP.</p>
        <a href="http://localhost:8000/docs" target="_blank">Ver documentación del backend</a>
    </footer>

    <script src="js/app.js"></script>
</body>

</html>