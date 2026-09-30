from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'category', 'description', 'amount',
            'expense_date', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_by_name']
