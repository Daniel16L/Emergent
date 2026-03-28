import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  MapPin,
  ShoppingCart,
  Truck,
  CreditCard,
  AlertTriangle,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function NewOrder() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [orderLines, setOrderLines] = useState([]);
  const [orderData, setOrderData] = useState({
    channel: 'phone',
    payment_method: 'cash-on-delivery',
    delivery_type: 'own_fleet',
    notes: '',
    estimated_date: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchClients();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const searchClient = async () => {
    if (phoneSearch.length < 4) return;
    try {
      const response = await axios.get(`${API_URL}/api/clients/search/${phoneSearch}`);
      if (response.data) {
        setSelectedClient(response.data);
        toast.success('Client găsit!');
      } else {
        toast.error('Client negăsit');
      }
    } catch (error) {
      console.error('Error searching client:', error);
    }
  };

  const addProductToOrder = (product) => {
    const existing = orderLines.find(line => line.product_id === product.id);
    if (existing) {
      setOrderLines(orderLines.map(line => 
        line.product_id === product.id 
          ? { ...line, quantity: line.quantity + 1 }
          : line
      ));
    } else {
      setOrderLines([...orderLines, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.sale_price,
        current_stock: product.current_stock,
        min_stock_alert: product.min_stock_alert
      }]);
    }
  };

  const updateLineQuantity = (productId, delta) => {
    setOrderLines(orderLines.map(line => {
      if (line.product_id === productId) {
        const newQty = Math.max(0, line.quantity + delta);
        return { ...line, quantity: newQty };
      }
      return line;
    }).filter(line => line.quantity > 0));
  };

  const removeLine = (productId) => {
    setOrderLines(orderLines.filter(line => line.product_id !== productId));
  };

  const calculateTotal = () => {
    return orderLines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error('Selectați un client');
      return;
    }
    if (orderLines.length === 0) {
      toast.error('Adăugați cel puțin un produs');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_id: selectedClient.id,
        channel: orderData.channel,
        payment_method: orderData.payment_method,
        delivery_type: orderData.delivery_type,
        notes: orderData.notes,
        estimated_date: orderData.estimated_date,
        lines: orderLines.map(line => ({
          product_id: line.product_id,
          product_name: line.product_name,
          quantity: line.quantity,
          unit_price: line.unit_price
        }))
      };

      await axios.post(`${API_URL}/api/orders`, payload);
      toast.success('Comandă creată cu succes!');
      navigate('/orders');
    } catch (error) {
      toast.error('Eroare la crearea comenzii');
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="new-order-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Comandă Nouă</h1>
        <p className="text-neutral-500 mt-1">Creează o comandă nouă pentru un client</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <Card data-testid="client-selection">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Selectare Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    placeholder="Caută după telefon..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchClient()}
                    className="pl-10"
                    data-testid="phone-search"
                  />
                </div>
                <Button onClick={searchClient} variant="outline" data-testid="search-client-btn">
                  <Search className="w-4 h-4 mr-2" />
                  Caută
                </Button>
              </div>

              <div className="mb-4">
                <Label>Sau selectează din listă</Label>
                <Select 
                  value={selectedClient?.id || ''} 
                  onValueChange={(value) => {
                    const client = clients.find(c => c.id === value);
                    setSelectedClient(client);
                  }}
                >
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Selectează client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClient && (
                <div className="bg-[#E8F5E9] rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#2E7D32]">{selectedClient.name}</p>
                      <p className="text-sm text-neutral-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {selectedClient.phone}
                      </p>
                      <p className="text-sm text-neutral-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {selectedClient.address}, {selectedClient.city}, {selectedClient.county}
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-[#2E7D32]" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Selection */}
          <Card data-testid="products-selection">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Selectare Produse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.map((product) => {
                  const isLowStock = product.current_stock < product.min_stock_alert;
                  const lineQty = orderLines.find(l => l.product_id === product.id)?.quantity || 0;
                  
                  return (
                    <div 
                      key={product.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-[#2E7D32] ${
                        lineQty > 0 ? 'border-[#2E7D32] bg-[#E8F5E9]/50' : 'border-neutral-200'
                      }`}
                      onClick={() => addProductToOrder(product)}
                      data-testid={`product-${product.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">{product.name}</p>
                          <p className="text-sm text-neutral-500">{product.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#2E7D32]">
                            {formatCurrency(product.sale_price)}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {isLowStock && (
                              <AlertTriangle className="w-3 h-3 text-[#FF7043]" />
                            )}
                            <span className={`text-xs ${isLowStock ? 'text-[#FF7043]' : 'text-neutral-500'}`}>
                              Stoc: {product.current_stock}
                            </span>
                          </div>
                        </div>
                      </div>
                      {lineQty > 0 && (
                        <Badge className="mt-2 bg-[#2E7D32]">
                          În comandă: {lineQty}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          {/* Order Lines */}
          <Card data-testid="order-summary">
            <CardHeader>
              <CardTitle>Sumar Comandă</CardTitle>
            </CardHeader>
            <CardContent>
              {orderLines.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">
                  Nu ați adăugat produse
                </p>
              ) : (
                <div className="space-y-3">
                  {orderLines.map((line) => (
                    <div key={line.product_id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{line.product_name}</p>
                        <p className="text-xs text-neutral-500">
                          {formatCurrency(line.unit_price)} x {line.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => updateLineQuantity(line.product_id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{line.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => updateLineQuantity(line.product_id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => removeLine(line.product_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-[#2E7D32]">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Opțiuni Comandă
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Canal Vânzare</Label>
                <Select 
                  value={orderData.channel}
                  onValueChange={(value) => setOrderData({ ...orderData, channel: value })}
                >
                  <SelectTrigger data-testid="select-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Telefon</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="in-store">Magazin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Metodă Plată</Label>
                <Select 
                  value={orderData.payment_method}
                  onValueChange={(value) => setOrderData({ ...orderData, payment_method: value })}
                >
                  <SelectTrigger data-testid="select-payment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash-on-delivery">Ramburs</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank-transfer">Transfer Bancar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Tip Livrare
                </Label>
                <Select 
                  value={orderData.delivery_type}
                  onValueChange={(value) => setOrderData({ ...orderData, delivery_type: value })}
                >
                  <SelectTrigger data-testid="select-delivery">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own_fleet">Flotă Proprie</SelectItem>
                    <SelectItem value="courier">Curier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Estimată Livrare</Label>
                <Input 
                  type="date"
                  value={orderData.estimated_date}
                  onChange={(e) => setOrderData({ ...orderData, estimated_date: e.target.value })}
                  data-testid="delivery-date"
                />
              </div>

              <div>
                <Label>Note</Label>
                <Textarea
                  placeholder="Note adiționale..."
                  value={orderData.notes}
                  onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                  rows={3}
                  data-testid="order-notes"
                />
              </div>

              <Button 
                className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] h-12 text-lg"
                onClick={handleSubmit}
                disabled={loading || !selectedClient || orderLines.length === 0}
                data-testid="submit-order"
              >
                {loading ? 'Se procesează...' : 'Plasează Comanda'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
