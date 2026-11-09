import { Component, OnInit, Renderer2, HostListener, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-solicitar',
  standalone: true,
  templateUrl: './solicitude.html',
  styleUrls: ['./solicitude.css'],
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
})
export class SolicitarComponent implements OnInit {
  usuario: any = null;
  menuAbierto = false;
  userMenuAbierto = false;
  private apiUrl_logout = `${API_URL}/api/usuarios`;

  menuItems = [
    { name: 'Catálogo', icon: 'bi bi-grid', route: '/index' },
    { name: 'Solicitar', icon: 'bi bi-pencil-square', route: '/solicitar' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat' },
    { name: 'Mis Solicitudes', icon: 'bi bi-list-check', route: '/mis-solicitudes' },
    { name: 'Soporte', icon: 'bi bi-headset', route: '/soporte' },
  ];

  productos: any[] = [];
  productosFiltrados: any[] = [];
  productoSeleccionado: any = null;

  ultimoPing: number = 0;
  intervaloKeepAlive: any;

  cantidad: number = 1;
  fechaEntrega: string = new Date().toISOString().split('T')[0];
  descripcion: string = '';

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
    this.usuario = this.authService.getUsuario() || JSON.parse(localStorage.getItem('usuario') || 'null');

    if (!this.usuario) {
      alert('No se encontró información del usuario. Vuelva a iniciar sesión.');
      this.router.navigate(['/login']);
      return;
    }

    this.renderer.setStyle(document.body, 'overflow', 'auto');
    this.renderer.setStyle(document.documentElement, 'overflow', 'auto');

    this.cargarProductos();

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

  cargarProductos() {
    this.http.get(`${API_URL}/api/productos`).subscribe({
      next: (data: any) => {
        this.productos = [
          ...data.servicios.map((s: any) => ({
            tipo: 'servicio',
            id: s.id_servicio,
            nombre: s.nombre,
            descripcion: s.descripcion,
            precio: s.precio_base,
          })),
          ...data.packs.map((p: any) => ({
            tipo: 'pack',
            id: p.id_pack,
            nombre: p.nombre_pack,
            descripcion: p.descripcion,
            precio: p.precio_pack,
          })),
        ];
        this.productosFiltrados = [...this.productos];
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        alert('No se pudieron cargar los productos del servidor. Intente más tarde.');
      },
    });
  }

  filtrarProductos(event: any) {
    const filtro = event.target.value.toLowerCase();
    this.productosFiltrados = this.productos.filter((p) =>
      p.nombre.toLowerCase().includes(filtro)
    );
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


  seleccionarProducto(prod: any) {
    this.productoSeleccionado = prod;
  }

  enviarSolicitud(form: any) {
    if (!form.valid) {
      alert('Complete todos los campos obligatorios.');
      return;
    }

    if (!this.productoSeleccionado) {
      alert('Seleccione un producto antes de enviar la solicitud.');
      return;
    }

    const idUsuario = this.usuario?.idUsuario || this.usuario?.id || this.usuario?.userId;

    if (!idUsuario) {
      alert('Error: El usuario no tiene un ID válido. Por favor, vuelva a iniciar sesión.');
      console.error('Usuario inválido:', this.usuario);
      return;
    }
    
    const solicitud = {
      nombreCliente: this.usuario?.nombre,
      dniCePasaporte: this.usuario?.dni,
      telefono: this.usuario?.telefono,
      tipoPedido: this.productoSeleccionado.tipo.toLowerCase(),
      idServicio: this.productoSeleccionado.tipo === 'servicio' ? this.productoSeleccionado.id : null,
      idPack: this.productoSeleccionado.tipo === 'pack' ? this.productoSeleccionado.id : null,
      cantidad: this.cantidad,
      fechaEntregaEstimada: this.fechaEntrega,
      descripcion: this.descripcion || this.productoSeleccionado.descripcion,
      usuarioId: this.usuario.idUsuario
    };


    const token = this.usuario.token;

    this.http.post(`${API_URL}/api/ordenes`, solicitud, {
      headers: { 'Authorization': `Bearer ${this.usuario.token}` }
    }).subscribe({
      next: (data) => {
        alert(`Solicitud enviada para: ${this.productoSeleccionado.nombre}`);
        this.productoSeleccionado = null;
        this.cantidad = 1;
        this.fechaEntrega = new Date().toISOString().split('T')[0];
        this.descripcion = '';
      },
      error: (err) => {
        console.error('Error al enviar la solicitud:', err);
        alert('No se pudo enviar la solicitud. Intente nuevamente.');
      },
    });
  }

  soloNumeros(event: KeyboardEvent) {
    const char = String.fromCharCode(event.keyCode);
    if (!/[0-9]/.test(char)) {
      event.preventDefault();
    }
  }


  toggleMenu() { this.menuAbierto = !this.menuAbierto; }
  toggleUserMenu() { this.userMenuAbierto = !this.userMenuAbierto; }

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
    if (!target.closest('.logo')) this.userMenuAbierto = false;
  }
}
