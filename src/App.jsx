import React, { useState, useEffect } from 'react';
import { 
  Package, LayoutDashboard, ArrowRightLeft, ClipboardList, 
  Settings, LogOut, Menu, X, ShieldAlert, CheckCircle2, 
  AlertCircle, Search, Plus, Filter, FileText, ScanLine, 
  History, Save, Camera, XCircle, Wifi, WifiOff, RefreshCw, 
  AlertTriangle, Check, CloudOff, Cloud, UserCheck, Download,
  Lock, Mail, UserPlus, KeyRound, CheckSquare, ShieldCheck
} from 'lucide-react';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'stockar-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const SERVER_DB = {
  roles: {
    ADMIN: 'ADMINISTRADOR',
    OPERADOR: 'OPERADOR',
    ARMADOR: 'ARMADOR',
    CONSULTA: 'CONSULTA'
  },
  users: [
    { id: 'u-admin-master', email: 'olmedopel1@gmail.com', pass: 'AdmPr1!', name: 'Administrador Principal (Olmedo)', role: 'ADMINISTRADOR' },
    { id: 'u1', email: 'laura@stockar.local', pass: 'laura123', name: 'Laura (Admin)', role: 'ADMINISTRADOR' },
    { id: 'u2', email: 'carlos@stockar.local', pass: 'carlos123', name: 'Carlos (Operador)', role: 'OPERADOR' },
    { id: 'u3', email: 'miguel@stockar.local', pass: 'miguel123', name: 'Miguel (Armador)', role: 'ARMADOR' },
    { id: 'u4', email: 'ana@stockar.local', pass: 'ana123', name: 'Ana (Consulta)', role: 'CONSULTA' }
  ],
  products: [
    { id: 'p1', sku: 'CAB-UTP-5E', barcode: '779123400001', name: 'Cable UTP Cat 5e (Bobina)', description: 'Cable de red interior.', stock: 12, reserved_stock: 2, minimum_stock: 5, category: 'Cables', brand: 'Generic', location: 'Rack A1', unit: 'bobina' },
    { id: 'p2', sku: 'ROU-WIF-AX', barcode: '779123400002', name: 'Router WiFi 6 AX1500', description: 'Router doble banda.', stock: 45, reserved_stock: 5, minimum_stock: 10, category: 'Redes', brand: 'TP-Link', location: 'Estante B2', unit: 'unidades' },
    { id: 'p3', sku: 'DIS-SSD-1T', barcode: '779123400003', name: 'Disco Sólido SSD 1TB', description: 'SSD NVMe.', stock: 8, reserved_stock: 0, minimum_stock: 10, category: 'Almacenamiento', brand: 'WD', location: 'Vitrina 1', unit: 'unidades' },
    { id: 'p4', sku: 'MON-24-FHD', barcode: '779123400004', name: 'Monitor 24" FHD IPS', description: 'Monitor frameless.', stock: 20, reserved_stock: 10, minimum_stock: 15, category: 'Periféricos', brand: 'Samsung', location: 'Depósito 2', unit: 'unidades' },
    { id: 'p5', sku: 'TEC-MEC-RGB', barcode: '779123400005', name: 'Teclado Mecánico RGB', description: 'Switches blue.', stock: 5, reserved_stock: 1, minimum_stock: 5, category: 'Periféricos', brand: 'Redragon', location: 'Estante C1', unit: 'unidades' },
  ],
  costs: {
    'p1': { unit_cost: 45000, currency: 'ARS' },
    'p2': { unit_cost: 22000, currency: 'ARS' },
    'p3': { unit_cost: 35000, currency: 'ARS' },
    'p4': { unit_cost: 85000, currency: 'ARS' },
    'p5': { unit_cost: 18000, currency: 'ARS' },
  },
  movements: [
    { id: 'm1', date: '2026-09-22 09:30', type: 'ENTRADA', product: 'Router WiFi 6 AX1500', qty: 50, user: 'Carlos (Operador)' },
    { id: 'm2', date: '2026-09-22 10:15', type: 'SALIDA', product: 'Disco Sólido SSD 1TB', qty: 2, user: 'Laura (Admin)' },
  ],
  orders: [
    { id: 'o1', order_number: 'PED-001', status: 'PENDIENTE', notes: 'Urgente para sucursal norte', created_by: 'Carlos (Operador)', items: [{ product_id: 'p2', name: 'Router WiFi 6 AX1500', requested: 3, picked: 0 }] }
  ],
  conflicts: []
};

const LOCAL_DB = {
  products: [],
  movements: [],
  orders: [],
  costs: {},
  sync_queue: [],
  conflicts: [],
  isSyncing: false
};

const apiService = {
  isOnline: true,
  currentUser: null,

  login: async (email, password) => {
    // Autenticación real validando correo y contraseña
    const foundUser = SERVER_DB.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === password);
    if (!foundUser) {
      throw new Error("Credenciales inválidas. Comprueba tu correo y contraseña.");
    }
    apiService.currentUser = { ...foundUser };
    await apiService.syncFromServer();
    return apiService.currentUser;
  },

  logout: async () => {
    apiService.currentUser = null;
    LOCAL_DB.costs = {};
    LOCAL_DB.conflicts = [];
  },

  initSession: async (user) => {
    apiService.currentUser = user;
    await apiService.syncFromServer();
  },

  setNetworkStatus: async (status) => {
    apiService.isOnline = status;
    window.dispatchEvent(new Event('network_changed'));
    if (status) {
      await apiService.processSyncQueue();
    }
  },

  getProducts: async () => LOCAL_DB.products,
  
  getProductCosts: async () => {
    if (!apiService.currentUser || apiService.currentUser.role !== SERVER_DB.roles.ADMIN) {
      throw new Error("403: Row Level Security. Acceso denegado a datos económicos.");
    }
    return LOCAL_DB.costs;
  },
  
  getMovements: async () => LOCAL_DB.movements,
  getOrders: async () => LOCAL_DB.orders,
  
  getDashboardStats: async () => {
    const products = LOCAL_DB.products;
    let totalValue = null;
    
    if (apiService.currentUser && apiService.currentUser.role === SERVER_DB.roles.ADMIN) {
      totalValue = products.reduce((acc, p) => acc + ((LOCAL_DB.costs[p.id]?.unit_cost || 0) * p.stock), 0);
    }

    return {
      totalProducts: products.length,
      lowStockAlerts: products.filter(p => p.isLowStock).length,
      pendingOrders: LOCAL_DB.orders.filter(o => o.status === 'PENDIENTE').length,
      totalValue
    };
  },

  getSyncQueue: () => LOCAL_DB.sync_queue,
  getConflicts: () => LOCAL_DB.conflicts,

  registerMovement: async (data) => {
    if (!apiService.currentUser) throw new Error("Usuario no autenticado.");
    const userRole = apiService.currentUser.role;
    if (userRole === SERVER_DB.roles.CONSULTA) {
        throw new Error("No tienes permisos para registrar movimientos.");
    }
    
    const { productId, type, quantity, newCost } = data;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) throw new Error("Cantidad inválida");

    const localProductIndex = LOCAL_DB.products.findIndex(p => p.id === productId);
    if (localProductIndex === -1) throw new Error("Producto no encontrado localmente.");
    const localProduct = LOCAL_DB.products[localProductIndex];

    if (type === 'SALIDA') {
      if (qty > localProduct.available_stock) {
        throw new Error(`Stock insuficiente. Disponible local: ${localProduct.available_stock}`);
      }
      LOCAL_DB.products[localProductIndex].stock -= qty;
      LOCAL_DB.products[localProductIndex].available_stock -= qty;
    } else if (type === 'ENTRADA') {
      LOCAL_DB.products[localProductIndex].stock += qty;
      LOCAL_DB.products[localProductIndex].available_stock += qty;
      
      if (userRole === SERVER_DB.roles.ADMIN && newCost && !isNaN(parseFloat(newCost))) {
         if(!LOCAL_DB.costs[productId]) LOCAL_DB.costs[productId] = { currency: 'ARS' };
         LOCAL_DB.costs[productId].unit_cost = parseFloat(newCost);
      }
    }
    
    LOCAL_DB.products[localProductIndex].isLowStock = LOCAL_DB.products[localProductIndex].stock <= LOCAL_DB.products[localProductIndex].minimum_stock;

    const opTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const op = {
      id: generateUUID(),
      type: 'MOVEMENT',
      payload: { productId, type, qty, newCost },
      user: apiService.currentUser.name,
      device: 'PWA-Client',
      timestamp: opTimestamp,
      status: 'PENDING'
    };
    
    LOCAL_DB.sync_queue.unshift(op);
    
    LOCAL_DB.movements.unshift({
      id: `local-${op.id}`,
      date: opTimestamp,
      type,
      product: localProduct.name,
      qty,
      user: `${apiService.currentUser.name} ${!apiService.isOnline ? '(Offline)' : ''}`
    });

    window.dispatchEvent(new Event('sync_queue_updated'));

    if (apiService.isOnline) {
       apiService.processSyncQueue();
    }
    
    return op;
  },

  updateOrderPick: async (orderId, productId, pickedQty) => {
    const order = LOCAL_DB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("Pedido no encontrado");
    
    const item = order.items.find(i => i.product_id === productId);
    if (item) {
      item.picked = pickedQty;
      if (order.items.every(i => i.picked >= i.requested)) {
        order.status = 'PREPARADO';
      } else {
        order.status = 'EN_PREPARACION';
      }
    }

    const op = {
      id: generateUUID(),
      type: 'ORDER_PICK',
      payload: { orderId, productId, pickedQty },
      user: apiService.currentUser ? apiService.currentUser.name : 'Sistema',
      device: 'PWA-Client',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'PENDING'
    };

    LOCAL_DB.sync_queue.unshift(op);
    window.dispatchEvent(new Event('sync_queue_updated'));

    if (apiService.isOnline) {
      apiService.processSyncQueue();
    }
  },

  processSyncQueue: async () => {
    if (!apiService.isOnline || LOCAL_DB.isSyncing) return;
    LOCAL_DB.isSyncing = true;
    window.dispatchEvent(new Event('sync_queue_updated'));

    const pendingOps = LOCAL_DB.sync_queue.filter(op => op.status === 'PENDING' || op.status === 'ERROR');
    
    for (const op of pendingOps) {
      op.status = 'ENVIANDO';
      window.dispatchEvent(new Event('sync_queue_updated'));
      
      await new Promise(res => setTimeout(res, 300));
      
      try {
        if (op.type === 'MOVEMENT') {
          const { productId, type, qty, newCost } = op.payload;
          const serverProduct = SERVER_DB.products.find(p => p.id === productId);
          
          if (!serverProduct) throw new Error("Producto eliminado del servidor.");

          if (type === 'SALIDA') {
            const serverAvailable = serverProduct.stock - serverProduct.reserved_stock;
            if (qty > serverAvailable) {
              op.status = 'CONFLICT';
              op.error_msg = `Stock insuficiente en servidor (Disponible: ${serverAvailable})`;
              SERVER_DB.conflicts.unshift({
                 id: op.id,
                 date: op.timestamp,
                 product: serverProduct.name,
                 requested_qty: qty,
                 available: serverAvailable,
                 user: op.user,
                 device: op.device,
                 resolved: false
              });
              continue;
            }
            serverProduct.stock -= qty;
          } else if (type === 'ENTRADA') {
            serverProduct.stock += qty;
            if (newCost && apiService.currentUser?.role === SERVER_DB.roles.ADMIN) {
               if(!SERVER_DB.costs[productId]) SERVER_DB.costs[productId] = { currency: 'ARS' };
               SERVER_DB.costs[productId].unit_cost = parseFloat(newCost);
            }
          }

          SERVER_DB.movements.unshift({
            id: op.id,
            date: op.timestamp,
            type,
            product: serverProduct.name,
            qty,
            user: op.user
          });
          
          op.status = 'SINCRONIZADO';
        } else if (op.type === 'ORDER_PICK') {
          const { orderId, productId, pickedQty } = op.payload;
          const sOrder = SERVER_DB.orders.find(o => o.id === orderId);
          if (sOrder) {
            const sItem = sOrder.items.find(i => i.product_id === productId);
            if (sItem) sItem.picked = pickedQty;
          }
          op.status = 'SINCRONIZADO';
        }
      } catch (err) {
        op.status = 'ERROR';
        op.error_msg = err.message;
      }
    }

    LOCAL_DB.sync_queue = LOCAL_DB.sync_queue.filter(op => op.status !== 'SINCRONIZADO');
    await apiService.syncFromServer();
    
    LOCAL_DB.isSyncing = false;
    window.dispatchEvent(new Event('sync_queue_updated'));
  },

  syncFromServer: async () => {
    LOCAL_DB.products = SERVER_DB.products.map(p => ({
      ...p,
      available_stock: p.stock - p.reserved_stock,
      isLowStock: p.stock <= p.minimum_stock
    }));

    LOCAL_DB.movements = [...SERVER_DB.movements];
    LOCAL_DB.orders = [...SERVER_DB.orders];
    
    if (apiService.currentUser && apiService.currentUser.role === SERVER_DB.roles.ADMIN) {
      LOCAL_DB.costs = JSON.parse(JSON.stringify(SERVER_DB.costs));
      LOCAL_DB.conflicts = [...SERVER_DB.conflicts];
    } else {
      LOCAL_DB.costs = {};
      LOCAL_DB.conflicts = [];
    }
  },
  
  resolveConflict: async (conflictId) => {
      const idx = SERVER_DB.conflicts.findIndex(c => c.id === conflictId);
      if (idx !== -1) {
          SERVER_DB.conflicts[idx].resolved = true;
          await apiService.syncFromServer();
          window.dispatchEvent(new Event('sync_queue_updated'));
      }
  }
};

const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('olmedopel1@gmail.com');
  const [password, setPassword] = useState('AdmPr1!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await apiService.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center text-blue-500 mb-3">
          <Package size={52} strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-wide">StockAr</h2>
        <p className="mt-2 text-sm text-slate-400">
          Control de Stock e Inventario Profesional Offline-First
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-xl border border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-md text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="olmedopel1@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <KeyRound size={18} />}
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión Supabase Auth'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-3 text-center uppercase tracking-wider">Perfiles de prueba disponibles:</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => fillDemoCreds('olmedopel1@gmail.com', 'AdmPr1!')}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded text-left transition-colors"
              >
                <p className="font-bold text-xs flex items-center gap-1"><ShieldCheck size={12}/> Admin (Olmedo)</p>
                <p className="text-[10px] text-blue-700 font-mono">olmedopel1@gmail.com</p>
              </button>
              <button 
                type="button"
                onClick={() => fillDemoCreds('carlos@stockar.local', 'carlos123')}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded text-left transition-colors"
              >
                <p className="font-bold text-xs">Operador</p>
                <p className="text-[10px] text-slate-500 font-mono">carlos@stockar.local</p>
              </button>
              <button 
                type="button"
                onClick={() => fillDemoCreds('miguel@stockar.local', 'miguel123')}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded text-left transition-colors"
              >
                <p className="font-bold text-xs">Armador</p>
                <p className="text-[10px] text-slate-500 font-mono">miguel@stockar.local</p>
              </button>
              <button 
                type="button"
                onClick={() => fillDemoCreds('ana@stockar.local', 'ana123')}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded text-left transition-colors"
              >
                <p className="font-bold text-xs">Consulta</p>
                <p className="text-[10px] text-slate-500 font-mono">ana@stockar.local</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navigation = ({ user, currentView, setView, onLogout, onOpenApkModal }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMINISTRADOR', 'OPERADOR', 'CONSULTA'] },
    { id: 'products', label: 'Catálogo & Stock', icon: Package, roles: ['ADMINISTRADOR', 'OPERADOR', 'ARMADOR', 'CONSULTA'] },
    { id: 'movements', label: 'Movimientos', icon: ArrowRightLeft, roles: ['ADMINISTRADOR', 'OPERADOR'] },
    { id: 'orders', label: 'Armado de Pedidos', icon: ClipboardList, roles: ['ADMINISTRADOR', 'OPERADOR', 'ARMADOR'] },
    { id: 'reports', label: 'Reportes Económicos', icon: FileText, roles: ['ADMINISTRADOR'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['ADMINISTRADOR'] },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(user.role));

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center h-16 border-b border-slate-700 mb-4 px-4 bg-slate-900">
        <Package className="text-blue-400 mr-2" size={24} />
        <span className="text-white font-bold text-xl tracking-wide">StockAr</span>
      </div>
      
      <div className="px-4 pb-4">
        <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={() => { onOpenApkModal(); setIsMobileMenuOpen(false); }}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-emerald-300 bg-emerald-950/50 rounded-md hover:bg-emerald-900/50 transition-colors"
        >
          <Download className="mr-3 h-5 w-5 text-emerald-400" />
          Descargar APK Android
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-300 rounded-md hover:bg-slate-700 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-slate-400" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 shadow-xl z-10">
        <NavContent />
      </div>
      <div className="md:hidden flex items-center justify-between bg-slate-900 h-16 px-4 fixed top-0 w-full z-20 shadow-md">
        <div className="flex items-center">
          <Package className="text-blue-400 mr-2" size={24} />
          <span className="text-white font-bold text-lg">StockAr</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300 hover:text-white">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-10 bg-slate-900/80 backdrop-blur-sm pt-16">
          <div className="bg-slate-900 h-full w-64 shadow-xl">
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
};

const DashboardView = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [recentMovements, setRecentMovements] = useState([]);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    const load = () => {
      apiService.getDashboardStats().then(setStats);
      apiService.getMovements().then(m => setRecentMovements(m.slice(0, 5)));
      if(user && user.role === 'ADMINISTRADOR') {
          setConflicts(apiService.getConflicts().filter(c => !c.resolved));
      }
    };
    
    load();
    window.addEventListener('sync_queue_updated', load);
    return () => window.removeEventListener('sync_queue_updated', load);
  }, [user]);

  if (!stats) return <div className="p-8 text-center text-slate-500">Cargando métricas...</div>;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Operativo</h1>
        <p className="text-slate-500">Monitoreo de stock y sincronización multidispositivo (Offline-First).</p>
      </div>

      {conflicts.length > 0 && user && user.role === 'ADMINISTRADOR' && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-md shadow-sm">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-bold text-rose-800">Conflictos de Stock Detectados ({conflicts.length})</h3>
              <div className="mt-2 text-sm text-rose-700 space-y-2">
                {conflicts.map(c => (
                  <div key={c.id} className="bg-white/80 p-3 rounded border border-rose-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold">Producto: {c.product}</p>
                      <p className="text-xs">Solicitado: {c.requested_qty} | Disponible Servidor: {c.available} | Usuario: {c.user} ({c.device})</p>
                    </div>
                    <button onClick={() => apiService.resolveConflict(c.id)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded shadow-sm">Resolver / Aceptar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Productos</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalProducts}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Package size={24} /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Alertas Stock Bajo</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.lowStockAlerts}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><AlertCircle size={24} /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pedidos Pendientes</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.pendingOrders}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><ClipboardList size={24} /></div>
          </div>
        </div>

        {user && user.role === 'ADMINISTRADOR' ? (
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl shadow-sm p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100">Valor Total (RLS)</p>
                <p className="text-3xl font-bold mt-1">${stats.totalValue ? stats.totalValue.toLocaleString('es-AR') : '0'}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg"><FileText size={24} /></div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl shadow-inner border border-slate-200 border-dashed p-5 flex flex-col items-center justify-center text-center text-slate-400">
             <ShieldAlert size={24} className="mb-2 opacity-50" />
             <p className="text-xs font-medium">Información Económica Oculta (RLS)</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mt-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-medium text-slate-900">Movimientos Recientes</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {recentMovements.map((mov, i) => (
            <div key={mov.id || i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center">
                <div className={`w-2.5 h-2.5 rounded-full mr-3 ${mov.type === 'ENTRADA' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{mov.product}</p>
                  <p className="text-xs text-slate-500">{mov.date} • {mov.user}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  mov.type === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {mov.type === 'ENTRADA' ? '+' : '-'}{mov.qty}
                </span>
                {mov.id && typeof mov.id === 'string' && mov.id.startsWith('local') && <p className="text-[10px] text-amber-500 mt-1 font-semibold">Pendiente sincro</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BarcodeScannerModal = ({ onClose, onScan }) => {
  const [manualCode, setManualCode] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Camera size={18} /> Escáner de Código de Barras</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 flex flex-col items-center">
          <div className="w-48 h-32 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center mb-6 relative overflow-hidden bg-slate-50">
            <div className="absolute top-0 w-full h-1 bg-blue-500 opacity-50 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
            <span className="text-slate-400 text-sm">Cámara Activa...</span>
          </div>
          <p className="text-sm text-slate-500 mb-4 text-center">Simula el escaneo introduciendo el código (Ej: 779123400001)</p>
          <div className="w-full flex gap-2">
            <input 
              type="text" 
              className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="7791234..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onScan(manualCode)}
            />
            <button 
              onClick={() => onScan(manualCode)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Escanear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApkDownloadModal = ({ onClose }) => {
  const [downloading, setDownloading] = useState(false);

  const simulateDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert("¡Simulación completada! En una PWA en producción, este enlace generaría el binario APK firmado mediante Bubblewrap o servicio web APK builder.");
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
          <h3 className="font-bold text-lg flex items-center gap-2"><Download size={20} /> Descargar Instalador APK para Android</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 text-slate-700 text-sm">
          <p>
            StockAr está construida como una <b>PWA (Progressive Web App) Offline-First</b> de alto rendimiento. Para instalarla nativamente como APK en Android, tienes dos métodos:
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
            <p className="font-bold text-blue-900">Método 1: Instalación directa desde el navegador (Recomendado)</p>
            <p className="text-xs text-blue-800">Abre esta aplicación en Google Chrome desde tu dispositivo Android, pulsa el menú de los 3 puntos y selecciona <b>"Instalar aplicación"</b> o <b>"Añadir a la pantalla principal"</b>. Funcionará de forma 100% nativa con acceso offline y caché local.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-2">
            <p className="font-bold text-slate-900">Método 2: Compilación de APK Firmado (TWA)</p>
            <p className="text-xs text-slate-600">Puedes empaquetar el manifiesto mediante Bubblewrap CLI ejecutando:</p>
            <code className="block bg-slate-900 text-emerald-400 p-2 rounded text-xs font-mono">bubblewrap init --manifest=https://tu-dominio.com/manifest.json</code>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md font-medium">Cerrar</button>
            <button 
              onClick={simulateDownload} 
              disabled={downloading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold flex items-center gap-2"
            >
              {downloading ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
              {downloading ? 'Generando APK...' : 'Descargar Paquete APK Demo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductsView = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [costs, setCosts] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadData = async () => {
    const prods = await apiService.getProducts();
    setProducts(prods);
    try {
      const c = await apiService.getProductCosts();
      setCosts(c);
    } catch (err) {
      setCosts(null);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('sync_queue_updated', loadData);
    return () => window.removeEventListener('sync_queue_updated', loadData);
  }, []);

  const handleScan = (code) => {
    setSearchTerm(code);
    setIsScannerOpen(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="space-y-4">
      {isScannerOpen && <BarcodeScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catálogo y Stock Offline</h1>
          <p className="text-sm text-slate-500">Control de stock con integridad garantizada.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 flex">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por SKU, Nombre o Código de Barras..."
            className="block w-full pl-10 pr-12 py-2 border border-slate-300 rounded-md sm:text-sm focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => setIsScannerOpen(true)} className="absolute inset-y-0 right-0 pr-3 pl-2 flex items-center text-slate-400 hover:text-blue-600"><ScanLine size={20} /></button>
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
                <p className="text-sm text-slate-500 font-mono mt-1">SKU: {selectedProduct.sku} | EAN: {selectedProduct.barcode}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-rose-500"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-sm">
                    <p><span className="font-medium">Categoría:</span> {selectedProduct.category}</p>
                    <p><span className="font-medium">Ubicación:</span> {selectedProduct.location}</p>
                    <p><span className="font-medium">Unidad:</span> {selectedProduct.unit}</p>
                  </div>
                  {user && user.role === 'ADMINISTRADOR' && costs && (
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 space-y-2 text-sm">
                      <p><span className="font-medium text-emerald-800">Costo Unitario (Admin):</span> <span className="font-bold">${costs[selectedProduct.id] ? costs[selectedProduct.id].unit_cost.toLocaleString('es-AR') : '0'}</span></p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                     <div className="bg-white border p-3 rounded-lg text-center">
                       <p className="text-xs text-slate-500 font-medium">Stock Físico</p>
                       <p className="text-2xl font-bold">{selectedProduct.stock}</p>
                     </div>
                     <div className="bg-orange-50 border-orange-100 p-3 rounded-lg text-center">
                       <p className="text-xs text-orange-600 font-medium">Reservado</p>
                       <p className="text-2xl font-bold text-orange-700">{selectedProduct.reserved_stock}</p>
                     </div>
                     <div className={`col-span-2 p-4 rounded-lg text-center border ${selectedProduct.isLowStock ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}>
                       <p className={`text-sm font-medium ${selectedProduct.isLowStock ? 'text-rose-600' : 'text-blue-600'}`}>Stock Disponible</p>
                       <p className={`text-4xl font-black ${selectedProduct.isLowStock ? 'text-rose-700' : 'text-blue-700'}`}>{selectedProduct.available_stock}</p>
                       {selectedProduct.isLowStock && <p className="text-xs font-bold text-rose-600 mt-1 flex items-center justify-center gap-1"><AlertCircle size={14}/> Stock Bajo (Mín: {selectedProduct.minimum_stock})</p>}
                     </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end">
               <button onClick={() => setSelectedProduct(null)} className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">SKU / Producto</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Físico</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-blue-600 uppercase bg-blue-50/50">Disponible</th>
                {user && user.role === 'ADMINISTRADOR' && <th className="px-6 py-3 text-right text-xs font-medium text-emerald-600 uppercase bg-emerald-50/50">Costo (Admin)</th>}
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">{p.sku} {p.isLowStock && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">STOCK BAJO</span>}</div>
                    <div className="text-xs text-slate-500">{p.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-slate-500">{p.stock}</td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${p.isLowStock ? 'text-rose-600 bg-rose-50/30' : 'text-slate-900 bg-blue-50/20'}`}>{p.available_stock}</td>
                  {user && user.role === 'ADMINISTRADOR' && (
                    <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600 bg-emerald-50/20">
                      ${costs && costs[p.id] ? costs[p.id].unit_cost.toLocaleString('es-AR') : '0'}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right text-sm">
                    <button onClick={() => setSelectedProduct(p)} className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MovementsView = ({ user }) => {
  const [activeTab, setActiveTab] = useState('ENTRADA');
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [newCost, setNewCost] = useState('');
  const [statusMsg, setStatusMsg] = useState({});

  const load = async () => {
    setProducts(await apiService.getProducts());
    setHistory(await apiService.getMovements());
  };

  useEffect(() => {
    load();
    window.addEventListener('sync_queue_updated', load);
    return () => window.removeEventListener('sync_queue_updated', load);
  }, []);

  const handleScan = (code) => {
    setSearchTerm(code);
    setIsScannerOpen(false);
    const found = products.find(p => p.barcode === code || p.sku === code);
    if (found) setSelectedProduct(found);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length > 2) {
      const found = products.find(p => p.sku.toLowerCase() === val.toLowerCase() || p.barcode === val);
      if (found) setSelectedProduct(found);
      else setSelectedProduct(null);
    } else setSelectedProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({});
    if (!selectedProduct) return setStatusMsg({ type: 'error', text: 'Selecciona un producto.' });
    if (!quantity || quantity <= 0) return setStatusMsg({ type: 'error', text: 'Cantidad inválida.' });

    try {
      await apiService.registerMovement({
        productId: selectedProduct.id,
        type: activeTab,
        quantity,
        newCost: activeTab === 'ENTRADA' ? newCost : undefined
      });
      
      setStatusMsg({ type: 'success', text: `Operación registrada correctamente ${apiService.isOnline ? 'y sincronizada' : 'offline (Guardada en cola local)'}.` });
      setQuantity(''); setNewCost(''); setSearchTerm(''); setSelectedProduct(null);
      load();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {isScannerOpen && <BarcodeScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
      
      <div className="flex border-b border-slate-200">
        <button onClick={() => {setActiveTab('ENTRADA'); setStatusMsg({});}} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'ENTRADA' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500'}`}>Entrada</button>
        <button onClick={() => {setActiveTab('SALIDA'); setStatusMsg({});}} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'SALIDA' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500'}`}>Salida</button>
        <button onClick={() => {setActiveTab('HISTORIAL'); setStatusMsg({});}} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'HISTORIAL' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}>Historial</button>
      </div>

      {statusMsg.text && (
         <div className={`p-4 rounded-md flex items-center gap-3 ${statusMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
           <span className="font-medium text-sm">{statusMsg.text}</span>
         </div>
      )}

      {(activeTab === 'ENTRADA' || activeTab === 'SALIDA') && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="text"
                  className="block w-full pl-10 pr-12 py-3 border rounded-md focus:ring-blue-500"
                  placeholder="Buscar SKU o escanear código de barras..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
                <button type="button" onClick={() => setIsScannerOpen(true)} className="absolute right-3 top-3 text-slate-400 hover:text-blue-600"><ScanLine size={24} /></button>
            </div>
            
            {selectedProduct && (
              <div className="bg-slate-50 border rounded-lg p-4">
                <p className="font-bold text-slate-900">{selectedProduct.name} ({selectedProduct.sku})</p>
                <p className="text-sm mt-1 text-slate-600">Stock Disponible: <span className="font-bold text-blue-600">{selectedProduct.available_stock}</span> {selectedProduct.unit}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad a {activeTab.toLowerCase()}</label>
                <input type="number" step="0.01" required className="block w-full p-3 border rounded-md text-lg font-bold" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              
              {activeTab === 'ENTRADA' && user && user.role === 'ADMINISTRADOR' && (
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1">Costo Unitario (Admin)</label>
                  <input type="number" step="0.01" className="block w-full p-3 border border-emerald-200 bg-emerald-50 rounded-md" placeholder="Nuevo costo" value={newCost} onChange={e => setNewCost(e.target.value)} />
                </div>
              )}
            </div>

            <button type="submit" className={`w-full py-3 rounded-md font-bold text-white shadow-sm ${activeTab === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
              Confirmar {activeTab} (Soporta Offline)
            </button>
          </form>
        </div>
      )}

      {activeTab === 'HISTORIAL' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <table className="min-w-full divide-y divide-slate-200">
               <thead className="bg-slate-50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Fecha</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Tipo</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Producto</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Cantidad</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Usuario</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {history.map((h, i) => (
                   <tr key={h.id || i}>
                     <td className="px-6 py-4 text-sm text-slate-500">{h.date}</td>
                     <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${h.type === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {h.type}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-sm font-medium text-slate-900">{h.product}</td>
                     <td className={`px-6 py-4 text-sm font-bold text-right ${h.type === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {h.type === 'ENTRADA' ? '+' : '-'}{h.qty}
                     </td>
                     <td className="px-6 py-4 text-sm text-right text-slate-500">{h.user}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
        </div>
      )}
    </div>
  );
};

const OrdersView = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    apiService.getOrders().then(setOrders);
    const update = () => apiService.getOrders().then(setOrders);
    window.addEventListener('sync_queue_updated', update);
    return () => window.removeEventListener('sync_queue_updated', update);
  }, []);

  const handlePick = async (orderId, productId, requested, currentPicked) => {
    const nextVal = currentPicked + 1;
    if (nextVal > requested) return;
    await apiService.updateOrderPick(orderId, productId, nextVal);
    apiService.getOrders().then(setOrders);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Armado de Pedidos (Offline Ready)</h1>
        <p className="text-slate-500">Preparación y pickeo de mercadería.</p>
      </div>

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{order.order_number}</h3>
                <p className="text-xs text-slate-500">Notas: {order.notes} | Creado por: {order.created_by}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'PREPARADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {order.status}
              </span>
            </div>

            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">Solicitado: {item.requested} | Preparado: {item.picked}</p>
                  </div>
                  <button 
                    onClick={() => handlePick(order.id, item.product_id, item.requested, item.picked)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-sm"
                  >
                    + Preparar 1 unid.
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(apiService.isOnline);
  const [syncState, setSyncState] = useState({ pending: 0, isSyncing: false, errors: 0 });
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      apiService.initSession(currentUser);
      
      const updateSyncStatus = () => {
        const queue = apiService.getSyncQueue();
        setSyncState({
          pending: queue.filter(q => q.status === 'PENDING' || q.status === 'ENVIANDO').length,
          isSyncing: LOCAL_DB.isSyncing,
          errors: queue.filter(q => q.status === 'ERROR' || q.status === 'CONFLICT').length
        });
      };
      
      const updateNetwork = () => setIsOnline(apiService.isOnline);
      
      window.addEventListener('sync_queue_updated', updateSyncStatus);
      window.addEventListener('network_changed', updateNetwork);
      
      return () => {
        window.removeEventListener('sync_queue_updated', updateSyncStatus);
        window.removeEventListener('network_changed', updateNetwork);
      };
    }
  }, [currentUser]);

  const toggleNetwork = async () => await apiService.setNetworkStatus(!isOnline);

  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans">
      {isApkModalOpen && <ApkDownloadModal onClose={() => setIsApkModalOpen(false)} />}
      
      <Navigation 
        user={currentUser} 
        currentView={currentView} 
        setView={setCurrentView}
        onLogout={() => { apiService.logout(); setCurrentUser(null); }} 
        onOpenApkModal={() => setIsApkModalOpen(true)}
      />
      
      <div className="flex-1 flex flex-col md:ml-64 w-full h-full relative">
        <div className={`h-10 px-4 flex items-center justify-between text-xs font-bold text-white shadow-md z-30 transition-colors ${
           !isOnline ? 'bg-amber-600' : syncState.isSyncing ? 'bg-blue-500' : syncState.errors > 0 ? 'bg-rose-500' : 'bg-emerald-600'
        }`}>
          <div className="flex items-center gap-2">
            {!isOnline ? <WifiOff size={16}/> : <Wifi size={16}/>}
            <span>
              {!isOnline ? 'OFFLINE (Modo sin conexión activo - PWA Local)' : 
                syncState.isSyncing ? 'SINCRONIZANDO (Enviando operaciones al servidor)...' : 
                'ONLINE (Conectado al servidor Supabase)'}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             {syncState.pending > 0 && <span className="flex items-center gap-1"><CloudOff size={14}/> {syncState.pending} pendientes</span>}
             {syncState.errors > 0 && <span className="flex items-center gap-1"><AlertTriangle size={14}/> {syncState.errors} conflictos/errores</span>}
             {isOnline && syncState.pending === 0 && syncState.errors === 0 && !syncState.isSyncing && <span className="flex items-center gap-1"><Cloud size={14}/> Todo sincronizado</span>}
             
             <button onClick={() => setIsApkModalOpen(true)} className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded text-xs transition-colors hidden sm:flex items-center gap-1">
               <Download size={12}/> APK Android
             </button>

             <button onClick={toggleNetwork} className="bg-black/20 hover:bg-black/40 px-3 py-1 rounded text-xs transition-colors flex items-center gap-1">
               {isOnline ? 'Simular Desconexión (Offline)' : 'Reconectar'}
             </button>
          </div>
        </div>
        
        <div className="md:hidden h-16 w-full flex-shrink-0"></div>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto pb-16 md:pb-0">
             {currentView === 'dashboard' && <DashboardView user={currentUser} />}
             {currentView === 'products' && <ProductsView user={currentUser} />}
             {currentView === 'movements' && <MovementsView user={currentUser} />}
             {currentView === 'orders' && <OrdersView />}
             {(currentView === 'reports' || currentView === 'settings') && (
               <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                  <Settings size={48} className="mb-4 opacity-50" />
                  <h2 className="text-lg font-bold">Módulo protegido ({currentView})</h2>
                  <p className="text-sm mt-1">Acceso restringido según políticas RLS de Supabase.</p>
               </div>
             )}
          </div>
        </main>
      </div>
    </div>
  );
          }
