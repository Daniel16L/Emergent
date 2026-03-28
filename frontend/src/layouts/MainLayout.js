import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  PlusCircle, 
  Users, 
  Package, 
  Truck, 
  Target, 
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Panou de Control', roles: ['admin', 'agent'] },
  { path: '/orders', icon: ShoppingCart, label: 'Comenzi', roles: ['admin', 'agent'] },
  { path: '/new-order', icon: PlusCircle, label: 'Comandă Nouă', roles: ['admin', 'agent'] },
  { path: '/clients', icon: Users, label: 'Clienți', roles: ['admin', 'agent'] },
  { path: '/stock', icon: Package, label: 'Stoc & Recepții', roles: ['admin', 'agent'] },
  { path: '/logistics', icon: Truck, label: 'Logistică', roles: ['admin', 'agent'] },
  { path: '/targets', icon: Target, label: 'Obiective', roles: ['admin', 'agent'] },
  { path: '/settings', icon: Settings, label: 'Setări', roles: ['admin'] },
];

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-neutral-200 z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-neutral-100 rounded-lg"
          data-testid="mobile-menu-btn"
        >
          <Menu className="w-6 h-6 text-neutral-700" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2E7D32] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="font-semibold text-neutral-900">Tomibena CRM</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-neutral-200 z-50
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2E7D32] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <div>
                <h1 className="font-bold text-neutral-900 text-lg leading-tight">Tomibena</h1>
                <p className="text-xs text-neutral-500">Materiale Încălzire</p>
              </div>
            </div>
            <button 
              className="lg:hidden p-1 hover:bg-neutral-100 rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-[#E8F5E9] text-[#2E7D32] font-medium' 
                      : 'text-neutral-600 hover:bg-neutral-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#2E7D32] rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 truncate">{user?.name}</p>
                <p className="text-xs text-neutral-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-neutral-600 hover:text-red-600 hover:border-red-200"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Deconectare
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
