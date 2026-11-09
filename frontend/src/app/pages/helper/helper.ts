import { Component, OnInit, Renderer2, HostListener, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-helper',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './helper.html',
  styleUrls: ['./helper.css']
})
export class SoporteComponent implements OnInit {
  usuario: any;
  menuAbierto = false;
  userMenuAbierto = false;
  wasMoved = false;
  ultimoPing: number = 0;
  intervaloKeepAlive: any;
  private apiUrl_logout = `${API_URL}/api/usuarios`;

  menuItems = [
    { name: 'Catálogo', icon: 'bi bi-grid', route: '/index' },
    { name: 'Solicitar', icon: 'bi bi-pencil-square', route: '/solicitar' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat' },
    { name: 'Mis Solicitudes', icon: 'bi bi-list-check', route: '/mis-solicitudes' },
    { name: 'Soporte', icon: 'bi bi-headset', route: '/soporte' },
  ];

  isDragging = false;
  offsetX = 0;
  offsetY = 0;
  botonSoporte: HTMLElement | null = null;

  visible = false;
  actual = '';
  nueva = '';
  confirmar = '';
  confirmarAccion = false;

  @Output() cambioExitoso = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();

    if (!this.usuario?.token) {
      console.warn("No hay usuario/token, redirigiendo a login");
      this.router.navigate(['/login']);
      return;
    }

    this.renderer.setStyle(document.body, 'overflow', 'auto');
    this.renderer.setStyle(document.documentElement, 'overflow', 'auto');
    this.botonSoporte = document.getElementById('soporteBoton');

    this.intervaloKeepAlive = setInterval(() => {
      const ahora = Date.now();
      if (ahora - this.ultimoPing < 60000) {
        this.http.put(
          `${API_URL}/api/usuarios/keep-alive`,
          {},
          { headers: { 'Authorization': `Bearer ${this.usuario.token}` } }
        ).subscribe({
          next: () => console.log('Keep-alive enviado'),
          error: err => console.error('Error keep-alive', err)
        });
      }
    }, 30000);
  }
  @HostListener('document:click')
  @HostListener('document:keydown')
  @HostListener('document:mousemove')
  @HostListener('document:scroll')
  registrarActividad() {
    this.ultimoPing = Date.now();
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  toggleUserMenu() {
    this.userMenuAbierto = !this.userMenuAbierto;
  }

  abrircambio() {
    this.visible = true;
    this.actual = '';
    this.nueva = '';
    this.confirmar = '';
    this.confirmarAccion = false;
  }

  cerrar() {
    this.visible = false;
  }

  cambiar() {
    if (!this.actual || !this.nueva || !this.confirmar) {
      alert("Complete todos los campos");
      return;
    }
    if (this.nueva !== this.confirmar) {
      alert("La nueva contraseña y la confirmación no coinciden");
      return;
    }
    if (!this.confirmarAccion) {
      alert("Debe confirmar que desea cambiar la contraseña");
      return;
    }

    const token = this.usuario?.token;
    if (!token) { 
      alert("No hay sesión activa"); 
      return; 
    }

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.put(`${API_URL}/api/usuarios/cambiar-contrasena`, {
      nuevaContrasena: this.nueva
    }, { headers }).subscribe({
      next: () => {
        alert("Contraseña cambiada correctamente");
        this.cerrar();
        this.cambioExitoso.emit();
      },
      error: err => {
        console.error(err);
        alert("Error al cambiar la contraseña");
      }
    });
  }

  logout() {
    const token = this.usuario.token;
    if (!token) {
      console.warn('No hay token disponible para cerrar sesión');
      return;
    }
    this.http.post(`${this.apiUrl_logout}/logout`, { idUsuario: this.usuario.idUsuario }, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        console.log(res.mensaje);
        this.usuario = null;
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error cerrando sesión:', err);
      }
    });
  }

  navigateTo(route: string, event: Event) {
    event.preventDefault();
    this.router.navigate([route]);
    this.menuAbierto = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.logo')) {
      this.userMenuAbierto = false;
    }
  }

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    if (this.botonSoporte) {
      this.isDragging = true;
      this.wasMoved = false;
      this.offsetX = event.clientX - this.botonSoporte.getBoundingClientRect().left;
      this.offsetY = event.clientY - this.botonSoporte.getBoundingClientRect().top;
      this.renderer.setStyle(this.botonSoporte, 'transition', 'none');
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.botonSoporte) {
      const newX = event.clientX - this.offsetX;
      const newY = event.clientY - this.offsetY;
      this.renderer.setStyle(this.botonSoporte, 'left', `${newX}px`);
      this.renderer.setStyle(this.botonSoporte, 'top', `${newY}px`);
      this.wasMoved = true;
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.botonSoporte) {
        this.renderer.setStyle(this.botonSoporte, 'transition', 'all 0.3s ease');
      }
    }
  }

  handleButtonClick() {
    if (!this.wasMoved) {
      window.location.href = "https://forms.gle/r66SgdFzc2Hgo5dq7";
    }
  }
}
