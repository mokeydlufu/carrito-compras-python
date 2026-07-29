# Documentación Oficial - Sistema de Carrito de Compras Premium

## 1. Tecnologías y Stack del Sistema

El proyecto ha sido desvinculado de PHP/XAMPP para optimizar el rendimiento y la facilidad de despliegue, utilizando una arquitectura moderna orientada a servicios (Cliente-Servidor) y una API RESTful documentada automáticamente.

### Frontend (Lado del Cliente)
- **HTML5 Semántico**: Para la construcción de las vistas.
- **CSS3 (Variables y Flexbox/Grid)**: Diseño "Premium" con soporte de Dark Mode y Glassmorphism nativo.
- **JavaScript Vanilla (ES6+)**: Consumo de la API Backend mediante fetch, gestión del estado del carrito en `localStorage`, y manejo asíncrono.
- **SweetAlert2**: Reemplazo de los métodos de alerta tradicionales para notificaciones UI modernas y amigables.
- **Stripe Elements (Stripe.js)**: Integración segura del formulario de métodos de tarjeta en entorno Sandbox.

### Backend (Lado del Servidor / API)
- **Lenguaje**: Python 3
- **Framework Core**: FastAPI (Altísimo rendimiento, validación de datos moderna mediante Pydantic).
- **Servidor ASGI**: Uvicorn (Ejecución y auto-recarga del proyecto).
- **Auto-Documentación**: Swagger UI integrado nativamente.

### Base de Datos
- **Motor**: **SQLite3**
  - Es una base de datos ligera base en archivos que **no requiere instalación externa (ni MySQL, ni XAMPP)**. Se crea y auto-administra dentro de Python.
- **ORM (Object-Relational Mapping)**: **SQLAlchemy**. Nos permite usar bases de datos directamente manejando Objetos en Python.

---

## 2. Patrones de Diseño Utilizados

### Patrón Strategy (Estrategia)
Se utiliza para **desacoplar la lógica de procesamiento de los pagos**. Existe una clase abstracta `MetodoPago` en `core/payments.py` y el Checkout en tiempo real decide (en base a la petición del cliente HTTP) qué algoritmo ejecutar:

- `PagoTarjetaSimulado`
- `PagoYapeSimulado`
- `StripePayment` (Integración real)

Esto respeta el Principio de Abierto/Cerrado (OCP de los principios SOLID), ya que permite agregar futuros métodos (como PayPal) sin alterar la lógica de la compra o del Checkout API.

---

## 3. Estructura Completa del Proyecto

```text
CARRITODECOMPRAS/
│
├── main.py                     # Punto de entrada de la aplicación FastAPI y montado estático.
├── database.py                 # Configuración de SQLite y el Motor de SQLAlchemy.
├── models.py                   # Entidades DB (Product, Cart, CartItem, Order, Payment).
├── requirements.txt            # Dependencias oficiales de Python (FastAPI, Stripe, etc).
├── .env.example                # Plantilla de llaves API secretas.
├── tienda.db                   # Archivo generado automáticamente de SQLite (BASE DE DATOS REAL).
│
├── core/
│   └── payments.py             # Lógica del Patrón Strategy para soportar T. Simulada, Yape y Stripe.
│
├── routers/                    # Controladores / Endpoints Separados (Organización)
│   ├── products.py             # CRUD Completo (GET, POST, PUT, DELETE) del inventario.
│   ├── cart.py                 # Lógica para Añadir, Visualizar, Restar y Eliminar Items (con identificador cart_id).
│   └── checkout.py             # Procesa la venta final, cambia estados y emite la respuesta.
│
└── static/                     # FRONTEND COMPLETAMENTE DESACOPLADO
    ├── index.html              # Vista inicial, lista de catálogo.
    ├── cart.html               # Vista del carrito de compras.
    ├── checkout.html           # Vista de pagos y resumen de orden.
    │
    ├── css/
    │   └── style.css           # Estilos corporativos en diseño oscuro.
    │
    └── js/
        └── app.js              # Cerebro del Frontend. Consume la API y muestra los SweetAlerts.
```

---

## 4. Endpoints Expuestos (La API Pública)

Estos puntos son consumidos tanto por el Frontend mediante Javascript, como probados independientemente a través de **Swagger UI** (enviando JSONs).

### Módulo de Productos
- `GET /api/products/` : Obtiene el inventario actual.
- `GET /api/products/{id}` : Obtiene detalles de un elemento.
- `POST /api/products/` : Crea un nuevo producto (con validación de Stock/Precio).
- `PUT /api/products/{id}` : Actualiza un producto existente.
- `DELETE /api/products/{id}` : Elimina el registro por completo de SQLite.

### Módulo del Carrito
- `POST /api/cart/{cart_id}/add` : Instancia un carrito e inserta items al array.
- `GET /api/cart/{cart_id}` : Lee un carrito estructurado re-calculando precios en Backend.
- `PUT /api/cart/{cart_id}/update/{product_id}` : Muta la cantidad elegida (+ o -).
- `DELETE /api/cart/{cart_id}/remove/{product_id}` : Quita de la lista al item permanentemente.

### Módulo de Checkout y Estado de Órdenes
- `POST /api/checkout/` : Endpoint Crítico. Suma, valida el método, procesa el Patrón STRATEGY, y guarda `Payment` y `Order`.
- `GET /api/checkout/order/{order_id}` : Retorna metadata de estado de la compra.
- `PUT /api/checkout/order/{order_id}/cancelar` : Pasa un estado `PENDIENTE` a `CANCELADO`.

---
*Documentación generada para presentación de arquitectura del sistema e Integraciones de Backend Moderno.*
