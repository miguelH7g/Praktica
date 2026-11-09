import { Component, OnInit, Renderer2, HostListener, EventEmitter, Output } from '@angular/core';
import { Router} from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-index',
  standalone: true,
  templateUrl: './index.html',
  styleUrls: ['./index.css'],
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule, ReactiveFormsModule],
})
export class IndexComponent implements OnInit {
  usuario: any;
  menuAbierto = false;
  private apiUrl_logout = `${API_URL}/api/usuarios`;

  menuItems = [
    { name: 'Catálogo', icon: 'bi bi-grid', route: '/index' },
    { name: 'Solicitar', icon: 'bi bi-pencil-square', route: '/solicitar' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat' },
    { name: 'Mis Solicitudes', icon: 'bi bi-list-check', route: '/mis-solicitudes' },
    { name: 'Soporte', icon: 'bi bi-headset', route: '/soporte' },
  ];

  radius = -120;

  catalogoItems = [
    { name: '', type: 'image', src: '/images/pan.png' },
    { name: '', type: 'image', src: '/images/papa.png' },
    { name: '', type: 'image', src: '/images/perrito.png' },
    { name: '', type: 'video', src: '/videos/mama.mp4' },
  ];

  modalOpen = false;
  selectedItem: any = null;

  ultimoPing: number = 0;
  intervaloKeepAlive: any;

  carouselIndex = 0;
  itemsPerView = 3;

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
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    this.renderer.setStyle(document.body, 'overflow', 'auto');
    this.renderer.setStyle(document.documentElement, 'overflow', 'auto');
    this.updateItemsPerView();
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

  @HostListener('window:resize')
  onResize() {
    this.updateItemsPerView();
  }

  updateItemsPerView() {
    const width = window.innerWidth;
    if (width < 600) this.itemsPerView = 1;
    else if (width < 1024) this.itemsPerView = 2;
    else this.itemsPerView = 3;
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
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

  openModal(item: any) {
    this.selectedItem = item;
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.selectedItem = null;
  }

  get visibleItems() {
    const visible = [];
    for (let i = 0; i < this.itemsPerView; i++) {
      const index = (this.carouselIndex + i) % this.catalogoItems.length;
      visible.push(this.catalogoItems[index]);
    }
    return visible;
  }

  prevSlide() {
    this.carouselIndex =
      (this.carouselIndex - 1 + this.catalogoItems.length) %
      this.catalogoItems.length;
  }

  nextSlide() {
    this.carouselIndex =
      (this.carouselIndex + 1) % this.catalogoItems.length;
  }

  userMenuAbierto = false;

  toggleUserMenu() {
    this.userMenuAbierto = !this.userMenuAbierto;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.logo')) {
      this.userMenuAbierto = false;
    }
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

}
