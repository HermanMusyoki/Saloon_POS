from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from common.permissions import IsAdmin
from .models import Employee
from .serializers import EmployeeSerializer, EmployeeListSerializer


class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'role']
    search_fields = ['name', 'phone', 'email', 'role']
    ordering_fields = ['name', 'hire_date', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Employee.objects.filter(is_deleted=False)

    def get_serializer_class(self):
        if self.request.query_params.get('minimal'):
            return EmployeeListSerializer
        return EmployeeSerializer

    def get_permissions(self):
        if self.request.method != 'GET':
            return [IsAdmin()]
        return super().get_permissions()


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = (IsAdmin,)

    def get_queryset(self):
        return Employee.objects.filter(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
