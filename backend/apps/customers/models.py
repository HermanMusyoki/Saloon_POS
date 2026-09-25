from django.db import models
from common.models import BaseModel


class Customer(BaseModel):
    GENDER_CHOICES = [('male', 'Male'), ('female', 'Female'), ('other', 'Other')]

    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    birthday = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    loyalty_points = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'customers'
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} ({self.phone})'
