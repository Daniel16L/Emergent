import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  Phone, 
  Navigation,
  Check,
  MapPin,
  Package,
  Clock,
  LogOut,
  RefreshCw,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  pending: 'border-yellow-400 bg-yellow-50',
  in_transit: 'border-blue-400 bg-blue-50',
  delivered: 'border-green-400 bg-green-50',
  failed: 'border-red-400 bg-red-50'
};

export default function DriverView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDelivery, setConfirmingDelivery] = useState(null);
  const [showOblioSpinner, setShowOblioSpinner] = useState(false);
  const [oblioInvoice, setOblioInvoice] = useState(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/driver/today`);
      setDeliveries(response.data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      // Fallback to all deliveries for the driver
      try {
        const allDeliveries = await axios.get(`${API_URL}/api/deliveries`);
        setDeliveries(allDeliveries.data);
      } catch (e) {
        console.error('Error fetching all deliveries:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      await axios.patch(`${API_URL}/api/deliveries/${deliveryId}/status`, { status });
      
      if (status === 'delivered') {
        // Show Oblio simulation
        setShowOblioSpinner(true);
        setTimeout(() => {
          setShowOblioSpinner(false);
          const invoiceNumber = `TB-${Date.now().toString().slice(-6)}`;
          setOblioInvoice(invoiceNumber);
          toast.success(`Factură #${invoiceNumber} emisă în Oblio`);
        }, 2000);
      }
      
      fetchDeliveries();
      setConfirmingDelivery(null);
    } catch (error) {
      toast.error('Eroare la actualizarea statusului');
      console.error('Error updating delivery status:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0
    }).format(value);
  };

  const pendingDeliveries = deliveries.filter(d => ['pending', 'in_transit'].includes(d.status));
  const completedDeliveries = deliveries.filter(d => ['delivered', 'failed'].includes(d.status));

  return (
    <div className="min-h-screen bg-[#F5F6FA]" data-testid="driver-view">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Livrări Azi</h1>
            <p className="text-sm text-neutral-500">{user?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={fetchDeliveries}
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-red-500"
              data-testid="logout-driver-btn"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-[#2E7D32]" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border border-neutral-200">
                <p className="text-sm text-neutral-500">De Livrat</p>
                <p className="text-2xl font-bold text-[#2E7D32]">{pendingDeliveries.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-neutral-200">
                <p className="text-sm text-neutral-500">Finalizate</p>
                <p className="text-2xl font-bold text-neutral-900">{completedDeliveries.length}</p>
              </div>
            </div>

            {/* Pending Deliveries */}
            {pendingDeliveries.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-neutral-900">În Curs</h2>
                {pendingDeliveries.map((delivery, index) => (
                  <div 
                    key={delivery.id}
                    className={`bg-white rounded-xl border-2 p-4 ${STATUS_COLORS[delivery.status]}`}
                    data-testid={`delivery-card-${delivery.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#2E7D32] rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{delivery.order_info?.client_name}</p>
                          <p className="text-sm text-neutral-500">
                            {formatCurrency(delivery.order_info?.total || 0)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={delivery.status === 'in_transit' ? 'default' : 'outline'}>
                        {delivery.status === 'in_transit' ? 'În Tranzit' : 'În Așteptare'}
                      </Badge>
                    </div>

                    <div className="flex items-start gap-2 mb-4 p-3 bg-neutral-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-neutral-700">{delivery.order_info?.client_address}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <a 
                        href={`tel:${delivery.order_info?.client_phone}`}
                        className="flex flex-col items-center gap-1 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                        data-testid={`call-btn-${delivery.id}`}
                      >
                        <Phone className="w-6 h-6 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">Sună</span>
                      </a>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.order_info?.client_address || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                        data-testid={`navigate-btn-${delivery.id}`}
                      >
                        <Navigation className="w-6 h-6 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">Navighează</span>
                      </a>
                      <button
                        onClick={() => setConfirmingDelivery(delivery)}
                        className="flex flex-col items-center gap-1 p-3 bg-[#E8F5E9] rounded-xl hover:bg-[#C8E6C9] transition-colors"
                        data-testid={`confirm-btn-${delivery.id}`}
                      >
                        <Check className="w-6 h-6 text-[#2E7D32]" />
                        <span className="text-xs font-medium text-[#2E7D32]">Confirmă</span>
                      </button>
                    </div>

                    {/* WhatsApp Button */}
                    <a 
                      href={`https://wa.me/4${delivery.order_info?.client_phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full mt-3 p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                      data-testid={`whatsapp-btn-${delivery.id}`}
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span className="font-medium">WhatsApp</span>
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Completed Deliveries */}
            {completedDeliveries.length > 0 && (
              <div className="space-y-3 mt-6">
                <h2 className="text-lg font-semibold text-neutral-900">Finalizate</h2>
                {completedDeliveries.map((delivery) => (
                  <div 
                    key={delivery.id}
                    className={`bg-white rounded-xl border p-4 opacity-75 ${
                      delivery.status === 'delivered' ? 'border-green-200' : 'border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{delivery.order_info?.client_name}</p>
                        <p className="text-sm text-neutral-500">{delivery.order_info?.client_address}</p>
                      </div>
                      <Badge className={delivery.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {delivery.status === 'delivered' ? 'Livrat' : 'Eșuat'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingDeliveries.length === 0 && completedDeliveries.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">Nu aveți livrări programate pentru azi</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirm Delivery Dialog */}
      <Dialog open={!!confirmingDelivery} onOpenChange={() => setConfirmingDelivery(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmă Livrarea</DialogTitle>
          </DialogHeader>
          {confirmingDelivery && (
            <div className="space-y-4">
              <div className="bg-neutral-50 rounded-lg p-4">
                <p className="font-semibold">{confirmingDelivery.order_info?.client_name}</p>
                <p className="text-sm text-neutral-500">{confirmingDelivery.order_info?.client_address}</p>
                <p className="text-lg font-bold text-[#2E7D32] mt-2">
                  {formatCurrency(confirmingDelivery.order_info?.total || 0)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  className="w-full h-14 text-lg bg-[#2E7D32] hover:bg-[#1B5E20]"
                  onClick={() => updateDeliveryStatus(confirmingDelivery.id, 'delivered')}
                  data-testid="confirm-delivered-btn"
                >
                  <Check className="w-6 h-6 mr-2" />
                  Marcat ca Livrat
                </Button>
                <Button 
                  variant="outline"
                  className="w-full h-14 text-lg border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => updateDeliveryStatus(confirmingDelivery.id, 'failed')}
                  data-testid="confirm-failed-btn"
                >
                  Refuzat / Eșuat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Oblio Integration Simulation */}
      <Dialog open={showOblioSpinner} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs">
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-[#2E7D32] mx-auto mb-4" />
            <p className="font-medium">Se emite factura în Oblio...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Success Dialog */}
      <Dialog open={!!oblioInvoice} onOpenChange={() => setOblioInvoice(null)}>
        <DialogContent className="max-w-xs">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#2E7D32]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Factură Emisă</h3>
            <p className="text-2xl font-bold text-[#2E7D32] mb-4">#{oblioInvoice}</p>
            <Button 
              className="w-full bg-[#2E7D32] hover:bg-[#1B5E20]"
              onClick={() => setOblioInvoice(null)}
            >
              Închide
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
