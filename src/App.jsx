import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, LayoutDashboard, ArrowRightLeft, ClipboardList, 
  Settings, LogOut, Menu, X, ShieldAlert, CheckCircle2, 
  AlertCircle, Search, Plus, Filter, FileText, ScanLine, 
  History, Save, Camera, XCircle, Wifi, WifiOff, RefreshCw,
  AlertTriangle, Check, CloudOff, Cloud, UserCheck, Download,
  Lock, Mail, UserPlus, KeyRound, CheckSquare, ShieldCheck, Users, Truck, Edit3
} from 'lucide-react';

const ROLES = {
  ADMIN: 'ADMINISTRADOR',
  OPERATOR: 'OPERADOR',
  ARMADOR: 'ARMADOR',
  CONSULTA: 'CONSULTA'
};

// Lista maestra fija de usuarios accesible desde cualquier dispositivo
const MASTER_USERS = [
  { id: 'u-master', email: 'olmedopel1@gmail.com', pass: 'AdmPr1!', name: 'Pablo (Administrador)', rol: ROLES.ADMIN },
  { id: 'u-horacio', email: 'horacio@gmail.com', pass: '12345', name: 'Horacio (Operador)', rol: ROLES.OPERATOR },
  { id: 'u-miguel', email: 'miguel@stockar.local', pass: 'miguel123', name: 'Miguel (Armador)', rol: ROLES.ARMADOR },
  { id: 'u-ana', email: 'ana@stockar.local', pass: 'ana123', name: 'Ana (Consulta)', rol: ROLES.CONSULTA }
];

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stockar_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [usersList, setUsersList] = useState(MASTER_USERS);

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('stockar_products');
    return saved ? JSON.parse(saved) : [
      { id: 'p1', sku: 'CAB-UTP-5E', barcode: '779123400001', name: 'Cable UTP Cat 5e (Bobina)', description: 'Bobina de cable UTP exterior CCA 305m', stock: 120 },
      { id: 'p2', sku: 'ROU-WIFI-AX', barcode: '779123400002', name: 'Router WiFi 6 AX1500', description: 'Router doble banda Gigabit inalámbrico', stock: 45 },
      { id: 'p3', sku: 'DIS-SSD-1T', barcode: '779123400003', name: 'Disco Sólido SSD 1TB', description: 'Disco NVMe M.2 2280 de alta velocidad', stock: 15 }
    ];
  });

  const [costs, setCosts] = useState(() => {
    const saved = localStorage.getItem('stockar_costs');
    return saved ? JSON.parse(saved) : {
      'p1': { unit_cost: 45000, currency: 'ARS' },
      'p2': { unit_cost: 22000, currency: 'ARS' },
      'p3': { unit_cost: 35000, currency: 'ARS' }
    };
  });

  const [movements, setMovements] = useState(() => {
    const saved = localStorage.getItem('stockar_movements');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('stockar_orders');
    return saved ? JSON.parse(saved) : [
      { id: 'e1', order_number: 'PED-001', client: 'Sucursal Norte', items: '2x Router WiFi 6 AX1500', status: 'PENDIENTE', created_by: 'Sistema' }
    ];
  });

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');

  // Scanner States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState(null); 
  const html5QrCodeRef = useRef(null);

  // Form states
  const [formProd, setFormProd] = useState({ id: '', sku: '', barcode: '', name: '', description: '', stock: 0, unit_cost: 0 });
  const [formMov, setFormMov] = useState({ type: 'ENTRADA', productId: '', qty: 1 });
  const [formUser, setFormUser] = useState({ email: '', pass: '', name: '', rol: ROLES.OPERATOR });
  const [formOrder, setFormOrder] = useState({ order_number: '', client: '', items: '' });

  useEffect(() => {
    localStorage.setItem('stockar_products', JSON.stringify(products));
    localStorage.setItem('stockar_costs', JSON.stringify(costs));
    localStorage.setItem('stockar_movements', JSON.stringify(movements));
    localStorage.setItem('stockar_orders', JSON.stringify(orders));
    if (user) localStorage.setItem('stockar_session', JSON.stringify(user));
    else localStorage.removeItem('stockar_session');
  }, [products, costs, movements, orders, user]);

  // Manejo de la cámara con html5-qrcode
  useEffect(() => {
    if (scannerOpen) {
      const timer = setTimeout(() => {
        if (window.Html5Qrcode) {
          const html5QrCode = new window.Html5Qrcode("reader");
          html5QrCodeRef.current = html5QrCode;
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
              handleScannedCode(decodedText);
              stopScanner();
            },
            () => {}
          ).catch(() => {
            alert("No se pudo iniciar la cámara.");
            stopScanner();
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [scannerOpen]);

  const startScanner = (target) => {
    setModalOpen(false);
    setScannerTarget(target);
    setScannerOpen(true);
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        setScannerOpen(false);
      }).catch(() => setScannerOpen(false));
    } else {
      setScannerOpen(false);
    }
  };

  const handleScannedCode = (code) => {
    if (scannerTarget === 'search') {
      setSearchTerm(code);
    } else if (scannerTarget === 'new_product' || scannerTarget === 'edit_product') {
      setFormProd(prev => ({ ...prev, barcode: code }));
      setModalOpen(true);
    } else if (scannerTarget === 'movement_product') {
      const found = products.find(p => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
      if (found) setFormMov(prev => ({ ...prev, productId: found.id }));
      else alert(`Código ${code} no encontrado.`);
      setModalOpen(true);
    } else if (scannerTarget === 'order_items') {
      const found = products.find(p => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
      const itemName = found ? found.name : code;
      setFormOrder(prev => ({ ...prev, items: prev.items ? `${prev.items}, 1x ${itemName}` : `1x ${itemName}` }));
      setModalOpen(true);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim().toLowerCase();
    const pass = e.target.pass.value.trim();

    const found = MASTER_USERS.find(u => u.email.toLowerCase() === email && u.pass === pass);
    if (!found) {
      alert('Credenciales incorrectas.');
      return;
    }
    setUser(found);
  };

  const handleLogout = () => setUser(null);

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (user.rol !== ROLES.ADMIN) return;

    if (formProd.id) {
      setProducts(products.map(p => p.id === formProd.id ? { ...p, sku: formProd.sku, barcode: formProd.barcode, name: formProd.name, description: formProd.description, stock: Number(formProd.stock) } : p));
      if (formProd.unit_cost > 0) {
        setCosts({ ...costs, [formProd.id]: { unit_cost: Number(formProd.unit_cost), currency: 'ARS' } });
      }
    } else {
      const newId = 'p_' + Date.now();
      const newProd = {
        id: newId,
        sku: formProd.sku,
        barcode: formProd.barcode || '779' + Math.floor(100000000 + Math.random() * 900000000),
        name: formProd.name,
        description: formProd.description,
        stock: Number(formProd.stock)
      };
      setProducts([newProd, ...products]);
      if (formProd.unit_cost > 0) {
        setCosts({ ...costs, [newId]: { unit_cost: Number(formProd.unit_cost), currency: 'ARS' } });
      }
    }
    setModalOpen(false);
    setFormProd({ id: '', sku: '', barcode: '', name: '', description: '', stock: 0, unit_cost: 0 });
  };

  const openEditProduct = (p) => {
    if (user.rol !== ROLES.ADMIN) return;
    setFormProd({
      id: p.id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      description: p.description,
      stock: p.stock,
      unit_cost: costs[p.id]?.unit_cost || 0
    });
    setModalType('edit_product');
    setModalOpen(true);
  };

  const handleCreateMovement = (e) => {
    e.preventDefault();
    const prod = products.find(p => p.id === formMov.productId);
    if (!prod) return;

    const qty = Number(formMov.qty);
    if (formMov.type === 'SALIDA' && prod.stock < qty) {
      alert('Stock insuficiente.');
      return;
    }
    if (formMov.type === 'ENTRADA' && user.rol !== ROLES.ADMIN) {
      alert('Solo el Administrador puede registrar ingresos de stock.');
      return;
    }

    setProducts(products.map(p => p.id === prod.id ? { ...p, stock: formMov.type === 'ENTRADA' ? p.stock + qty : p.stock - qty } : p));
    
    const newMov = {
      id: 'm_' + Date.now(),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: formMov.type,
      product: prod.name,
      qty: qty,
      user: user.name
    };
    setMovements([newMov, ...movements]);
    setModalOpen(false);
    setFormMov({ type: 'ENTRADA', productId: '', qty: 1 });
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    const newOrder = {
      id: 'e_' + Date.now(),
      order_number: formOrder.order_number,
      client: formOrder.client,
      items: formOrder.items,
      status: 'PENDIENTE',
      created_by: user.name
    };
    setOrders([newOrder, ...orders]);
    setModalOpen(false);
    setFormOrder({ order_number: '', client: '', items: '' });
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
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
            <p className="text-sm text-slate-400 mt-1">Control de Stock y Logística Profesional</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Correo Electrónico</label>
              <input name="email" type="email" defaultValue="horacio@gmail.com" required className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Contraseña</label>
              <input name="pass" type="password" defaultValue="12345" required className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 text-sm">
              <KeyRound size={18} /> Iniciar Sesión
            </button>
          </form>

          <div className="mt-6 border-t border-slate-700 pt-4 text-xs text-slate-400">
            <p className="font-bold mb-1">Perfiles disponibles:</p>
            <p>• Pablo (Admin): olmedopel1@gmail.com / AdmPr1!</p>
            <p>• Horacio (Operador): horacio@gmail.com / 12345</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.rol === ROLES.ADMIN;

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
            <span className="text-xs text-blue-400 font-medium">{user.name} ({user.rol})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsOnline(!isOnline)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />} {isOnline ? 'Online' : 'Offline'}
          </button>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 transition" title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full pb-20">
        <div className="flex bg-slate-800/80 p-1.5 rounded-2xl mb-6 border border-slate-700 shadow-inner overflow-x-auto gap-1">
          <button onClick={() => setCurrentTab('dashboard')} className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <LayoutDashboard size={16} /> Resumen
          </button>
          <button onClick={() => setCurrentTab('products')} className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'products' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <Package size={16} /> Stock
          </button>
          <button onClick={() => setCurrentTab('orders')} className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'orders' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <Truck size={16} /> Pedidos
          </button>
          <button onClick={() => setCurrentTab('movements')} className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'movements' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <ArrowRightLeft size={16} /> Movimientos
          </button>
          {isAdmin && (
            <button onClick={() => setCurrentTab('users')} className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'users' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <Users size={16} /> Usuarios
            </button>
          )}
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
                <span className="text-slate-400 text-xs font-semibold uppercase">Pedidos Pendientes</span>
                <div className="text-3xl font-extrabold text-amber-400 mt-1">{orders.filter(o => o.status !== 'DESPACHADO').length}</div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow">
              <h2 className="font-bold text-base mb-3 text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-400" /> Accesos Rápidos
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {isAdmin && (
                  <button onClick={() => { setFormProd({ id: '', sku: '', barcode: '', name: '', description: '', stock: 0, unit_cost: 0 }); setModalType('product'); setModalOpen(true); }} className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 p-3 rounded-xl text-left transition flex items-center gap-3 text-blue-300 font-semibold text-xs">
                    <Plus size={20} /> Nuevo Producto
                  </button>
                )}
                <button onClick={() => { setModalType('order'); setModalOpen(true); }} className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 p-3 rounded-xl text-left transition flex items-center gap-3 text-amber-300 font-semibold text-xs">
                  <Truck size={20} /> Nuevo Pedido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {currentTab === 'products' && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input type="text" placeholder="Buscar por SKU, nombre o código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <button onClick={() => startScanner('search')} className="bg-slate-700 hover:bg-slate-600 text-blue-400 border border-slate-600 p-2.5 rounded-xl shadow transition" title="Escanear con cámara">
                <Camera size={20} />
              </button>
              {isAdmin && (
                <button onClick={() => { setFormProd({ id: '', sku: '', barcode: '', name: '', description: '', stock: 0, unit_cost: 0 }); setModalType('product'); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl shadow transition">
                  <Plus size={20} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm)).map(p => (
                <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-700 text-blue-300 font-mono px-2 py-0.5 rounded">{p.sku}</span>
                      <span className="text-[11px] text-slate-400 font-mono">Barcode: {p.barcode}</span>
                      <span className="text-xs font-bold text-emerald-400">Stock: {p.stock} un.</span>
                    </div>
                    <h3 className="font-bold text-sm text-white mt-1">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && costs[p.id] && (
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Costo unitario</span>
                        <span className="text-sm font-extrabold text-emerald-400">${costs[p.id].unit_cost.toLocaleString()}</span>
                      </div>
                    )}
                    {isAdmin && (
                      <button onClick={() => openEditProduct(p)} className="bg-slate-700 hover:bg-slate-600 text-blue-400 p-2 rounded-xl transition">
                        <Edit3 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {currentTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Armado y Despacho de Pedidos</h2>
              <button onClick={() => { setModalType('order'); setModalOpen(true); }} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition">
                <Plus size={16} /> Crear Pedido
              </button>
            </div>

            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">{o.order_number}</span>
                      <h3 className="font-bold text-sm text-white mt-1">Cliente / Destino: {o.client}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      o.status === 'PENDIENTE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      o.status === 'EN ARMADO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-700/50"><strong>Ítems:</strong> {o.items}</p>
                  
                  <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                    <button onClick={() => handleUpdateOrderStatus(o.id, 'PENDIENTE')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${o.status === 'PENDIENTE' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      Pendiente
                    </button>
                    <button onClick={() => handleUpdateOrderStatus(o.id, 'EN ARMADO')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${o.status === 'EN ARMADO' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      En Armado
                    </button>
                    <button onClick={() => handleUpdateOrderStatus(o.id, 'DESPACHADO')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${o.status === 'DESPACHADO' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      Despachado
                    </button>
                  </div>
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
              {isAdmin && (
                <button onClick={() => { setModalType('movement'); setModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition">
                  <Plus size={16} /> Ingreso Stock
                </button>
              )}
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

        {/* USERS TAB */}
        {currentTab === 'users' && isAdmin && (
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Usuarios del Sistema</h2>
            <div className="space-y-3">
              {MASTER_USERS.map(u => (
                <div key={u.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold">{u.rol}</span>
                      <span className="text-xs text-slate-400 font-mono">{u.email} (Pass: {u.pass})</span>
                    </div>
                    <h3 className="font-bold text-sm text-white mt-1">{u.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* SCANNER MODAL */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black/95 z-[999] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Camera size={18} className="text-blue-400" /> Escáner de Código
              </h3>
              <button onClick={stopScanner} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <div id="reader" className="w-full rounded-xl overflow-hidden border border-slate-700 bg-black"></div>

            <p className="text-[11px] text-slate-400 text-center mt-3">Centra el código de barras en el recuadro.</p>
            <button onClick={stopScanner} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl mt-3 text-xs transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">
                {modalType === 'product' && 'Nuevo Producto'}
                {modalType === 'edit_product' && 'Editar Producto'}
                {modalType === 'movement' && 'Ingreso de Stock'}
                {modalType === 'order' && 'Nuevo Pedido / Despacho'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            {/* FORMULARIO PRODUCTO */}
            {(modalType === 'product' || modalType === 'edit_product') && (
              <form onSubmit={handleSaveProduct} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">SKU</label>
                  <input type="text" required value={formProd.sku} onChange={e => setFormProd({...formProd, sku: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400">Código de Barras</label>
                    <button type="button" onClick={() => startScanner('new_product')} className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-bold">
                      <Camera size={14} /> Escanear
                    </button>
                  </div>
                  <input type="text" required value={formProd.barcode} onChange={e => setFormProd({...formProd, barcode: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre</label>
                  <input type="text" required value={formProd.name} onChange={e => setFormProd({...formProd, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción</label>
                  <input type="text" value={formProd.description} onChange={e => setFormProd({...formProd, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Stock Actual</label>
                  <input type="number" min="0" required value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Costo Unitario ($)</label>
                    <input type="number" required value={formProd.unit_cost} onChange={e => setFormProd({...formProd, unit_cost: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                )}
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 shadow transition text-sm">Guardar Producto</button>
              </form>
            )}

            {/* FORMULARIO INGRESO STOCK */}
            {modalType === 'movement' && (
              <form onSubmit={handleCreateMovement} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo</label>
                  <input type="text" disabled value="ENTRADA DE STOCK" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-bold" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400">Producto</label>
                    <button type="button" onClick={() => startScanner('movement_product')} className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-bold">
                      <Camera size={14} /> Escanear
                    </button>
                  </div>
                  <select required value={formMov.productId} onChange={e => setFormMov({...formMov, productId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="">Seleccione producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad a Ingresar</label>
                  <input type="number" min="1" required value={formMov.qty} onChange={e => setFormMov({...formMov, qty: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-4 shadow transition text-sm">Registrar Ingreso</button>
              </form>
            )}

            {/* FORMULARIO PEDIDO */}
            {modalType === 'order' && (
              <form onSubmit={handleCreateOrder} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Número de Pedido</label>
                  <input type="text" placeholder="Ej: PED-002" required value={formOrder.order_number} onChange={e => setFormOrder({...formOrder, order_number: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cliente / Destino</label>
                  <input type="text" placeholder="Nombre del cliente" required value={formOrder.client} onChange={e => setFormOrder({...formOrder, client: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400">Detalle de Ítems (Escanea con cámara)</label>
                    <button type="button" onClick={() => startScanner('order_items')} className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold">
                      <Camera size={14} /> Escanear Producto
                    </button>
                  </div>
                  <textarea placeholder="Ítems del pedido..." required value={formOrder.items} onChange={e => setFormOrder({...formOrder, items: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 h-20 resize-none font-mono" />
                </div>
                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl mt-4 shadow transition text-sm">Registrar Pedido</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
