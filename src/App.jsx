import React, { useState, useEffect, useRef } from 'react';
// import mqtt from 'mqtt'; // Un-comment this line for local dev if using npm install
import { 
  Activity, 
  Thermometer, 
  Droplets, 
  Wifi, 
  WifiOff, 
  Save, 
  RotateCw, 
  AlertTriangle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// --- COMPONENT DEFINED OUTSIDE TO PREVENT RE-RENDERS ---
const ControlCard = ({ 
  type, 
  title, 
  icon: Icon, 
  colorClass, 
  min, max, step, unit, 
  graphColor, yDomain,
  localValue,
  remoteValue,
  currentReading,
  isConnected,
  onSliderChange,
  onCommit,
  graphData
}) => {
  const isDirty = localValue !== remoteValue;
  
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      
      {/* 1. Header & Live Value */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${colorClass.bg}`}>
            <Icon className={colorClass.text} size={24} />
          </div>
          <div>
             <span className="font-bold text-slate-700 block text-lg">{title}</span>
             <div className="flex items-center gap-1.5 mt-0.5">
               <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wide">
                 Target: {remoteValue}{unit}
               </span>
             </div>
          </div>
        </div>
        <span className="text-3xl font-mono font-bold text-slate-800 tracking-tight">
          {currentReading?.toFixed(step < 1 ? 1 : 0)}<span className="text-sm text-slate-400 font-normal ml-1">{unit}</span>
        </span>
      </div>
      
      {/* 2. Controls (Settings Bar) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4 mb-5">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Pending Setting</span>
             <span className="font-bold text-slate-700 text-xl">
               {localValue}{unit}
             </span>
          </div>
          
          <button 
             onClick={onCommit}
             disabled={!isDirty || !isConnected}
             className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
               isDirty 
                 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow active:scale-95' 
                 : 'bg-white text-slate-300 border border-slate-200 cursor-not-allowed'
             }`}
          >
            {isDirty ? <Save size={18} /> : <CheckCircle2 size={18} />}
            {isDirty ? 'Update' : 'Synced'}
          </button>
        </div>

        <input 
          type="range" 
          min={min} max={max} step={step}
          value={localValue}
          onChange={(e) => onSliderChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* 3. Integrated Graph */}
      <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-slate-400"/>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Live Trend</span>
          </div>
          <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphData}>
                  <defs>
                  <linearGradient id={`color-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={graphColor} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={graphColor} stopOpacity={0}/>
                  </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="time" hide />
                  <YAxis 
                      domain={yDomain} 
                      fontSize={10} 
                      tickFormatter={(v) => v.toFixed(0)} 
                      width={30} 
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      itemStyle={{fontSize: '12px', color: graphColor, fontWeight: 'bold'}}
                      formatter={(value) => [value + unit, title]}
                      labelStyle={{color: '#64748b', fontSize: '10px'}}
                  />
                  <Area 
                      type="monotone" 
                      dataKey={type} 
                      stroke={graphColor} 
                      fillOpacity={1} 
                      fill={`url(#color-${type})`} 
                      strokeWidth={2}
                      isAnimationActive={false}
                  />
              </AreaChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default function App() {
  const [client, setClient] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLibLoaded, setIsLibLoaded] = useState(false);
  
  const initialLoadRef = useRef({ temp: false, ph: false, rpm: false });

  // Real-time Data Store (for Graph)
  const [graphData, setGraphData] = useState([]);

  // Bioreactor State (Telemetry)
  const [readings, setReadings] = useState({
    temp: 0.0,
    ph: 0.0,
    rpm: 0,
    deviceState: 'Unknown'
  });

  // Remote Setpoints (The ACTUAL values on the ESP)
  const [remoteSetpoints, setRemoteSetpoints] = useState({
    temp: 37.0,
    ph: 7.0,
    rpm: 100
  });

  // Local Setpoints (The PENDING values on the Slider)
  const [localSetpoints, setLocalSetpoints] = useState({
    temp: 37.0,
    ph: 7.0,
    rpm: 100
  });

  // Configuration
  const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
  const TOPIC_ROOT = 'bio/v1';

  // Load MQTT Lib Dynamically (for Preview compatibility)
  useEffect(() => {
    if (window.mqtt) { 
      setIsLibLoaded(true); 
      return; 
    }
    const script = document.createElement('script');
    script.src = "https://unpkg.com/mqtt/dist/mqtt.min.js";
    script.async = true;
    script.onload = () => setIsLibLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Connect Logic
  useEffect(() => {
    if (!isLibLoaded) return;

    const options = {
      clientId: `bio_app_${Math.random().toString(16).substr(2, 8)}`,
      keepalive: 60,
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    };

    const mqttLib = window.mqtt; 
    const c = mqttLib.connect(BROKER_URL, options);

    c.on('connect', () => {
      setStatus('Connected');
      c.subscribe(`${TOPIC_ROOT}/#`, { qos: 1 });
    });

    c.on('message', (topic, message) => {
      const val = message.toString();
      const topicPath = topic.replace(`${TOPIC_ROOT}/`, '');
      const now = new Date().toLocaleTimeString();

      setLastUpdate(new Date());

      // Helper to sync local slider to remote value ONLY on first load
      const syncInitial = (key, value) => {
        setRemoteSetpoints(prev => ({ ...prev, [key]: value }));
        if (!initialLoadRef.current[key]) {
          setLocalSetpoints(prev => ({ ...prev, [key]: value }));
          initialLoadRef.current[key] = true;
        }
      };

      switch(topicPath) {
        case 'status': 
          setReadings(prev => ({ ...prev, deviceState: val }));
          break;
        case 'telemetry':
          try {
            const data = JSON.parse(val);
            setReadings(prev => ({ ...prev, ...data, deviceState: 'Online' }));
            setGraphData(prev => {
              const newData = [...prev, { time: now, ...data }];
              return newData.slice(-100);
            });
          } catch (e) { console.error("Bad JSON", e); }
          break;
        case 'set/temp':
          syncInitial('temp', parseFloat(val));
          break;
        case 'set/ph':
          syncInitial('ph', parseFloat(val));
          break;
        case 'set/rpm':
          syncInitial('rpm', parseInt(val));
          break;
      }
    });

    c.on('offline', () => setStatus('Offline'));
    setClient(c);

    return () => { c.end(); };
  }, [isLibLoaded]);


  // Control Functions
  const handleSliderChange = (type, value) => {
    setLocalSetpoints(prev => ({ ...prev, [type]: value }));
  };

  const commitChange = (type) => {
    if (!client || status !== 'Connected') return;
    
    const valToSend = localSetpoints[type];

    // Publish to MQTT
    client.publish(
      `${TOPIC_ROOT}/set/${type}`, 
      valToSend.toString(), 
      { qos: 1, retain: true }
    );

    // Optimistically update remote
    setRemoteSetpoints(prev => ({ ...prev, [type]: valToSend }));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Header */}
      <div className="bg-white px-5 py-4 shadow-sm border-b flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-colors ${readings.deviceState === 'Online' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            <Activity size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-tight text-slate-800">BioUnit-01</h1>
            <p className="text-xs text-slate-500 font-medium">
              {readings.deviceState === 'Online' 
                ? <span className="flex items-center gap-1 text-green-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Online</span> 
                : <span className="flex items-center gap-1 text-red-500">Offline</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {status === 'Connected' 
              ? <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2"><Wifi size={14}/> MQTT Connected</div>
              : <div className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2"><WifiOff size={14}/> Disconnected</div>
           }
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Connection Warning */}
        {status !== 'Connected' && (
           <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-pulse">
             <AlertTriangle size={20} /> 
             <span>Connecting to control server...</span>
           </div>
        )}

        {/* Control Cards Stack */}
        <div className="grid gap-6 pb-8">
          <ControlCard 
            type="temp" 
            title="Temperature" 
            icon={Thermometer} 
            colorClass={{bg: 'bg-red-50', text: 'text-red-500'}} 
            min="20" max="45" step="0.5" unit="°C"
            graphColor="#ef4444"
            yDomain={['dataMin - 1', 'dataMax + 1']}
            localValue={localSetpoints.temp}
            remoteValue={remoteSetpoints.temp}
            currentReading={readings.temp}
            isConnected={status === 'Connected'}
            onSliderChange={(val) => handleSliderChange('temp', val)}
            onCommit={() => commitChange('temp')}
            graphData={graphData}
          />
          
          <ControlCard 
            type="ph" 
            title="pH Level" 
            icon={Droplets} 
            colorClass={{bg: 'bg-blue-50', text: 'text-blue-500'}} 
            min="0" max="14" step="0.1" unit=""
            graphColor="#3b82f6"
            yDomain={[0, 14]}
            localValue={localSetpoints.ph}
            remoteValue={remoteSetpoints.ph}
            currentReading={readings.ph}
            isConnected={status === 'Connected'}
            onSliderChange={(val) => handleSliderChange('ph', val)}
            onCommit={() => commitChange('ph')}
            graphData={graphData}
          />

          <ControlCard 
            type="rpm" 
            title="Agitation" 
            icon={RotateCw} 
            colorClass={{bg: 'bg-green-50', text: 'text-green-600'}} 
            min="0" max="300" step="10" unit=" RPM"
            graphColor="#16a34a"
            yDomain={[0, 300]}
            localValue={localSetpoints.rpm}
            remoteValue={remoteSetpoints.rpm}
            currentReading={readings.rpm}
            isConnected={status === 'Connected'}
            onSliderChange={(val) => handleSliderChange('rpm', val)}
            onCommit={() => commitChange('rpm')}
            graphData={graphData}
          />
        </div>
      </div>
    </div>
  );
}