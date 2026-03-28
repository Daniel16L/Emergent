import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Eye, 
  Plus,
  RefreshCw,
  Phone,
  MapPin,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_LABELS = {
  new: 'Nouă',
  confirmed: 'Confirmată',
  allocated: 'Alocată',
  in_transit: 'În Tranzit',
  delivered: 'Livrată',
  refused: 'Refuzată',
  cancelled: 'Anulată'
};

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  allocated: 'bg-purple-100 text-purple-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  refused: 'bg-red-100 text-red-800',
  cancelled: 'bg-neutral-100 text-neutral-800'
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Neplătită',
  paid: 'Plătită',
  refund_pending: 'Rambursare în așteptare',
  refunded: 'Rambursată'
};

const CHANNEL_LABELS = {
  online: 'Online',
  phone: 'Telefon',
  'in-store': 'Magazin'
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    channel: '',
    search: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.channel) params.channel = filters.channel;
      
      const response = await axios.get(`${API_URL}/api/orders`, { params });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = orders.filter(order => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        order.client_name?.toLowerCase().includes(search) ||
        order.client_phone?.includes(search)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6" data-testid="orders-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Comenzi</h1>
          <p className="text-neutral-500 mt-1">Gestionare și urmărire comenzi</p>
        </div>
        <Link to="/new-order">
          <Button className="bg-[#2E7D32] hover:bg-[#1B5E20] gap-2" data-testid="new-order-btn">
            <Plus className="w-4 h-4" />
            Comandă Nouă
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Caută după nume client sau telefon..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
                data-testid="search-orders"
              />
            </div>
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-full md:w-48" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={filters.channel} 
              onValueChange={(value) => setFilters({ ...filters, channel: value })}
            >
              <SelectTrigger className="w-full md:w-40" data-testid="filter-channel">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchOrders} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualizare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-[#2E7D32]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead>Data</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plată</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-neutral-50">
                      <TableCell className="font-mono text-sm">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.client_name}</p>
                          <p className="text-sm text-neutral-500">{order.client_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CHANNEL_LABELS[order.channel] || order.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
                          {PAYMENT_STATUS_LABELS[order.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                          data-testid={`view-order-${order.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-neutral-500">
                        Nu există comenzi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalii Comandă</span>
              <Badge className={STATUS_COLORS[selectedOrder?.status]}>
                {STATUS_LABELS[selectedOrder?.status]}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold text-neutral-900 mb-3">Informații Client</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">Nume</p>
                    <p className="font-medium">{selectedOrder.client_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Telefon</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedOrder.client_phone}</p>
                      <a 
                        href={`https://wa.me/4${selectedOrder.client_phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2E7D32] hover:underline text-sm"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-neutral-500">Adresă</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-neutral-400" />
                      {selectedOrder.client_address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Lines */}
              <div>
                <h3 className="font-semibold text-neutral-900 mb-3">Produse</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produs</TableHead>
                      <TableHead className="text-right">Cantitate</TableHead>
                      <TableHead className="text-right">Preț Unitar</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.lines?.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{line.product_name}</TableCell>
                        <TableCell className="text-right">{line.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(line.quantity * line.unit_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-neutral-50">
                      <TableCell colSpan={3} className="text-right font-semibold">Total</TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(selectedOrder.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Canal</p>
                  <p className="font-medium">{CHANNEL_LABELS[selectedOrder.channel]}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Metodă Plată</p>
                  <p className="font-medium capitalize">{selectedOrder.payment_method?.replace('-', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Agent</p>
                  <p className="font-medium">{selectedOrder.agent_name}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Data</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-neutral-500">Note</p>
                  <p className="font-medium bg-neutral-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {selectedOrder.status === 'new' && (
                  <Button 
                    className="bg-[#2E7D32] hover:bg-[#1B5E20]"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                    data-testid="confirm-order-btn"
                  >
                    Confirmă Comanda
                  </Button>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'allocated')}
                  >
                    Alocă pentru Livrare
                  </Button>
                )}
                {['new', 'confirmed'].includes(selectedOrder.status) && (
                  <Button 
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                  >
                    Anulează
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
