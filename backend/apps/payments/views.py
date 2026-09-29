import hmac
import logging
from django.conf import settings
from rest_framework import serializers as drf_serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from common.permissions import IsAdminOrCashier
from common.utils import get_client_ip
from .models import Payment
from .services import query_stk_status

logger = logging.getLogger(__name__)


class PaymentSerializer(drf_serializers.ModelSerializer):
    """Expose only fields the frontend needs — never raw checkout IDs."""
    class Meta:
        model = Payment
        fields = ['id', 'sale', 'method', 'amount', 'mpesa_reference', 'status', 'created_at']
        read_only_fields = fields


@api_view(['GET'])
@permission_classes([IsAdminOrCashier])           # Fix 8: was IsAuthenticated
def sale_payments_view(request, sale_id):
    payments = Payment.objects.filter(sale_id=sale_id)
    return Response(PaymentSerializer(payments, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback_view(request):
    """
    Daraja STK Push result callback (called by Safaricom servers).

    Fix 1 — shared-secret guard:
    The callback URL configured in Daraja must include ?secret=<MPESA_CALLBACK_SECRET>.
    If MPESA_CALLBACK_SECRET is set and the header/param does not match, reject.
    """
    expected = settings.MPESA_CALLBACK_SECRET
    if expected:
        received = request.query_params.get('secret', '')
        if not hmac.compare_digest(expected, received):
            logger.warning('mpesa_callback_unauthorized ip=%s', get_client_ip(request))
            return Response({'ResultCode': 1, 'ResultDesc': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    stk = request.data.get('Body', {}).get('stkCallback', {})
    checkout_id = stk.get('CheckoutRequestID', '')
    result_code = stk.get('ResultCode')

    if checkout_id:
        try:
            payment = Payment.objects.select_related('sale').get(
                mpesa_checkout_request_id=checkout_id
            )
            if result_code == 0:
                items = stk.get('CallbackMetadata', {}).get('Item', [])
                ref = next((i['Value'] for i in items if i.get('Name') == 'MpesaReceiptNumber'), '')
                payment.mpesa_reference = ref or payment.mpesa_reference
                payment.status = 'completed'
                payment.save(update_fields=['mpesa_reference', 'status'])
                sale = payment.sale
                sale.payment_status = 'completed'
                sale.save(update_fields=['payment_status'])
                logger.info(
                    'mpesa_payment_completed checkout_id=%s ref=%s sale_id=%s amount=%s',
                    checkout_id, ref, sale.id, payment.amount,
                )
            else:
                payment.status = 'failed'
                payment.save(update_fields=['status'])
                payment.sale.payment_status = 'failed'
                payment.sale.save(update_fields=['payment_status'])
                logger.warning(
                    'mpesa_payment_failed checkout_id=%s result_code=%s sale_id=%s',
                    checkout_id, result_code, payment.sale_id,
                )
        except Payment.DoesNotExist:
            logger.warning('mpesa_callback_unknown_checkout checkout_id=%s', checkout_id)

    return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


@api_view(['POST'])
@permission_classes([IsAdminOrCashier])           # Fix 2: was IsAuthenticated
def refund_payment_view(request, payment_id):
    try:
        payment = Payment.objects.select_related('sale').get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

    if payment.status != 'completed':
        logger.warning(
            'refund_rejected payment_id=%s status=%s by=%s',
            payment_id, payment.status, request.user.email,
        )
        return Response(
            {'error': 'Only completed payments can be refunded'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment.status = 'refunded'
    payment.save(update_fields=['status'])

    sale = payment.sale
    if not Payment.objects.filter(sale=sale, status='completed').exists():
        sale.payment_status = 'refunded'
        sale.save(update_fields=['payment_status'])

    logger.info(
        'payment_refunded payment_id=%s method=%s amount=%s sale_id=%s by=%s',
        payment.id, payment.method, payment.amount, sale.id, request.user.email,
    )
    return Response(PaymentSerializer(payment).data)


@api_view(['GET'])
@permission_classes([IsAdminOrCashier])
def mpesa_query_view(request, payment_id):
    """
    GET /api/v1/payments/<id>/mpesa/status/

    Proactively query Daraja for the STK Push result and sync local state.
    Call this from the frontend after ~90 s of polling if status is still pending.
    """
    try:
        payment = Payment.objects.select_related('sale').get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

    if payment.method != 'mpesa':
        return Response({'error': 'Not an M-Pesa payment'}, status=status.HTTP_400_BAD_REQUEST)

    if payment.status != 'pending':
        return Response(PaymentSerializer(payment).data)

    checkout_id = payment.mpesa_checkout_request_id
    if not checkout_id:
        return Response({'error': 'No checkout request ID on record'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = query_stk_status(checkout_id)
    except Exception as exc:
        logger.error('mpesa_query_failed payment_id=%s error=%s', payment_id, exc)
        return Response({'error': 'Could not reach Daraja', 'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    result_code = str(result.get('ResultCode', ''))
    if result_code == '0':
        payment.status = 'completed'
        payment.save(update_fields=['status'])
        sale = payment.sale
        sale.payment_status = 'completed'
        sale.save(update_fields=['payment_status'])
        logger.info('mpesa_query_synced_completed payment_id=%s', payment_id)
    elif result_code not in ('', None) and result_code != '1032':
        # 1032 = request cancelled by user (still pending in Daraja's view until timeout)
        payment.status = 'failed'
        payment.save(update_fields=['status'])
        payment.sale.payment_status = 'failed'
        payment.sale.save(update_fields=['payment_status'])
        logger.warning('mpesa_query_synced_failed payment_id=%s result_code=%s', payment_id, result_code)

    return Response(PaymentSerializer(payment).data)
