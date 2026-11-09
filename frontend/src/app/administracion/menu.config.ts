export interface MenuItem {
  name: string;
  icon: string;
  route: string;
}

const PANEL: MenuItem = { name: 'Panel', icon: 'bi bi-grid', route: '/panel' };
const EMPLEADOS: MenuItem = { name: 'Empleados', icon: 'bi bi-pencil-square', route: '/empleados' };
const CHAT: MenuItem = { name: 'Chat', icon: 'bi bi-chat-dots', route: '/chat-atencion' };
//const PAGOS: MenuItem = { name: 'Pagos', icon: 'bi bi-currency-dollar', route: '/pagos' };
const INVENTARIO: MenuItem = { name: 'Inventario', icon: 'bi bi-list-check', route: '/inventario' };
const DASHBOARD: MenuItem = { name: 'Dashboard', icon: 'bi bi-bar-chart', route: '/dashboard' };

// Menú común de administración (panel, staff, chat, dashboard, payments)
export const ADMIN_MENU_ITEMS: MenuItem[] = [
  PANEL,
  EMPLEADOS,
  CHAT,
  //PAGOS,
  DASHBOARD,
];

// Menú de inventario: igual al común, con "Inventario" antes de "Dashboard"
export const INVENTORY_MENU_ITEMS: MenuItem[] = [
  PANEL,
  EMPLEADOS,
  CHAT,
  //PAGOS,
  INVENTARIO,
  DASHBOARD,
];
