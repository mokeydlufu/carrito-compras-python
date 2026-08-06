# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from database import engine, Base, SessionLocal, ensure_database_schema
from routers import products, cart, checkout
import models
import mimetypes

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

load_dotenv()

# Crear tablas y asegurar columnas necesarias
ensure_database_schema(engine=engine, base=Base)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-cargar datos si la BD está vacía (Para iniciar el proyecto con items)
    db = SessionLocal()
    if db.query(models.Product).count() == 0:
        productos_demo = [
            models.Product(nombre="Wireless Earbuds Gadget", descripcion="Wireless, 30h battery. Active Noise Canceling.", precio=76.99, stock=50, imagen="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80"),
            models.Product(nombre="Smartwatch Wintoth Gadget", descripcion="Fitness tracking, heart rate monitor. Water resistant.", precio=99.99, stock=30, imagen="https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80"),
            models.Product(nombre="Slim Laptop Pro", descripcion="16GB RAM, 512GB SSD, Ultra lightweight.", precio=99.80, stock=15, imagen="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80"),
            models.Product(nombre="Wireless Bass Headphone", descripcion="Deep bass, 40h playtime. Over-ear comfort.", precio=99.99, stock=40, imagen="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80"),
            models.Product(nombre="Smart Home Hub", descripcion="Control all your devices from one place.", precio=49.99, stock=80, imagen="https://images.unsplash.com/photo-1558002038-1055907df827?w=500&q=80"),
            models.Product(nombre="Smartphone X Ultra", descripcion="6.7 inch OLED display, 256GB storage, 50MP camera.", precio=899.99, stock=25, imagen="https://images.unsplash.com/photo-1598327105666-5b89351cb31b?w=500&q=80"),
            models.Product(nombre="Monitor Curvo 34\"", descripcion="Ultrawide 144Hz 1ms para Gaming y Productividad.", precio=349.50, stock=12, imagen="https://images.unsplash.com/photo-1527443195645-1133f7f28990?w=500&q=80"),
            models.Product(nombre="Cámara DSLR Pro", descripcion="Sensor Full Frame, Video 4K, Lente 24-70mm.", precio=1200.00, stock=8, imagen="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80"),
            models.Product(nombre="Drone Explorer 4K", descripcion="Vuelo inteligente, cámara 4K, 30 min batería.", precio=599.99, stock=15, imagen="https://images.unsplash.com/photo-1507582020474-9a35e7d65561?w=500&q=80"),
            models.Product(nombre="Consola PlayX 5", descripcion="Juegos de última generación, SSD ultra rápido, 4K a 120fps.", precio=499.99, stock=20, imagen="https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500&q=80"),
            models.Product(nombre="Teclado Mecánico RGB", descripcion="Switches azúles, retroiluminación personalizable.", precio=85.50, stock=45, imagen="https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80")
        ]
        db.add_all(productos_demo)
        db.commit()
    db.close()
    yield

# Inicializar App con el evento de vida
app = FastAPI(title="Carrito Premium API", lifespan=lifespan)

# Incluir routers
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(checkout.router)

# Servir Frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return FileResponse("static/index.html")

@app.get("/cart")
def cart_page():
    return FileResponse("static/cart.html")

@app.get("/checkout")
def checkout_page():
    return FileResponse("static/checkout.html")
