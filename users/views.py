from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone

from .models import CustomUser
from .serializers import UserSerializer, RegisterSerializer, ChangePasswordSerializer
from audit.models import AuditLog


def _client_ip(request):
    return request.META.get('REMOTE_ADDR')


class LoggingTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')

        try:
            response = super().post(request, *args, **kwargs)
        except AuthenticationFailed:
            AuditLog.objects.create(
                user=None, username=username, action=AuditLog.Action.LOGIN_FAILED,
                app_label='users', model_name='customuser',
                object_repr=username, ip_address=_client_ip(request),
            )
            raise

        if response.status_code == 200:
            user = CustomUser.objects.filter(username=username).first()
            AuditLog.objects.create(
                user=user, username=username, action=AuditLog.Action.LOGIN,
                app_label='users', model_name='customuser',
                object_id=str(user.pk) if user else None,
                object_repr=username, ip_address=_client_ip(request),
            )
        else:
            AuditLog.objects.create(
                user=None, username=username, action=AuditLog.Action.LOGIN_FAILED,
                app_label='users', model_name='customuser',
                object_repr=username, ip_address=_client_ip(request),
            )
        return response


class RegisterView(generics.CreateAPIView):
    queryset           = CustomUser.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class UserListView(generics.ListAPIView):
    queryset           = CustomUser.objects.all().order_by('-date_joined')
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = CustomUser.objects.all()
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(last_activity=timezone.now())
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'detail': 'Password updated successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            AuditLog.objects.create(
                user=request.user, username=request.user.username, action=AuditLog.Action.LOGOUT,
                app_label='users', model_name='customuser',
                object_id=str(request.user.pk), object_repr=request.user.username,
                ip_address=_client_ip(request),
            )
            return Response({'detail': 'Logged out successfully.'})
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)