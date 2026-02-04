import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Order } from '@/types/kiosk';
import { getOrders, updateOrderStatus } from '@/stores/orderStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Package, CheckCircle2, ChefHat, RefreshCw, UtensilsCrossed, ShoppingBag, User, ConciergeBell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/currency';

const statusConfig = {
  pending: { label: 'Kutilmoqda', icon: Clock, color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  preparing: { label: 'Tayyorlanmoqda', icon: ChefHat, color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
  ready: { label: 'Tayyor', icon: Package, color: 'bg-primary/20 text-primary border-primary/30' },
  completed: { label: 'Yakunlandi', icon: CheckCircle2, color: 'bg-green-500/20 text-green-500 border-green-500/30' },
};

export const OrderHistoryTable = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const loadOrders = () => {
    setOrders(getOrders());
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    updateOrderStatus(orderId, newStatus);
    loadOrders();
    toast({
      title: 'Holat yangilandi',
      description: `Buyurtma holati ${statusConfig[newStatus].label} ga o'zgartirildi`,
    });
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('uz-UZ', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className="rounded-xl whitespace-nowrap"
            size="sm"
          >
            Hammasi ({orders.length})
          </Button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={statusFilter === key ? 'default' : 'outline'}
              onClick={() => setStatusFilter(key)}
              className="rounded-xl whitespace-nowrap gap-2"
              size="sm"
            >
              <config.icon className="w-4 h-4" />
              {config.label} ({orders.filter(o => o.status === key).length})
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadOrders}
          className="rounded-xl gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Yangilash
        </Button>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Buyurtmalar topilmadi</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-foreground">Raqam</TableHead>
                <TableHead className="text-foreground">Sana</TableHead>
                <TableHead className="text-foreground">Turi</TableHead>
                <TableHead className="text-foreground">Mahsulotlar</TableHead>
                <TableHead className="text-foreground">Jami</TableHead>
                <TableHead className="text-foreground">Holat</TableHead>
                <TableHead className="text-foreground text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold text-primary">
                      #{order.orderNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit gap-1 text-xs">
                          {order.orderType === 'dine-in' ? (
                            <>
                              <UtensilsCrossed className="w-3 h-3" />
                              Bu yerda
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3 h-3" />
                              Olib ketish
                            </>
                          )}
                        </Badge>
                        <Badge variant="outline" className="w-fit gap-1 text-xs">
                          {order.serviceType === 'waiter-service' ? (
                            <>
                              <ConciergeBell className="w-3 h-3" />
                              Ofitsiant
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              O'zi
                            </>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        {order.items.map((item, idx) => (
                          <span key={item.id} className="text-sm text-muted-foreground">
                            {item.quantity}x {item.name}
                            {idx < order.items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`gap-1 ${statusConfig[order.status].color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[order.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value as Order['status'])}
                      >
                        <SelectTrigger className="w-[130px] rounded-xl bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <config.icon className="w-4 h-4" />
                                {config.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      )}
    </div>
  );
};
