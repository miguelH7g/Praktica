import { Component, OnInit, Renderer2, HostListener, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { API_URL } from '../../config/api.config';

interface Empleado {
  nombre: string;
  apellido: string;
  email: string;
  rol: {
    idRol: number;
    nombreRol: string;
    descripcion?: string;
  };
  estado: string;
}

@Component({
  selector: 'app-staff',
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule, ReactiveFormsModule],
  templateUrl: './staff.html',
  styleUrls: ['./staff.css']
})
export class StaffComponent implements OnInit {

  usuario: any;
  menuAbierto = false;
  userMenuAbierto = false;

  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  terminoBusqueda: string = '';

  paginaActual = 0;
  totalPaginas = 0;

  ultimoPing: number = 0;
  intervaloKeepAlive: any;

  formEmpleado: FormGroup;
  mostrarModal = false;
  passwordConfirmacion = '';
  empleadoPendiente: any = null;

  visible = false;
  actual = '';
  nueva = '';
  confirmar = '';
  confirmarAccion = false;

  private apiUrl_logout = `${API_URL}/api/usuarios`;

  @Output() cambioExitoso = new EventEmitter<void>();

  menuItems = [
    { name: 'Panel', icon: 'bi bi-grid', route: '/panel' },
    { name: 'Empleados', icon: 'bi bi-pencil-square', route: '/empleados' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat-atencion' },
    //{ name: 'Pagos', icon: 'bi bi-currency-dollar', route: '/pagos' },
    { name: 'Dashboard', icon: 'bi bi-bar-chart', route: '/dashboard' },
  ];

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

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.formEmpleado = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', Validators.required],
      rol: ['', Validators.required],
      contrasena: ['', [Validators.required, Validators.minLength(12)]],
      confirmarContrasena: ['', [Validators.required, Validators.minLength(12)]]
    }, {
      validators: (form: AbstractControl) =>
        form.get('contrasena')?.value === form.get('confirmarContrasena')?.value
          ? null : { contrasenasDistintas: true }
    });
  }

  ngOnInit(): void {
    this.usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    if (!this.usuario?.token) {
      console.error("Token no disponible");
      return;
    }

    this.cargarEmpleados();

    this.ultimoPing = Date.now();

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

  cargarEmpleados(page: number = 0) {
    const token = this.usuario.token;
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.get<any>(`${API_URL}/api/usuarios/empleados?page=${page}&size=9`, { headers })
      .subscribe({
        next: resp => {
          this.empleados = resp.content;
          this.empleadosFiltrados = resp.content;
          this.totalPaginas = resp.totalPages;
          this.paginaActual = resp.number;
        },
        error: err => console.error("Error cargando empleados", err)
      });
  }

  filtrarEmpleados() {
    const termino = this.terminoBusqueda.trim();

    if (termino === "") {
      this.cargarEmpleados(this.paginaActual);
      return;
    }

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.usuario.token}` });

    this.http.get<any>(
      `${API_URL}/api/empleados/buscar?filtro=${termino}&page=0&size=9`,
      { headers }
    ).subscribe(resp => {
      this.empleados = resp.content;
      this.empleadosFiltrados = resp.content;
      this.totalPaginas = resp.totalPages;
      this.paginaActual = resp.number;
    });
  }

  paginaAnterior() {
    if (this.paginaActual > 0) {
      this.cargarEmpleados(this.paginaActual - 1);
    }
  }

  paginaSiguiente() {
    if (this.paginaActual + 1 < this.totalPaginas) {
      this.cargarEmpleados(this.paginaActual + 1);
    }
  }

  agregarEmpleado() {
    if (this.formEmpleado.valid) {
      this.empleadoPendiente = {
        nombre: this.formEmpleado.value.nombre,
        apellido: this.formEmpleado.value.apellido,
        email: this.formEmpleado.value.email + '@praktica.com',
        rol: { idRol: Number(this.formEmpleado.value.rol) },
        contrasena: this.formEmpleado.value.contrasena
      };
      this.mostrarModal = true;
    }
  }


  confirmarOperacion() {
    const token = this.usuario?.token;
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.post(
      `${API_URL}/api/usuarios/verificar-contrasena`,
      { password: this.passwordConfirmacion },
      { headers }
    ).subscribe({
      next: (resp: any) => {
        if (resp.valido) this.crearEmpleadoFinal();
        else alert("Contraseña incorrecta");
      },
      error: err => alert("Error al verificar la contraseña")
    });
  }

  crearEmpleadoFinal() {
    const token = this.usuario?.token;
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.post(
      `${API_URL}/api/empleados/crear`,
      this.empleadoPendiente,
      { headers }
    ).subscribe({
      next: () => {
        alert("Empleado creado correctamente");
        this.formEmpleado.reset();
        this.cargarEmpleados();
        this.cerrarModal();
      },
      error: err => alert("Error al crear empleado o correo duplicado")
    });
  }

  cancelarOperacion() {
    this.cerrarModal();
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.passwordConfirmacion = '';
    this.empleadoPendiente = null;
    // Evitar que las contraseñas sigan en el formulario tras cancelar.
    this.formEmpleado.patchValue({ contrasena: '', confirmarContrasena: '' });
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.logo')) {
      this.userMenuAbierto = false;
    }
  }

  noArroba(event: KeyboardEvent) {
    if (event.key === '@') {
      event.preventDefault();
    }
  }

}

