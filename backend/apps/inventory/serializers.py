import uuid
from rest_framework import serializers
from .models import Supplier, Product, StockMovement


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'email', 'address', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'barcode', 'cost_price', 'selling_price',
            'stock_quantity', 'min_stock_level', 'supplier', 'supplier_name',
            'is_active', 'is_low_stock', 'created_at',
        ]

    def create(self, validated_data):
        if not validated_data.get('sku'):
            validated_data['sku'] = 'PRD-' + uuid.uuid4().hex[:8].upper()
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'barcode', 'cost_price', 'selling_price',
            'stock_quantity', 'min_stock_level', 'supplier', 'supplier_name',
            'is_active', 'is_low_stock',
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'movement_type',
            'quantity', 'reference', 'notes', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_by_name', 'created_at']

    def validate(self, data):
        # quantity is already negative for 'out' movements (sent from frontend)
        qty = data.get('quantity', 0)
        product = data.get('product')
        if product and qty < 0:
            available = product.stock_quantity
            if available + qty < 0:
                raise serializers.ValidationError({
                    'quantity': f'Only {available} unit{"s" if available != 1 else ""} in stock. Cannot remove {abs(qty)}.'
                })
        return data
