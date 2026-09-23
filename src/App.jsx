import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, LayoutDashboard, ArrowRightLeft, ClipboardList, 
  Settings, LogOut, Menu, X, ShieldAlert, CheckCircle2, 
  AlertCircle, Search, Plus, Filter, FileText, ScanLine, 
  History, Save, Camera, XCircle, Wifi, WifiOff, RefreshCw,
  AlertTriangle, Check, CloudOff, Cloud, UserCheck, Download,
  Lock, Mail, UserPlus, KeyRound, CheckSquare, ShieldCheck, Users, Truck
} from 'lucide-react';

const ROLES = {
  ADMIN: 'ADMINISTRADOR',
  OPERATOR: 'OPERADOR',
  ARMADOR: 'ARMADOR',
  CONSULTA: 'CONSULTA'
};

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stockar_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('stockar_users');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'u-master', email: 'olmedopel1@gmail.com', pass: 'AdmPr1!', name: 'Administrador Principal (Olmedo)', rol: ROLES.ADMIN }
    ];
  });

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

  // Scanner Modal States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState(null); // 'search', 'movement_product', 'new_product'
  const videoRef = useRef(null);
  const scannerStreamRef = useRef(null);

  // Form states
  const [formProd, setFormProd] = useState({ sku: '', barcode: '', name: '', description: '', stock: 0, unit_cost: 0 });
  const [formMov, setFormMov] = useState({ type: 'ENTRADA', productId: '', qty: 1 });
  const [formUser, setFormUser] = useState({ email: '', pass: '', name: '', rol: ROLES.OPERATOR });
  const [formOrder, setFormOrder] = useState({ order_number: '', client: '', items: '' });

  useEffect(() => {
    localStorage.setItem('stockar_users', JSON.stringify(usersList));
    localStorage.setItem('stockar_products', JSON.stringify(products));
    localStorage.setItem('stockar_costs', JSON.stringify(costs));
    localStorage.setItem('stockar_movements', JSON.stringify(movements));
    localStorage.setItem('stockar_orders', JSON.stringify(orders));
    if (user) localStorage.setItem('stockar_session', JSON.stringify(user));
    else localStorage.removeItem('stockar_session');
  }, [usersList, products, costs, movements, orders, user]);

  // Lógica de la Cámara / Escáner de Códigos de Barras
  const startScanner = async (target) => {
    setScannerTarget(target);
    setScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      scannerStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch (err) {
      alert('No se pudo acceder a la cámara. Asegúrate de dar permisos en el navegador.');
      setScannerOpen(false);
    }
  };

  const stopScanner = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach(track => track.stop());
      scannerStreamRef.current = null;
    }
    setScannerOpen(false);
  };

  const scanFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      if (scannerOpen) requestAnimationFrame(scanFrame);
      return;
    }

    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'qr_code'] });
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          handleScannedCode(code);
          stopScanner();
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (scannerOpen) {
      requestAnimationFrame(scanFrame);
    }
  };

  const handleScannedCode = (code) => {
    if (scannerTarget === 'search') {
      setSearchTerm(code);
    } else if (scannerTarget === 'new_product') {
      setFormProd(prev => ({ ...prev, barcode: code }));
    } else if (scannerTarget === 'movement_product') {
      const found = products.find(p => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
      if (found) {
        setFormMov(prev => ({ ...prev, productId: found.id }));
      } else {
        alert(`Código detectado: ${code}, pero no coincide con ningún producto.`);
      }
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim().toLowerCase();
    const pass = e.target.pass.value.trim();
    const found = usersList.find(u => u.email.toLowerCase() === email && u.pass === pass);
    if (!found) {
      alert('Credenciales incorrectas o usuario no registrado.');
      return;
    }
    setUser(found);
  };

  const handleLogout = () => setUser(null);

  const handleCreateProduct = (e) => {
    e.preventDefault();
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
    if (user.rol === ROLES.ADMIN && formProd.unit_cost > 0) {
      setCosts({ ...costs, [newId]: { unit_cost: Number(formProd.unit_cost), currency: 'ARS' } });
    }
    setModalOpen(false);
    setFormProd({ sku: '', barcode: '', name: '', description: '', stock: 0, unit_cost: 0 });
  };

  const handleCreateMovement = (e) => {
    e.preventDefault();
    const prod = products.find(p => p.id === formMov.productId);
    if (!prod) return;

    const qty = Number(formMov.qty);
    if (formMov.type === 'SALIDA' && prod.stock < qty) {
      alert('Stock insuficiente para realizar esta salida.');
      return;
    }

    const updatedProducts = products.map(p => {
      if (p.id === prod.id) {
        return { ...p, stock: formMov.type === 'ENTRADA' ? p.stock + qty : p.stock - qty };
      }
      return p;
    });
    setProducts(updatedProducts);

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

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (usersList.some(u => u.email.toLowerCase() === formUser.email.toLowerCase())) {
      alert('Ya existe un usuario con este correo electrónico.');
      return;
    }
    const newUser = { id: 'u_' + Date.now(), ...formUser };
    setUsersList([...usersList, newUser]);
    setModalOpen(false);
    setFormUser({ email: '', pass: '', name: '', rol: ROLES.OPERATOR });
    alert('Usuario creado correctamente.');
  };

  const handleDeleteUser = (id) => {
    if (usersList.length <= 1) {
      alert('No puedes eliminar al único usuario del sistema.');
      return;
    }
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      setUsersList(usersList.filter(u => u.id !== id));
    }
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
              <input 
                name="email" 
                type="email" 
                defaultValue="olmedopel1@gmail.com" 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Contraseña</label>
              <input 
                name="pass" 
                type="password" 
                defaultValue="AdmPr1!" 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-3 rounded-xl transition duration-200 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 text-sm"
            >
              <KeyRound size={18} /> Iniciar Sesión
            </button>
          </form>
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
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </button>

          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 transition" title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full pb-20">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-2xl mb-6 border border-slate-700 shadow-inner overflow-x-auto gap-1">
          <button 
            onClick={() => setCurrentTab('dashboard')}
            className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutDashboard size={16} /> Resumen
          </button>
          <button 
            onClick={() => setCurrentTab('products')}
            className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'products' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Package size={16} /> Stock
          </button>
          <button 
            onClick={() => setCurrentTab('orders')}
            className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'orders' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Truck size={16} /> Pedidos
          </button>
          <button 
            onClick={() => setCurrentTab('movements')}
            className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'movements' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <ArrowRightLeft size={16} /> Movimientos
          </button>
          {isAdmin && (
            <button 
              onClick={() => setCurrentTab('users')}
              className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${currentTab === 'users' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
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
                  <button 
                    onClick={() => { setModalType('product'); setModalOpen(true); }}
                    className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 p-3 rounded-xl text-left transition flex items-center gap-3 text-blue-300 font-semibold text-xs"
                  >
                    <Plus size={20} /> Nuevo Producto
                  </button>
                )}
                <button 
                  onClick={() => { setModalType('order'); setModalOpen(true); }}
                  className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 p-3 rounded-xl text-left transition flex items-center gap-3 text-amber-300 font-semibold text-xs"
                >
                  <Truck size={20} /> Nuevo Pedido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS / STOCK TAB */}
        {currentTab === 'products' && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por SKU, nombre o código..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button 
                onClick={() => startScanner('search')}
                className="bg-slate-700 hover:bg-slate-600 text-blue-400 border border-slate-600 p-2.5 rounded-xl shadow transition flex items-center gap-1.5 text-xs font-bold"
                title="Escanear código con cámara"
              >
                <Camera size={20} />
              </button>
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
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
                .map(p => (
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

        {/* ORDERS TAB */}
        {currentTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Armado y Despacho</h2>
              <button 
                onClick={() => { setModalType('order'); setModalOpen(true); }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
              >
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
                    <button 
                      onClick={() => handleUpdateOrderStatus(o.id, 'PENDIENTE')}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${o.status === 'PENDIENTE' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      Pendiente
                    </button>
                    <button 
                      onClick={() => handleUpdateOrderStatus(o.id, 'EN ARMADO')}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${o.status === 'EN ARMADO' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      En Armado
                    </button>
                    <button 
                      onClick={() => handleUpdateOrderStatus(o.id, 'DESPACHADO')}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${o.status === 'DESPACHADO' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
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
              <button 
                onClick={() => { setModalType('movement'); setModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
              >
                <Plus size={16} /> Movimiento Stock
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

        {/* USERS TAB */}
        {currentTab === 'users' && isAdmin && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Gestión de Usuarios</h2>
              <button 
                onClick={() => { setModalType('user'); setModalOpen(true); }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
              >
                <UserPlus size={16} /> Crear Usuario
              </button>
            </div>

            <div className="space-y-3">
              {usersList.map(u => (
                <div key={u.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold">{u.rol}</span>
                      <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                    </div>
                    <h3 className="font-bold text-sm text-white mt-1">{u.name}</h3>
                  </div>
                  {u.email !== 'olmedopel1@gmail.com' && (
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 p-2 rounded-xl text-xs transition"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL CÁMARA ESCÁNER */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Camera size={18} className="text-blue-400" /> Escanear Código de Barras
              </h3>
              <button onClick={stopScanner} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-700">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-0 border-2 border-blue-500/50 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500/80 animate-pulse"></div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">Enfoca el código de barras dentro del recuadro con la cámara de tu celular.</p>
            <button 
              onClick={stopScanner}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl mt-3 text-xs transition"
            >
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
                {modalType === 'movement' && 'Registrar Movimiento Stock'}
                {modalType === 'user' && 'Crear Nuevo Usuario'}
                {modalType === 'order' && 'Nuevo Pedido / Despacho'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* FORMULARIO PRODUCTO */}
            {modalType === 'product' && (
              <form onSubmit={handleCreateProduct} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">SKU</label>
                  <input type="text" required value={formProd.sku} onChange={e => setFormProd({...formProd, sku: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400">Código de Barras</label>
                    <button 
                      type="button" 
                      onClick={() => startScanner('new_product')}
                      className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Camera size={14} /> Escanear
                    </button>
                  </div>
                  <input type="text" required value={formProd.barcode} onChange={e => setFormProd({...formProd, barcode: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono" />
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Stock Inicial</label>
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

            {/* FORMULARIO MOVIMIENTO */}
            {modalType === 'movement' && (
              <form onSubmit={handleCreateMovement} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Operación</label>
                  <select value={formMov.type} onChange={e => setFormMov({...formMov, type: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="ENTRADA">Entrada de Stock</option>
                    <option value="SALIDA">Salida de Stock</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400">Producto</label>
                    <button 
                      type="button" 
                      onClick={() => startScanner('movement_product')}
                      className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Camera size={14} /> Escanear Código
                    </button>
                  </div>
                  <select required value={formMov.productId} onChange={e => setFormMov({...formMov, productId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="">Seleccione un producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad</label>
                  <input type="number" min="1" required value={formMov.qty} onChange={e => setFormMov({...formMov, qty: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-4 shadow transition text-sm">Registrar Movimiento</button>
              </form>
            )}

            {/* FORMULARIO USUARIO */}
            {modalType === 'user' && (
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre y Apellido</label>
                  <input type="text" required value={formUser.name} onChange={e => setFormUser({...formUser, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico</label>
                  <input type="email" required value={formUser.email} onChange={e => setFormUser({...formUser, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contraseña</label>
                  <input type="text" required value={formUser.pass} onChange={e => setFormUser({...formUser, pass: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rol / Permisos</label>
                  <select value={formUser.rol} onChange={e => setFormUser({...formUser, rol: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value={ROLES.ADMIN}>Administrador (Control total y costos)</option>
                    <option value={ROLES.OPERATOR}>Operador (Stock y movimientos)</option>
                    <option value={ROLES.ARMADOR}>Armador (Logística de pedidos)</option>
                    <option value={ROLES.CONSULTA}>Consulta (Solo lectura)</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 shadow transition text-sm">Crear Usuario</button>
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
                  <input type="text" placeholder="Nombre del cliente o sucursal" required value={formOrder.client} onChange={e => setFormOrder({...formOrder, client: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Detalle de Ítems</label>
                  <textarea placeholder="Ej: 2x Router WiFi, 5x Cable UTP" required value={formOrder.items} onChange={e => setFormOrder({...formOrder, items: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 h-20 resize-none" />
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
