import { Component, OnInit, OnDestroy, Renderer2, HostListener, Input, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-payments',
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './payments.html',
  styleUrls: ['./payments.css'],
  standalone: true,
})
export class PaymentsComponent implements OnInit, OnDestroy {
  usuario: any;
  menuAbierto = false;
  userMenuAbierto = false;
  descripcion: string = '';
  monto: number | null = null;
  moneda: string = 'PEN';
  linkPago: string | null = null;
  success: boolean = false;
  error: string | null = null;
  numeroOrden: number | null = null;
  ultimoPing: number = 0;
  intervaloKeepAlive: any;
  visible = false;
  actual = '';
  nueva = '';
  confirmar = '';
  confirmarAccion = false;
  private apiUrl_logout = `${API_URL}/api/usuarios`;
  @Output() cambioExitoso = new EventEmitter<void>();
  @Input() chatSeleccionado: any = null;
  @Input() mensajes: any[] = [];

  menuItems = [
    { name: 'Panel', icon: 'bi bi-grid', route: '/panel' },
    { name: 'Empleados', icon: 'bi bi-pencil-square', route: '/empleados' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat-atencion' },
    //{ name: 'Pagos', icon: 'bi bi-currency-dollar', route: '/pagos' },
    { name: 'Dashboard', icon: 'bi bi-bar-chart', route: '/dashboard' },
  ];

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
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    this.renderer.setStyle(document.documentElement, 'overflow', 'hidden');
  
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

  toggleOptionsMenu() { this.optionsMenuAbierto = !this.optionsMenuAbierto; }

  generarLinkPago() {
    this.success = false;
    this.error = null;

    if (!this.descripcion || !this.monto || this.monto <= 0) {
      this.error = 'Ingresa una descripción y un monto válido';
      return;
    }

    if (this.monto > 999999.99) {
      this.error = 'El monto máximo permitido por Stripe es 999,999.99';
      return;
    }

    if (!this.numeroOrden) {
      this.error = 'Debes ingresar el número de orden';
      return;
    }

    const body = {
      descripcion: this.descripcion,
      monto: this.monto,
      moneda: this.moneda,
      idOrden: this.numeroOrden
    };

    const token = this.usuario.token;

    this.http.post<any>(
      `${API_URL}/api/pagos/generar-link`,
      body,
      {
        headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
      }
    )
    .subscribe({
      next: (res) => { 
        this.linkPago = res.urlPago; 
        this.success = true; 
      },
      error: (err) => { 
        console.error('Error generando link de pago', err); 
        this.error = 'No se pudo generar el link de pago'; 
      }
    });
  }

  copiarLink() {
    if (this.linkPago) {
      navigator.clipboard.writeText(this.linkPago).then(() => {
        alert('Link copiado al portapapeles');
      });
    }
  }

  enviarLinkChat() {
    if (!this.linkPago || !this.numeroOrden) {
      alert('Ingresa el link y el número de orden');
      return;
    }

    const mensajePago = {
      idEmisor: 0,
      nombreEmisor: 'Sistema',
      mensaje: `🔗 Link de pago para la orden #${this.numeroOrden}: ${this.linkPago}`,
      fechaEnvio: new Date(),
    };

    const token = this.usuario.token;

    this.http.post(
      `${API_URL}/api/chats/enviar-link/${this.numeroOrden}`,
      mensajePago,
      { headers: new HttpHeaders().set('Authorization', `Bearer ${token}`) }
    ).subscribe({
      next: () => {
        alert('Link enviado al chat');
        this.error = null;
        this.linkPago = null;
        this.numeroOrden = null;
        this.descripcion = '';
        this.monto = null;
        this.success = false;
      },
      error: (err) => {
        console.error('Error enviando link', err);
        this.error = 'No se pudo enviar el link al chat';
      }
    });
  }

  
  enviarMensajeAutomatico(mensaje: any) {
    if (!this.chatSeleccionado) return;

    const token = this.usuario.token;

    this.http.post(`${API_URL}/api/chats/${this.chatSeleccionado.idChat}/enviar`, mensaje, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
    }).subscribe({
      next: () => console.log('Mensaje de link enviado al chat'),
      error: (err) => console.error('Error al enviar mensaje de link', err)
    });
  }

  setChatSeleccionado(chat: any, mensajesActuales: any[]) {
    this.chatSeleccionado = chat;
    this.mensajes = mensajesActuales || [];
  }
}
