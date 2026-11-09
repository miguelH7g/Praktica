import { Component, OnInit, Renderer2, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ChangeDetectorRef } from '@angular/core';
import { API_URL } from '../../config/api.config';


@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css']
})
export class LandingComponent implements OnInit {
  usuario: any;
  menuAbierto = false;
  menuVisible = true;
  private lastScrollTop = 0;

  mensaje = {
    nombre: '',
    correo: '',
    mensaje: ''
  };

  mensajeEnviado = false;
  errorEnvio = false;

  private apiUrl = `${API_URL}/api/contacto`;

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.renderer.setStyle(document.body, 'overflow', 'auto');
      this.renderer.setStyle(document.documentElement, 'overflow', 'auto');
    }
  }

  enviarMensaje() {
    this.http.post(this.apiUrl, this.mensaje).subscribe({
      next: () => {
        this.mensajeEnviado = true;
        this.errorEnvio = false;
        this.mensaje = { nombre: '', correo: '', mensaje: '' };
      },
      error: (err) => {
        console.error('Error al enviar mensaje:', err);
        this.errorEnvio = true;
        this.mensajeEnviado = false;
      }
    });
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  scrollTo(sectionId: string, event: Event) {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.menuAbierto = false;
  }

  irARegister() {
    this.router.navigate(['/register']);
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    const body = document.body;
    body.addEventListener('scroll', () => {
      const currentScroll = body.scrollTop;
      if (Math.abs(currentScroll - this.lastScrollTop) < 20) return;
      if (currentScroll > this.lastScrollTop && currentScroll > 80) {
        this.menuVisible = false;
      } else {
        this.menuVisible = true;
      }
      this.lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    });
  }
}