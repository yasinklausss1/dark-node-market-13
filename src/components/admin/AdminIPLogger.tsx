import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, 
  Monitor, 
  Smartphone, 
  Tablet, 
  RefreshCw, 
  Shield, 
  ShieldAlert,
  Search,
  Ban,
  Clock,
  Eye,
  TrendingUp,
  MapPin,
  BarChart3,
  Activity
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PageVisit {
  id: string;
  ip_address: string;
  user_agent: string | null;
  page: string;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  session_id: string | null;
  is_suspicious: boolean;
  visited_at: string;
}

interface Stats {
  totalVisits: number;
  uniqueIPs: number;
  todayVisits: number;
  suspiciousVisits: number;
  topBrowsers: { name: string; count: number }[];
  topDevices: { name: string; count: number }[];
}

const AdminIPLogger = () => {
  const { toast } = useToast();
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterSuspicious, setFilterSuspicious] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchVisits = async () => {
    const { data, error } = await supabase
      .from('page_visits')
      .select('*')
      .order('visited_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching visits:', error);
      toast({
        title: "Fehler",
        description: "Besuche konnten nicht geladen werden",
        variant: "destructive"
      });
      return;
    }

    setVisits((data || []) as PageVisit[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVisits();

    // Real-time subscription
    const channel = supabase
      .channel('page-visits-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'page_visits' }, 
        (payload) => {
          setVisits(prev => [payload.new as PageVisit, ...prev.slice(0, 499)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchVisits, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const stats: Stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const uniqueIPs = new Set(visits.map(v => v.ip_address));
    const todayVisits = visits.filter(v => v.visited_at.startsWith(today));
    const suspiciousVisits = visits.filter(v => v.is_suspicious);

    // Top browsers
    const browserCounts = visits.reduce((acc, v) => {
      const browser = v.browser || 'Unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topBrowsers = Object.entries(browserCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top devices
    const deviceCounts = visits.reduce((acc, v) => {
      const device = v.device_type || 'unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topDevices = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return {
      totalVisits: visits.length,
      uniqueIPs: uniqueIPs.size,
      todayVisits: todayVisits.length,
      suspiciousVisits: suspiciousVisits.length,
      topBrowsers,
      topDevices
    };
  }, [visits]);

  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesIP = visit.ip_address.toLowerCase().includes(query);
        const matchesBrowser = visit.browser?.toLowerCase().includes(query);
        const matchesOS = visit.os?.toLowerCase().includes(query);
        if (!matchesIP && !matchesBrowser && !matchesOS) return false;
      }

      // Device filter
      if (filterDevice !== 'all' && visit.device_type !== filterDevice) return false;

      // Suspicious filter
      if (filterSuspicious === 'suspicious' && !visit.is_suspicious) return false;
      if (filterSuspicious === 'normal' && visit.is_suspicious) return false;

      return true;
    });
  }, [visits, searchQuery, filterDevice, filterSuspicious]);

  const blockIP = async (ip: string) => {
    const { error } = await supabase
      .from('blocked_ips')
      .insert({
        ip_address: ip,
        reason: 'Manually blocked from IP Logger',
        blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });

    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "IP blockiert",
        description: `${ip} wurde für 24 Stunden blockiert`
      });
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const visitTime = new Date(timestamp);
    const diffMs = now.getTime() - visitTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    return `vor ${diffDays} Tagen`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Gesamt Besuche</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalVisits}</p>
              </div>
              <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Einzigartige IPs</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.uniqueIPs}</p>
              </div>
              <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Heute</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500">{stats.todayVisits}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Verdächtig</p>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{stats.suspiciousVisits}</p>
              </div>
              <ShieldAlert className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Browser & Device Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top Browser
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {stats.topBrowsers.map((browser, idx) => (
                <div key={browser.name} className="flex items-center justify-between">
                  <span className="text-sm">{browser.name}</span>
                  <Badge variant={idx === 0 ? "default" : "secondary"}>{browser.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Gerätetypen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {stats.topDevices.map((device) => (
                <div key={device.name} className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    {getDeviceIcon(device.name)}
                    {device.name === 'desktop' ? 'Desktop' : 
                     device.name === 'mobile' ? 'Mobile' : 
                     device.name === 'tablet' ? 'Tablet' : 'Unbekannt'}
                  </span>
                  <Badge variant="outline">{device.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main IP Log Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                IP Logger - Live Übersicht
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Alle Besuche der Login-Seite in Echtzeit
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={autoRefresh ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
                {autoRefresh ? 'Live' : 'Pausiert'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchVisits}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach IP, Browser, OS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Gerätetyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Geräte</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSuspicious} onValueChange={setFilterSuspicious}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="suspicious">Verdächtig</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>IP Adresse</TableHead>
                  <TableHead className="hidden md:table-cell">Browser / OS</TableHead>
                  <TableHead className="hidden sm:table-cell">Gerät</TableHead>
                  <TableHead>Zeit</TableHead>
                  <TableHead className="w-20">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredVisits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Keine Besuche gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisits.slice(0, 100).map((visit) => (
                    <TableRow 
                      key={visit.id}
                      className={visit.is_suspicious ? 'bg-red-500/5' : ''}
                    >
                      <TableCell>
                        {visit.is_suspicious ? (
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                        ) : (
                          <Shield className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <code className="text-xs sm:text-sm font-mono">
                            {visit.ip_address}
                          </code>
                          {visit.is_suspicious && (
                            <Badge variant="destructive" className="text-[10px]">
                              Verdächtig
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs sm:text-sm">
                          <div>{visit.browser || 'Unbekannt'}</div>
                          <div className="text-muted-foreground">{visit.os || 'Unbekannt'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(visit.device_type)}
                          <span className="text-xs capitalize">
                            {visit.device_type || 'desktop'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(visit.visited_at)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatTime(visit.visited_at)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>IP blockieren?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Möchten Sie die IP <code className="bg-muted px-1 rounded">{visit.ip_address}</code> für 24 Stunden blockieren?
                                Blockierte IPs können sich nicht mehr anmelden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => blockIP(visit.ip_address)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Blockieren
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredVisits.length > 100 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Zeige 100 von {filteredVisits.length} Einträgen
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminIPLogger;
