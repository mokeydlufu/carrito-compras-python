import os
import uuid

import stripe
from dotenv import load_dotenv

load_dotenv()


class MetodoPago:
    def procesar(self, monto: float, datos: dict) -> dict:
        raise NotImplementedError

    def validar(self, monto: float) -> bool:
        raise NotImplementedError


class PagoTarjetaSimulado(MetodoPago):
    def procesar(self, monto: float, datos: dict) -> dict:
        if monto <= 0:
            return {
                "success": False,
                "transaction_id": None,
                "estado": "RECHAZADO",
                "mensaje": "El monto debe ser mayor a cero"
            }
        return {
            "success": True,
            "transaction_id": f"tx_sim_{uuid.uuid4().hex[:8]}",
            "estado": "PAGADO",
            "mensaje": "Pago simulado con tarjeta exitoso"
        }

    def validar(self, monto: float) -> bool:
        return monto > 0


class PagoYapeSimulado(MetodoPago):
    def procesar(self, monto: float, datos: dict) -> dict:
        if monto <= 0:
            return {
                "success": False,
                "transaction_id": None,
                "estado": "RECHAZADO",
                "mensaje": "El monto debe ser mayor a cero"
            }
        return {
            "success": True,
            "transaction_id": f"yp_sim_{uuid.uuid4().hex[:8]}",
            "estado": "PAGADO",
            "mensaje": "Pago simulado con Yape exitoso"
        }

    def validar(self, monto: float) -> bool:
        return monto > 0


class StripePayment(MetodoPago):
    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY", "").strip() or "sk_test_mock"
        if self.api_key and self.api_key != "sk_test_mock":
            stripe.api_key = self.api_key
        self.available = self.api_key != "sk_test_mock"

    def procesar(self, monto: float, datos: dict) -> dict:
        if monto <= 0:
            return {
                "success": False,
                "transaction_id": None,
                "estado": "RECHAZADO",
                "mensaje": "El monto debe ser mayor a cero"
            }
        if not self.available:
            return {
                "success": True,
                "transaction_id": f"stripe_mock_{uuid.uuid4().hex[:8]}",
                "estado": "PENDIENTE",
                "mensaje": "Stripe sandbox mock (sin clave configurada)"
            }
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(monto * 100),
                currency="usd"
            )
            return {
                "success": True,
                "client_secret": intent.client_secret,
                "transaction_id": intent.id,
                "estado": "PENDIENTE",
                "mensaje": "Stripe intent generado"
            }
        except Exception as e:
            return {
                "success": False,
                "transaction_id": None,
                "estado": "RECHAZADO",
                "error": str(e),
                "mensaje": "El pago con Stripe fue rechazado"
            }

    def validar(self, monto: float) -> bool:
        return monto > 0
