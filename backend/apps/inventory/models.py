from django.db import models
from common.models import BaseModel


class Supplier(BaseModel):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Product(BaseModel):
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, unique=True, blank=True, null=True, default=None)
    barcode = models.CharField(max_length=100, blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    min_stock_level = models.IntegerField(default=5)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['barcode']),
        ]

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.min_stock_level


class StockMovement(BaseModel):
    MOVEMENT_TYPES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=15, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField()  # positive = in, negative = out
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL, null=True, related_name='stock_movements'
    )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update product stock quantity
        self.product.stock_quantity = (
            StockMovement.objects.filter(product=self.product)
            .aggregate(total=models.Sum('quantity'))['total'] or 0
        )
        self.product.save(update_fields=['stock_quantity', 'updated_at'])
