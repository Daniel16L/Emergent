import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, 
  Plus,
  AlertTriangle,
  RefreshCw,
  FileText
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Stock() {
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    product_id: '',
    quantity: '',
    invoice_nr: '',
    cost: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, receiptsRes] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/receipts`)
      ]);
      setProducts(productsRes.data);
      setReceipts(receiptsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReceipt = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/receipts`, {
        product_id: receiptForm.product_id,
        quantity: parseFloat(receiptForm.quantity),
        invoice_nr: receiptForm.invoice_nr,
        cost: parseFloat(receiptForm.cost)
      });
      toast.success('Recepție adăugată cu succes!');
      setShowReceiptDialog(false);
      setReceiptForm({ product_id: '', quantity: '', invoice_nr: '', cost: '' });
      fetchData();
    } catch (error) {
      toast.error('Eroare la adăugarea recepției');
      console.error('Error adding receipt:', error);
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
      year: 'numeric'
    });
  };

  const lowStockProducts = products.filter(p => p.current_stock < p.min_stock_alert);

  return (
    <div className="space-y-6" data-testid="stock-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Stoc & Recepții</h1>
          <p className="text-neutral-500 mt-1">Gestionare produse și intrări stoc</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualizare
          </Button>
          <Button 
            className="bg-[#2E7D32] hover:bg-[#1B5E20] gap-2"
            onClick={() => setShowReceiptDialog(true)}
            data-testid="add-receipt-btn"
          >
            <Plus className="w-4 h-4" />
            Recepție Nouă
          </Button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <Card className="border-[#FF7043] bg-[#FBE9E7]" data-testid="low-stock-alerts">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-[#E64A19]">
              <AlertTriangle className="w-5 h-5" />
              Alerte Stoc Scăzut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((product) => (
                <Badge 
                  key={product.id} 
                  className="bg-white text-[#E64A19] border border-[#FF7043]"
                >
                  {product.name}: {product.current_stock} (min: {product.min_stock_alert})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Table */}
      <Card data-testid="stock-table">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventar Produse
          </CardTitle>
        </CardHeader>
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
                    <TableHead>Produs</TableHead>
                    <TableHead>Unitate</TableHead>
                    <TableHead className="text-right">Greutate/Unitate</TableHead>
                    <TableHead className="text-right">Stoc Actual</TableHead>
                    <TableHead className="text-right">Stoc Minim</TableHead>
                    <TableHead className="text-right">Cost Achiziție</TableHead>
                    <TableHead className="text-right">Preț Vânzare</TableHead>
                    <TableHead className="text-right">Marjă</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const isLowStock = product.current_stock < product.min_stock_alert;
                    const margin = ((product.sale_price - product.purchase_cost) / product.sale_price) * 100;
                    
                    return (
                      <TableRow 
                        key={product.id}
                        className={isLowStock ? 'bg-[#FBE9E7]/50' : ''}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isLowStock && (
                              <AlertTriangle className="w-4 h-4 text-[#FF7043]" />
                            )}
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell className="text-right">{product.weight_per_unit} kg</TableCell>
                        <TableCell className={`text-right font-semibold ${isLowStock ? 'text-[#FF7043]' : ''}`}>
                          {product.current_stock}
                        </TableCell>
                        <TableCell className="text-right">{product.min_stock_alert}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.purchase_cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-[#E8F5E9] text-[#2E7D32]">
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Receipts */}
      <Card data-testid="receipts-table">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recepții Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead>Data</TableHead>
                  <TableHead>Produs</TableHead>
                  <TableHead className="text-right">Cantitate</TableHead>
                  <TableHead>Nr. Factură</TableHead>
                  <TableHead className="text-right">Cost Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.length > 0 ? receipts.slice(0, 10).map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>{formatDate(receipt.date)}</TableCell>
                    <TableCell className="font-medium">{receipt.product_name}</TableCell>
                    <TableCell className="text-right">{receipt.quantity}</TableCell>
                    <TableCell>{receipt.invoice_nr}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(receipt.cost)}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-neutral-500">
                      Nu există recepții
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recepție Nouă</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddReceipt} className="space-y-4">
            <div>
              <Label>Produs *</Label>
              <Select 
                value={receiptForm.product_id}
                onValueChange={(value) => setReceiptForm({ ...receiptForm, product_id: value })}
              >
                <SelectTrigger data-testid="receipt-product">
                  <SelectValue placeholder="Selectează produs" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Cantitate *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={receiptForm.quantity}
                onChange={(e) => setReceiptForm({ ...receiptForm, quantity: e.target.value })}
                required
                data-testid="receipt-quantity"
              />
            </div>
            <div>
              <Label htmlFor="invoice_nr">Nr. Factură *</Label>
              <Input
                id="invoice_nr"
                value={receiptForm.invoice_nr}
                onChange={(e) => setReceiptForm({ ...receiptForm, invoice_nr: e.target.value })}
                required
                data-testid="receipt-invoice"
              />
            </div>
            <div>
              <Label htmlFor="cost">Cost Total (RON) *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={receiptForm.cost}
                onChange={(e) => setReceiptForm({ ...receiptForm, cost: e.target.value })}
                required
                data-testid="receipt-cost"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowReceiptDialog(false)}
              >
                Anulează
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20]"
                disabled={!receiptForm.product_id}
                data-testid="save-receipt-btn"
              >
                Salvează Recepție
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
