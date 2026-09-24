from django.db import models
from common.models import BaseModel
from apps.authentication.models import User


class Employee(BaseModel):
    user = models.OneToOneField(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='employee_profile'
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    role = models.CharField(max_length=100, blank=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    skills = models.JSONField(default=list, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'employees'
        ordering = ['name']

    def __str__(self):
        return self.name
