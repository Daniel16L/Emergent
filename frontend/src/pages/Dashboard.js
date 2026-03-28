import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Package,
  AlertTriangle,
  RefreshCw,
  Phone,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = ['#2E7D32', '#FF7043', '#1976D2'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, monthlyRes, targetsRes, agentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`),
        axios.get(`${API_URL}/api/dashboard/monthly-sales`),
        axios.get(`${API_URL}/api/targets`),
        axios.get(`${API_URL}/api/agents`)
      ]);
      setStats(statsRes.data);
      setMonthlyData(monthlyRes.data);
      setTargets(targetsRes.data);
      setAgents(agentsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const channelData = stats ? [
    { name: 'Online', value: stats.channel_stats.online || 0 },
    { name: 'Telefon', value: stats.channel_stats.phone || 0 },
    { name: 'Magazin', value: stats.channel_stats['in-store'] || 0 }
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#2E7D32]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Panou de Control</h1>
          <p className="text-neutral-500 mt-1">Sumar activitate luna curentă</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchData}
          className="gap-2"
          data-testid="refresh-dashboard"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizare
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="card-hover" data-testid="metric-sales">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">Vânzări Totale</p>
                <p className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
                  {formatCurrency(stats?.total_sales || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#E8F5E9] rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#2E7D32]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="metric-orders">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">Comenzi</p>
                <p className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
                  {stats?.total_orders || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#E3F2FD] rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-[#1976D2]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="metric-margin">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">Valoare Medie</p>
                <p className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
                  {formatCurrency(stats?.total_orders ? stats.total_sales / stats.total_orders : 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#FFF3E0] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#FF7043]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="metric-low-stock">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">Stoc Scăzut</p>
                <p className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
                  {stats?.low_stock?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#FFEBEE] rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Chart */}
        <Card className="lg:col-span-2" data-testid="chart-monthly-sales">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Vânzări Lunare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label) => `Luna: ${label}`}
                  />
                  <Bar dataKey="sales" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Distribution Pie */}
        <Card data-testid="chart-channel">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Canale de Vânzare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  Nu există date pentru afișare
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Targets */}
        <Card data-testid="agent-targets">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Obiective Agenți</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {targets.length > 0 ? targets.slice(0, 5).map((target) => {
                const progress = target.value > 0 ? (target.achieved / target.value) * 100 : 0;
                return (
                  <div key={target.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">{target.agent_name}</span>
                      <span className="text-sm text-neutral-500">
                        {formatCurrency(target.achieved)} / {formatCurrency(target.value)}
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#2E7D32] transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-neutral-500 text-center py-4">Nu există obiective setate</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upsell Alerts */}
        <Card data-testid="upsell-alerts">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Alerte Upsell</CardTitle>
            <Badge className="bg-[#FF7043] text-white">
              {stats?.upsell_alerts?.length || 0}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.upsell_alerts?.length > 0 ? stats.upsell_alerts.map((alert, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#FBE9E7] rounded-lg"
                >
                  <div>
                    <p className="font-medium text-neutral-900 text-sm">{alert.client_name}</p>
                    <p className="text-xs text-neutral-500">A cumpărat anul trecut în această lună</p>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={`https://wa.me/4${alert.client_phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-lg hover:bg-[#E8F5E9] transition-colors"
                      data-testid={`whatsapp-${index}`}
                    >
                      <ExternalLink className="w-4 h-4 text-[#2E7D32]" />
                    </a>
                    <a 
                      href={`tel:${alert.client_phone}`}
                      className="p-2 bg-white rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-neutral-700" />
                    </a>
                  </div>
                </div>
              )) : (
                <p className="text-neutral-500 text-center py-4">Nu există alerte upsell</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Refund Pending */}
        <Card data-testid="refund-pending">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Rambursări în Așteptare</CardTitle>
            {stats?.refund_pending?.length > 0 && (
              <Badge variant="destructive">
                {stats.refund_pending.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.refund_pending?.length > 0 ? stats.refund_pending.map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-neutral-900 text-sm">{order.client_name}</p>
                    <p className="text-xs text-neutral-500">{formatCurrency(order.total)}</p>
                  </div>
                  <Badge className="bg-[#FF7043] text-white">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              )) : (
                <p className="text-neutral-500 text-center py-4">Nu există rambursări în așteptare</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
