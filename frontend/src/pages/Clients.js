import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, 
  Plus,
  Phone,
  MapPin,
  Mail,
  Building,
  ChevronDown,
  ChevronUp,
  Edit,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../components/ui/collapsible';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);
  const [clientOrders, setClientOrders] = useState({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    county: 'Suceava',
    city: '',
    address: '',
    cui: '',
    email: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientOrders = async (clientId) => {
    if (clientOrders[clientId]) return;
    try {
      const response = await axios.get(`${API_URL}/api/clients/${clientId}/orders`);
      setClientOrders(prev => ({ ...prev, [clientId]: response.data }));
    } catch (error) {
      console.error('Error fetching client orders:', error);
    }
  };

  const toggleClient = (clientId) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
      fetchClientOrders(clientId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await axios.put(`${API_URL}/api/clients/${editingClient.id}`, formData);
        toast.success('Client actualizat!');
      } else {
        await axios.post(`${API_URL}/api/clients`, formData);
        toast.success('Client adăugat!');
      }
      setShowAddDialog(false);
      setEditingClient(null);
      resetForm();
      fetchClients();
    } catch (error) {
      toast.error('Eroare la salvare');
      console.error('Error saving client:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      county: 'Suceava',
      city: '',
      address: '',
      cui: '',
      email: ''
    });
  };

  const openEditDialog = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      county: client.county,
      city: client.city,
      address: client.address,
      cui: client.cui || '',
      email: client.email || ''
    });
    setShowAddDialog(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0
    }).format(value);
  };

  const calculateAnnualConsumption = (orders) => {
    if (!orders || orders.length === 0) return {};
    const consumption = {};
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    orders.forEach(order => {
      if (new Date(order.created_at) >= oneYearAgo) {
        order.lines?.forEach(line => {
          if (!consumption[line.product_name]) {
            consumption[line.product_name] = 0;
          }
          consumption[line.product_name] += line.quantity;
        });
      }
    });
    return consumption;
  };

  const filteredClients = clients.filter(client => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.phone.includes(search) ||
      client.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6" data-testid="clients-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Clienți</h1>
          <p className="text-neutral-500 mt-1">{clients.length} clienți înregistrați</p>
        </div>
        <Button 
          className="bg-[#2E7D32] hover:bg-[#1B5E20] gap-2"
          onClick={() => {
            resetForm();
            setEditingClient(null);
            setShowAddDialog(true);
          }}
          data-testid="add-client-btn"
        >
          <Plus className="w-4 h-4" />
          Client Nou
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="Caută după nume, telefon sau oraș..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="search-clients"
        />
      </div>

      {/* Clients List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2E7D32]" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => {
            const orders = clientOrders[client.id] || [];
            const consumption = calculateAnnualConsumption(orders);
            const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

            return (
              <Collapsible 
                key={client.id}
                open={expandedClient === client.id}
                onOpenChange={() => toggleClient(client.id)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center shrink-0">
                            <span className="text-[#2E7D32] font-semibold text-lg">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-neutral-900">{client.name}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-neutral-500">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client.phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {client.city}, {client.county}
                              </span>
                              {client.cui && (
                                <span className="flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {client.cui}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(client);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <a 
                            href={`https://wa.me/4${client.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 hover:bg-[#E8F5E9] rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-[#2E7D32]" />
                          </a>
                          {expandedClient === client.id ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t bg-neutral-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* Order History */}
                        <div>
                          <h4 className="font-semibold text-neutral-900 mb-3">Istoric Comenzi</h4>
                          {orders.length > 0 ? (
                            <div className="space-y-2">
                              {orders.slice(0, 5).map((order) => (
                                <div 
                                  key={order.id}
                                  className="flex items-center justify-between p-2 bg-white rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {new Date(order.created_at).toLocaleDateString('ro-RO')}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                      {order.lines?.length || 0} produse
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    {formatCurrency(order.total)}
                                  </Badge>
                                </div>
                              ))}
                              <div className="pt-2 border-t mt-2">
                                <p className="text-sm font-semibold">
                                  Total comenzi: {formatCurrency(totalSpent)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-neutral-500 text-sm">Nu există comenzi</p>
                          )}
                        </div>

                        {/* Annual Consumption */}
                        <div>
                          <h4 className="font-semibold text-neutral-900 mb-3">Consum Anual Estimat</h4>
                          {Object.keys(consumption).length > 0 ? (
                            <div className="space-y-2">
                              {Object.entries(consumption).map(([product, qty]) => (
                                <div 
                                  key={product}
                                  className="flex items-center justify-between p-2 bg-white rounded-lg"
                                >
                                  <span className="text-sm">{product}</span>
                                  <Badge className="bg-[#2E7D32]">{qty} unități</Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-neutral-500 text-sm">Nu există date suficiente</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
          {filteredClients.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-neutral-500">
                Nu au fost găsiți clienți
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add/Edit Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Editare Client' : 'Client Nou'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nume *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="client-name-input"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                data-testid="client-phone-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="county">Județ</Label>
                <Input
                  id="county"
                  value={formData.county}
                  onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">Oraș *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  data-testid="client-city-input"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Adresă *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                data-testid="client-address-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cui">CUI (opțional)</Label>
                <Input
                  id="cui"
                  value={formData.cui}
                  onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email (opțional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAddDialog(false)}
              >
                Anulează
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]"
                data-testid="save-client-btn"
              >
                {editingClient ? 'Salvează' : 'Adaugă'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
