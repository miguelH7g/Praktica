import { Component, OnInit, OnDestroy, Renderer2, ViewChild, HostListener, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import { API_URL } from '../../config/api.config';
import { ADMIN_MENU_ITEMS } from '../menu.config';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule, NgChartsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) productChart?: BaseChartDirective;
  @ViewChild('dailyEarningsChart') dailyChart?: BaseChartDirective;

  usuario: any;
  menuAbierto = false;
  userMenuAbierto = false;
  ultimoPing: number = 0;
  intervaloKeepAlive: any;
  pagos: any[] = [];
  fechaInicio: string = '';
  fechaFin: string = '';
  visible = false;
  actual = '';
  nueva = '';
  confirmar = '';
  confirmarAccion = false;
  private apiUrl_logout = `${API_URL}/api/usuarios`;
  private apiUrl_pagos = `${API_URL}/api/pagos`;

  public productChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      label: 'Servicios y Packs más Solicitados',
      data: [],
      backgroundColor: 'rgba(87, 219, 0, 0.6)',
      minBarLength: 20,
      hidden: true
    }]
  };
  public productChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: { x: { ticks: { display: false }, grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  public dailyEarningsChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      { label: 'Mes Actual', data: [], fill: false, tension: 0.2, pointRadius: 3, hidden: true },
      { label: 'Mes Pasado', data: [], fill: false, tension: 0.2, pointRadius: 3, hidden: true }
    ]
  };
  public dailyEarningsChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: {
      x: { title: { display: true, text: 'Día del mes' } },
      y: { title: { display: true, text: 'S/. Ganancias' }, beginAtZero: true }
    }
  };

  menuItems = [...ADMIN_MENU_ITEMS];

  @Output() cambioExitoso = new EventEmitter<void>();

  constructor(private authService: AuthService, private router: Router, private renderer: Renderer2, private http: HttpClient) {}

  ngOnInit(): void {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario?.token) return;
    this.usuario = usuario;
    this.loadProducts();
    this.loadDailyEarnings();
    this.cargarPagos();
    this.intervaloKeepAlive = setInterval(() => {
      const ahora = Date.now();
      if (ahora - this.ultimoPing < 60000) {
        this.http.put(`${API_URL}/api/usuarios/keep-alive`, {}, { headers: { 'Authorization': `Bearer ${this.usuario.token}` } }).subscribe();
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
    if (this.intervaloKeepAlive) clearInterval(this.intervaloKeepAlive);
  }

  toggleMenu() { this.menuAbierto = !this.menuAbierto; }
  toggleUserMenu() { this.userMenuAbierto = !this.userMenuAbierto; }

  logout() {
    const token = this.usuario?.token;
    if (!token) return;
    this.http.post(`${this.apiUrl_logout}/logout`, { idUsuario: this.usuario.idUsuario }, { headers: { 'Authorization': `Bearer ${token}` } })
      .subscribe(() => {
        this.usuario = null;
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
        this.authService.logout();
        this.router.navigate(['/login']);
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

  cargarPagos() {
    const token = this.usuario?.token;
    if (!token) return;

    let params = new HttpParams();
    if (this.fechaInicio) params = params.set('fechaInicio', this.fechaInicio);
    if (this.fechaFin) params = params.set('fechaFin', this.fechaFin);

    const headers = { 'Authorization': `Bearer ${token}` };

    this.http.get<any[]>(`${this.apiUrl_pagos}/ordenes-pagadas-detalle`, { headers, params })
      .subscribe({
        next: res => this.pagos = res,
        error: err => console.error('ERROR cargando pagos:', err)
      });
  }

  filtrarPagos() {
    this.cargarPagos();
  }

  loadProducts() {
    this.http.get<any>(`${API_URL}/api/productos/mas-pedidos`).subscribe(data => {
      const productos = data.productos || [];
      this.productChartData.labels = productos.map((p: any) => p.nombre);
      this.productChartData.datasets[0].data = productos.map((p: any) => p.cantidad);
      setTimeout(() => this.productChart?.update(), 0);
    }, err => console.error(err));
  }

  private loadDailyEarnings() {
    const token = this.usuario?.token;
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    const url = `${this.apiUrl_pagos}/ganancias-ultimos-meses`;

    this.http.get<{ mesAnterior: any[], mesActual: any[] }>(url, { headers }).subscribe(data => {
      const mapByDay = (arr: { dia: string, ganancia: number }[]) => {
        const m = new Map<number, number>();
        arr.forEach(x => {
          const dayNum = parseInt(x.dia.split('-').pop() || '0', 10);
          m.set(dayNum, (m.get(dayNum) || 0) + (x.ganancia || 0));
        });
        return m;
      };
      const currMap = mapByDay(data.mesActual);
      const prevMap = mapByDay(data.mesAnterior);
      const maxDay = Math.max(...Array.from(new Set([...currMap.keys(), ...prevMap.keys()])), 30);
      const labels = Array.from({ length: maxDay }, (_, i) => (i + 1).toString());
      this.dailyEarningsChartData.labels = labels;
      this.dailyEarningsChartData.datasets[0].data = labels.map(lbl => currMap.get(parseInt(lbl, 10)) ?? 0);
      this.dailyEarningsChartData.datasets[1].data = labels.map(lbl => prevMap.get(parseInt(lbl, 10)) ?? 0);
      setTimeout(() => this.dailyChart?.update(), 0);
    }, err => console.error(err));
  }
}
