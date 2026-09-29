import base64
import logging
import threading
import time
import uuid
from datetime import datetime

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Sandbox / production base URLs ───────────────────────────────────────────
_BASE_URLS = {
    'sandbox':    'https://sandbox.safaricom.co.ke',
    'production': 'https://api.safaricom.co.ke',
}

# ── Thread-safe OAuth token cache ─────────────────────────────────────────────
_token_lock  = threading.Lock()
_cached_token: str | None = None
_token_expiry: float = 0.0          # epoch seconds


def _base_url() -> str:
    env = getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox')
    return _BASE_URLS.get(env, _BASE_URLS['sandbox'])


def get_access_token() -> str:
    """
    Fetch (or return cached) Daraja OAuth2 bearer token.
    Tokens are valid for 3 600 s; we refresh 60 s early to avoid races.
    """
    global _cached_token, _token_expiry

    with _token_lock:
        if _cached_token and time.time() < _token_expiry:
            return _cached_token

        key    = settings.MPESA_CONSUMER_KEY
        secret = settings.MPESA_CONSUMER_SECRET

        if not key or not secret:
            raise ValueError(
                'MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be set '
                'in .env before calling the real Daraja API.'
            )

        url = f'{_base_url()}/oauth/v1/generate?grant_type=client_credentials'
        resp = requests.get(url, auth=(key, secret), timeout=15)
        resp.raise_for_status()

        data          = resp.json()
        _cached_token = data['access_token']
        # Safaricom returns expires_in in seconds (usually 3600)
        _token_expiry = time.time() + int(data.get('expires_in', 3600)) - 60
        return _cached_token


def _format_phone(phone: str) -> str:
    """Normalise Kenyan phone → 2547XXXXXXXX (12 digits)."""
    phone = phone.strip().replace(' ', '').replace('-', '')
    if phone.startswith('+'):
        phone = phone[1:]
    if phone.startswith('07') or phone.startswith('01'):
        phone = '254' + phone[1:]
    return phone


def _generate_password(shortcode: str, passkey: str, timestamp: str) -> str:
    raw = f'{shortcode}{passkey}{timestamp}'
    return base64.b64encode(raw.encode()).decode()


def stk_push(phone: str, amount: int, account_ref: str, description: str) -> dict:
    """
    Initiate an M-Pesa STK Push (Lipa Na M-Pesa Online).

    Returns the full Daraja response dict which includes:
      - CheckoutRequestID  (store this on the Payment record)
      - MerchantRequestID
      - ResponseCode  ('0' == success)
      - CustomerMessage

    Raises requests.HTTPError or ValueError on failure.
    """
    token     = get_access_token()
    shortcode = settings.MPESA_SHORTCODE
    passkey   = settings.MPESA_PASSKEY
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password  = _generate_password(shortcode, passkey, timestamp)

    payload = {
        'BusinessShortCode': shortcode,
        'Password':          password,
        'Timestamp':         timestamp,
        'TransactionType':   'CustomerPayBillOnline',
        'Amount':            int(amount),
        'PartyA':            _format_phone(phone),
        'PartyB':            shortcode,
        'PhoneNumber':       _format_phone(phone),
        'CallBackURL':       settings.MPESA_CALLBACK_URL,
        'AccountReference':  account_ref[:12],   # Daraja max 12 chars
        'TransactionDesc':   description[:13],   # Daraja max 13 chars
    }

    url  = f'{_base_url()}/mpesa/stkpush/v1/processrequest'
    resp = requests.post(
        url,
        json=payload,
        headers={'Authorization': f'Bearer {token}'},
        timeout=30,
    )
    resp.raise_for_status()

    data = resp.json()
    logger.info(
        'stk_push_initiated phone=%s amount=%s checkout_id=%s',
        _format_phone(phone), amount, data.get('CheckoutRequestID'),
    )
    return data


def query_stk_status(checkout_request_id: str) -> dict:
    """
    Query the status of an STK Push request from Daraja.

    Returns the Daraja response dict:
      - ResultCode  '0' == success, '1032' == cancelled by user, etc.
      - ResultDesc
    """
    token     = get_access_token()
    shortcode = settings.MPESA_SHORTCODE
    passkey   = settings.MPESA_PASSKEY
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password  = _generate_password(shortcode, passkey, timestamp)

    payload = {
        'BusinessShortCode': shortcode,
        'Password':          password,
        'Timestamp':         timestamp,
        'CheckoutRequestID': checkout_request_id,
    }

    url  = f'{_base_url()}/mpesa/stkpushquery/v1/query'
    resp = requests.post(
        url,
        json=payload,
        headers={'Authorization': f'Bearer {token}'},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


# ── Debug-only mock (no credentials needed) ───────────────────────────────────

def confirm_mock_mpesa(payment_id: int, delay: int = 5):
    """
    Simulate M-Pesa auto-confirming after `delay` seconds.
    Only runs in DEBUG mode AND when no real credentials are configured.
    """
    if not settings.DEBUG:
        return
    if settings.MPESA_CONSUMER_KEY:
        return  # real credentials present — use the real flow

    def _run():
        time.sleep(delay)
        from .models import Payment
        try:
            payment = Payment.objects.select_related('sale').get(
                id=payment_id, status='pending'
            )
            payment.mpesa_reference = f'MOCK{uuid.uuid4().hex[:8].upper()}'
            payment.status = 'completed'
            payment.save(update_fields=['mpesa_reference', 'status'])
            sale = payment.sale
            if sale.payment_status == 'pending':
                sale.payment_status = 'completed'
                sale.save(update_fields=['payment_status'])
        except Payment.DoesNotExist:
            pass

    threading.Thread(target=_run, daemon=True).start()
