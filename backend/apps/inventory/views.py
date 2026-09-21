from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from common.pagination import StandardResultsPagination
from common.permissions import IsAdmin, IsAdminWriteOrCashierRead
from .models import Supplier, Product, StockMovement
from .serializers import (
    SupplierSerializer, ProductSerializer, ProductListSerializer, StockMovementSerializer
)


# ── Suppliers ─────────────────────────────────────────────────────────────────
class SupplierListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = SupplierSerializer
    pagination_class = StandardResultsPagination
    filter_backends = [SearchFilter]
    search_fields = ['name', 'phone', 'email']

    def get_queryset(self):
        return Supplier.objects.filter(is_deleted=False)


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = SupplierSerializer

    def get_queryset(self):
        return Supplier.objects.filter(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Products ──────────────────────────────────────────────────────────────────
class ProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminWriteOrCashierRead]
    pagination_class = StandardResultsPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'supplier']
    search_fields = ['name', 'sku', 'barcode']
    ordering_fields = ['name', 'stock_quantity', 'selling_price', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        qs = Product.objects.filter(is_deleted=False).select_related('supplier')
        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            from django.db.models import F
            qs = qs.filter(stock_quantity__lte=F('min_stock_level'))
        return qs

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ProductListSerializer
        return ProductSerializer

    def perform_create(self, serializer):
        initial_stock = serializer.validated_data.get('stock_quantity', 0)
        # Save with stock_quantity=0; the movement will set the real value
        product = serializer.save(stock_quantity=0)
        if initial_stock > 0:
            StockMovement.objects.create(
                product=product,
                movement_type='in',
                quantity=initial_stock,
                reference='Initial stock',
                created_by=self.request.user,
            )


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminWriteOrCashierRead]

    def get_queryset(self):
        return Product.objects.filter(is_deleted=False).select_related('supplier')

    def get_serializer_class(self):
        return ProductSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Stock Movements ───────────────────────────────────────────────────────────
class StockMovementListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminWriteOrCashierRead]
    serializer_class = StockMovementSerializer
    pagination_class = StandardResultsPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['product', 'movement_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return StockMovement.objects.filter(is_deleted=False).select_related('product', 'created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@api_view(['GET'])
@permission_classes([IsAdminWriteOrCashierRead])
def low_stock_alert_view(request):
    from django.db.models import F
    products = Product.objects.filter(
        is_deleted=False, is_active=True,
        stock_quantity__lte=F('min_stock_level')
    ).values('id', 'name', 'sku', 'stock_quantity', 'min_stock_level')
    return Response({'count': products.count(), 'products': list(products)})


@api_view(['GET'])
@permission_classes([IsAdminWriteOrCashierRead])
def barcode_lookup_view(request):
    barcode = request.query_params.get('barcode', '')
    sku = request.query_params.get('sku', '')
    try:
        if barcode:
            p = Product.objects.get(barcode=barcode, is_deleted=False, is_active=True)
        elif sku:
            p = Product.objects.get(sku=sku, is_deleted=False, is_active=True)
        else:
            return Response({'error': 'Provide barcode or sku'}, status=400)
        return Response(ProductSerializer(p).data)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)
