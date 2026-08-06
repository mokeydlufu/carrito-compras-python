import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
from core.payments import PagoTarjetaSimulado, PagoYapeSimulado, StripePayment, PayPalPayment, MercadoPagoPayment

router = APIRouter(prefix="/api/checkout", tags=["checkout"])

class ShippingInfo(BaseModel):
    nombre: str
    email: str
    direccion: str
    ciudad: str
    postal: str

class CheckoutRequest(BaseModel):
    cart_id: str
    metodo: str  # TARJETA_SIMULADA, YAPE, STRIPE
    shipping: ShippingInfo

@router.post("/", summary="Procesar pago de una orden")
def process_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    cart_items = db.query(models.CartItem).filter(models.CartItem.cart_id == req.cart_id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    total = 0.0
    for item in cart_items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            continue
        total += product.precio * item.cantidad

    if total <= 0:
        raise HTTPException(status_code=400, detail="El monto total debe ser mayor a cero")

    estrategias = {
        "TARJETA_SIMULADA": PagoTarjetaSimulado,
        "YAPE": PagoYapeSimulado,
        "STRIPE": StripePayment,
        "PAYPAL": PayPalPayment,
        "MERCADOPAGO": MercadoPagoPayment,
    }
    if req.metodo not in estrategias:
        raise HTTPException(status_code=400, detail="Método de pago inválido")

    order = models.Order(
        total=total,
        estado="PENDIENTE",
        shipping_name=req.shipping.nombre,
        shipping_email=req.shipping.email,
        shipping_address=req.shipping.direccion,
        shipping_city=req.shipping.ciudad,
        shipping_postal=req.shipping.postal,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    estrategia = estrategias[req.metodo]()
    if not estrategia.validar(total):
        order.estado = "RECHAZADO"
        db.commit()
        raise HTTPException(status_code=400, detail="Monto no válido para el método seleccionado")

    # Datos adicionales para el procesador (por ejemplo email del cliente)
    datos_pago = {"email": req.shipping.email}
    res = estrategia.procesar(total, datos_pago)
    estado_orden = "PAGADO" if res.get("success") and res.get("estado") == "PAGADO" else res.get("estado", "PENDIENTE")
    if not res.get("success"):
        estado_orden = "RECHAZADO"

    order.estado = estado_orden
    db.commit()

    payment = models.Payment(
        order_id=order.id,
        metodo=req.metodo,
        transaction_id=res.get("transaction_id"),
        estado=estado_orden
    )
    db.add(payment)

    # Solo vaciar el carrito si la orden resultó PAGADO (no basta con success=True en modos PENDIENTE)
    if estado_orden == "PAGADO":
        for it in cart_items:
            db.delete(it)

    db.commit()
    return {"success": res.get("success"), "order_id": order.id, "payment_result": res}

@router.get("/config/stripe", summary="Obtener llave publica para UI")
def get_stripe_config():
    # Retorna un pk de pruebas de Stripe por defecto para que funcione el frontend Sandbox siempre
    return {"public_key": os.getenv("STRIPE_PUBLIC_KEY", "pk_test_TYooMQauvdEDq54NiTphI7jx")}

@router.post("/confirm/{order_id}", summary="Confirmar desde frontend (Stripe Elements)")
def confirm_order_from_frontend(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    order.estado = "PAGADO"
    payment = db.query(models.Payment).filter(models.Payment.order_id == order_id).first()
    if payment:
        payment.estado = "PAGADO"
    
    # Vaciar carrito de este wey es dificil sin auth, pero en un ecom normal seria basado en cart_id.
    db.commit()
    return {"success": True, "order_id": order.id}

@router.get("/order/{order_id}", summary="Ver estado de una orden")
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return {
        "id": order.id,
        "total": order.total,
        "estado": order.estado,
        "created_at": order.created_at
    }


@router.put("/order/{order_id}/cancelar", summary="Cancelar una orden (estado: CANCELADO)")
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if order.estado == "PAGADO":
        raise HTTPException(status_code=400, detail="No se puede cancelar una orden ya PAGADA")
    order.estado = "CANCELADO"
    db.commit()
    return {"success": True, "order_id": order_id, "nuevo_estado": "CANCELADO"}
