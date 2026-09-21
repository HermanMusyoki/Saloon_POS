from django.urls import path
from .views import (
    SupplierListCreateView, SupplierDetailView,
    ProductListCreateView, ProductDetailView,
    StockMovementListCreateView,
    low_stock_alert_view, barcode_lookup_view,
)

urlpatterns = [
    path('suppliers/', SupplierListCreateView.as_view(), name='supplier-list-create'),
    path('suppliers/<int:pk>/', SupplierDetailView.as_view(), name='supplier-detail'),
    path('products/', ProductListCreateView.as_view(), name='product-list-create'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('stock-movements/', StockMovementListCreateView.as_view(), name='stock-movement-list-create'),
    path('low-stock/', low_stock_alert_view, name='low-stock-alert'),
    path('barcode/', barcode_lookup_view, name='barcode-lookup'),
]
