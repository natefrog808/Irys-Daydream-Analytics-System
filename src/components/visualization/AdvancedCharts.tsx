import React, { useState, useCallback } from 'react';
import { 
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, ZoomIn, ZoomOut, RefreshCw, 
  PauseCircle, PlayCircle, Settings
} from 'lucide-react';

// Default empty states
const defaultData = [
  { timestamp: Date.now(), value: 0 }
];

const defaultPatterns = [];

const defaultStatistics = {
  mean: 0,
  stdDev: 0,
  min: 0,
  max: 0
};

const TimeSeriesChart = ({ 
  data = defaultData,
  metrics = ['value'],
  onZoom = () => {},
  onTimeRangeChange = () => {}
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedMetrics, setSelectedMetrics] = useState(metrics);

  const handleZoom = (direction) => {
    const newZoom = direction === 'in' ? zoomLevel * 1.2 : zoomLevel / 1.2;
    setZoomLevel(newZoom);
    onZoom(newZoom);
  };

  return (
    <div className="w-full h-96">
      <div className="flex justify-between mb-4">
        <div className="space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleZoom('in')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleZoom('out')}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex space-x-2">
          {metrics.map(metric => (
            <Button
              key={metric}
              variant={selectedMetrics.includes(metric) ? "default" : "outline"}
              onClick={() => setSelectedMetrics(prev => 
                prev.includes(metric) 
                  ? prev.filter(m => m !== metric)
                  : [...prev, metric]
              )}
            >
              {metric}
            </Button>
          ))}
        </div>
      </div>
      <ResponsiveContainer>
        <ComposedChart data={data}>
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
          {selectedMetrics.map((metric, index) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={`hsl(${index * 137.5}, 70%, 50%)`}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const PatternVisualization = ({ 
  patterns = defaultPatterns,
  data = defaultData 
}) => {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleString()}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.3}
          />
          {patterns.map((pattern, index) => (
            <Area
              key={index}
              type="monotone"
              dataKey={`pattern${index}`}
              stroke={`hsl(${index * 137.5}, 70%, 50%)`}
              fill={`hsl(${index * 137.5}, 70%, 50%)`}
              fillOpacity={0.1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const StatisticsPanel = ({ statistics = defaultStatistics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  );
};

const CorrelationMatrix = ({ data = defaultData }) => {
  const correlationData = data.slice(1).map((point, index) => ({
    x: point.value,
    y: data[index].value
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            dataKey="x"
            name="Value (t)"
          />
          <YAxis 
            type="number"
            dataKey="y"
            name="Value (t-1)"
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter
            data={correlationData}
            fill="#8884d8"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

const ControlPanel = ({ 
  onRefresh = () => {},
  onPlayPause = () => {},
  isPlaying = true,
  updateInterval = 1000,
  onIntervalChange = () => {}
}) => {
  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
      <Button
        variant="outline"
        size="icon"
        onClick={onPlayPause}
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
        onClick={onRefresh}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        <label className="text-sm font-medium">
          Update Interval: {updateInterval}ms
        </label>
        <Slider
          value={[updateInterval]}
          onValueChange={([value]) => onIntervalChange(value)}
          min={100}
          max={5000}
          step={100}
          className="w-full"
        />
      </div>
    </div>
  );
};

export const AdvancedVisualization = ({ 
  data = defaultData,
  patterns = defaultPatterns,
  statistics = defaultStatistics,
  onSettingsChange = () => {}
}) => {
  const [activeTab, setActiveTab] = useState('timeseries');
  const [isPlaying, setIsPlaying] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(1000);
  const [error, setError] = useState(null);

  const handleError = (error) => {
    setError(error.message);
    setTimeout(() => setError(null), 5000);
  };

  const exportData = useCallback(() => {
    try {
      const csvContent = [
        ['Timestamp', 'Value', 'Pattern', 'Type'].join(','),
        ...data.map(point => [
          new Date(point.timestamp).toISOString(),
          point.value,
          point.pattern || '',
          point.type || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      handleError(error);
    }
  }, [data]);

  return (
    <div className="space-y-4 p-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Advanced Analytics Dashboard</h1>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={exportData}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onSettingsChange()}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ControlPanel
        onRefresh={() => {}}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        isPlaying={isPlaying}
        updateInterval={updateInterval}
        onIntervalChange={setUpdateInterval}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeseries">Time Series</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
        </TabsList>

        <TabsContent value="timeseries">
          <Card>
            <CardHeader>
              <CardTitle>Time Series Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart
                data={data}
                metrics={['value', 'trend', 'prediction']}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Pattern Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              <PatternVisualization
                patterns={patterns}
                data={data}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Statistical Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <StatisticsPanel statistics={statistics} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation">
          <Card>
            <CardHeader>
              <CardTitle>Correlation Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CorrelationMatrix data={data} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedVisualization;
