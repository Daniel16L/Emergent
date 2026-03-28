import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  Target, 
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp
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

const TARGET_TYPE_LABELS = {
  monthly: 'Lunar',
  quarterly: 'Trimestrial',
  annual: 'Anual'
};

export default function Targets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    agent_id: '',
    target_type: 'monthly',
    value: '',
    period: new Date().toISOString().slice(0, 7) // YYYY-MM format
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [targetsRes, agentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/targets`),
        axios.get(`${API_URL}/api/agents`)
      ]);
      setTargets(targetsRes.data);
      setAgents(agentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTarget = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/targets`, {
        agent_id: formData.agent_id,
        target_type: formData.target_type,
        value: parseFloat(formData.value),
        period: formData.period
      });
      toast.success('Obiectiv adăugat!');
      setShowAddDialog(false);
      setFormData({ agent_id: '', target_type: 'monthly', value: '', period: new Date().toISOString().slice(0, 7) });
      fetchData();
    } catch (error) {
      toast.error('Eroare la adăugarea obiectivului');
      console.error('Error adding target:', error);
    }
  };

  const handleDeleteTarget = async (targetId) => {
    if (!window.confirm('Sigur doriți să ștergeți acest obiectiv?')) return;
    try {
      await axios.delete(`${API_URL}/api/targets/${targetId}`);
      toast.success('Obiectiv șters!');
      fetchData();
    } catch (error) {
      toast.error('Eroare la ștergere');
      console.error('Error deleting target:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getTargetsByType = (type) => targets.filter(t => t.target_type === type);

  const renderTargetCards = (filteredTargets) => {
    if (filteredTargets.length === 0) {
      return (
        <div className="text-center py-8 text-neutral-500">
          <Target className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <p>Nu există obiective setate</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTargets.map((target) => {
          const progress = target.value > 0 ? (target.achieved / target.value) * 100 : 0;
          const isCompleted = progress >= 100;

          return (
            <Card 
              key={target.id} 
              className={`${isCompleted ? 'border-[#2E7D32] bg-[#E8F5E9]/50' : ''}`}
              data-testid={`target-card-${target.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-neutral-900">{target.agent_name}</p>
                    <p className="text-sm text-neutral-500">{target.period}</p>
                  </div>
                  {user?.role === 'admin' && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteTarget(target.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider">Realizat</p>
                      <p className="text-2xl font-bold text-[#2E7D32]">
                        {formatCurrency(target.achieved || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider">Obiectiv</p>
                      <p className="text-lg font-semibold text-neutral-700">
                        {formatCurrency(target.value)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">Progres</span>
                      <span className={`font-medium ${isCompleted ? 'text-[#2E7D32]' : ''}`}>
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(progress, 100)} 
                      className="h-3"
                    />
                  </div>

                  {isCompleted && (
                    <Badge className="w-full justify-center bg-[#2E7D32] text-white">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Obiectiv Atins!
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="targets-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Obiective</h1>
          <p className="text-neutral-500 mt-1">Setare și urmărire obiective agenți</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualizare
          </Button>
          {user?.role === 'admin' && (
            <Button 
              className="bg-[#2E7D32] hover:bg-[#1B5E20] gap-2"
              onClick={() => setShowAddDialog(true)}
              data-testid="add-target-btn"
            >
              <Plus className="w-4 h-4" />
              Obiectiv Nou
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2E7D32]" />
        </div>
      ) : (
        <Tabs defaultValue="monthly" className="space-y-6">
          <TabsList>
            <TabsTrigger value="monthly" data-testid="tab-monthly">
              Lunar ({getTargetsByType('monthly').length})
            </TabsTrigger>
            <TabsTrigger value="quarterly" data-testid="tab-quarterly">
              Trimestrial ({getTargetsByType('quarterly').length})
            </TabsTrigger>
            <TabsTrigger value="annual" data-testid="tab-annual">
              Anual ({getTargetsByType('annual').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            {renderTargetCards(getTargetsByType('monthly'))}
          </TabsContent>

          <TabsContent value="quarterly">
            {renderTargetCards(getTargetsByType('quarterly'))}
          </TabsContent>

          <TabsContent value="annual">
            {renderTargetCards(getTargetsByType('annual'))}
          </TabsContent>
        </Tabs>
      )}

      {/* Add Target Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Obiectiv Nou</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTarget} className="space-y-4">
            <div>
              <Label>Agent *</Label>
              <Select 
                value={formData.agent_id}
                onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
              >
                <SelectTrigger data-testid="select-target-agent">
                  <SelectValue placeholder="Selectează agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tip Obiectiv *</Label>
              <Select 
                value={formData.target_type}
                onValueChange={(value) => setFormData({ ...formData, target_type: value })}
              >
                <SelectTrigger data-testid="select-target-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Lunar</SelectItem>
                  <SelectItem value="quarterly">Trimestrial</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">Valoare (RON) *</Label>
              <Input
                id="value"
                type="number"
                step="100"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="50000"
                required
                data-testid="target-value-input"
              />
            </div>

            <div>
              <Label htmlFor="period">Perioadă *</Label>
              <Input
                id="period"
                type="month"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                required
                data-testid="target-period-input"
              />
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
                disabled={!formData.agent_id || !formData.value}
                data-testid="save-target-btn"
              >
                Salvează
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
