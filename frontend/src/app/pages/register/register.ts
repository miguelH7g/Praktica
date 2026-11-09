import { Component } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RouterModule } from '@angular/router';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, HttpClientModule, RouterLink, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  user = {
    nombre: '',
    apellido: '',
    email: '',
    empresa: '',
    contrasena: '',
    confirmPassword: ''
  };

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    if (this.user.contrasena !== this.user.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (!this.isValidEmail(this.user.email)) {
      alert('Por favor ingresa un correo electrónico válido');
      return;
    }

    if (this.user.contrasena.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    const body = {
      nombre: this.user.nombre,
      apellido: this.user.apellido,
      email: this.user.email,
      empresa: this.user.empresa,
      contrasena: this.user.contrasena
    };

    this.http.post(`${API_URL}/api/usuarios/registro`, body, { withCredentials: true })
    .subscribe({
      next: (usuario: any) => {
        alert('Usuario registrado correctamente');

        localStorage.setItem('usuario', JSON.stringify(usuario));

        this.router.navigate(['/index']);
      },
      error: (err) => {
        if (err.status === 409) {
          alert('El correo ya está registrado');
        } else {
          alert('Error al registrar usuario');
        }
        console.error('Error en registro:', err);
      }
    });
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  }
}
