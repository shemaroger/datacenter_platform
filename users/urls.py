from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('auth/register/',       views.RegisterView.as_view(),       name='register'),
    path('auth/login/',          views.LoggingTokenObtainPairView.as_view(), name='login'),
    path('auth/token/refresh/',  TokenRefreshView.as_view(),         name='token_refresh'),
    path('auth/logout/',         views.LogoutView.as_view(),         name='logout'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),

    # Users
    path('users/',               views.UserListView.as_view(),       name='user_list'),
    path('users/me/',            views.MeView.as_view(),             name='me'),
    path('users/<int:pk>/',      views.UserDetailView.as_view(),     name='user_detail'),
]