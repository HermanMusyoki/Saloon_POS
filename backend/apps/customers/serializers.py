from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            'id', 'full_name', 'phone', 'email', 'gender',
            'birthday', 'notes', 'loyalty_points', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_phone(self, value):
        qs = Customer.objects.filter(phone=value, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A customer with this phone number already exists.')
        return value


class CustomerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns."""
    class Meta:
        model = Customer
        fields = ('id', 'full_name', 'phone', 'loyalty_points')
