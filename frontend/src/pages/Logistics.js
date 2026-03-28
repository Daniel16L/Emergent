import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Truck, 
  MapPin,
  Package,
  User,
  Plus,
  RefreshCw,
  Calendar,
  Navigation
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  pending: 'În Așteptare',
  in_transit: 'În Tranzit',
  delivered: 'Livrat',
  failed: 'Eșuat'
};

export default function Logistics() {
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignForm, setAssignForm] = useState({
    driver_id: '',
    vehicle_id: '',
    estimated_date: '',
    km: '',
    transport_cost: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, deliveriesRes, vehiclesRes, driversRes] = await Promise.all([
        axios.get(`${API_URL}/api/orders?status=confirmed`),
        axios.get(`${API_URL}/api/deliveries`),
        axios.get(`${API_URL}/api/vehicles`),
        axios.get(`${API_URL}/api/drivers`)
      ]);
      setOrders(ordersRes.data);
      setDeliveries(deliveriesRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDelivery = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await axios.post(`${API_URL}/api/deliveries`, {
        order_id: selectedOrder.id,
        delivery_type: 'own_fleet',
        driver_id: assignForm.driver_id,
        vehicle_id: assignForm.vehicle_id,
        estimated_date: assignForm.estimated_date,
        km: parseFloat(assignForm.km) || 0,
        transport_cost: parseFloat(assignForm.transport_cost) || 0
      });
      toast.success('Livrare alocată cu succes!');
      setShowAssignDialog(false);
      setSelectedOrder(null);
      setAssignForm({ driver_id: '', vehicle_id: '', estimated_date: '', km: '', transport_cost: '' });
      fetchData();
    } catch (error) {
      toast.error('Eroare la alocarea livrării');
      console.error('Error assigning delivery:', error);
    }
  };

  const openAssignDialog = (order) => {
    setSelectedOrder(order);
    setAssignForm({
      ...assignForm,
      estimated_date: order.estimated_date || new Date().toISOString().split('T')[0]
    });
    setShowAssignDialog(true);
  };

  const calculateVehicleLoad = (vehicleId) => {
    const vehicleDeliveries = deliveries.filter(d => 
      d.vehicle_id === vehicleId && 
      ['pending', 'in_transit'].includes(d.status)
    );
    // Simplified - in real app would calculate from order weights
    return vehicleDeliveries.length * 2000; // Assume 2 tons average per delivery
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6" data-testid="logistics-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Logistică</h1>
          <p className="text-neutral-500 mt-1">Planificare și urmărire livrări</p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizare
        </Button>
      </div>

      <Tabs defaultValue="fleet" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fleet" data-testid="tab-fleet">Flotă Proprie</TabsTrigger>
          <TabsTrigger value="courier" data-testid="tab-courier">Curier</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-[#2E7D32]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Pending Orders Column */}
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Comenzi de Alocat
                      <Badge className="ml-auto">{orders.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                    {orders.length > 0 ? orders.map((order) => (
                      <div 
                        key={order.id}
                        className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-[#2E7D32] cursor-pointer transition-colors"
                        onClick={() => openAssignDialog(order)}
                        data-testid={`pending-order-${order.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm">{order.client_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {formatCurrency(order.total)}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {order.client_address}
                        </p>
                        <Button 
                          size="sm" 
                          className="w-full mt-2 bg-[#2E7D32] hover:bg-[#1B5E20]"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Alocă
                        </Button>
                      </div>
                    )) : (
                      <p className="text-neutral-500 text-center py-4 text-sm">
                        Nu există comenzi de alocat
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Fleet & Drivers Column */}
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Flotă & Șoferi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {vehicles.map((vehicle) => {
                      const load = calculateVehicleLoad(vehicle.id);
                      const loadPercentage = (load / vehicle.max_kg) * 100;
                      const assignedDriver = drivers.find(d => 
                        deliveries.some(del => 
                          del.vehicle_id === vehicle.id && 
                          del.driver_id === d.id &&
                          ['pending', 'in_transit'].includes(del.status)
                        )
                      );

                      return (
                        <div 
                          key={vehicle.id}
                          className="p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">{vehicle.name}</p>
                              <p className="text-xs text-neutral-500">{vehicle.plate}</p>
                            </div>
                            <Badge variant="outline">{vehicle.max_kg} kg</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>Încărcare</span>
                              <span>{load} / {vehicle.max_kg} kg</span>
                            </div>
                            <Progress 
                              value={loadPercentage} 
                              className="h-2"
                            />
                          </div>
                          {assignedDriver && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                              <User className="w-3 h-3 text-neutral-400" />
                              <span className="text-xs text-neutral-600">{assignedDriver.name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Today's Deliveries */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Livrări Azi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {deliveries.filter(d => ['pending', 'in_transit'].includes(d.status)).slice(0, 5).map((delivery) => (
                      <div 
                        key={delivery.id}
                        className="p-2 bg-neutral-50 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{delivery.order_info?.client_name}</p>
                          <p className="text-xs text-neutral-500">{delivery.driver_info?.name}</p>
                        </div>
                        <Badge className={STATUS_COLORS[delivery.status]}>
                          {STATUS_LABELS[delivery.status]}
                        </Badge>
                      </div>
                    ))}
                    {deliveries.filter(d => ['pending', 'in_transit'].includes(d.status)).length === 0 && (
                      <p className="text-neutral-500 text-center py-4 text-sm">
                        Nu există livrări programate
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Map Column */}
              <div className="lg:col-span-6">
                <Card className="h-full min-h-[500px]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Navigation className="w-5 h-5" />
                      Hartă Livrări
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-60px)]">
                    <div className="w-full h-full bg-neutral-100 rounded-b-lg overflow-hidden">
                      <iframe
                        src="https://www.openstreetmap.org/export/embed.html?bbox=25.7%2C47.3%2C26.5%2C47.8&amp;layer=mapnik&amp;marker=47.6514,25.9231"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        title="Hartă Livrări"
                        data-testid="delivery-map"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="courier">
          <Card>
            <CardHeader>
              <CardTitle>Livrări Curier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 mb-4">
                  Introduceți AWB pentru livrările prin curier
                </p>
                <div className="max-w-md mx-auto flex gap-3">
                  <Input placeholder="AWB Number" />
                  <Button className="bg-[#2E7D32] hover:bg-[#1B5E20]">
                    Adaugă
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Delivery Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alocare Livrare</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-neutral-50 rounded-lg p-3">
                <p className="font-semibold">{selectedOrder.client_name}</p>
                <p className="text-sm text-neutral-500">{selectedOrder.client_address}</p>
                <p className="text-sm font-medium text-[#2E7D32] mt-1">
                  {formatCurrency(selectedOrder.total)}
                </p>
              </div>

              <form onSubmit={handleAssignDelivery} className="space-y-4">
                <div>
                  <Label>Șofer *</Label>
                  <Select 
                    value={assignForm.driver_id}
                    onValueChange={(value) => setAssignForm({ ...assignForm, driver_id: value })}
                  >
                    <SelectTrigger data-testid="select-driver">
                      <SelectValue placeholder="Selectează șofer" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Vehicul *</Label>
                  <Select 
                    value={assignForm.vehicle_id}
                    onValueChange={(value) => setAssignForm({ ...assignForm, vehicle_id: value })}
                  >
                    <SelectTrigger data-testid="select-vehicle">
                      <SelectValue placeholder="Selectează vehicul" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} ({vehicle.plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data Livrare *</Label>
                  <Input
                    type="date"
                    value={assignForm.estimated_date}
                    onChange={(e) => setAssignForm({ ...assignForm, estimated_date: e.target.value })}
                    required
                    data-testid="delivery-date-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Distanță (km)</Label>
                    <Input
                      type="number"
                      value={assignForm.km}
                      onChange={(e) => setAssignForm({ ...assignForm, km: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Cost Transport (RON)</Label>
                    <Input
                      type="number"
                      value={assignForm.transport_cost}
                      onChange={(e) => setAssignForm({ ...assignForm, transport_cost: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowAssignDialog(false)}
                  >
                    Anulează
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]"
                    disabled={!assignForm.driver_id || !assignForm.vehicle_id}
                    data-testid="confirm-assign-btn"
                  >
                    Confirmă Alocare
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
