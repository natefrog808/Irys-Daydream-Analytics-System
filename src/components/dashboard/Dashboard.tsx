import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Database,
  Settings,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Download,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

// Default data states
const defaultData = [{ timestamp: Date.now(), value: 0 }];
const defaultStatistics = { mean: 0, stdDev: 0, min: 0, max: 0 };

const SystemStatus = ({ status }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Activity className="h-4 w-4" />
        System Status
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <div className="text-sm text-gray-500">CPU Usage</div>
          <div className="text-lg font-bold">{status.cpu.toFixed(1)}%</div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">Memory</div>
          <div className="text-lg font-bold">{status.memory.toFixed(1)}%</div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">Uptime</div>
          <div className="text-lg font-bold">{Math.floor(status.uptime / 3600)}h</div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">Active Streams</div>
          <div className="text-lg font-bold">{status.activeStreams}</div>
        </div>
      </div>
      {status.errors.length > 0 && (
        <div className="mt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {status.errors.length} error(s) detected
            </AlertDescription>
          </Alert>
        </div>
      )}
    </CardContent>
  </Card>
);

const StreamManager = ({ streams, onStreamAdd, onStreamRemove, onStreamToggle }) => {
  const [newStreamName, setNewStreamName] = useState('');

  const handleAddStream = () => {
    if (newStreamName.trim()) {
      onStreamAdd({
        name: newStreamName.trim(),
        type: 'default',
        active: true
      });
      setNewStreamName('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data Streams
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            value={newStreamName}
            onChange={(e) => setNewStreamName(e.target.value)}
            placeholder="New stream name"
          />
          <Button onClick={handleAddStream}>Add</Button>
        </div>
        <div className="space-y-2">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center gap-2">
                <Badge variant={stream.active ? "default" : "secondary"}>
                  {stream.type}
                </Badge>
                <span>{stream.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStreamToggle(stream.id)}
                >
                  {stream.active ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStreamRemove(stream.id)}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const BlockchainStatus = ({ status }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Zap className="h-4 w-4" />
        Blockchain Status
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <div className="text-sm text-gray-500">Connected Node</div>
          <div className="text-lg font-medium truncate">
            {status.connectedNode}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">Sync Status</div>
          <div className="text-lg font-medium">
            {status.syncStatus}%
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">Latest Block</div>
          <div className="text-lg font-medium">
            #{status.latestBlock}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">Stored Data</div>
          <div className="text-lg font-medium">
            {(status.storedData / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const VisualizationPanel = ({ data, statistics }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(1000);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <PauseCircle className="h-4 w-4" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <label className="text-sm font-medium">
            Update Interval: {updateInterval}ms
          </label>
          <Slider
            value={[updateInterval]}
            onValueChange={([value]) => setUpdateInterval(value)}
            min={100}
            max={5000}
            step={100}
            className="w-full"
          />
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleString()}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(215, 70%, 50%)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(statistics).map(([key, value]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof value === 'number' ? value.toFixed(2) : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const InteractiveDashboard = ({ agent, initialData = defaultData, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState({
    cpu: 0,
    memory: 0,
    uptime: 0,
    activeStreams: 0,
    errors: []
  });
  const [streams, setStreams] = useState([]);
  const [blockchainStatus, setBlockchainStatus] = useState({
    connectedNode: 'node1.irys.xyz',
    syncStatus: 100,
    latestBlock: 0,
    storedData: 0,
    pendingTransactions: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        uptime: prev.uptime + 1,
        activeStreams: streams.filter(s => s.active).length
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [streams]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlockchainStatus(prev => ({
        ...prev,
        latestBlock: prev.latestBlock + 1,
        storedData: prev.storedData + Math.random() * 1000,
        pendingTransactions: Math.floor(Math.random() * 10)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleStreamAdd = useCallback((stream) => {
    setStreams(prev => [...prev, { ...stream, id: Date.now() }]);
  }, []);

  const handleStreamRemove = useCallback((streamId) => {
    setStreams(prev => prev.filter(s => s.id !== streamId));
  }, []);

  const handleStreamToggle = useCallback((streamId) => {
    setStreams(prev => 
      prev.map(s => 
        s.id === streamId ? { ...s, active: !s.active } : s
      )
    );
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Nexus Stream Dashboard</h1>
        <Button
          variant="outline"
          onClick={onSettingsChange}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <SystemStatus status={systemStatus} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="streams">Streams</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4">
              <StreamManager
                streams={streams}
                onStreamAdd={handleStreamAdd}
                onStreamRemove={handleStreamRemove}
                onStreamToggle={handleStreamToggle}
              />
              <BlockchainStatus status={blockchainStatus} />
            </div>
          </TabsContent>

          <TabsContent value="streams">
            <Card>
              <CardContent className="p-4">
                <VisualizationPanel
                  data={initialData}
                  statistics={defaultStatistics}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blockchain">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <BlockchainStatus status={blockchainStatus} />
                  <VisualizationPanel
                    data={initialData}
                    statistics={defaultStatistics}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardContent className="p-4">
                <VisualizationPanel
                  data={initialData}
                  statistics={defaultStatistics}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InteractiveDashboard;
