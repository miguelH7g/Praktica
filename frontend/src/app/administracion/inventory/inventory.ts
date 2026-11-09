import { Component, OnInit, Renderer2, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class InventoryComponent {
  usuario: any;
  menuAbierto = false;
  userMenuAbierto = false;
  ultimoPing: number = 0;
  intervaloKeepAlive: any;
  inventario: any[] = [];
  modalAbierto = false;
  itemEditando: any = null;
  private apiProductos = `${API_URL}/api/productos`;
  private apiUrl_logout = `${API_URL}/api/usuarios`;

  menuItems = [
    { name: 'Panel', icon: 'bi bi-grid', route: '/panel' },
    { name: 'Empleados', icon: 'bi bi-pencil-square', route: '/empleados' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat-atencion' },
    //{ name: 'Pagos', icon: 'bi bi-currency-dollar', route: '/pagos' },
    { name: 'Inventario', icon: 'bi bi-list-check', route: '/inventario' },
    { name: 'Dashboard', icon: 'bi bi-bar-chart', route: '/dashboard' },
  ];

  formEditar = {
    nombre: "",
    descripcion: "",
    precio: "",
    estado: ""
  };

  optionsMenuAbierto = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario?.token) {
      console.error('No hay token en el almacenamiento local');
      return;
    }

    this.usuario = usuario;
    
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

  ngOnDestroy(): void {
    this.renderer.removeStyle(document.body, 'overflow');
    this.renderer.removeStyle(document.documentElement, 'overflow');
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  toggleUserMenu() {
    this.userMenuAbierto = !this.userMenuAbierto;
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

  cargarServicios() {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.get<any>(`${API_URL}/api/productos/inventario/servicios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      this.inventario = res.servicios || [];
    }, err => console.error(err));
  }

  cargarPacks() {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.get<any>(`${API_URL}/api/productos/inventario/packs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      this.inventario = res.packs || [];
    }, err => console.error(err));
  }

  buscarProductos(termino: string) {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.get<any>(`${this.apiProductos}/buscar?q=${termino}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      if (res.status === 'ok') {
        this.inventario = res.resultados;
      }
    }, err => console.error(err));
  }

  agregarServicio(servicio: any) {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.post<any>(`${this.apiProductos}/servicio`, servicio, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      if (res.status === 'ok') {
        alert("Servicio agregado");
        this.cargarServicios();
      }
    }, err => console.error(err));
  }

  agregarPack(pack: any) {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.post<any>(`${this.apiProductos}/pack`, pack, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      if (res.status === 'ok') {
        alert("Pack agregado");
        this.cargarPacks();
      }
    }, err => console.error(err));
  }

  eliminarProducto(id: number) {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.delete<any>(`${this.apiProductos}/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      if (res.status === 'ok') {
        alert("Producto eliminado");
        this.inventario = this.inventario.filter(x => x.id !== id);
      } else {
        alert(res.mensaje);
      }
    }, err => console.error(err));
  }

  eliminarMultiple(ids: number[]) {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.request<any>('delete', `${this.apiProductos}/eliminar-multiple`, {
      body: ids,
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      if (res.status === 'ok') {
        alert(res.eliminados + " productos eliminados");
        this.inventario = this.inventario.filter(x => !ids.includes(x.id));
      }
    }, err => console.error(err));
  }

  actualizarServicio(id: number, data: any) {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.put<any>(`${this.apiProductos}/servicio/${id}`, data, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      if (res.status === 'ok') {
        alert("Servicio actualizado");
        this.cargarServicios();
      }
    }, err => console.error(err));
  }

  actualizarPack(id: number, data: any) {
    const token = this.usuario?.token;
    if (!token) return;

    this.http.put<any>(`${this.apiProductos}/pack/${id}`, data, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe(res => {
      if (res.status === 'ok') {
        alert("Pack actualizado");
        this.cargarPacks();
      }
    }, err => console.error(err));
  }

  confirmarEdicion() {
    if (!this.itemEditando) return;

    const esServicio = this.itemEditando.precio_base !== undefined;
    const id = this.itemEditando.id || this.itemEditando.id_pack;

    const data: any = {};

    if (this.formEditar.nombre.trim() !== "") {
      data.nombre = this.formEditar.nombre.trim();
    }

    if (this.formEditar.descripcion.trim() !== "") {
      data.descripcion = this.formEditar.descripcion.trim();
    }

    if (this.formEditar.precio !== "") {
      data.precio = Number(this.formEditar.precio);
    }

    if (this.formEditar.estado !== "") {
      data.estado = this.formEditar.estado;
    }

    if (Object.keys(data).length === 0) {
      alert("No hay cambios por aplicar");
      return;
    }

    if (esServicio) {
      this.actualizarServicio(id, data);
    } else {
      this.actualizarPack(id, data);
    }

    this.cerrarModal();
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

  abrirModal(item: any) {
    this.itemEditando = item;
    this.modalAbierto = true;

    this.formEditar = {
      nombre: item.nombre ?? item.nombre_pack,
      descripcion: item.descripcion,
      precio: item.precio_base ?? item.precio_pack,
      estado: item.estado
    };
  }
  cerrarModal() {
    this.modalAbierto = false;
    this.itemEditando = null;
  }


  toggleOptionsMenu() {
    this.optionsMenuAbierto = !this.optionsMenuAbierto;
  }
}
