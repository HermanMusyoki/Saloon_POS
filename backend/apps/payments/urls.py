from django.urls import path
from .views import (
    sale_payments_view,
    mpesa_callback_view,
    mpesa_query_view,
    refund_payment_view,
)

urlpatterns = [
    path('sale/<int:sale_id>/', sale_payments_view, name='sale-payments'),
    path('mpesa/callback/', mpesa_callback_view, name='mpesa-callback'),
    path('<int:payment_id>/mpesa/status/', mpesa_query_view, name='mpesa-query'),
    path('<int:payment_id>/refund/', refund_payment_view, name='payment-refund'),
]
