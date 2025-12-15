import React, { useState, useEffect } from 'react';
import { Beaker, Settings as SettingsIcon, PlayCircle, RotateCcw, UploadCloud, Globe, Server, Save, CheckCircle2, XCircle, AlertTriangle, Key, Bot, ChevronRight } from 'lucide-react';
import InputForm from './components/InputForm';
import ParameterConfig from './components/ParameterConfig';
import ReportView from './components/ReportView';
import { AppView, AuditResponse, EquipmentProfile, AppSettings } from './types';
import { DEFAULT_EQUIPMENT_PROFILES, SAMPLE_FORMULA_TEXT, SAMPLE_PROCESS_TEXT } from './constants';
import { auditProcess } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.INPUT);
  
  // File State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [filingFile, setFilingFile] = useState<File | null>(null);
  const [filingFileBase64, setFilingFileBase64] = useState<string | null>(null);
  const [demoText, setDemoText] = useState<string | null>(null);

  // Profiles
  const [profiles, setProfiles] = useState<EquipmentProfile[]>(() => {
    const saved = localStorage.getItem('cpa_equipment_profiles');
    return saved ? JSON.parse(saved) : DEFAULT_EQUIPMENT_PROFILES;
  });

  useEffect(() => {
    localStorage.setItem('cpa_equipment_profiles', JSON.stringify(profiles));
  }, [profiles]);

  // Settings State - Init with defaults
  const [settings, setSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem('cpa_settings');
      if (saved) return JSON.parse(saved);
      return {
          provider: 'google',
          baseUrl: '',
          modelName: 'gemini-2.5-flash',
          apiKey: ''
      };
  });

  // Save settings
  useEffect(() => {
      localStorage.setItem('cpa_settings', JSON.stringify(settings));
  }, [settings]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Key Logic
  const envKey = process.env.API_KEY || '';
  const effectiveKey = settings.apiKey || (settings.provider === 'google' ? envKey : '');
  const hasValidKey = effectiveKey.length > 5;

  const handleAudit = async () => {
    if (!pdfBase64 && !demoText) {
      alert("请至少上传【生产单据】PDF文件或加载范本数据");
      return;
    }

    if (!hasValidKey) {
        setShowSettingsModal(true);
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const auditResult = await auditProcess({
        fileBase64: pdfBase64,
        filingFileBase64: filingFileBase64,
        textData: demoText,
        equipmentProfiles: profiles,
        settings
      }, envKey);
      
      setResult(auditResult);
      setView(AppView.REPORT);
    } catch (e: any) {
      setError(e.message || "审核过程中发生错误");
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const combined = `【DEMO 文本模式 - 模拟PDF内容】\n\n${SAMPLE_FORMULA_TEXT}\n\n${SAMPLE_PROCESS_TEXT}`;
    setDemoText(combined);
    setPdfFile(null);
    setPdfBase64(null);
    setFilingFile(null);
    setFilingFileBase64(null);
    setView(AppView.INPUT);
  };

  const resetAll = () => {
    setPdfFile(null);
    setPdfBase64(null);
    setFilingFile(null);
    setFilingFileBase64(null);
    setDemoText(null);
    setResult(null);
    setView(AppView.INPUT);
  };

  const restoreDefaults = () => {
    if(confirm("确定要恢复默认设备参数吗？")) {
      setProfiles(DEFAULT_EQUIPMENT_PROFILES);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-200 overflow-y-auto max-h-[90vh]">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <SettingsIcon className="w-5 h-5 text-slate-600" /> 系统设置
                </h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">关闭</button>
             </div>
             
             <div className="space-y-5">
                {/* AI Provider Section */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">AI 服务提供商 (Provider)</label>
                   <div className="grid grid-cols-2 gap-3">
                       <button 
                          onClick={() => setSettings({...settings, provider: 'google', modelName: 'gemini-2.5-flash', baseUrl: ''})}
                          className={`px-4 py-3 rounded-lg border flex flex-col items-center gap-1 text-sm ${settings.provider === 'google' ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold ring-1 ring-teal-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                       >
                          <Bot className="w-5 h-5" />
                          Google Gemini
                          <span className="text-[10px] font-normal opacity-70">国际版/多模态强</span>
                       </button>
                       <button 
                          onClick={() => setSettings({...settings, provider: 'deepseek', modelName: 'deepseek-chat', baseUrl: 'https://api.deepseek.com'})}
                          className={`px-4 py-3 rounded-lg border flex flex-col items-center gap-1 text-sm ${settings.provider === 'deepseek' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                       >
                          <Server className="w-5 h-5" />
                          DeepSeek (R1)
                          <span className="text-[10px] font-normal opacity-70">国产/逻辑推理强</span>
                       </button>
                   </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">
                        {settings.provider === 'google' ? 'Gemini 配置' : 'DeepSeek 配置'}
                    </h4>
                    
                    {/* API Key Input */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            API Key {settings.provider === 'google' && envKey ? '(留空使用默认)' : '(必填)'}
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="password" 
                                placeholder={settings.provider === 'google' && envKey ? "已使用环境变量默认Key" : "sk-..."}
                                value={settings.apiKey}
                                onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Model Name */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">模型名称 (Model Name)</label>
                        {settings.provider === 'google' ? (
                             <select 
                                value={settings.modelName}
                                onChange={(e) => setSettings({...settings, modelName: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                             >
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (推荐)</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                             </select>
                        ) : (
                             <input 
                                type="text" 
                                value={settings.modelName}
                                onChange={(e) => setSettings({...settings, modelName: e.target.value})}
                                placeholder="deepseek-chat"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                             />
                        )}
                    </div>

                    {/* Base URL */}
                    <div>
                       <label className="block text-xs font-medium text-slate-700 mb-1">API 地址 (Base URL)</label>
                       <input 
                          type="text" 
                          placeholder={settings.provider === 'google' ? "可选: 代理地址" : "https://api.deepseek.com"}
                          value={settings.baseUrl}
                          onChange={(e) => setSettings({...settings, baseUrl: e.target.value})}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                       />
                       {settings.provider === 'deepseek' && (
                           <p className="text-[10px] text-slate-400 mt-1">DeepSeek 官方: https://api.deepseek.com</p>
                       )}
                    </div>
                </div>
             </div>

             <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                >
                  保存设置
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-lg">
              <Beaker className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-800">CPA 系统 <span className="text-teal-600 text-xs ml-1 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">正式版 v1.4</span></h1>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="text-[10px] font-medium text-slate-400 tracking-wider cursor-pointer hover:text-teal-600 flex items-center gap-1 group"
              >
                  {settings.provider === 'deepseek' ? '🔵 DeepSeek Mode' : '🟢 Gemini Mode'}
                  <SettingsIcon className="w-3 h-3 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {/* 突出的设置按钮 */}
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition-all shadow-sm animate-pulse"
              title="配置 AI 模型和 Key"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="text-xs font-bold">配置 DeepSeek/API</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {!hasValidKey && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-900 px-6 py-6 rounded-xl flex items-start gap-4 shadow-sm no-print relative overflow-hidden">
             <div className="absolute right-0 top-0 p-4 opacity-10">
                <SettingsIcon className="w-32 h-32" />
             </div>
             <Key className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
             <div className="flex-1 z-10">
                <h3 className="font-bold text-lg mb-2 text-red-700">⚠️ 系统未就绪：请填写 API Key</h3>
                <p className="text-sm text-red-600 mb-4 leading-relaxed max-w-2xl">
                   为了保护数据隐私，请使用您自己的 API Key。
                   <br/>
                   如果您想使用 <strong>DeepSeek</strong>，请点击右侧按钮进行切换和配置。
                </p>
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-md transition-transform hover:scale-105"
                >
                    <SettingsIcon className="w-4 h-4" />
                    点击此处配置 Key
                    <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}

        {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 no-print">
                <span className="font-bold">Error:</span> {error}
            </div>
        )}

        {view === AppView.INPUT && (
          <div className="space-y-6 flex flex-col">
             <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">工艺审核资料上传</h2>
                    <p className="text-sm text-slate-500">
                      当前引擎: <span className={`font-bold ${settings.provider === 'deepseek' ? 'text-blue-600' : 'text-teal-600'}`}>
                          {settings.provider === 'deepseek' ? 'DeepSeek (China)' : 'Google Gemini'}
                      </span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={loadSampleData}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <UploadCloud className="w-4 h-4" />
                        加载演示范本
                    </button>
                    <button 
                        onClick={resetAll}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        重置
                    </button>
                </div>
            </div>
            
            <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                {demoText ? (
                    <div className="h-96 flex flex-col">
                         <h3 className="font-mono text-xs text-slate-400 mb-2 uppercase tracking-widest">Demo Content Preview</h3>
                         <textarea 
                            readOnly 
                            className="flex-1 w-full bg-slate-50 p-4 rounded-lg font-mono text-sm text-slate-600 resize-none outline-none border border-slate-200"
                            value={demoText}
                         />
                    </div>
                ) : (
                    <InputForm 
                        pdfFile={pdfFile}
                        setPdfFile={setPdfFile}
                        setPdfBase64={setPdfBase64}
                        filingFile={filingFile}
                        setFilingFile={setFilingFile}
                        setFilingFileBase64={setFilingFileBase64}
                    />
                )}
            </div>
          </div>
        )}

        {view === AppView.SETTINGS && (
             <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">设备与参数档案管理</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <Save className="w-3 h-3 text-teal-600" />
                            修改后将自动保存到本机
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={restoreDefaults} className="text-sm text-slate-400 hover:text-red-500 underline">
                            恢复默认数据
                        </button>
                        <button onClick={() => setView(AppView.INPUT)} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg">
                            完成配置
                        </button>
                    </div>
                 </div>
                 <ParameterConfig profiles={profiles} setProfiles={setProfiles} />
             </div>
        )}

        {view === AppView.REPORT && result && (
             <div className="space-y-6">
                 <div className="flex justify-between items-center no-print">
                    <h2 className="text-xl font-bold text-slate-800">AI 审核报告</h2>
                     <button onClick={() => setView(AppView.INPUT)} className="text-sm text-slate-500 hover:text-teal-600">
                        返回文件上传
                    </button>
                 </div>
                 <ReportView data={result} />
             </div>
        )}
      </main>

      {/* Sticky Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 sticky bottom-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${hasValidKey ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className={`w-2 h-2 rounded-full ${hasValidKey ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-xs font-bold ${hasValidKey ? 'text-green-700' : 'text-red-700'}`}>
                        {hasValidKey ? 'AI Ready' : 'Key Missing'}
                    </span>
                </div>
            </div>
            
            <div className="flex gap-4">
                {view === AppView.INPUT && (
                    <button 
                        onClick={() => setView(AppView.SETTINGS)}
                        className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-transparent"
                    >
                        下一步: 配置设备参数
                    </button>
                )}
                
                <button
                    disabled={loading || !hasValidKey}
                    onClick={handleAudit}
                    className={`flex items-center gap-2 px-8 py-2.5 rounded-lg shadow-md transition-all ${
                        loading ? 'bg-slate-100 text-slate-400 cursor-wait' : 
                        hasValidKey ? (settings.provider === 'deepseek' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white') : 
                        'bg-slate-300 text-white cursor-not-allowed'
                    }`}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI 深度审核中...
                        </>
                    ) : (
                        <>
                            <PlayCircle className="w-5 h-5" />
                            {view === AppView.REPORT ? '重新审核' : '开始智能审核'}
                        </>
                    )}
                </button>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;