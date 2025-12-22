
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, Minimize2, ChevronDown, Cpu, Check, List } from 'lucide-react';
import { sendMessageToAI, AVAILABLE_MODELS, DEFAULT_MODEL } from '../services/aiService';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const AIChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: '您好！我是您的考古助手。关于出土文物分类、描述规范或数据整理，有什么我可以帮您的吗？' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeModelId = selectedModel === 'custom' ? customModelId : selectedModel;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass recent history for context (last 10 messages)
      const history = messages.slice(-10);
      const responseText = await sendMessageToAI(userMsg.content, history, activeModelId);
      
      setMessages(prev => [...prev, { role: 'model', content: responseText || "抱歉，我暂时无法回答这个问题。" }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "连接 AI 服务时出现错误，请检查网络或配置。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-terra-600 hover:bg-terra-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-[100] group active:scale-95 animate-in fade-in zoom-in"
      >
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-stone-200 z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
      {/* Header */}
      <div className="bg-stone-900 p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3 text-white w-full mr-8">
          <div className="p-1.5 bg-terra-600 rounded-lg shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
             <span className="font-serif font-bold leading-none text-sm">考古助手 AI</span>
             <div className="relative mt-1">
                {selectedModel === 'custom' ? (
                    <div className="flex items-center gap-1 bg-stone-800/80 rounded px-1.5 py-0.5 max-w-full">
                        <input 
                            className="bg-transparent border-none outline-none text-[10px] text-white placeholder:text-stone-500 font-mono w-full"
                            placeholder="输入 Model ID"
                            value={customModelId}
                            onChange={(e) => setCustomModelId(e.target.value)}
                            autoFocus
                        />
                        <button 
                            onClick={() => setSelectedModel(DEFAULT_MODEL)} 
                            className="text-stone-400 hover:text-white p-0.5"
                            title="返回默认模型"
                        >
                            <List size={10} />
                        </button>
                    </div>
                ) : (
                    <div className="relative inline-block">
                        <button 
                            onClick={() => setShowModelSelect(!showModelSelect)}
                            className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-white transition-colors group"
                        >
                            <Cpu size={10} />
                            <span className="truncate max-w-[150px]">{selectedModel.replace('gemini-', '')}</span>
                            <ChevronDown size={10} className="group-hover:text-terra-400" />
                        </button>
                        
                        {showModelSelect && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowModelSelect(false)}></div>
                                <div className="absolute top-full left-0 mt-2 bg-stone-800 border border-stone-700 rounded-lg shadow-xl w-48 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-2 py-1 text-[9px] text-stone-500 font-bold uppercase tracking-wider">选择模型</div>
                                    {AVAILABLE_MODELS.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => { setSelectedModel(m.id); setShowModelSelect(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-700 flex items-center justify-between ${selectedModel === m.id ? 'font-bold text-white bg-stone-700/50' : 'text-stone-300'}`}
                                        >
                                            <span className="truncate">{m.name.split(' (')[0]}</span>
                                            {selectedModel === m.id && <Check size={10} className="text-terra-500" />}
                                        </button>
                                    ))}
                                    <div className="border-t border-stone-700 my-1"></div>
                                    <button
                                        onClick={() => { setSelectedModel('custom'); setShowModelSelect(false); }}
                                        className={`w-full text-left px-3 py-2 text-xs text-stone-400 hover:bg-stone-700 hover:text-white transition-colors`}
                                    >
                                        自定义模型 ID...
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
             </div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full shrink-0">
          <Minimize2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-50 space-y-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-stone-800 text-white rounded-br-none' 
                  : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-stone-400 text-xs">
              <Loader2 size={14} className="animate-spin" /> 正在思考...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="询问关于文物的信息..."
            className="w-full pl-4 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none text-sm text-stone-700 transition-all"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-terra-600 hover:bg-terra-700 text-white rounded-lg disabled:opacity-50 disabled:bg-stone-300 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChatBot;
