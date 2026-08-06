import os
import unittest
from unittest.mock import patch

from core.payments import MercadoPagoPayment, PayPalPayment, StripePayment


class TestSandboxPayments(unittest.TestCase):
    @patch.dict(os.environ, {}, clear=True)
    def test_stripe_requires_credentials(self):
        payment = StripePayment()
        result = payment.procesar(10.0, {})
        self.assertFalse(result["success"])
        self.assertEqual(result["estado"], "RECHAZADO")
        self.assertIn("credenciales", result["mensaje"].lower())

    @patch.dict(os.environ, {}, clear=True)
    def test_paypal_requires_credentials(self):
        payment = PayPalPayment()
        result = payment.procesar(10.0, {})
        self.assertFalse(result["success"])
        self.assertEqual(result["estado"], "RECHAZADO")
        self.assertIn("credenciales", result["mensaje"].lower())

    @patch.dict(os.environ, {}, clear=True)
    def test_mercadopago_requires_credentials(self):
        payment = MercadoPagoPayment()
        result = payment.procesar(10.0, {})
        self.assertFalse(result["success"])
        self.assertEqual(result["estado"], "RECHAZADO")
        self.assertIn("credenciales", result["mensaje"].lower())


if __name__ == "__main__":
    unittest.main()
