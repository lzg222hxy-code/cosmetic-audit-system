import React from 'react';
import { UploadCloud, FileText, X, FileType, FileCheck } from 'lucide-react';

interface InputFormProps {
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  setPdfBase64: (base64: string | null) => void;

  filingFile: File | null;
  setFilingFile: (file: File | null) => void;
  setFilingFileBase64: (base64: string | null) => void;
}

const InputForm: React.FC<InputFormProps> = ({
  pdfFile,
  setPdfFile,
  setPdfBase64,
  filingFile,
  setFilingFile,
  setFilingFileBase64,
}) => {

  const processFile = (selectedFile: File, type: 'production' | 'filing') => {
    if (selectedFile.type !== 'application/pdf') {
      alert('仅支持上传 PDF 文件');
      return;
    }
    
    if (type === 'production') {
        setPdfFile(selectedFile);
    } else {
        setFilingFile(selectedFile);
    }
    
    // Convert to Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];
      
      if (type === 'production') {
        setPdfBase64(base64);
      } else {
        setFilingFileBase64(base64);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent, type: 'production' | 'filing') => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], type);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      
      {/* 1. Production Document Upload (Required) */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
            生产单据 (配料单 + 工艺记录)
            <span className="text-xs text-red-500">*必传</span>
        </h3>
        
        <div 
            className={`flex-1 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center p-6 relative ${
            pdfFile 
                ? 'border-teal-500 bg-teal-50/30' 
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'production')}
        >
            {pdfFile ? (
            <div className="text-center animate-in fade-in zoom-in duration-300">
                <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileType className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1 max-w-[200px] truncate" title={pdfFile.name}>{pdfFile.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                onClick={() => { setPdfFile(null); setPdfBase64(null); }}
                className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-medium flex items-center gap-1 mx-auto"
                >
                <X className="w-3 h-3" /> 移除
                </button>
            </div>
            ) : (
            <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-slate-500 text-xs max-w-[180px] mx-auto mb-4">
                请上传“半成品批生产配料单”与“生产工艺记录”
                </p>
                <label className="cursor-pointer">
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-all">
                    选择生产文件
                </span>
                <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'production')}
                />
                </label>
            </div>
            )}
        </div>
      </div>

      {/* 2. Regulatory Filing Upload (Optional) */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
            注册备案资料 (工艺/原料信息)
            <span className="text-xs text-slate-400 font-normal bg-slate-100 px-1.5 py-0.5 rounded">可选, 用于比对</span>
        </h3>
        
        <div 
            className={`flex-1 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center p-6 relative ${
            filingFile 
                ? 'border-indigo-500 bg-indigo-50/30' 
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'filing')}
        >
            {filingFile ? (
            <div className="text-center animate-in fade-in zoom-in duration-300">
                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileCheck className="w-7 h-7 text-indigo-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1 max-w-[200px] truncate" title={filingFile.name}>{filingFile.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{(filingFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                onClick={() => { setFilingFile(null); setFilingFileBase64(null); }}
                className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-medium flex items-center gap-1 mx-auto"
                >
                <X className="w-3 h-3" /> 移除
                </button>
            </div>
            ) : (
            <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-slate-500 text-xs max-w-[180px] mx-auto mb-4">
                上传备案PDF以进行<br/><strong>“备案 vs 实际生产”</strong>一致性核查
                </p>
                <label className="cursor-pointer">
                <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition-all">
                    选择备案文件
                </span>
                <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'filing')}
                />
                </label>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default InputForm;