from django.db import models
from common.models import BaseModel


class Expense(BaseModel):
    CATEGORY_CHOICES = [
        ('rent', 'Rent'),
        ('utilities', 'Utilities'),
        ('supplies', 'Supplies'),
        ('salaries', 'Salaries'),
        ('marketing', 'Marketing'),
        ('equipment', 'Equipment'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
    ]

    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense_date = models.DateField()
    receipt_image = models.CharField(max_length=255, blank=True)  # store file path; use FileField in production with Pillow
    created_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL, null=True, related_name='expenses'
    )

    class Meta:
        ordering = ['-expense_date']

    def __str__(self):
        return f"{self.category} — KES {self.amount} ({self.expense_date})"
