
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Artifact } from '../types';
import { PieChart, BarChart2, Grid, Box, Shapes, Tag, Maximize2, X } from 'lucide-react';

interface StatsChartProps {
  artifacts: Artifact[];
}

// Added 'name' to Tab type
type Tab = 'material' | 'category' | 'unit' | 'name';

const StatsChart: React.FC<StatsChartProps> = ({ artifacts }) => {
  const chartRef = useRef<SVGSVGElement>(null);
  const largeChartRef = useRef<SVGSVGElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('material');
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Drawing Logic extracted for reuse ---
  const renderChart = (
      svgRef: React.RefObject<SVGSVGElement>, 
      width: number, 
      height: number, 
      margin: {top: number, right: number, bottom: number, left: number},
      fontSize: number
    ) => {
    if (!artifacts.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // --- Prepare Data ---
    let dataMap: d3.InternMap<string, number>;
    let colorHex = "#78716c";

    switch (activeTab) {
      case 'material':
        dataMap = d3.rollup(artifacts, v => v.length, d => d.material || '未知');
        colorHex = "#b45309"; // Terra-500
        break;
      case 'category':
        dataMap = d3.rollup(artifacts, v => v.length, d => d.category || '未分类');
        colorHex = "#92400e"; // Terra-600
        break;
      case 'unit':
        dataMap = d3.rollup(artifacts, v => v.length, d => d.unit || '未知单位');
        colorHex = "#57534e"; // Stone-600
        break;
      case 'name':
        dataMap = d3.rollup(artifacts, v => v.length, d => d.name || '未命名');
        colorHex = "#44403c"; // Stone-700
        break;
      default:
        return;
    }

    let data = Array.from(dataMap, ([label, value]) => ({ label, value }));
    data.sort((a, b) => b.value - a.value);
    
    // Limit for small view, maybe show more in large view?
    // Let's keep logic consistent but allow more items if width allows, 
    // but for simplicity stick to Top 8 + Other for consistency across views
    if (data.length > 8) {
      const others = data.slice(8).reduce((acc, cur) => acc + cur.value, 0);
      data = data.slice(0, 8);
      data.push({ label: '其他', value: others });
    }

    // --- Render Logic ---

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.attr("width", width).attr("height", height).append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 10])
      .nice()
      .range([innerHeight, 0]);

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", `${fontSize}px`)
      .style("fill", "#57534e");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .style("color", "#a8a29e")
      .style("font-size", `${fontSize}px`);

    // Bars
    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.label)!)
      .attr("y", innerHeight)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", colorHex)
      .attr("rx", 3)
      .transition()
      .duration(800)
      .attr("y", d => y(d.value))
      .attr("height", d => innerHeight - y(d.value));

    // Labels on top
    g.selectAll(".label")
      .data(data)
      .enter()
      .append("text")
      .text(d => d.value)
      .attr("x", d => x(d.label)! + x.bandwidth() / 2)
      .attr("y", d => y(d.value) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", `${fontSize}px`)
      .style("fill", "#57534e")
      .style("opacity", 0)
      .transition()
      .delay(400)
      .duration(400)
      .style("opacity", 1);
  };

  // Render Small Chart
  useEffect(() => {
     renderChart(chartRef, 280, 250, { top: 20, right: 20, bottom: 60, left: 40 }, 10);
  }, [artifacts, activeTab]);

  // Render Large Chart when expanded
  useEffect(() => {
     if (isExpanded) {
        // Delay slightly to ensure Modal DOM is ready
        const timer = setTimeout(() => {
             // 80vw, 60vh approx
             const w = Math.min(window.innerWidth * 0.8, 1000);
             const h = Math.min(window.innerHeight * 0.6, 600);
             renderChart(largeChartRef, w, h, { top: 40, right: 40, bottom: 80, left: 60 }, 14);
        }, 100);
        return () => clearTimeout(timer);
     }
  }, [artifacts, activeTab, isExpanded]);


  const tabs: {id: Tab, icon: React.FC<any>, label: string}[] = [
      { id: 'material', icon: Box, label: '质地' },
      { id: 'category', icon: Shapes, label: '器类' },
      { id: 'name', icon: Tag, label: '名称' },
      { id: 'unit', icon: Grid, label: '单位' },
  ];

  const activeTabItem = tabs.find(t => t.id === activeTab);
  const ActiveIcon = activeTabItem?.icon;

  return (
    <>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 relative group">
        <button 
            onClick={() => setIsExpanded(true)}
            className="absolute top-4 right-4 text-stone-300 hover:text-terra-600 p-1 rounded hover:bg-stone-50 transition-colors opacity-0 group-hover:opacity-100"
            title="放大查看"
        >
            <Maximize2 size={16} />
        </button>

        {/* Tabs */}
        <div className="flex border-b border-stone-100 mb-4 justify-around mr-8">
            {tabs.map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 pb-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 transition-colors ${activeTab === tab.id ? 'text-terra-600 border-b-2 border-terra-600' : 'text-stone-400 hover:text-stone-600'}`}
                >
                <tab.icon size={14} /> <span>{tab.label}</span>
                </button>
            ))}
        </div>

        <div className="min-h-[250px] flex items-center justify-center">
            {artifacts.length === 0 ? (
            <div className="text-stone-400 text-sm italic">暂无数据</div>
            ) : (
            <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
                <svg ref={chartRef} className="overflow-visible"></svg>
                <p className="text-xs text-stone-400 mt-2">
                    {activeTab === 'material' && '按材质统计 (Top 8)'}
                    {activeTab === 'category' && '按器物类别统计 (Top 8)'}
                    {activeTab === 'name' && '按器物名称统计 (Top 8)'}
                    {activeTab === 'unit' && '按出土单位统计 (Top 8)'}
                </p>
            </div>
            )}
        </div>
        </div>

        {/* Expanded Modal */}
        {isExpanded && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/80 backdrop-blur-sm animate-in fade-in duration-200 p-8">
                <div className="bg-white rounded-2xl shadow-2xl p-8 relative max-w-6xl w-full flex flex-col items-center">
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                    
                    <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2 flex items-center gap-2">
                         {ActiveIcon && <ActiveIcon size={24} />}
                         {activeTabItem?.label}统计分析
                    </h2>
                    <p className="text-stone-500 mb-8 text-sm">大数据可视化面板</p>

                    <div className="flex-1 w-full flex items-center justify-center overflow-auto">
                        <svg ref={largeChartRef} className="overflow-visible"></svg>
                    </div>

                     {/* Modal Tabs to switch view inside modal */}
                     <div className="flex gap-4 mt-8 bg-stone-100 p-1.5 rounded-lg">
                        {tabs.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white text-terra-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                            <tab.icon size={16} /> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default StatsChart;
