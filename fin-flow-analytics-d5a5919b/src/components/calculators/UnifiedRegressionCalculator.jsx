// ===== src/components/calculators/UnifiedRegressionCalculator.jsx =====

import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BrainCircuit,
  Plus,
  X,
  ListOrdered,
  AlertTriangle,
  Info,
  Upload,
  FileSpreadsheet,
  Clock,
  Binary,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

// ===== Import Model Components =====
import SimpleLinearRegressionContent from './SimpleLinearRegressionContent';
import TimeSeriesRegressionContent from './TimeSeriesRegressionContent';
import BinaryChoiceModelContent from './BinaryChoiceModelContent';
import EconometricsDiagnosis from './EconometricsDiagnosis';
import EndogeneityDiagnosis from './EndogeneityDiagnosis';

// ===== Data Parser Utility =====
const parseFileData = (text, fileType) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  let headers = [];
  let rows = [];
  
  if (fileType === 'csv' || fileType === 'text/csv') {
    // Parse CSV
    const allRows = lines.map(line => line.split(',').map(cell => cell.trim()));
    headers = allRows[0] || [];
    rows = allRows.slice(1).filter(row => row.length >= 2);
  } else if (fileType === 'application/json') {
    // Parse JSON
    try {
      const jsonData = JSON.parse(text);
      if (Array.isArray(jsonData)) {
        headers = Object.keys(jsonData[0] || {});
        rows = jsonData.map(item => headers.map(h => item[h]));
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        headers = Object.keys(jsonData.data[0] || {});
        rows = jsonData.data.map(item => headers.map(h => item[h]));
      }
    } catch (e) {
      throw new Error('Invalid JSON format');
    }
  } else if (fileType === 'text/plain' || fileType === 'txt') {
    // Parse tab-delimited or space-delimited
    const allRows = lines.map(line => line.split(/\t|\s+/).filter(cell => cell.trim() !== ''));
    headers = allRows[0] || [];
    rows = allRows.slice(1).filter(row => row.length >= 2);
  }
  
  // Auto-detect column types
  const numericColumns = headers.map((h, idx) => {
    const values = rows.map(row => parseFloat(row[idx]));
    return values.every(v => !isNaN(v));
  });
  
  return { headers, rows, numericColumns };
};

// ===== Main Component =====
const UnifiedRegressionCalculator = () => {
  // ===== State =====
  const [activeMode, setActiveMode] = useState('simple'); // 'simple' | 'timeseries' | 'binary'
  const [dataPoints, setDataPoints] = useState([
    { x: 1, y: 2500 }, { x: 2, y: 2800 }, { x: 3, y: 3100 },
    { x: 4, y: 3500 }, { x: 5, y: 3300 }, { x: 6, y: 3800 },
  ]);
  const [xLabel, setXLabel] = useState('X Variable');
  const [yLabel, setYLabel] = useState('Y Variable');
  const [fileUploadError, setFileUploadError] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [endogeneityStatus, setEndogeneityStatus] = useState(null);
  const fileInputRef = useRef(null);

  // ===== Data Management Functions =====
  const addDataPoint = () => {
    const lastX = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].x : 0;
    setDataPoints([...dataPoints, { x: lastX + 1, y: 0 }]);
  };

  const removeDataPoint = (index) => {
    if (dataPoints.length > 2) {
      setDataPoints(dataPoints.filter((_, i) => i !== index));
    }
  };

  const updateDataPoint = (index, field, value) => {
    const newData = [...dataPoints];
    newData[index][field] = Number(value);
    setDataPoints(newData);
  };

  const autoIndexX = () => {
    setDataPoints(dataPoints.map((p, i) => ({ ...p, x: i + 1 })));
  };

  // ===== File Upload Handler =====
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileUploadError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, rows, numericColumns } = parseFileData(text, file.type);

        if (rows.length === 0) {
          setFileUploadError('No data rows found in the file.');
          return;
        }

        // Find numeric columns
        const numericColIndices = numericColumns.map((isNum, idx) => isNum ? idx : -1).filter(idx => idx >= 0);
        
        if (numericColIndices.length < 2) {
          setFileUploadError('File must contain at least 2 numeric columns for X and Y.');
          return;
        }

        // Use first two numeric columns as x and y
        const xColIdx = numericColIndices[0];
        const yColIdx = numericColIndices[1];
        
        // Update xLabel and yLabel
        setXLabel(headers[xColIdx] || 'X');
        setYLabel(headers[yColIdx] || 'Y');

        // Parse data points
        const newData = rows.map(row => ({
          x: parseFloat(row[xColIdx]),
          y: parseFloat(row[yColIdx])
        })).filter(d => !isNaN(d.x) && !isNaN(d.y));

        if (newData.length < 2) {
          setFileUploadError('Need at least 2 valid numeric data points.');
          return;
        }

        setDataPoints(newData);
        setFileUploadError(null);
      } catch (err) {
        setFileUploadError(`Error parsing file: ${err.message}`);
      }
    };

    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // ===== Export Data =====
  const exportData = () => {
    const headers = ['x', 'y'];
    const rows = dataPoints.map(p => [p.x, p.y]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regression_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Sample Data =====
  const loadSampleData = (mode) => {
    if (mode === 'simple') {
      setDataPoints([
        { x: 1, y: 2500 }, { x: 2, y: 2800 }, { x: 3, y: 3100 },
        { x: 4, y: 3500 }, { x: 5, y: 3300 }, { x: 6, y: 3800 },
      ]);
      setXLabel('Month');
      setYLabel('Revenue');
    } else if (mode === 'timeseries') {
      setDataPoints([
        { x: 2001, y: 70539.4 }, { x: 2002, y: 73480.5 },
        { x: 2003, y: 74775.4 }, { x: 2004, y: 78570.2 },
        { x: 2005, y: 81778.2 }, { x: 2006, y: 87264.6 },
      ]);
      setXLabel('Year');
      setYLabel('Consumption');
    } else if (mode === 'binary') {
      setDataPoints([
        { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 1 },
        { x: 4, y: 0 }, { x: 5, y: 1 }, { x: 6, y: 1 },
        { x: 7, y: 0 }, { x: 8, y: 1 }, { x: 9, y: 1 },
        { x: 10, y: 1 },
      ]);
      setXLabel('Education (Years)');
      setYLabel('Employed (0/1)');
    }
  };

  // ===== Clear Data =====
  const clearData = () => {
    if (dataPoints.length > 0) {
      setDataPoints([{ x: 1, y: 0 }]);
    }
  };

  // ===== Render Data Input Section (Shared across all modes) =====
  const renderDataInputSection = () => (
    <div className="space-y-4">
      {/* Row 1: X and Y Variable Names */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">X-Variable Name</Label>
          <Input 
            value={xLabel} 
            onChange={(e) => setXLabel(e.target.value)} 
            placeholder="e.g., Time Period"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Y-Variable Name</Label>
          <Input 
            value={yLabel} 
            onChange={(e) => setYLabel(e.target.value)} 
            placeholder="e.g., Sales"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Row 2: Data Points with Upload/Export buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Label className="flex items-center gap-1 text-xs font-medium">
              Data Points (x, y) <Info className="h-3 w-3" />
            </Label>
            <Badge variant="outline" className="text-[10px]">
              {dataPoints.length} rows
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {/* Upload Button */}
            <Button 
              onClick={triggerFileUpload} 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs gap-1 px-2"
            >
              <Upload className="h-3 w-3"/> Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Export Button */}
            <Button 
              onClick={exportData} 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs gap-1 px-2"
              disabled={dataPoints.length === 0}
            >
              <Download className="h-3 w-3"/> Export
            </Button>
            
            {/* Auto-Index Button */}
            <Button 
              onClick={autoIndexX} 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs gap-1 px-2"
            >
              <ListOrdered className="h-3 w-3"/> Auto-Index
            </Button>
            
            {/* Add Row Button */}
            <Button 
              onClick={addDataPoint} 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs gap-1 px-2"
            >
              <Plus className="h-3 w-3"/> Add
            </Button>
          </div>
        </div>
        
        {/* File Upload Error */}
        {fileUploadError && (
          <Alert variant="destructive" className="py-1.5 px-2.5">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs">{fileUploadError}</AlertDescription>
          </Alert>
        )}
        
        {/* Data Table */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-lg p-1">
          {dataPoints.map((p, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input 
                type="number" 
                value={p.x} 
                onChange={(e) => updateDataPoint(index, 'x', e.target.value)} 
                className="font-mono h-7 text-sm w-16" 
              />
              <Input 
                type="number" 
                value={p.y} 
                onChange={(e) => updateDataPoint(index, 'y', e.target.value)} 
                className="font-mono h-7 text-sm flex-1" 
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeDataPoint(index)} 
                className="h-6 w-6 text-red-500 hover:text-red-700"
                disabled={dataPoints.length <= 2}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        
        {/* Sample Data & Clear Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[10px] gap-1 px-2"
            onClick={() => loadSampleData(activeMode)}
          >
            Load Sample Data
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[10px] gap-1 px-2 text-red-500 hover:text-red-700"
            onClick={clearData}
          >
            Clear Data
          </Button>
        </div>
      </div>
    </div>
  );

  // ===== Render Endogeneity Diagnosis =====
  const renderEndogeneityDiagnosis = () => (
    <div className="mt-4">
      <EndogeneityDiagnosis 
        dataPoints={dataPoints}
        regressionResults={null}
        onEndogeneityStatusChange={setEndogeneityStatus}
      />
    </div>
  );

  // ===== Render Diagnostics Toggle =====
  const renderDiagnosticsToggle = () => (
    <div className="mt-4">
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-xs gap-2"
        onClick={() => setShowDiagnostics(!showDiagnostics)}
      >
        {showDiagnostics ? <EyeOff className="h-3 w-3"/> : <Eye className="h-3 w-3"/>}
        {showDiagnostics ? 'Hide' : 'Show'} Econometric Diagnostics
        <Badge variant="outline" className="text-[8px]">Auto</Badge>
      </Button>
    </div>
  );

  // ===== Main Render =====
  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
              <BrainCircuit className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Regression Analysis Suite</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Switch between Simple Linear, Time Series, and Binary Choice models
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Mode Selection Tabs */}
          <Tabs value={activeMode} onValueChange={setActiveMode} className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="simple" className="text-xs gap-1">
                <BrainCircuit className="h-3 w-3" />
                Simple
              </TabsTrigger>
              <TabsTrigger value="timeseries" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                Time Series
              </TabsTrigger>
              <TabsTrigger value="binary" className="text-xs gap-1">
                <Binary className="h-3 w-3" />
                Binary
              </TabsTrigger>
            </TabsList>
            
            {/* ===== CONTENT: Simple Linear ===== */}
            <TabsContent value="simple" className="mt-4">
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-4">
                  {renderDataInputSection()}
                  {renderEndogeneityDiagnosis()}
                  {renderDiagnosticsToggle()}
                </div>
                
                {/* Right Column */}
                <div className="lg:col-span-3">
                  <SimpleLinearRegressionContent 
                    dataPoints={dataPoints}
                    setDataPoints={setDataPoints}
                    xLabel={xLabel}
                    yLabel={yLabel}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* ===== CONTENT: Time Series ===== */}
            <TabsContent value="timeseries" className="mt-4">
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-4">
                  {renderDataInputSection()}
                  {renderEndogeneityDiagnosis()}
                  {renderDiagnosticsToggle()}
                </div>
                
                {/* Right Column */}
                <div className="lg:col-span-3">
                  <TimeSeriesRegressionContent 
                    dataPoints={dataPoints}
                    setDataPoints={setDataPoints}
                    timeLabel={xLabel}
                    yLabel={yLabel}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* ===== CONTENT: Binary Choice ===== */}
            <TabsContent value="binary" className="mt-4">
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-4">
                  {renderDataInputSection()}
                  {renderEndogeneityDiagnosis()}
                  {renderDiagnosticsToggle()}
                </div>
                
                {/* Right Column */}
                <div className="lg:col-span-3">
                  <BinaryChoiceModelContent 
                    dataPoints={dataPoints}
                    setDataPoints={setDataPoints}
                    xLabel={xLabel}
                    yLabel={yLabel}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default UnifiedRegressionCalculator;