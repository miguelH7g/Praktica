import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthGoogleService } from '../../services/auth-google';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, HttpClientModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  credentials = { email: '', password: '' };
  mostrarModal = false;
  reset = { email: '', newPassword: '', confirmPassword: '' };

  constructor(
    private http: HttpClient,
    private router: Router,
    private authGoogle: AuthGoogleService
  ) {}

  onLogin() {
    this.http.post(`${API_URL}/api/usuarios/login`, this.credentials)
      .subscribe({
        next: (response: any) => {
          localStorage.setItem('usuario', JSON.stringify({
            idUsuario: response.idUsuario,
            email: response.email,
            nombre: response.nombre,
            apellido: response.apellido,
            rol: response.rol,
            token: response.token
          }));

          
          if (response.rol === 'cliente') {
            this.router.navigate(['/index']);
          } else if (response.rol === 'administrador') {
            this.router.navigate(['/panel']);
          } else if (
            response.rol === 'ventas' ||
            response.rol === 'catalogador'
          ) {
            this.router.navigate(['/panel']);
          } else {
            alert('No tienes permisos para acceder a esta área.');
            localStorage.removeItem('usuario');
            this.credentials.password = '';
          }

        },
        error: (err) => {
          console.error('Error login:', err);
          alert('Credenciales incorrectas o error al iniciar sesión');
          this.credentials.password = '';
        }
      });
  }


  loginGoogle() {
    this.authGoogle.login();
  }

  handleGoogleLogin() {
    this.authGoogle.initConfiguration();
    const profile = this.authGoogle.getProfile();
    const idToken = this.authGoogle.getIdToken();

    if (!profile || !idToken) {
      console.log('#2 No hay token de Google');
      return;
    }

    this.http.post(`${API_URL}/api/usuarios/google`, { idToken })
      .subscribe({
        next: (res: any) => {
          localStorage.setItem('usuario', JSON.stringify({
            idUsuario: res.idUsuario,
            email: res.email,
            nombre: res.nombre,
            apellido: res.apellido,
            rol: res.rol,
            token: res.token
          }));
          this.router.navigate(['/index']);
        },
        error: (err) => {
          console.error('Error login Google:', err);
          alert('No se pudo iniciar sesión con Google');
        }
      });
  }


  abrirModal() { this.mostrarModal = true; }
  cerrarModal() { this.mostrarModal = false; }

  cambiarPassword() {
    if (this.reset.newPassword !== this.reset.confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    const payload = { email: this.reset.email, nuevaContrasena: this.reset.newPassword };

    this.http.put(`${API_URL}/api/usuarios/recuperar-contrasena`, payload)
      .subscribe({
        next: () => {
          alert('Contraseña cambiada correctamente.');
          this.cerrarModal();
        },
        error: (err) => {
          console.error('Error cambiar contraseña:', err);
          const mensaje = err.error?.error || 'Error al cambiar la contraseña';
          alert(mensaje);
        }
      });
  }

  ngOnInit() {
    setTimeout(() => {
      this.handleGoogleLogin();
    }, 500);
  }
}
