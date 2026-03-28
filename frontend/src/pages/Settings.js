import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings as SettingsIcon, 
  Users,
  Truck,
  Package,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Link2
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ROLE_LABELS = {
  admin: 'Administrator',
  agent: 'Agent',
  driver: 'Șofer'
};

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User Dialog
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'agent'
  });

  // Vehicle Dialog
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    plate: '',
    name: '',
    max_kg: '',
    fuel_consumption: ''
  });

  // Product Dialog
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    unit: 'palet',
    weight_per_unit: '',
    current_stock: '',
    min_stock_alert: '',
    purchase_cost: '',
    sale_price: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, vehiclesRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users`),
        axios.get(`${API_URL}/api/vehicles`),
        axios.get(`${API_URL}/api/products`)
      ]);
      setUsers(usersRes.data);
      setVehicles(vehiclesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // User handlers
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/users`, userForm);
      toast.success('Utilizator adăugat!');
      setShowUserDialog(false);
      setUserForm({ email: '', password: '', name: '', role: 'agent' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Eroare la adăugare');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Sigur doriți să ștergeți acest utilizator?')) return;
    try {
      await axios.delete(`${API_URL}/api/users/${userId}`);
      toast.success('Utilizator șters!');
      fetchData();
    } catch (error) {
      toast.error('Eroare la ștergere');
    }
  };

  // Vehicle handlers
  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...vehicleForm,
        max_kg: parseFloat(vehicleForm.max_kg),
        fuel_consumption: parseFloat(vehicleForm.fuel_consumption)
      };

      if (editingVehicle) {
        await axios.put(`${API_URL}/api/vehicles/${editingVehicle.id}`, payload);
        toast.success('Vehicul actualizat!');
      } else {
        await axios.post(`${API_URL}/api/vehicles`, payload);
        toast.success('Vehicul adăugat!');
      }
      setShowVehicleDialog(false);
      setEditingVehicle(null);
      setVehicleForm({ plate: '', name: '', max_kg: '', fuel_consumption: '' });
      fetchData();
    } catch (error) {
      toast.error('Eroare la salvare');
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Sigur doriți să ștergeți acest vehicul?')) return;
    try {
      await axios.delete(`${API_URL}/api/vehicles/${vehicleId}`);
      toast.success('Vehicul șters!');
      fetchData();
    } catch (error) {
      toast.error('Eroare la ștergere');
    }
  };

  const openEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      plate: vehicle.plate,
      name: vehicle.name,
      max_kg: vehicle.max_kg.toString(),
      fuel_consumption: vehicle.fuel_consumption.toString()
    });
    setShowVehicleDialog(true);
  };

  // Product handlers
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...productForm,
        weight_per_unit: parseFloat(productForm.weight_per_unit),
        current_stock: parseFloat(productForm.current_stock),
        min_stock_alert: parseFloat(productForm.min_stock_alert),
        purchase_cost: parseFloat(productForm.purchase_cost),
        sale_price: parseFloat(productForm.sale_price)
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/${editingProduct.id}`, payload);
        toast.success('Produs actualizat!');
      } else {
        await axios.post(`${API_URL}/api/products`, payload);
        toast.success('Produs adăugat!');
      }
      setShowProductDialog(false);
      setEditingProduct(null);
      setProductForm({ name: '', unit: 'palet', weight_per_unit: '', current_stock: '', min_stock_alert: '', purchase_cost: '', sale_price: '' });
      fetchData();
    } catch (error) {
      toast.error('Eroare la salvare');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Sigur doriți să ștergeți acest produs?')) return;
    try {
      await axios.delete(`${API_URL}/api/products/${productId}`);
      toast.success('Produs șters!');
      fetchData();
    } catch (error) {
      toast.error('Eroare la ștergere');
    }
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      unit: product.unit,
      weight_per_unit: product.weight_per_unit.toString(),
      current_stock: product.current_stock.toString(),
      min_stock_alert: product.min_stock_alert.toString(),
      purchase_cost: product.purchase_cost.toString(),
      sale_price: product.sale_price.toString()
    });
    setShowProductDialog(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Setări</h1>
          <p className="text-neutral-500 mt-1">Configurare utilizatori, vehicule și produse</p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizare
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2E7D32]" />
        </div>
      ) : (
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
              <Users className="w-4 h-4" />
              Utilizatori
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2" data-testid="tab-vehicles">
              <Truck className="w-4 h-4" />
              Vehicule
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2" data-testid="tab-products">
              <Package className="w-4 h-4" />
              Produse
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2" data-testid="tab-integrations">
              <Link2 className="w-4 h-4" />
              Integrări
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Utilizatori</CardTitle>
                <Button 
                  className="bg-[#2E7D32] hover:bg-[#1B5E20] gap-2"
                  onClick={() => setShowUserDialog(true)}
                  data-testid="add-user-btn"
                >
                  <Plus className="w-4 h-4" />
                  Utilizator Nou
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead>Nume</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-right">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Vehicule</CardTitle>
                <Button 
                  className="bg-[#2E7D32] hover:bg-[#1B5E20] gap-2"
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleForm({ plate: '', name: '', max_kg: '', fuel_consumption: '' });
                    setShowVehicleDialog(true);
                  }}
                  data-testid="add-vehicle-btn"
                >
                  <Plus className="w-4 h-4" />
                  Vehicul Nou
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead>Nr. Înmatriculare</TableHead>
                      <TableHead>Denumire</TableHead>
                      <TableHead className="text-right">Capacitate Max</TableHead>
                      <TableHead className="text-right">Consum/100km</TableHead>
                      <TableHead className="text-right">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-mono font-medium">{vehicle.plate}</TableCell>
                        <TableCell>{vehicle.name}</TableCell>
                        <TableCell className="text-right">{vehicle.max_kg} kg</TableCell>
                        <TableCell className="text-right">{vehicle.fuel_consumption} L</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditVehicle(vehicle)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Produse</CardTitle>
                <Button 
                  className="bg-[#2E7D32] hover:bg-[#1B5E20] gap-2"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({ name: '', unit: 'palet', weight_per_unit: '', current_stock: '', min_stock_alert: '', purchase_cost: '', sale_price: '' });
                    setShowProductDialog(true);
                  }}
                  data-testid="add-product-btn"
                >
                  <Plus className="w-4 h-4" />
                  Produs Nou
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead>Denumire</TableHead>
                      <TableHead>Unitate</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Preț Vânzare</TableHead>
                      <TableHead className="text-right">Stoc</TableHead>
                      <TableHead className="text-right">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.purchase_cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={product.current_stock < product.min_stock_alert ? 'destructive' : 'outline'}>
                            {product.current_stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditProduct(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📄</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Oblio</h3>
                      <p className="text-sm text-neutral-500">Facturare electronică</p>
                    </div>
                  </div>
                  <Badge className="bg-[#E8F5E9] text-[#2E7D32]">Activ (Simulat)</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💬</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">WhatsApp</h3>
                      <p className="text-sm text-neutral-500">Comunicare clienți</p>
                    </div>
                  </div>
                  <Badge className="bg-[#E8F5E9] text-[#2E7D32]">Activ</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🛒</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">WooCommerce</h3>
                      <p className="text-sm text-neutral-500">Sincronizare magazin online</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Coming Soon</Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Add User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Utilizator Nou</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <Label htmlFor="user-name">Nume *</Label>
              <Input
                id="user-name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
                data-testid="user-name-input"
              />
            </div>
            <div>
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
                data-testid="user-email-input"
              />
            </div>
            <div>
              <Label htmlFor="user-password">Parolă *</Label>
              <Input
                id="user-password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required
                data-testid="user-password-input"
              />
            </div>
            <div>
              <Label>Rol *</Label>
              <Select 
                value={userForm.role}
                onValueChange={(value) => setUserForm({ ...userForm, role: value })}
              >
                <SelectTrigger data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="driver">Șofer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowUserDialog(false)}>
                Anulează
              </Button>
              <Button type="submit" className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]" data-testid="save-user-btn">
                Salvează
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Editare Vehicul' : 'Vehicul Nou'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveVehicle} className="space-y-4">
            <div>
              <Label htmlFor="vehicle-plate">Nr. Înmatriculare *</Label>
              <Input
                id="vehicle-plate"
                value={vehicleForm.plate}
                onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })}
                placeholder="SV-01-ABC"
                required
              />
            </div>
            <div>
              <Label htmlFor="vehicle-name">Denumire *</Label>
              <Input
                id="vehicle-name"
                value={vehicleForm.name}
                onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                placeholder="MAN TGX 18.440"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle-max-kg">Capacitate Max (kg) *</Label>
                <Input
                  id="vehicle-max-kg"
                  type="number"
                  value={vehicleForm.max_kg}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, max_kg: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="vehicle-fuel">Consum/100km (L) *</Label>
                <Input
                  id="vehicle-fuel"
                  type="number"
                  step="0.1"
                  value={vehicleForm.fuel_consumption}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, fuel_consumption: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowVehicleDialog(false)}>
                Anulează
              </Button>
              <Button type="submit" className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]">
                Salvează
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editare Produs' : 'Produs Nou'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div>
              <Label htmlFor="product-name">Denumire *</Label>
              <Input
                id="product-name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unitate *</Label>
                <Select 
                  value={productForm.unit}
                  onValueChange={(value) => setProductForm({ ...productForm, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="palet">Palet</SelectItem>
                    <SelectItem value="sac">Sac</SelectItem>
                    <SelectItem value="metru ster">Metru Ster</SelectItem>
                    <SelectItem value="tonă">Tonă</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="product-weight">Greutate/Unitate (kg) *</Label>
                <Input
                  id="product-weight"
                  type="number"
                  value={productForm.weight_per_unit}
                  onChange={(e) => setProductForm({ ...productForm, weight_per_unit: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product-stock">Stoc Inițial *</Label>
                <Input
                  id="product-stock"
                  type="number"
                  value={productForm.current_stock}
                  onChange={(e) => setProductForm({ ...productForm, current_stock: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="product-min">Stoc Minim Alertă *</Label>
                <Input
                  id="product-min"
                  type="number"
                  value={productForm.min_stock_alert}
                  onChange={(e) => setProductForm({ ...productForm, min_stock_alert: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product-cost">Cost Achiziție (RON) *</Label>
                <Input
                  id="product-cost"
                  type="number"
                  value={productForm.purchase_cost}
                  onChange={(e) => setProductForm({ ...productForm, purchase_cost: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="product-price">Preț Vânzare (RON) *</Label>
                <Input
                  id="product-price"
                  type="number"
                  value={productForm.sale_price}
                  onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowProductDialog(false)}>
                Anulează
              </Button>
              <Button type="submit" className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]">
                Salvează
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
