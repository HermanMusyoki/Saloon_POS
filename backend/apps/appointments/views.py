from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import datetime, timedelta

from common.pagination import StandardResultsPagination
from common.permissions import IsAdminOrReceptionist, IsAdminOrReceptionistOrStylist
from .models import Appointment
from .serializers import AppointmentSerializer, AppointmentListSerializer


class AppointmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrReceptionistOrStylist]
    pagination_class = StandardResultsPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'employee', 'date']
    search_fields = ['customer__full_name', 'customer__phone', 'employee__name', 'service__name']
    ordering_fields = ['date', 'start_time', 'created_at']
    ordering = ['-date', '-start_time']

    def get_queryset(self):
        qs = Appointment.objects.filter(is_deleted=False).select_related(
            'customer', 'employee', 'service'
        )
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return AppointmentListSerializer
        return AppointmentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrReceptionist()]
        return [IsAdminOrReceptionistOrStylist()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AppointmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrReceptionistOrStylist]

    def get_queryset(self):
        return Appointment.objects.filter(is_deleted=False).select_related(
            'customer', 'employee', 'service'
        )

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return AppointmentListSerializer
        return AppointmentSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdminOrReceptionist()]
        return [IsAdminOrReceptionistOrStylist()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAdminOrReceptionistOrStylist])
def availability_view(request):
    """
    GET /api/v1/appointments/availability/
    ?employee_id=X&date=YYYY-MM-DD&service_id=Y
    Returns available 30-min-increment slots for the employee on that date.
    """
    employee_id = request.query_params.get('employee_id')
    date_str = request.query_params.get('date')
    service_id = request.query_params.get('service_id')

    if not all([employee_id, date_str]):
        return Response({'error': 'employee_id and date are required'}, status=400)

    try:
        from apps.employees.models import Employee
        employee = Employee.objects.get(id=employee_id, is_active=True, is_deleted=False)
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except Exception:
        return Response({'error': 'Invalid employee_id or date'}, status=400)

    duration = 60
    if service_id:
        try:
            from apps.services.models import Service
            service = Service.objects.get(id=service_id)
            duration = service.duration_minutes
        except Exception:
            pass

    work_start = datetime.combine(target_date, datetime.strptime('08:00', '%H:%M').time())
    work_end = datetime.combine(target_date, datetime.strptime('20:00', '%H:%M').time())

    booked = Appointment.objects.filter(
        employee=employee,
        date=target_date,
        is_deleted=False,
        status__in=['pending', 'confirmed', 'in_progress'],
    ).values_list('start_time', 'end_time')

    slots = []
    slot_start = work_start
    while slot_start + timedelta(minutes=duration) <= work_end:
        slot_end = slot_start + timedelta(minutes=duration)
        conflict = any(
            slot_start.time() < end and slot_end.time() > start
            for start, end in booked
        )
        if not conflict:
            slots.append({
                'start': slot_start.strftime('%H:%M'),
                'end': slot_end.strftime('%H:%M'),
            })
        slot_start += timedelta(minutes=30)

    return Response({'date': date_str, 'employee_id': employee_id, 'slots': slots})
