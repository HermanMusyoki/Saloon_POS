from django.db import models
from common.models import BaseModel
from apps.customers.models import Customer
from apps.employees.models import Employee
from apps.services.models import Service


class Appointment(BaseModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='appointments')
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='appointments')
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, related_name='appointments')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL, null=True, related_name='created_appointments'
    )

    class Meta:
        ordering = ['-date', '-start_time']
        indexes = [
            models.Index(fields=['date', 'employee']),
            models.Index(fields=['date', 'status']),
        ]

    def __str__(self):
        return f"{self.customer} - {self.service} on {self.date}"
