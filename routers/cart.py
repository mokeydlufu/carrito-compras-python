from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models

router = APIRouter(prefix="/api/cart", tags=["carrito"])

class CartAdd(BaseModel):
    product_id: int
    cantidad: int = 1

class CartUpdate(BaseModel):
    cantidad: int

@router.post("/{cart_id}/add", summary="Agregar producto al carrito")
def add_to_cart(cart_id: str, item: CartAdd, db: Session = Depends(get_db)):
    # Buscar o crear carrito
    cart = db.query(models.Cart).filter(models.Cart.id == cart_id).first()
    if not cart:
        cart = models.Cart(id=cart_id)
        db.add(cart)
        db.commit()

    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Agregar o acumular cantidad
    cart_item = db.query(models.CartItem).filter(
        models.CartItem.cart_id == cart_id,
        models.CartItem.product_id == item.product_id
    ).first()

    if cart_item:
        cart_item.cantidad += item.cantidad
    else:
        cart_item = models.CartItem(cart_id=cart_id, product_id=item.product_id, cantidad=item.cantidad)
        db.add(cart_item)

    db.commit()
    return {"success": True}

@router.get("/{cart_id}", summary="Ver contenido del carrito")
def get_cart(cart_id: str, db: Session = Depends(get_db)):
    items = db.query(models.CartItem).filter(models.CartItem.cart_id == cart_id).all()
    result = []
    total = 0
    for item in items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            sub = product.precio * item.cantidad
            total += sub
            result.append({
                "product_id": product.id,
                "nombre": product.nombre,
                "precio": product.precio,
                "imagen": product.imagen,
                "cantidad": item.cantidad,
                "subtotal": sub
            })
    return {"items": result, "total": total}

@router.put("/{cart_id}/update/{product_id}", summary="Actualizar cantidad de un ítem")
def update_cart_item(cart_id: str, product_id: int, data: CartUpdate, db: Session = Depends(get_db)):
    if data.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")

    item = db.query(models.CartItem).filter(
        models.CartItem.cart_id == cart_id,
        models.CartItem.product_id == product_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado en el carrito")

    item.cantidad = data.cantidad
    db.commit()
    return {"success": True, "nueva_cantidad": data.cantidad}

@router.delete("/{cart_id}/remove/{product_id}", summary="Eliminar ítem del carrito")
def remove_from_cart(cart_id: str, product_id: int, db: Session = Depends(get_db)):
    item = db.query(models.CartItem).filter(
        models.CartItem.cart_id == cart_id,
        models.CartItem.product_id == product_id
    ).first()
    if item:
        db.delete(item)
        db.commit()
    return {"success": True}
