from django.urls import path
from .views import AppointmentListCreateView, AppointmentDetailView, availability_view

urlpatterns = [
    path('', AppointmentListCreateView.as_view(), name='appointment-list-create'),
    path('<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('availability/', availability_view, name='appointment-availability'),
]
