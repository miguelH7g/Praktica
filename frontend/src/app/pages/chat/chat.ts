import { Component, OnInit, OnDestroy, Renderer2, HostListener, EventEmitter, Output } from '@angular/core';
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
export class ChatComponent implements OnInit, OnDestroy {
  usuario: any;
  menuAbierto = false;
  userMenuAbierto = false;
  chatAbierto = false;
  idOrdenSeleccionada: number | null = null;
  chatSeleccionado: any = null;
  mensajes: any[] = [];
  nuevoMensaje = '';
  chats: any[] = [];
  ultimoPing: number = 0;
  intervaloKeepAlive: any;
  private apiUrl_logout = `${API_URL}/api/usuarios`;
  private apiUrl = `${API_URL}/api/chats`;
  private subMensajes: any;

  visible = false;
  actual = '';
  nueva = '';
  confirmar = '';
  confirmarAccion = false;

  @Output() cambioExitoso = new EventEmitter<void>();

  menuItems = [
    { name: 'Catálogo', icon: 'bi bi-grid', route: '/index' },
    { name: 'Solicitar', icon: 'bi bi-pencil-square', route: '/solicitar' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat' },
    { name: 'Mis Solicitudes', icon: 'bi bi-list-check', route: '/mis-solicitudes' },
    { name: 'Soporte', icon: 'bi bi-headset', route: '/soporte' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private http: HttpClient,
    private chatWS: ChatWebSocketService
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    this.renderer.setStyle(document.documentElement, 'overflow', 'hidden');
    this.cargarChats();
    this.chatWS.mensajeGlobal$.subscribe((mensaje: any) => {
      if (!mensaje) return;

      const index = this.chats.findIndex(c => c.idChat === mensaje.idChat);
      if (index !== -1) {
        this.chats[index].ultimoMensaje = mensaje.mensaje;
        this.chats[index].fechaUltimoMensaje = mensaje.fechaEnvio;

        const chat = this.chats.splice(index, 1)[0];
        this.chats.unshift(chat);
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
    if (this.subMensajes) this.subMensajes.unsubscribe();
    this.chatWS.disconnect();
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
    if (!target.closest('.logo')) this.userMenuAbierto = false;
  }

  cargarChats() {
    this.http.get<any[]>(`${this.apiUrl}/usuario/${this.usuario.idUsuario}`).subscribe({
      next: (res) => { this.chats = res.length ? res : []; },
      error: (err) => { console.error('Error cargando chats:', err); this.chats = []; }
    });
  }

  abrirChat(chat: any) {
    this.chatSeleccionado = chat;
    this.idOrdenSeleccionada = chat.idChat;
    this.chatAbierto = true;

    this.mensajes = [];
    this.chatWS.connect(chat.idChat);
    if (this.subMensajes) this.subMensajes.unsubscribe();
    this.subMensajes = this.chatWS.mensaje$.subscribe((mensajeNuevo) => {
      if (!mensajeNuevo) return;
      this.mensajes.push(mensajeNuevo);
      setTimeout(() => this.scrollAlFinal(), 0);
    });
    this.cargarMensajes(chat.idChat);
  }

  cerrarChat() {
    this.chatAbierto = false;
    this.chatSeleccionado = null;
    this.idOrdenSeleccionada = null;
    this.mensajes = [];

    this.chatWS.disconnect();
  }

  cargarMensajes(idChat: number) {
    const token = this.usuario.token;

    this.http.get<any[]>(`${this.apiUrl}/${idChat}/mensajes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }).subscribe({
      next: (res) => {
        if (res.length > 0) {
          this.mensajes = res;
        } else {
          const mensajeBienvenida = {
            idEmisor: 0,
            nombreEmisor: 'Sistema',
            mensaje: `¡Hola ${this.usuario?.nombre}! 👋 Gracias por contactarnos. Tu número de orden es #${this.chatSeleccionado.idOrden}.`,
            fechaEnvio: new Date(),
          };
          this.mensajes = [mensajeBienvenida];
          this.enviarMensajeAutomatico(mensajeBienvenida);
        }
        setTimeout(() => this.scrollAlFinal(), 100);
      },
      error: (err) => console.error('Error cargando mensajes:', err)
    });
  }

  enviarMensajeAutomatico(mensaje: any) {
    const token = this.usuario.token;
    this.http.post(`${this.apiUrl}/${this.chatSeleccionado.idChat}/enviar`, mensaje, {
      headers: { 'Authorization': `Bearer ${token}` },
    }).subscribe({
      next: () => {},
      error: (err) => console.error('Error enviando mensaje automático', err)
    });
  }

  enviarMensaje() {
    if (!this.nuevoMensaje.trim() || !this.chatSeleccionado) return;

    const mensajeObj = {
      idEmisor: this.usuario?.idUsuario,
      nombreEmisor: this.usuario?.nombre || 'Cliente',
      mensaje: this.nuevoMensaje,
    };

    this.chatWS.enviarMensaje(this.chatSeleccionado.idChat, mensajeObj);
    this.nuevoMensaje = '';
    this.scrollAlFinal();
  }


  actualizarChatConNuevoMensaje(mensaje: any) {
    this.chatSeleccionado.ultimoMensaje = mensaje.mensaje;
    this.chatSeleccionado.fechaUltimoMensaje = new Date();

    const index = this.chats.findIndex(c => c.idChat === this.chatSeleccionado.idChat);
    if (index !== -1) this.chats[index] = { ...this.chatSeleccionado };
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
