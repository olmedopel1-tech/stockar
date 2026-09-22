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
    OPERATOR: 'OPERADOR',
    ARMADOR: 'ARMADOR',
    CONSULTA: 'CONSULTA'
  },
  users: [
    { id: 'u-admin-master', email: 'olmedopel1@gmail.com', pass: 'AdmPr1!', name: 'Administrador Principal (Olmedo)', rol: 'ADMINISTRADOR' },
    { id: 'u1', email: 'laura@stockar.local', pass: 'laura123', name: 'Laura (Admin)', rol: 'ADMINISTRADOR' },
    { id: 'u2', email: 'carlos@stockar.local', pass: 'carlos123', name: 'Carlos (Operador)', rol: 'OPERADOR' },
    { id: 'u3', email: 'miguel@stockar.local', pass: 'miguel123', name: 'Miguel (Armador)', rol: 'ARMADOR' },
    { id: 'u4', email: 'ana@stockar.local', pass: 'ana123', name: 'Ana (Consulta)', rol: 'CONSULTA' }
  ],
  products: [
    { id: 'p1', sku: 'CAB-UTP-5E', barcode: '779123400001', name: 'Cable UTP Cat 5e (Bobina)', description: 'Bobina de cable UTP exterior CCA 305m' },
    { id: 'p2', sku: 'ROU-WIFI-AX', barcode: '779123400002', name: 'Router WiFi 6 AX1500', description: 'Router doble banda Gigabit inalámbrico' },
    { id: 'p3', sku: 'DIS-SSD-1T', barcode: '779123400003', name: 'Disco Sólido SSD 1TB', description: 'Disco NVMe M.2 2280 de alta velocidad' },
    { id: 'p4', sku: 'MON-24-FHD', barcode: '779123400004', name: 'Monitor 24" FHD IPS', description: 'Monitor sin bordes 75Hz HDMI/VGA' },
    { id: 'p5', sku: 'TEC-MEC-RGB', barcode: '779123400005', name: 'Teclado Mecánico RGB', description: 'Switches Blue en español formato TKL' }
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
    { id: 'm2', date: '2026-09-22 10:15', type: 'SALIDA', product: 'Disco Sólido SSD 1TB', qty: 2, user: 'Laura (Admin)' }
  ],
  orders: [
    { id: 'e1', order_number: 'PED-001', status: 'PENDIENTE', notes: 'Urgente para sucursal norte', created_by: 'Carlos' }
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
  currentuser: null,

  login: async (email, password) => {
    const foundUser = SERVER_DB.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === password);
    if (!foundUser) throw new Error('Credenciales inválidas. Comprobá tu correo y contraseña.');
    apiService.currentuser = foundUser;
    await apiService.syncFromServer();
    return apiService.currentuser;
  },

  logout: async () => {
    apiService.currentuser = null;
    LOCAL_DB.costs = {};
  },

  syncFromServer: async () => {
    LOCAL_DB.products = [...SERVER_DB.products];
    LOCAL_DB.movements = [...SERVER_DB.movements];
    LOCAL_DB.orders = [...SERVER_DB.orders];
    
    if (apiService.currentuser && apiService.currentuser.rol === SERVER_DB.roles.ADMIN) {
      LOCAL_DB.costs = JSON.parse(JSON.stringify(SERVER_DB.costs));
    } else {
      LOCAL_DB.costs = {};
    }
  },

  getProducts: () => LOCAL_DB.products,
  getMovements: () => LOCAL_DB.movements,
  getOrders: () => LOCAL_DB.orders,
  getCosts: () => LOCAL_DB.costs,

  addProduct: async (prodData, costData) => {
    const newId = 'p_' + Date.now();
    const newProd = { id: newId, ...prodData };
    
    SERVER_DB.products.push(newProd);
    if (costData && apiService.currentuser?.rol === SERVER_DB.roles.ADMIN) {
      SERVER_DB.costs[newId] = costData;
    }

    if (!apiService.isOnline) {
      LOCAL_DB.sync_queue.push({ type: 'ADD_PRODUCT', payload: { prodData, costData }, timestamp: Date.now() });
    }
    await apiService.syncFromServer();
  },

  recordMovement: async (movData) => {
    const newMov = { id: 'm_' + Date.now(), date: new Date().toISOString().replace('T', ' ').substring(0, 16), user: apiService.currentuser?.name || 'Sistema', ...movData };
    SERVER_DB.movements.unshift(newMov);

    if (!apiService.isOnline) {
      LOCAL_DB.sync_queue.push({ type: 'RECORD_MOVEMENT', payload: movData, timestamp: Date.now() });
    }
    await apiService.syncFromServer();
  },

  triggerSync: async () => {
    LOCAL_DB.isSyncing = true;
    await new Promise(r => setTimeout(r, 1200));
    LOCAL_DB.sync_queue = [];
    LOCAL_DB.isSyncing = false;
    await apiService.syncFromServer();
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [costs, setCosts] = useState({});
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');

  // Form states
  const [formProd, setFormProd] = useState({ sku: '', barcode: '', name: '', description: '', unit_cost: 0 });
  const [formMov, setFormMov] = useState({ type: 'ENTRADA', product: '', qty: 1 });
  const [searchTerm, setSearchTerm] = useState('');

  const refreshData = () => {
    setProducts(apiService.getProducts());
    setMovements(apiService.getMovements());
    setCosts(apiService.getCosts());
    setSyncQueueCount(LOCAL_DB.sync_queue.length);
  };

  useEffect(() => {
    if (user) refreshData();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const pass = e.target.pass.value;
    try {
      const logged = await apiService.login(email, pass);
      setUser(logged);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleQuickLogin = async (email, pass) => {
    try {
      const logged = await apiService.login(email, pass);
      setUser(logged);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
  };

  const toggleConnection = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    apiService.isOnline = nextState;
  };

  const executeSync = async () => {
    await apiService.triggerSync();
    refreshData();
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    await apiService.addProduct(
      { sku: formProd.sku, barcode: formProd.barcode, name: formProd.name, description: formProd.description },
      { unit_cost: Number(formProd.unit_cost), currency: 'ARS' }
    );
    setModalOpen(false);
    setFormProd({ sku: '', barcode: '', name: '', description: '', unit_cost: 0 });
    refreshData();
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault();
    if (!formMov.product) {
      alert('Seleccioná un producto');
      return;
    }
    await apiService.recordMovement(formMov);
    setModalOpen(false);
    setFormMov({ type: 'ENTRADA', product: products[0]?.name || '', qty: 1 });
    refreshData();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg mb-3">
              <Package size={36} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">StockAr</h1>
            <p className="text-sm text-slate-400 mt-1">Control de Stock e Inventario Profesional</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Correo Electrónico</label>
              <input 
                name="email" 
                type="email" 
                defaultValue="olmedopel1@gmail.com" 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Contraseña</label>
              <input 
                name="pass" 
                type="password" 
                defaultValue="AdmPr1!" 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-3 rounded-xl transition duration-200 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <KeyRound size={18} /> Iniciar Sesión
            </button>
          </form>

          <div className="mt-8 border-t border-slate-700 pt-5">
            <p className="text-xs text-slate-400 text-center mb-3 font-medium uppercase tracking-wider">Acceso rápido por perfil</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleQuickLogin('olmedopel1@gmail.com', 'AdmPr1!')}
                className="bg-slate-700 hover:bg-slate-600 text-xs p-2.5 rounded-lg text-left transition"
              >
                <div className="font-bold text-blue-400">Admin (Olmedo)</div>
                <div className="text-[10px] text-slate-400">Acceso total y costos</div>
              </button>
              <button 
                onClick={() => handleQuickLogin('carlos@stockar.local', 'carlos123')}
                className="bg-slate-700 hover:bg-slate-600 text-xs p-2.5 rounded-lg text-left transition"
              >
                <div className="font-bold text-emerald-400">Operador</div>
                <div className="text-[10px] text-slate-400">Sin ver costos</div>
              </button>
              <button 
                onClick={() => handleQuickLogin('miguel@stockar.local', 'miguel123')}
                className="bg-slate-700 hover:bg-slate-600 text-xs p-2.5 rounded-lg text-left transition"
              >
                <div className="font-bold text-amber-400">Armador</div>
                <div className="text-[10px] text-slate-400">Logística de pedidos</div>
              </button>
              <button 
                onClick={() => handleQuickLogin('ana@stockar.local', 'ana123')}
                className="bg-slate-700 hover:bg-slate-600 text-xs p-2.5 rounded-lg text-left transition"
              >
                <div className="font-bold text-purple-400">Consulta</div>
                <div className="text-[10px] text-slate-400">Solo lectura</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.rol === SERVER_DB.roles.ADMIN;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Topbar */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center sticky top-0 z-20 shadow">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white">
            <Package size={22} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">StockAr</h1>
            <span className="text-xs text-blue-400 font-medium">{user.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleConnection}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </button>

          {syncQueueCount > 0 && (
            <button 
              onClick={executeSync} 
              disabled={isSyncing}
              className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {syncQueueCount} pendiente{syncQueueCount > 1 ? 's' : ''}
            </button>
          )}

          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 transition">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full pb-20">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-2xl mb-6 border border-slate-700 shadow-inner">
          <button 
            onClick={() => setCurrentTab('dashboard')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutDashboard size={16} /> Resumen
          </button>
          <button 
            onClick={() => setCurrentTab('products')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'products' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Package size={16} /> Productos
          </button>
          <button 
            onClick={() => setCurrentTab('movements')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'movements' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <ArrowRightLeft size={16} /> Movimientos
          </button>
        </div>

        {/* DASHBOARD TAB */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow">
                <span className="text-slate-400 text-xs font-semibold uppercase">Total Productos</span>
                <div className="text-3xl font-extrabold text-white mt-1">{products.length}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow">
                <span className="text-slate-400 text-xs font-semibold uppercase">Movimientos</span>
                <div className="text-3xl font-extrabold text-emerald-400 mt-1">{movements.length}</div>
              </div>
            </div>

            {isAdmin && (
              <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 border border-blue-500/30 rounded-2xl p-5 shadow">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-1">
                  <ShieldCheck size={18} /> Panel Exclusivo Administrador
                </div>
                <p className="text-xs text-slate-300">Tienes permisos de visualización de costos y control financiero habilitados de forma segura.</p>
              </div>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow">
              <h2 className="font-bold text-base mb-3 text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-400" /> Accesos Rápidos
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {isAdmin && (
                  <button 
                    onClick={() => { setModalType('product'); setModalOpen(true); }}
                    className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 p-3 rounded-xl text-left transition flex items-center gap-3 text-blue-300 font-semibold text-xs"
                  >
                    <Plus size={20} /> Nuevo Producto
                  </button>
                )}
                <button 
                  onClick={() => { setModalType('movement'); setModalOpen(true); }}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 p-3 rounded-xl text-left transition flex items-center gap-3 text-emerald-300 font-semibold text-xs"
                >
                  <ArrowRightLeft size={20} /> Registrar Movimiento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {currentTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por SKU o nombre..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              {isAdmin && (
                <button 
                  onClick={() => { setModalType('product'); setModalOpen(true); }}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl shadow transition"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {products
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-700 text-blue-300 font-mono px-2 py-0.5 rounded">{p.sku}</span>
                        <span className="text-xs text-slate-400 font-mono">{p.barcode}</span>
                      </div>
                      <h3 className="font-bold text-sm text-white mt-1">{p.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
                    </div>
                    {isAdmin && costs[p.id] && (
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Costo unitario</span>
                        <span className="text-sm font-extrabold text-emerald-400">${costs[p.id].unit_cost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* MOVEMENTS TAB */}
        {currentTab === 'movements' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Historial de Operaciones</h2>
              <button 
                onClick={() => { setModalType('movement'); setModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
              >
                <Plus size={16} /> Nuevo
              </button>
            </div>

            <div className="space-y-3">
              {movements.map(m => (
                <div key={m.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${m.type === 'ENTRADA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {m.type}
                      </span>
                      <span className="text-xs text-slate-400">{m.date}</span>
                    </div>
                    <div className="font-bold text-sm text-white mt-1">{m.product}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Responsable: {m.user}</div>
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    {m.type === 'ENTRADA' ? '+' : '-'}{m.qty}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">
                {modalType === 'product' ? 'Nuevo Producto' : 'Registrar Movimiento'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {modalType === 'product' ? (
              <form onSubmit={handleSaveProduct} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">SKU</label>
                  <input type="text" required value={formProd.sku} onChange={e => setFormProd({...formProd, sku: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Código de Barras</label>
                  <input type="text" required value={formProd.barcode} onChange={e => setFormProd({...formProd, barcode: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Producto</label>
                  <input type="text" required value={formProd.name} onChange={e => setFormProd({...formProd, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción</label>
                  <input type="text" value={formProd.description} onChange={e => setFormProd({...formProd, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Costo Unitario ($)</label>
                    <input type="number" required value={formProd.unit_cost} onChange={e => setFormProd({...formProd, unit_cost: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                )}
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 shadow transition">Guardar Producto</button>
              </form>
            ) : (
              <form onSubmit={handleSaveMovement} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Operación</label>
                  <select value={formMov.type} onChange={e => setFormMov({...formMov, type: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="ENTRADA">Entrada de Stock</option>
                    <option value="SALIDA">Salida de Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Producto</label>
                  <select value={formMov.product} onChange={e => setFormMov({...formMov, product: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad</label>
                  <input type="number" min="1" required value={formMov.qty} onChange={e => setFormMov({...formMov, qty: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-4 shadow transition">Registrar Movimiento</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
