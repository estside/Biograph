from django.urls import path
from .views import predict_stability

urlpatterns = [
    path('predict-stability/', predict_stability, name='predict_stability'),
]
