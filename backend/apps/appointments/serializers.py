from rest_framework import serializers
from .models import Appointment
from apps.customers.models import Customer
from apps.employees.models import Employee
from apps.services.models import Service
from apps.customers.serializers import CustomerListSerializer
from apps.employees.serializers import EmployeeListSerializer
from apps.services.serializers import ServiceListSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    customer_detail = CustomerListSerializer(source='customer', read_only=True)
    employee_detail = EmployeeListSerializer(source='employee', read_only=True)
    service_detail = ServiceListSerializer(source='service', read_only=True)

    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.filter(is_deleted=False)
    )
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.filter(is_deleted=False),
        allow_null=True, required=False
    )
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_deleted=False, is_active=True),
        allow_null=True, required=False
    )

    class Meta:
        model = Appointment
        fields = [
            'id', 'customer', 'customer_detail',
            'employee', 'employee_detail',
            'service', 'service_detail',
            'date', 'start_time', 'end_time',
            'status', 'notes', 'created_at',
        ]

    def validate(self, attrs):
        employee = attrs.get('employee')
        date = attrs.get('date')
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        instance_id = self.instance.id if self.instance else None

        if employee and date and start_time and end_time:
            conflict_qs = Appointment.objects.filter(
                employee=employee,
                date=date,
                is_deleted=False,
                status__in=['pending', 'confirmed', 'in_progress'],
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            if instance_id:
                conflict_qs = conflict_qs.exclude(id=instance_id)
            if conflict_qs.exists():
                raise serializers.ValidationError(
                    'This employee already has an appointment during this time slot.'
                )
        return attrs


class AppointmentListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_duration = serializers.IntegerField(source='service.duration_minutes', read_only=True)
    service_price = serializers.CharField(source='service.price', read_only=True)
    category_color = serializers.CharField(source='service.category.color', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone',
            'employee', 'employee_name',
            'service', 'service_name', 'service_duration', 'service_price', 'category_color',
            'date', 'start_time', 'end_time', 'status', 'notes', 'created_at',
        ]
