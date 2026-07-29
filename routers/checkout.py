from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
from core.payments import PagoTarjetaSimulado, PagoYapeSimulado, StripePayment

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

    res = estrategia.procesar(total, {})
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

    if res.get("success"):
        for it in cart_items:
            db.delete(it)

    db.commit()
    return {"success": res.get("success"), "order_id": order.id, "payment_result": res}


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
