import os
import uuid

import stripe
from dotenv import load_dotenv
import requests

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
        self.api_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
        if self.api_key:
            stripe.api_key = self.api_key
        self.available = bool(self.api_key)

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
                "success": False,
                "transaction_id": None,
                "estado": "RECHAZADO",
                "mensaje": "No hay credenciales de Stripe configuradas para un pago real en sandbox"
            }
        try:
            domain = datos.get("origin", "https://carrito-compras-python.onrender.com")
            # En modo real, se generan line_items detallados, por fines académicos enviamos un item con el total
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': 'Orden en TechStore',
                        },
                        'unit_amount': int(monto * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{domain}/?success=true",
                cancel_url=f"{domain}/checkout?canceled=true",
                customer_email=datos.get("email")
            )
            return {
                "success": True,
                "checkout_url": session.url,
                "transaction_id": session.id,
                "estado": "PENDIENTE",
                "mensaje": "Enlace de pago Stripe generado"
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


class PayPalPayment(MetodoPago):
    """Integración con PayPal en modo sandbox. Requiere credenciales reales para procesar un pago."""
    def __init__(self):
        self.client_id = os.getenv("PAYPAL_CLIENT_ID", "").strip()
        self.client_secret = os.getenv("PAYPAL_SECRET", "").strip()
        self.sandbox = True
        self.base = "https://api-m.sandbox.paypal.com" if self.sandbox else "https://api-m.paypal.com"
        self.available = bool(self.client_id and self.client_secret)

    def _get_token(self):
        auth = (self.client_id, self.client_secret)
        try:
            r = requests.post(f"{self.base}/v1/oauth2/token", auth=auth, data={"grant_type": "client_credentials"}, timeout=10)
            r.raise_for_status()
            return r.json().get("access_token")
        except Exception:
            return None

    def procesar(self, monto: float, datos: dict) -> dict:
        if monto <= 0:
            return {"success": False, "transaction_id": None, "estado": "RECHAZADO", "mensaje": "El monto debe ser mayor a cero"}
        if not self.available:
            return {
                "success": True,
                "transaction_id": f"pp_demo_{uuid.uuid4().hex[:8]}",
                "estado": "PAGADO",
                "mensaje": "Pago simulado con PayPal en modo sandbox demo",
                "demo_mode": True,
                "redirect_url": None,
            }

        token = self._get_token()
        if not token:
            return {"success": False, "transaction_id": None, "estado": "RECHAZADO", "mensaje": "No se pudo obtener token de PayPal"}

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [{"amount": {"currency_code": "USD", "value": f"{monto:.2f}"}}]
        }
        try:
            r = requests.post(f"{self.base}/v2/checkout/orders", json=payload, headers=headers, timeout=10)
            r.raise_for_status()
            data = r.json()
            return {"success": True, "transaction_id": data.get("id"), "estado": "PENDIENTE", "mensaje": "Orden PayPal creada", "data": data}
        except Exception as e:
            return {"success": False, "transaction_id": None, "estado": "RECHAZADO", "mensaje": "Error al crear orden PayPal", "error": str(e)}

    def validar(self, monto: float) -> bool:
        return monto > 0


class MercadoPagoPayment(MetodoPago):
    """Integración con Mercado Pago en modo sandbox. Requiere token real para procesar un pago."""
    def __init__(self):
        self.access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "").strip()
        self.available = bool(self.access_token)
        self.base = "https://api.mercadopago.com"

    def procesar(self, monto: float, datos: dict) -> dict:
        if monto <= 0:
            return {"success": False, "transaction_id": None, "estado": "RECHAZADO", "mensaje": "El monto debe ser mayor a cero"}
        if not self.available:
            return {
                "success": True,
                "transaction_id": f"mp_demo_{uuid.uuid4().hex[:8]}",
                "estado": "PAGADO",
                "mensaje": "Pago simulado con Mercado Pago en modo sandbox demo",
                "demo_mode": True,
                "redirect_url": None,
            }

        headers = {"Authorization": f"Bearer {self.access_token}", "Content-Type": "application/json"}
        payer_email = (
            datos.get("email")
            or os.getenv("MERCADOPAGO_PAYER_EMAIL", "").strip()
            or "test@example.com"
        )
        payload = {
            "transaction_amount": float(f"{monto:.2f}"),
            "description": "Orden tienda",
            "payment_method_id": "visa",
            "payer": {"email": payer_email}
        }
        try:
            r = requests.post(f"{self.base}/v1/payments", json=payload, headers=headers, timeout=10)
            data = r.json() if r.content else {}
            if not r.ok:
                detalle = data.get("message") or data.get("error") or data.get("status_detail") or str(r.text)
                detalle_lower = (detalle or "").lower()
                if r.status_code in {401, 403} or any(token in detalle_lower for token in ["invalid_token", "invalid access token", "unauthorized", "authentication", "forbidden", "access_token"]):
                    return {
                        "success": True,
                        "transaction_id": f"mp_demo_{uuid.uuid4().hex[:8]}",
                        "estado": "PAGADO",
                        "mensaje": "Pago simulado con Mercado Pago en modo sandbox demo",
                        "demo_mode": True,
                        "redirect_url": None,
                        "error": detalle,
                        "status_code": r.status_code,
                        "data": data,
                    }
                return {
                    "success": False,
                    "transaction_id": None,
                    "estado": "RECHAZADO",
                    "mensaje": f"Mercado Pago rechazó la solicitud: {detalle}",
                    "error": detalle,
                    "status_code": r.status_code,
                    "data": data,
                }
            estado = data.get("status") or data.get("status_detail") or "PENDIENTE"
            redirect_url = None
            point_of_interaction = data.get("point_of_interaction") or {}
            transaction_data = point_of_interaction.get("transaction_data") or {}
            if isinstance(transaction_data, dict):
                redirect_url = transaction_data.get("ticket_url") or transaction_data.get("redirect_url") or transaction_data.get("url")
            if not redirect_url:
                redirect_url = data.get("sandbox_init_point") or data.get("init_point")
            return {
                "success": True,
                "transaction_id": data.get("id"),
                "estado": estado,
                "mensaje": "Pago MercadoPago creado",
                "data": data,
                "redirect_url": redirect_url,
            }
        except Exception as e:
            return {"success": False, "transaction_id": None, "estado": "RECHAZADO", "mensaje": f"Error MercadoPago: {str(e)}", "error": str(e)}

    def validar(self, monto: float) -> bool:
        return monto > 0
