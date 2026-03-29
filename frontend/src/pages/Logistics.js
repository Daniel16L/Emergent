import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
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
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

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

// Marker colors based on delivery status
const MARKER_COLORS = {
  pending: '#EAB308',    // Yellow
  in_transit: '#3B82F6', // Blue
  delivered: '#22C55E',  // Green
  failed: '#EF4444'      // Red
};

// Suceava county center and surrounding coordinates
const SUCEAVA_CENTER = { lat: 47.6514, lng: 25.9231 };

// Sample coordinates for demo clients in Suceava county
const CITY_COORDINATES = {
  'Suceava': { lat: 47.6514, lng: 26.2556 },
  'Rădăuți': { lat: 47.8489, lng: 25.9208 },
  'Vatra Dornei': { lat: 47.3464, lng: 25.3544 },
  'Fălticeni': { lat: 47.4597, lng: 26.3044 },
  'Câmpulung Moldovenesc': { lat: 47.5314, lng: 25.5514 },
  'Gura Humorului': { lat: 47.5539, lng: 25.8892 },
  'Siret': { lat: 47.9500, lng: 26.0667 }
};

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Custom marker icon SVG generator
const createMarkerIcon = (color) => {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: color,
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#FFFFFF',
    scale: 1.8,
    anchor: { x: 12, y: 24 }
  };
};

export default function Logistics() {
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [map, setMap] = useState(null);
  const [assignForm, setAssignForm] = useState({
    driver_id: '',
    vehicle_id: '',
    estimated_date: '',
    km: '',
    transport_cost: ''
  });

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

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
    return vehicleDeliveries.length * 2000;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Get coordinates for a delivery based on city in address
  const getDeliveryCoordinates = (delivery, index) => {
    const address = delivery.order_info?.client_address || '';
    for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
      if (address.includes(city)) {
        // Add small offset to prevent overlapping markers
        return {
          lat: coords.lat + (index * 0.008),
          lng: coords.lng + (index * 0.008)
        };
      }
    }
    // Default to Suceava with offset
    return {
      lat: SUCEAVA_CENTER.lat + (index * 0.01),
      lng: SUCEAVA_CENTER.lng + (index * 0.01)
    };
  };

  // Get active deliveries for map display
  const activeDeliveries = deliveries.filter(d => ['pending', 'in_transit'].includes(d.status));

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
                      Livrări Active
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activeDeliveries.slice(0, 5).map((delivery) => (
                      <div 
                        key={delivery.id}
                        className="p-2 bg-neutral-50 rounded-lg flex items-center justify-between cursor-pointer hover:bg-neutral-100"
                        onClick={() => setSelectedMarker(delivery)}
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
                    {activeDeliveries.length === 0 && (
                      <p className="text-neutral-500 text-center py-4 text-sm">
                        Nu există livrări active
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Map Legend */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Legendă Hartă</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-500" />
                      <span className="text-xs">În Așteptare</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                      <span className="text-xs">În Tranzit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500" />
                      <span className="text-xs">Livrat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                      <span className="text-xs">Eșuat</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Map Column */}
              <div className="lg:col-span-6">
                <Card className="h-full min-h-[600px]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Navigation className="w-5 h-5" />
                      Hartă Livrări - Județul Suceava
                      <Badge variant="outline" className="ml-auto">
                        {activeDeliveries.length} active
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-60px)]">
                    <div className="w-full h-full rounded-b-lg overflow-hidden">
                      {isLoaded ? (
                        <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={SUCEAVA_CENTER}
                          zoom={9}
                          onLoad={onLoad}
                          onUnmount={onUnmount}
                          options={mapOptions}
                        >
                          {/* Delivery Markers */}
                          {deliveries.map((delivery, index) => {
                            const position = getDeliveryCoordinates(delivery, index);
                            const markerColor = MARKER_COLORS[delivery.status] || MARKER_COLORS.pending;
                            
                            return (
                              <Marker
                                key={delivery.id}
                                position={position}
                                icon={createMarkerIcon(markerColor)}
                                onClick={() => setSelectedMarker(delivery)}
                                title={delivery.order_info?.client_name}
                              />
                            );
                          })}

                          {/* Info Window for selected marker */}
                          {selectedMarker && (
                            <InfoWindow
                              position={getDeliveryCoordinates(selectedMarker, deliveries.indexOf(selectedMarker))}
                              onCloseClick={() => setSelectedMarker(null)}
                            >
                              <div className="p-2 max-w-xs">
                                <h3 className="font-semibold text-sm mb-1">
                                  {selectedMarker.order_info?.client_name}
                                </h3>
                                <p className="text-xs text-gray-600 mb-2">
                                  {selectedMarker.order_info?.client_address}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-green-700">
                                    {formatCurrency(selectedMarker.order_info?.total || 0)}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    selectedMarker.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    selectedMarker.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                                    selectedMarker.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {STATUS_LABELS[selectedMarker.status]}
                                  </span>
                                </div>
                                {selectedMarker.driver_info && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Șofer: {selectedMarker.driver_info.name}
                                  </p>
                                )}
                              </div>
                            </InfoWindow>
                          )}
                        </GoogleMap>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                          <RefreshCw className="w-8 h-8 animate-spin text-[#2E7D32]" />
                        </div>
                      )}
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
