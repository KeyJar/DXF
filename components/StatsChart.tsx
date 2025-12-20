
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Artifact } from '../types';
import { PieChart, BarChart2, Grid, Box, Shapes } from 'lucide-react';

interface StatsChartProps {
  artifacts: Artifact[];
}

// Restricted to user request: Material (质地), Category (器类), Unit (出土单位)
type Tab = 'material' | 'category' | 'unit';

const StatsChart: React.FC<StatsChartProps> = ({ artifacts }) => {
  const chartRef = useRef<SVGSVGElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('material');

  useEffect(() => {
    if (!artifacts.length || !chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const width = 280;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 60, left: 40 };

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
        // Unit often combined with Site Name for uniqueness, but here we just show 'Unit' string density
        dataMap = d3.rollup(artifacts, v => v.length, d => d.unit || '未知单位');
        colorHex = "#57534e"; // Stone-600
        break;
      default:
        return;
    }

    let data = Array.from(dataMap, ([label, value]) => ({ label, value }));
    data.sort((a, b) => b.value - a.value);
    
    // Limit to top 8 items
    if (data.length > 8) {
      const others = data.slice(8).reduce((acc, cur) => acc + cur.value, 0);
      data = data.slice(0, 8);
      data.push({ label: '其他', value: others });
    }

    // --- Render Logic (Shared Bar Chart for consistency) ---
    // If it's Material, user might expect Pie, but Bar is clearer for comparisons.
    // Let's use Bar for all for clean UI.

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
      .style("font-size", "10px")
      .style("fill", "#57534e");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .style("color", "#a8a29e")
      .style("font-size", "10px");

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
      .style("font-size", "10px")
      .style("fill", "#57534e")
      .style("opacity", 0)
      .transition()
      .delay(400)
      .duration(400)
      .style("opacity", 1);

  }, [artifacts, activeTab]);

  const tabs: {id: Tab, icon: React.FC<any>, label: string}[] = [
      { id: 'material', icon: Box, label: '质地' },
      { id: 'category', icon: Shapes, label: '器类' },
      { id: 'unit', icon: Grid, label: '出土单位' },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-stone-200">
      {/* Tabs */}
      <div className="flex border-b border-stone-100 mb-4 justify-around">
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
            <svg ref={chartRef}></svg>
            <p className="text-xs text-stone-400 mt-2">
                {activeTab === 'material' && '按材质统计'}
                {activeTab === 'category' && '按器物类别统计'}
                {activeTab === 'unit' && '按出土单位统计'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsChart;
