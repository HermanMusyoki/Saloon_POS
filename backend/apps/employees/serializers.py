from rest_framework import serializers
from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = (
            'id', 'user', 'name', 'phone', 'email', 'role',
            'salary', 'commission_pct', 'skills', 'hire_date',
            'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns and calendar."""
    class Meta:
        model = Employee
        fields = ('id', 'name', 'role', 'commission_pct')
