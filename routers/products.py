from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
from sqlalchemy import or_

router = APIRouter(prefix="/api/products", tags=["products"])

class ProductCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    precio: float
    stock: int = 0
    imagen: Optional[str] = ""

class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    stock: Optional[int] = None
    imagen: Optional[str] = None


def _validate_product_data(data: dict) -> None:
    if data.get("precio") is not None and data["precio"] < 0:
        raise HTTPException(status_code=400, detail="El precio no puede ser negativo")
    if data.get("stock") is not None and data["stock"] < 0:
        raise HTTPException(status_code=400, detail="El stock no puede ser negativo")


@router.get("/", summary="Listar todos los productos")
def get_products(q: Optional[str] = None, db: Session = Depends(get_db)):
    if q:
        search = f"%{q}%"
        return db.query(models.Product).filter(
            or_(
                models.Product.nombre.ilike(search),
                models.Product.descripcion.ilike(search)
            )
        ).all()
    return db.query(models.Product).all()


@router.get("/{product_id}", summary="Obtener un producto por ID")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.post("/", summary="Crear un nuevo producto")
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    _validate_product_data(payload)
    db_product = models.Product(**payload)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.put("/{product_id}", summary="Actualizar un producto existente")
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    update_data = data.model_dump(exclude_unset=True)
    _validate_product_data(update_data)
    for key, value in update_data.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", summary="Eliminar un producto")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(product)
    db.commit()
    return {"success": True, "mensaje": f"Producto {product_id} eliminado"}
