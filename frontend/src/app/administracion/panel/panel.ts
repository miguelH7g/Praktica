import { Component, OnInit, Renderer2, HostListener, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-panel',
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule, NgChartsModule],
  templateUrl: './panel.html',
  styleUrls: ['./panel.css']
})
export class PanelComponent implements OnInit, AfterViewInit {
  usuario: any;
  menuAbierto = false;
  userMenuAbierto = false;
  optionsMenuAbierto = false;
  metaDiaria = 2000;
  porcentajeDiario = 0;
  gananciaTotal = '0';
  gananciaDiaria = '0';
  private intervalId: any;
  mensajesNuevos = 0;
  clientesConectados = 0;
  empleadosConectados = 0;
  mostrarModalClave = false;
  modalEmpleadoAbierto = false;
  modalPagoAbierto = false;
  passwordValidacion = '';
  errorPassword = '';
  confirmarContrasenaEmpleado = '';
  paso = 1;
  passwordPanel = '';
  activeChartIndex = 0;
  ultimoPing: number = 0;
  intervaloKeepAlive: any;
  actual = '';
  nueva = '';
  confirmar = '';
  confirmarAccion = false;
  visible = false;

  @Output() cambioExitoso = new EventEmitter<void>();
  @ViewChild('ventasChart') ventasChart?: BaseChartDirective;
  @ViewChild('productosChart') productosChart?: BaseChartDirective;

  private apiUrlEmpleados = `${API_URL}/api/empleados`;
  private apiUrlUsuarios = `${API_URL}/api/usuarios`;
  private apiUrlChats = `${API_URL}/api/chats`;
  private apiUrl_logout = `${API_URL}/api/usuarios`;
  private apiUrl_pagos = `${API_URL}/api/pagos`;

  empleado = {
    nombre: '',
    apellido: '',
    email: '',
    contrasena: '',
    rol: {
      idRol: 0
    }
  };

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

  pago = {
    id_orden: 0,
    monto: 0,
    metodo_pago: 'efectivo',
    estado_pago: 'completado',
    comprobante_url: null
  };

  menuItems = [
    { name: 'Panel', icon: 'bi bi-grid', route: '/panel' },
    { name: 'Empleados', icon: 'bi bi-pencil-square', route: '/empleados' },
    { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat-atencion' },
    //{ name: 'Pagos', icon: 'bi bi-currency-dollar', route: '/pagos' },
    { name: 'Dashboard', icon: 'bi bi-bar-chart', route: '/dashboard' },
  ];

  public ventasChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ label: 'Ventas Mensuales (S/.)', data: [], backgroundColor: 'rgba(54,162,235,0.7)', hidden: true }]
  };

  public ventasChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: true }},
    scales: { y: { beginAtZero: true }}
  };

  public productosChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };

  public productosChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { display: true, position: 'right' }}
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private http: HttpClient
  ) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.updateChart(), 150);
  }

  ngOnInit(): void {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario?.token) return;

    this.usuario = usuario;

    if (usuario.rol !== 'administrador') {
      this.menuItems = this.menuItems.filter(
        item => item.route !== '/empleados'
      );
    }

    this.cargarGananciaTotal();
    this.cargarGananciaDiaria();
    this.cargarMensajesNoLeidos();
    this.cargarClientesConectados();
    this.cargarEmpleadosConectados();
    this.cargarVentasMensuales();
    this.cargarProductosMasVendidos();

    this.intervalId = setInterval(() => {
      this.cargarGananciaTotal();
      this.cargarGananciaDiaria();
      this.cargarMensajesNoLeidos();
      this.cargarClientesConectados();
      this.cargarEmpleadosConectados();
      this.cargarVentasMensuales();
      this.cargarProductosMasVendidos();
    }, 1500);

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

  prevChart() {
    this.activeChartIndex = (this.activeChartIndex - 1 + 2) % 2;
    this.updateChart();
  }

  nextChart() {
    this.activeChartIndex = (this.activeChartIndex + 1) % 2;
    this.updateChart();
  }

  updateChart() {
    setTimeout(() => {
      this.ventasChart?.chart?.resize();
      this.ventasChart?.chart?.update();
      this.productosChart?.chart?.resize();
      this.productosChart?.chart?.update();
    }, 10);
  }

  mostrarVentas() {
    this.activeChartIndex = 0;
    this.updateChart();
  }

  mostrarProductos() {
    this.activeChartIndex = 1;
    this.updateChart();
  }

  cargarGananciaTotal() {
    const token = this.usuario.token;
    this.http.get<{ gananciaTotal: number }>(`${this.apiUrl_pagos}/ganancia-total`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({ next: r => this.gananciaTotal = r.gananciaTotal.toString() });
  }

  cargarGananciaDiaria() {
    const token = this.usuario.token;
    this.http.get<{ gananciaDiaria: number }>(`${this.apiUrl_pagos}/ganancia-diaria`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: r => {
        this.gananciaDiaria = r.gananciaDiaria.toString();
        this.porcentajeDiario = Math.min((r.gananciaDiaria / this.metaDiaria) * 100, 100);
      }
    });
  }

  cargarMensajesNoLeidos() {
    const token = this.usuario.token;
    this.http.get<{ chatsNoLeidos: number }>(
      `${this.apiUrlChats}/usuario/${this.usuario.idUsuario}/no-leidos`,
      { headers: { Authorization: `Bearer ${token}` }}
    ).subscribe({ next: r => this.mensajesNuevos = r.chatsNoLeidos });
  }

  cargarClientesConectados() {
    const token = this.usuario.token;
    this.http.get<{ clientesConectados: number }>(
      `${this.apiUrlUsuarios}/clientes/conectados`,
      { headers: { Authorization: `Bearer ${token}` }}
    ).subscribe({ next: r => this.clientesConectados = r.clientesConectados });
  }

  cargarEmpleadosConectados() {
    const token = this.usuario.token;
    this.http.get<{ usuariosConectados: number }>(
      `${this.apiUrlEmpleados}/conectados`,
      { headers: { Authorization: `Bearer ${token}` }}
    ).subscribe({ next: r => this.empleadosConectados = r.usuariosConectados });
  }

  cargarVentasMensuales() {
    const token = this.usuario.token;

    this.http.get<{ mes: number, total: number }[]>(
      `${this.apiUrl_pagos}/ventas-mensuales`,
      { headers: { Authorization: `Bearer ${token}` }}
    ).subscribe({
      next: res => {
        const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Setiembre","Octubre","Noviembre","Diciembre"];
        const totales = Array(12).fill(0);
        res.forEach(v => totales[v.mes - 1] = v.total);

        this.ventasChartData.labels = nombresMeses;
        this.ventasChartData.datasets[0].data = totales;
        this.ventasChart?.chart?.update();
      }
    });
  }

  cargarProductosMasVendidos() {
    const token = this.usuario.token;

    this.http.get<{ nombre: string, cantidad: number }[]>(
      `${API_URL}/api/productos/mas-vendidos`,
      { headers: { Authorization: `Bearer ${token}` }}
    ).subscribe({
      next: res => {
        const datosOrdenados = res.sort((a, b) => b.cantidad - a.cantidad);
        const colores = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF'];

        this.productosChartData.labels = datosOrdenados.map(p => p.nombre);
        this.productosChartData.datasets[0].data = datosOrdenados.map(p => p.cantidad);
        this.productosChartData.datasets[0].backgroundColor = datosOrdenados.map((_, i) => colores[i % colores.length]);

        this.ventasChart?.chart?.update();
      }
    });
  }

  confirmarClavePanel() {
    const token = this.usuario?.token;

    this.http.post(
      `${API_URL}/api/usuarios/verificar-contrasena`,
      { password: this.passwordPanel },
      { headers: { Authorization: `Bearer ${token}` }}
    ).subscribe({
      next: (resp: any) => {
        if (resp.valido) {
          alert("Contraseña correcta. Acción autorizada.");
          this.mostrarModalClave = false;
          this.passwordPanel = '';
        } else {
          alert("Contraseña incorrecta");
        }
      },
      error: err => alert("Error validando contraseña")
    });
  }

  registrarEmpleado() {
    const token = this.usuario?.token;

    this.errorPassword = '';

    this.http.post(
      `${API_URL}/api/usuarios/verificar-contrasena`,
      { password: this.passwordValidacion },
      { headers: { Authorization: `Bearer ${token}` }}
    ).subscribe({
      next: (resp: any) => {
        if (!resp.valido) {
          this.errorPassword = "La contraseña ingresada es incorrecta";
          return;
        }

        const payload = {
          nombre: this.empleado.nombre,
          apellido: this.empleado.apellido,
          rol: this.empleado.rol,
          contrasena: this.empleado.contrasena,
          email: this.empleado.email.includes('@')
                ? this.empleado.email
                : this.empleado.email + '@praktica.com'
        };

        this.http.post(
          `${API_URL}/api/empleados/crear`,
          payload,
          { headers: { Authorization: `Bearer ${token}` }}
        ).subscribe({
          next: () => {
            alert("Empleado registrado correctamente");
            this.cerrarModal();
          },
          error: () => {
            alert("Error al registrar empleado");
          }
        });
      },
      error: () => {
        this.errorPassword = "Error al validar contraseña";
      }
    });
  }

  noArroba(event: KeyboardEvent) {
    if (event.key === '@') {
      event.preventDefault();
    }
  }

  toggleMenu() { this.menuAbierto = !this.menuAbierto; }
  toggleUserMenu() { this.userMenuAbierto = !this.userMenuAbierto; }
  toggleOptionsMenu() { this.optionsMenuAbierto = !this.optionsMenuAbierto; }

  navigateTo(route: string, event: Event) {
    event.preventDefault();
    this.router.navigate([route]);
    this.menuAbierto = false;
  }

  logout() {
    const token = this.usuario.token;

    this.http.post(
      `${this.apiUrl_logout}/logout`,
      { idUsuario: this.usuario.idUsuario },
      { headers: { Authorization: `Bearer ${token}` }}
    ).subscribe({
      next: () => {
        this.usuario = null;
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }

  abrirModalPago() {
    this.modalPagoAbierto = true;
  }

  cerrarModalPago() {
    this.modalPagoAbierto = false;
    this.pago = {
      id_orden: 0,
      monto: 0,
      metodo_pago: 'efectivo',
      estado_pago: 'completado',
      comprobante_url: null
    };
  }

  registrarPago() {
    const token = this.usuario?.token;
    if (!token) {
      alert("No hay sesión activa");
      return;
    }

    if (!this.pago.id_orden || this.pago.monto <= 0) {
      alert("Ingrese un ID de orden válido y un monto mayor a 0");
      return;
    }

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.post(`${this.apiUrl_pagos}/efectivo`, {
      id_orden: this.pago.id_orden,
      monto: this.pago.monto
    }, { headers })
    .subscribe({
      next: () => {
        alert("Pago en efectivo registrado correctamente");
        this.cerrarModalPago();
      },
      error: err => {
        console.error(err);
        alert("Error al registrar el pago en efectivo");
      }
    });
  }


  abrirModalEmpleado() {
    this.modalEmpleadoAbierto = true;
    this.paso = 1;

    this.empleado = { 
      nombre: '', 
      apellido: '', 
      email: '',
      contrasena: '',
      rol: { idRol: 0 }
    };

    this.confirmarContrasenaEmpleado = '';
    this.passwordValidacion = '';
    this.errorPassword = '';
  }

  cerrarModal() {
    this.modalEmpleadoAbierto = false;
    this.paso = 1;
    this.empleado.contrasena = '';
    this.confirmarContrasenaEmpleado = '';
    this.passwordValidacion = '';
  }

  continuarPaso2() {
    if (!this.empleado.nombre || 
      !this.empleado.apellido || 
      !this.empleado.email ||
      !this.empleado.rol.idRol ||
      !this.empleado.contrasena ||
      !this.confirmarContrasenaEmpleado) {
        alert("Complete todos los campos del empleado");
        return;
      }
    if (this.empleado.contrasena.length < 12) {
      alert("La contraseña debe tener como mínimo 12 caracteres");
      return;
    }
    if (this.empleado.contrasena !== this.confirmarContrasenaEmpleado) {
      alert("Las contraseñas del empleado no coinciden");
      return;
    }
    this.paso = 2;
  }

  abrirModalClave() {
    this.mostrarModalClave = true;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.logo')) this.userMenuAbierto = false;
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
