import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, Plus, Download } from 'lucide-react';

const IntegratedDataViz = ({ agent }) => {
  const [activeTab, setActiveTab] = useState('streams');
  const [dataStreams, setDataStreams] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [dataRate, setDataRate] = useState(50);
  const [error, setError] = useState(null);
  const [streamConfigs, setStreamConfigs] = useState([]);
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  
  // Generate unique colors for streams
  const streamColors = useMemo(() => [
    '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'
  ], []);

  const [newStreamConfig, setNewStreamConfig] = useState({
    type: 'financial',
    name: '',
    description: '',
    settings: {
      dataRate: 10,
      retentionPeriod: 3600,
      storageEnabled: true,
    },
  });

  // Add new stream
  const addStream = async () => {
    if (dataStreams.length >= 5) {
      setError('Maximum of 5 streams allowed');
      return;
    }

    try {
      const result = await agent.run("create-stream", {
        ...newStreamConfig,
        settings: {
          ...newStreamConfig.settings,
          dataRate: parseInt(dataRate)
        }
      });

      setDataStreams(streams => [
        ...streams,
        {
          id: streams.length,
          data: [],
          color: streamColors[streams.length],
          statistics: {
            mean: 0,
            std: 0,
            min: 0,
            max: 0
          }
        }
      ]);

      setStreamConfigs(prev => [...prev, {
        ...newStreamConfig,
        id: result.streamId
      }]);
    } catch (error) {
      setError(`Failed to create stream: ${error.message}`);
    }
  };

  // Update stream statistics
  const updateStatistics = (streamData) => {
    if (streamData.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };
    
    const values = streamData.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    );
    
    return {
      mean: mean.toFixed(2),
      std: std.toFixed(2),
      min: Math.min(...values).toFixed(2),
      max: Math.max(...values).toFixed(2)
    };
  };

  // Handle new data points
  const handleDataPoint = useCallback(async (streamId, value, timestamp) => {
    try {
      await agent.run("add-stream-data", {
        streamId,
        timestamp,
        value,
      });
    } catch (error) {
      console.error("Error adding stream data:", error);
    }
  }, [agent]);

  // Simulation effect
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const timestamp = Date.now();
      setDataStreams(streams => 
        streams.map(stream => {
          const newValue = Math.random() * 100;
          const newData = [
            ...stream.data.slice(-50),
            { time: timestamp, value: newValue }
          ];
          
          // Send data to agent
          handleDataPoint(stream.id, newValue, timestamp);

          return {
            ...stream,
            data: newData,
            statistics: updateStatistics(newData)
          };
        })
      );
    }, 1000 / dataRate);

    return () => clearInterval(interval);
  }, [isSimulating, dataRate, handleDataPoint]);

  // Export data
  const exportData = () => {
    const headers = ['Stream', 'Time', 'Value'];
    const rows = dataStreams.flatMap(stream => 
      stream.data.map(point => 
        [stream.id + 1, new Date(point.time).toISOString(), point.value.toFixed(3)]
      )
    );

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-streams.csv';
    a.click();
  };

  return (
    <div className="w-full space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="streams">Data Streams</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="streams">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Data Streams</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsSimulating(!isSimulating)}
                >
                  {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addStream}
                  disabled={dataStreams.length >= 5}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={exportData}
                  disabled={dataStreams.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="mb-4">
                <label className="text-sm font-medium">
                  Data Rate: {dataRate} points/second
                </label>
                <Slider
                  value={[dataRate]}
                  onValueChange={([value]) => setDataRate(value)}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={['auto', 'auto']}
                      tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                    />
                    <Legend />
                    {dataStreams.map((stream) => (
                      <Line
                        key={stream.id}
                        type="monotone"
                        data={stream.data}
                        dataKey="value"
                        stroke={stream.color}
                        name={`Stream ${stream.id + 1}`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataStreams.map((stream) => (
                  <Card key={stream.id}>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Stream {stream.id + 1} Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>Mean: {stream.statistics.mean}</div>
                        <div>Std Dev: {stream.statistics.std}</div>
                        <div>Min: {stream.statistics.min}</div>
                        <div>Max: {stream.statistics.max}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Stream Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stream Name</label>
                  <Input
                    value={newStreamConfig.name}
                    onChange={(e) => setNewStreamConfig(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    placeholder="Enter stream name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stream Type</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={newStreamConfig.type}
                    onChange={(e) => setNewStreamConfig(prev => ({
                      ...prev,
                      type: e.target.value
                    }))}
                  >
                    <option value="financial">Financial</option>
                    <option value="analytics">Analytics</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newStreamConfig.description}
                  onChange={(e) => setNewStreamConfig(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Enter stream description"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Storage Enabled</label>
                <div className="pt-2">
                  <input
                    type="checkbox"
                    checked={newStreamConfig.settings.storageEnabled}
                    onChange={(e) => setNewStreamConfig(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        storageEnabled: e.target.checked
                      }
                    }))}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {streamConfigs.map((config) => (
                  <Card key={config.id}>
                    <CardHeader>
                      <CardTitle className="text-sm">{config.name} Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>Type: {config.type}</div>
                        <div>Data Rate: {config.settings.dataRate} points/sec</div>
                        <div>Storage: {config.settings.storageEnabled ? 'Enabled' : 'Disabled'}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegratedDataViz;
