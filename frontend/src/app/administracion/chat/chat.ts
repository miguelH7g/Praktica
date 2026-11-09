import { Component, OnInit, Renderer2, HostListener, OnDestroy, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ChatWebSocketService } from '../../services/chat-websocket';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  standalone: true,
})
export class ChatAtencionComponent implements OnInit, OnDestroy {
  usuario: any;
  menuAbierto = false;
  userMenuAbierto = false;
  chatAbierto = false;
  idOrdenSeleccionada: number | null = null;
  chatSeleccionado: any = null;
  mensajes: any[] = [];
  nuevoMensaje = '';
  chats: any[] = [];
  optionsMenuAbierto = false;
  chatCancelado = false;
  chatActivo = false;
  menuGestionVisible = false;
  ordenSeleccionada: any = null;
  mostrarPanelOrden = false;
  ultimoPing: number = 0;
  intervaloKeepAlive: any;
  private subMensajes: any;
  private apiUrl = `${API_URL}/api/chats`;
  private apiUrl_logout = `${API_URL}/api/usuarios`;

  visible = false;
  actual = '';
  nueva = '';
  confirmar = '';
  confirmarAccion = false;

  menuItems = [
    { name: 'Panel', icon: 'bi bi-grid', route: '/panel' },
    { name: 'Empleados', icon: 'bi bi-pencil-square', route: '/empleados' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat-atencion' },
    //{ name: 'Pagos', icon: 'bi bi-currency-dollar', route: '/pagos' },
    { name: 'Dashboard', icon: 'bi bi-bar-chart', route: '/dashboard' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private http: HttpClient,
    private chatWS: ChatWebSocketService
  ) {}

  @Output() cambioExitoso = new EventEmitter<void>();

  ngOnInit(): void {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario?.token) {
      console.error('No hay token en el almacenamiento local');
      return;
    }

    this.usuario = usuario;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    this.renderer.setStyle(document.documentElement, 'overflow', 'hidden');
    this.cargarChats();
    this.chatWS.mensajeGlobal$.subscribe((mensaje) => {
      if (mensaje) {
        const index = this.chats.findIndex(c => c.idChat === mensaje.idChat);
        if (index !== -1) {
          this.chats[index].ultimoMensaje = mensaje.mensaje;
          this.chats[index].fechaUltimoMensaje = mensaje.fechaEnvio;
          const chatActual = this.chats.splice(index, 1)[0];
          this.chats.unshift(chatActual);
        }
      }
    });
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

    this.chatWS.disconnect();
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
    if (!target.closest('.logo') &&
        !target.closest('.user-menu') &&
        !target.closest('.options-btn') &&
        !target.closest('.options-menu')) {
      this.userMenuAbierto = false;
      this.optionsMenuAbierto = false;
    }
  }

  cargarChats() {
    const token = this.usuario.token;
    this.http.get<any[]>(`${this.apiUrl}/todos`, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
    }).subscribe({
      next: (res) => { this.chats = res.length ? res : []; },
      error: (err) => this.manejarErrorCargarChats(err),
    });
  }

  manejarErrorCargarChats(err: any) {
    console.error('Error cargando chats:', err);
    this.chats = [];
  }

  abrirChat(chat: any) {
    this.chatSeleccionado = chat;
    this.idOrdenSeleccionada = chat.idChat;
    this.chatAbierto = true;

    this.mensajes = [];

    this.chatWS.connect(chat.idChat);

    if (this.subMensajes) {
      this.subMensajes.unsubscribe();
    }

    this.subMensajes = this.chatWS.mensaje$.subscribe((mensajeNuevo) => {
      if (mensajeNuevo) {
        this.mensajes.push(mensajeNuevo);
        this.scrollAlFinal();

        if (mensajeNuevo.idEmisor !== this.usuario.idUsuario && !mensajeNuevo.leido) {
          this.marcarMensajesComoLeidos();
        }

        const index = this.chats.findIndex(c => c.idChat === mensajeNuevo.idChat);
        if (index !== -1) {
          this.chats[index].ultimoMensaje = mensajeNuevo.mensaje;
          this.chats[index].fechaUltimoMensaje = mensajeNuevo.fechaEnvio;
        }
      }
    });

    this.cargarMensajes(chat.idChat);

    this.inspeccionarOrden(true, false);
  }

  cerrarChat() {
    this.chatAbierto = false;
    this.chatSeleccionado = null;
    this.idOrdenSeleccionada = null;
    this.mensajes = [];
    this.menuGestionVisible = false;

    this.chatWS.disconnect();
  }


  cargarMensajes(idChat: number) {
    const token = this.usuario.token;
    this.http.get<any[]>(`${this.apiUrl}/${idChat}/mensajes`, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
    }).subscribe({
      next: (res) => this.procesarMensajes(res),
      error: (err) => {
        this.procesarMensajes([]);
        this.manejarErrorCargarMensajes(err);
      },
    });
  }

  manejarErrorCargarMensajes(err: any) {
    console.error('Error cargando mensajes:', err);
  }

  procesarMensajes(res: any[]) {
    if (res.length > 0) {
      this.mensajes = res;
      this.marcarMensajesComoLeidos();
      const mensajeSistema = this.mensajes.some(m => m.nombreEmisor === 'Sistema' && m.mensaje.includes('¡Hola'));
      if (!mensajeSistema) this.enviarMensajeSistema();
    } else {
      this.enviarMensajeSistema();
    }
    setTimeout(() => this.scrollAlFinal(), 100);
  }

  private enviarMensajeSistema() {
    const mensajeBienvenida = {
      idEmisor: 0,
      nombreEmisor: 'Sistema',
      mensaje: `¡Hola ${this.usuario?.nombre}! 👋 Gracias por contactarnos. Tu número de orden es #${this.chatSeleccionado.idOrden}.`,
      fechaEnvio: new Date(),
    };
    this.mensajes = [mensajeBienvenida, ...this.mensajes];
    this.enviarMensajeAutomatico(mensajeBienvenida);
  }

  enviarMensajeAutomatico(mensaje: any) {
    const token = this.usuario.token;
    this.http.post(`${this.apiUrl}/${this.chatSeleccionado.idChat}/enviar`, mensaje, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
    }).subscribe({
      next: () => {},
      error: (err) => console.error('Error al enviar mensaje automático', err),
    });
  }

  enviarMensaje() {
    if (!this.nuevoMensaje.trim() || !this.chatSeleccionado || this.chatCancelado) return;

    const mensajeObj = {
      idEmisor: this.usuario?.idUsuario,
      nombreEmisor: this.usuario?.nombre || 'Empleado',
      mensaje: this.nuevoMensaje,
    };

    const token = this.usuario.token;

    this.http.post(`${this.apiUrl}/${this.chatSeleccionado.idChat}/enviar`, mensajeObj, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
    }).subscribe({
      next: () => {
        this.scrollAlFinal();

        const index = this.chats.findIndex(c => c.idChat === this.chatSeleccionado.idChat);
        if (index !== -1) {
          this.chats[index].ultimoMensaje = mensajeObj.mensaje;
          this.chats[index].fechaUltimoMensaje = new Date();
        }
      },
      error: (err) => console.error('Error al enviar mensaje', err),
    });
    this.nuevoMensaje = '';
    this.scrollAlFinal();
  }




  toggleOptionsMenu() { this.optionsMenuAbierto = !this.optionsMenuAbierto; }

  activarChat() { this.cambiarEstadoChat('activo'); }
  cancelarChat() { this.cambiarEstadoChat('cancelado'); }

  private cambiarEstadoChat(estado: 'activo' | 'cancelado') {
    if (!this.chatSeleccionado) return;
    const token = this.usuario.token;
    this.http.put(`${this.apiUrl}/${this.chatSeleccionado.idChat}/cerrar`, { estado }, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
    }).subscribe({
      next: () => {
        this.chatSeleccionado.estado = estado;
        this.chatActivo = estado === 'activo';
        this.chatCancelado = estado === 'cancelado';
        this.menuGestionVisible = this.chatActivo;
      },
      error: (err) => console.error('Error al cambiar estado del chat', err)
    });
  }

  reportarChat() { console.log('Reportando chat:', this.chatSeleccionado); }

  inspeccionarOrden(marcarProduciendo: boolean = false, mostrarModal: boolean = true) {
    if (!this.chatSeleccionado) return;

    const idChat = this.chatSeleccionado.idChat;
    const token = this.usuario.token;

    this.http.get(`${API_URL}/api/chats/${idChat}/inspeccion`, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
    }).subscribe({
      next: (orden: any) => {
        orden.estado = orden.estado.toLowerCase();
        this.ordenSeleccionada = orden;

        if (mostrarModal) {
          this.mostrarPanelOrden = true;
        }

        if (marcarProduciendo && orden.estado === 'pendiente') {
          this.marcarOrdenComoProduciendo(orden.idOrden);
        }
      }
    });
  }



  marcarMensajesComoLeidos() {
    if (!this.chatSeleccionado) return;
    const token = this.usuario.token;

    this.mensajes.forEach(mensaje => {
      if (mensaje.idEmisor !== this.usuario.idUsuario && !mensaje.leido) {
        this.http.put(`${this.apiUrl}/mensajes/${mensaje.idMensaje}/leido`, {}, {
          headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
        }).subscribe({
          next: () => { mensaje.leido = true; },
          error: err => console.error('Error marcando mensaje como leído', err)
        });
      }
    });
  }

  marcarOrdenComoProduciendo(idOrden: number) {
    if (!this.ordenSeleccionada) return;
    const estadoActual = this.ordenSeleccionada.estado;

    if (estadoActual !== 'pendiente') return;

    const token = this.usuario.token;

    this.http.put(
      `${API_URL}/api/ordenes/${idOrden}/estado?estado=produciendo`,
      {},
      { headers: new HttpHeaders().set('Authorization', `Bearer ${token}`) }
    ).subscribe({
      next: () => {
        if (this.ordenSeleccionada.idOrden === idOrden) {
          this.ordenSeleccionada.estado = 'produciendo';
        }
      }
    });
  }

  cambiarEstadoOrden(estado: 'listo' | 'entregado') {
    if (!this.ordenSeleccionada) return;

    const token = this.usuario.token;

    if (estado === 'listo' && this.ordenSeleccionada.estado !== 'produciendo') {
      alert('Solo se puede marcar como LISTO si la orden está en producción.');
      return;
    }

    if (estado === 'entregado' && this.ordenSeleccionada.estado !== 'listo') {
      alert('Solo se puede marcar como ENTREGADO si la orden está en listo.');
      return;
    }

    this.http.put(
      `${API_URL}/api/ordenes/${this.ordenSeleccionada.idOrden}/estado?estado=${estado}`,
      {},
      { headers: new HttpHeaders().set('Authorization', `Bearer ${token}`) }
    ).subscribe({
      next: () => {
        this.ordenSeleccionada.estado = estado;
        console.log(`Orden ${this.ordenSeleccionada.idOrden} ahora está en ${estado}`);
      },
      error: (err) => console.error('Error al actualizar estado de la orden', err)
    });
  }

  private scrollAlFinal() {
    setTimeout(() => {
      const chatBox = document.getElementById('chatMessages');
      if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }, 0);
  }
}
