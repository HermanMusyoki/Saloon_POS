from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from common.permissions import IsAdminOrReceptionist
from .models import Customer
from .serializers import CustomerSerializer, CustomerListSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = (IsAdminOrReceptionist,)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['gender']
    search_fields = ['full_name', 'phone', 'email']
    ordering_fields = ['full_name', 'created_at', 'loyalty_points']
    ordering = ['full_name']

    def get_queryset(self):
        return Customer.objects.filter(is_deleted=False)

    def get_serializer_class(self):
        if self.request.query_params.get('minimal'):
            return CustomerListSerializer
        return CustomerSerializer


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = (IsAdminOrReceptionist,)

    def get_queryset(self):
        return Customer.objects.filter(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
