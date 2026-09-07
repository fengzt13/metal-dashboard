/* ============================================================
   金铜大宗景气度看板 · 渲染逻辑
   依赖：ECharts 5.x + data.js
   ============================================================ */

/* ---------- 通用工具 ---------- */
var D = METAL_DATA;
var charts = {};   // 存储已初始化图表实例

var COLOR = {
  primary: "#2f6fed",
  gold: "#d4a017",
  copper: "#c06c3c",
  text: "#1f2d3d",
  sub: "#6b7a8f",
  muted: "#9aa8bb",
  green: "#3aa66b",
  red: "#d9534f",
  grid: "#e6edf5"
};

/* 统一图表的默认配置 */
function baseOption(titleText) {
  return {
    color: [COLOR.primary, COLOR.gold, COLOR.copper, COLOR.green, COLOR.red],
    textStyle: { color: COLOR.text, fontFamily: "Microsoft YaHei, sans-serif" },
    grid: { left: 50, right: 24, top: 40, bottom: 40, containLabel: true },
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: COLOR.sub } },
    xAxis: { type: "category", axisLine: { lineStyle: { color: COLOR.border } },
             axisLabel: { color: COLOR.sub } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: COLOR.border, type: "dashed" } },
             axisLabel: { color: COLOR.sub } }
  };
}

/* 渲染辅助：若数据为空则显示空态 */
function renderChart(el, option) {
  var dom = document.getElementById(el);
  if (!dom) return;
  var hasData = option && option.series && option.series.some(function (s) {
    return s.data && s.data.length > 0;
  });
  if (!hasData) {
    dom.innerHTML = '<div class="chart-empty">数据整理中，待补充</div>';
    return;
  }
  var chart = echarts.init(dom);
  chart.setOption(option);
  charts[el] = chart;
}

/* 页面渲染注册表：各页面首次激活时执行 */
var pageRenders = {
  overview: renderOverview,
  gold: renderGold,
  copper: renderCopper,
  ratio: renderRatio,
  macro: renderMacro,
  bears: renderBears,
  sources: renderSources
};
var renderedPages = {};

function renderPage(name) {
  if (renderedPages[name]) {
    // 已渲染过：仅resize
    setTimeout(function () {
      for (var k in charts) { if (charts[k]) charts[k].resize(); }
    }, 60);
    return;
  }
  renderedPages[name] = true;
  var fn = pageRenders[name];
  if (fn) fn();
}

/* 空态兜底：若无 ECharts 则提示 */
function checkEcharts() {
  if (typeof echarts === "undefined") {
    document.querySelectorAll(".chart").forEach(function (el) {
      el.innerHTML = '<div class="chart-empty">图表库加载失败（ECharts CDN不可用）</div>';
    });
    return false;
  }
  return true;
}

/* 计算分位/景气度颜色 */
function gaugeColor(val) {
  if (val >= 75) return COLOR.red;      // 高景气/偏热
  if (val >= 50) return COLOR.green;    // 中性偏暖
  if (val >= 30) return COLOR.primary;  // 中性
  return COLOR.muted;                   // 偏冷
}

/* ---------- 导航切换 ---------- */
function initNav() {
  var navBtns = document.querySelectorAll(".nav-btn");
  var pages = document.querySelectorAll(".page");
  navBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      navBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var target = btn.getAttribute("data-page");
      pages.forEach(function (p) {
        p.classList.toggle("active", p.id === "page-" + target);
      });
      // 懒加载：首次切换到该页时渲染图表
      renderPage(target);
    });
  });
}

/* ============================================================
   综合总览页
   ============================================================ */
function renderOverview() {
  /* 更新日期 */
  document.getElementById("updateDate").textContent =
    "数据更新：" + D.meta.updated;

  /* 1. 景气度仪表盘（黄金/铜） */
  var goldScore = 72, copperScore = 68;   // 由score数据聚合的总体分
  // 综合得分：加权各维度
  var dims = D.score.dimensions;
  var g = D.score.gold, c = D.score.copper;
  goldScore = Math.round(g.reduce(function (a, b) { return a + b; }, 0) / g.length);
  copperScore = Math.round(c.reduce(function (a, b) { return a + b; }, 0) / c.length);

  renderChart("gaugeGold", {
    series: [{
      type: "gauge",
      min: 0, max: 100,
      splitNumber: 10,
      radius: "95%",
      axisLine: {
        lineStyle: {
          width: 14,
          color: [[0.7, "#e8f0ff"], [1, "#f2d98a"]]
        }
      },
      progress: { show: true, width: 14, itemStyle: { color: gaugeColor(goldScore) } },
      pointer: { show: true, itemStyle: { color: COLOR.gold } },
      axisTick: { distance: -18, length: 4 },
      splitLine: { distance: -22, length: 8, lineStyle: { color: "#cfd8e8" } },
      axisLabel: { distance: 16, color: COLOR.sub, fontSize: 10 },
      detail: { valueAnimation: true, fontSize: 30, color: COLOR.gold, offsetCenter: [0, "60%"] },
      title: { show: false },
      data: [{ value: goldScore, name: "黄金景气度" }]
    }]
  });
  renderChart("gaugeCopper", {
    series: [{
      type: "gauge",
      min: 0, max: 100,
      splitNumber: 10,
      radius: "95%",
      axisLine: { lineStyle: { width: 14, color: [[0.7, "#e8f0ff"], [1, "#f2d9c0"]] } },
      progress: { show: true, width: 14, itemStyle: { color: gaugeColor(copperScore) } },
      pointer: { show: true, itemStyle: { color: COLOR.copper } },
      axisTick: { distance: -18, length: 4 },
      splitLine: { distance: -22, length: 8, lineStyle: { color: "#cfd8e8" } },
      axisLabel: { distance: -12, color: COLOR.sub, fontSize: 10 },
      detail: { valueAnimation: true, fontSize: 30, color: COLOR.copper, offsetCenter: [0, "60%"] },
      data: [{ value: copperScore, name: "铜景气度" }]
    }]
  });
  document.getElementById("overallTag").textContent =
    "黄金 " + goldScore + " 分 · 铜 " + copperScore + " 分 · 均处高位景气";

  /* 2. 金铜比走势（月度粒度） */
  var monthly = D.monthly;
  renderChart("chartRatio", Object.assign(baseConfig("金铜比走势（月度，2021.01-2026.08）"), {
    xAxis: { type: "category", data: monthly.months, axisLabel: { color: COLOR.sub, rotate: 35, fontSize: 10 } },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, height: 18, bottom: 4 }
    ],
    series: [{
      name: "金铜比",
      type: "line",
      smooth: true,
      data: monthly.ratio,
      lineStyle: { color: COLOR.primary, width: 2 },
      itemStyle: { color: COLOR.primary },
      areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1,
        colorStops: [{offset:0,color:"rgba(47,111,237,0.25)"},{offset:1,color:"rgba(47,111,237,0)"}] } },
      markLine: { data: [{ type: "average", name: "均值" }],
        lineStyle: { color: COLOR.muted, type: "dashed" } }
    }]
  }));
  var lastRatio = monthly.ratio[monthly.ratio.length - 1];
  var firstRatio = monthly.ratio[0];
  var ratioMultiple = (lastRatio / firstRatio).toFixed(1);
  document.getElementById("ratioTag").textContent =
    "当前 " + lastRatio.toFixed(3) + " · 较2021年初走扩约" + ratioMultiple + "倍（避险占优）";

  /* 3. 双价格走势（月度粒度，双Y轴） */
  renderChart("chartDualPrice", {
    color: [COLOR.gold, COLOR.copper],
    legend: { top: 0 },
    tooltip: { trigger: "axis" },
    grid: { left: 60, right: 60, top: 40, bottom: 55 },
    xAxis: { type: "category", data: monthly.months, axisLabel: { color: COLOR.sub, rotate: 35, fontSize: 10 } },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, height: 18, bottom: 4 }
    ],
    yAxis: [
      { type: "value", name: "金价 $/oz", nameTextStyle: { color: COLOR.gold },
        axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "铜价 $/t", nameTextStyle: { color: COLOR.copper },
        axisLabel: { color: COLOR.sub }, splitLine: { show: false } }
    ],
    series: [
      { name: "金价(美元/盎司)", type: "line", smooth: true, data: monthly.gold,
        lineStyle: { color: COLOR.gold, width: 2 }, itemStyle: { color: COLOR.gold }, yAxisIndex: 0,
        symbol: "circle", symbolSize: 4 },
      { name: "铜价(美元/吨)", type: "line", smooth: true, data: monthly.copper,
        lineStyle: { color: COLOR.copper, width: 2 }, itemStyle: { color: COLOR.copper }, yAxisIndex: 1,
        symbol: "circle", symbolSize: 4 }
    ]
  });

  /* 4. 五维景气度雷达 */
  renderChart("chartRadar", {
    color: [COLOR.gold, COLOR.copper],
    tooltip: {},
    legend: { top: 0, data: ["黄金", "铜"] },
    radar: {
      indicator: dims.map(function (d) { return { name: d, max: 100 }; }),
      radius: "65%",
      splitArea: { areaStyle: { color: ["rgba(47,111,237,0.03)", "rgba(47,111,237,0.06)"] } },
      axisName: { color: COLOR.text },
      splitLine: { lineStyle: { color: COLOR.border } }
    },
    series: [{
      type: "radar",
      data: [
        { value: D.score.gold, name: "黄金", areaStyle: { color: "rgba(212,160,23,0.2)" },
          lineStyle: { color: COLOR.gold }, itemStyle: { color: COLOR.gold } },
        { value: D.score.copper, name: "铜", areaStyle: { color: "rgba(192,108,60,0.2)" },
          lineStyle: { color: COLOR.copper }, itemStyle: { color: COLOR.copper } }
      ]
    }]
  });

  /* 5. 关键指标快照 */
  renderMetrics(D.metrics);
}

/* 通用折线图配置 */
function baseConfig(title) {
  return {
    title: { text: title, left: "center", top: 4, textStyle: { fontSize: 14, color: COLOR.text } },
    tooltip: { trigger: "axis" },
    legend: { top: 32 },
    grid: { left: 56, right: 24, top: 60, bottom: 40 },
    xAxis: { type: "category", axisLine: { lineStyle: { color: COLOR.border } }, axisLabel: { color: COLOR.sub } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: COLOR.border, type: "dashed" } }, axisLabel: { color: COLOR.sub } }
  };
}

/* 渲染关键指标快照 */
function renderMetrics(metrics) {
  var wrap = document.getElementById("metricCards");
  if (!wrap) return;
  wrap.innerHTML = metrics.map(function (m) {
    return '<div class="metric-card">' +
      '<div class="m-label">' + m.label + '</div>' +
      '<div class="m-value ' + m.type + '">' + m.value + ' <span style="font-size:11px">' + m.unit + '</span></div>' +
      '<div class="m-note">' + m.note + '</div>' +
    '</div>';
  }).join("");
}

/* ============================================================
   黄金专题页
   ============================================================ */
function renderGold() {
  var g = D.gold;
  var gm = D.goldMonthly;
  var months = gm.months;

  /* 月度图表通用配置 */
  function monthlyConfig(title) {
    return {
      title: { text: title, left: "center", top: 4, textStyle: { fontSize: 14, color: COLOR.text } },
      tooltip: { trigger: "axis" },
      legend: { top: 32 },
      grid: { left: 60, right: 60, top: 64, bottom: 55 },
      xAxis: { type: "category", data: months,
        axisLine: { lineStyle: { color: COLOR.grid } },
        axisLabel: { color: COLOR.sub, rotate: 35, fontSize: 10 } },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", start: 0, end: 100, height: 18, bottom: 4 }
      ]
    };
  }

  /* 1. 黄金价格走势（月度，叠加月环比柱） */
  renderChart("chartGoldPrice", Object.assign(monthlyConfig("黄金价格走势（月度，2021.01-2026.08）"), {
    legend: { top: 32, data: ["金价(美元/盎司)", "月环比 %"] },
    yAxis: [
      { type: "value", name: "金价 $/oz", nameTextStyle: { color: COLOR.gold },
        axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "月环比 %", nameTextStyle: { color: COLOR.green },
        axisLabel: { color: COLOR.sub, formatter: "{value}%" }, splitLine: { show: false } }
    ],
    series: [
      { name: "金价(美元/盎司)", type: "line", smooth: true, data: gm.gold, yAxisIndex: 0,
        lineStyle: { color: COLOR.gold, width: 2 }, itemStyle: { color: COLOR.gold },
        symbol: "circle", symbolSize: 3,
        areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1,
          colorStops: [{offset:0,color:"rgba(212,160,23,0.25)"},{offset:1,color:"rgba(212,160,23,0)"}] } } },
      { name: "月环比 %", type: "bar", data: gm.goldMom, yAxisIndex: 1,
        itemStyle: { color: function(p) { return p.value >= 0 ? "rgba(58,166,107,0.45)" : "rgba(217,83,79,0.45)"; } },
        barWidth: "60%" }
    ]
  }));

  /* 2. 全球央行月度净购金（吨） */
  renderChart("chartGoldCbBuy", Object.assign(monthlyConfig("全球央行黄金净买入（月度，吨）"), {
    yAxis: { type: "value", name: "吨", nameTextStyle: { color: COLOR.sub },
      axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid, type: "dashed" } } },
    series: [{
      name: "全球央行净购金",
      type: "bar",
      data: gm.globalCbTons,
      itemStyle: {
        color: function(p) { return p.value >= 0 ? COLOR.gold : COLOR.red; },
        borderRadius: [3, 3, 0, 0]
      }
    }]
  }));

  /* 3. 中国央行月度净买入 & 储备（新增） */
  renderChart("chartGoldChinaCb", Object.assign(monthlyConfig("中国央行月度净买入 & 储备（2021.01-2026.08）"), {
    legend: { top: 32, data: ["中国央行净买入(吨)", "黄金储备(万oz)"] },
    yAxis: [
      { type: "value", name: "净买入(吨)", nameTextStyle: { color: COLOR.gold },
        axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "储备(万oz)", nameTextStyle: { color: COLOR.primary },
        axisLabel: { color: COLOR.sub }, splitLine: { show: false } }
    ],
    series: [
      { name: "中国央行净买入(吨)", type: "bar", data: gm.chinaCbTons, yAxisIndex: 0,
        itemStyle: { color: COLOR.gold, borderRadius: [3, 3, 0, 0] } },
      { name: "黄金储备(万oz)", type: "line", smooth: true, data: gm.chinaReserveOz, yAxisIndex: 1,
        lineStyle: { color: COLOR.primary, width: 2 }, itemStyle: { color: COLOR.primary }, symbol: "none" }
    ]
  }));

  /* 4. 需求结构（饼图，保持不变） */
  renderChart("chartGoldDemand", {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: COLOR.sub } },
    color: [COLOR.gold, COLOR.primary, COLOR.green, COLOR.copper],
    series: [{
      name: "需求结构",
      type: "pie",
      radius: ["40%", "68%"],
      center: ["50%", "45%"],
      itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
      label: { formatter: "{b}: {d}%" },
      data: g.demandMix2024.labels.map(function (l, i) {
        return { name: l, value: g.demandMix2024.values[i] };
      })
    }]
  });

  /* 5. 黄金库存 + 金价叠加（双Y轴） */
  renderChart("chartGoldInventory", Object.assign(monthlyConfig("黄金库存与金价叠加（月度，吨 vs $/oz）"), {
    legend: { top: 32, data: ["COMEX", "SHFE", "金价"] },
    yAxis: [
      { type: "value", name: "库存(吨)", nameTextStyle: { color: COLOR.sub },
        axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "金价 $/oz", nameTextStyle: { color: COLOR.gold },
        axisLabel: { color: COLOR.sub }, splitLine: { show: false } }
    ],
    series: [
      { name: "COMEX", type: "line", smooth: true, data: gm.comex, yAxisIndex: 0,
        lineStyle: { color: COLOR.primary, width: 2 }, itemStyle: { color: COLOR.primary }, symbol: "none" },
      { name: "SHFE", type: "line", smooth: true, data: gm.shfe, yAxisIndex: 0,
        lineStyle: { color: COLOR.copper, width: 2 }, itemStyle: { color: COLOR.copper }, symbol: "none" },
      { name: "金价", type: "line", smooth: true, data: gm.gold, yAxisIndex: 1,
        lineStyle: { color: COLOR.gold, width: 2, type: "dashed" }, itemStyle: { color: COLOR.gold }, symbol: "none" }
    ]
  }));

  /* 6. 黄金ETF + 金价叠加（双Y轴） */
  renderChart("chartGoldEtf", Object.assign(monthlyConfig("黄金ETF持仓与金价叠加（月度，吨 vs $/oz）"), {
    legend: { top: 32, data: ["ETF持仓", "金价"] },
    yAxis: [
      { type: "value", name: "ETF(吨)", nameTextStyle: { color: COLOR.gold },
        axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "金价 $/oz", nameTextStyle: { color: COLOR.primary },
        axisLabel: { color: COLOR.sub }, splitLine: { show: false } }
    ],
    series: [
      { name: "ETF持仓", type: "line", smooth: true, data: gm.etf, yAxisIndex: 0,
        lineStyle: { color: COLOR.gold, width: 2 }, itemStyle: { color: COLOR.gold }, symbol: "none",
        areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1,
          colorStops: [{offset:0,color:"rgba(212,160,23,0.2)"},{offset:1,color:"rgba(212,160,23,0)"}] } } },
      { name: "金价", type: "line", smooth: true, data: gm.gold, yAxisIndex: 1,
        lineStyle: { color: COLOR.primary, width: 2, type: "dashed" }, itemStyle: { color: COLOR.primary }, symbol: "none" }
    ]
  }));
}

/* ============================================================
   铜专题页
   ============================================================ */
function renderCopper() {
  var cm = D.copperMonthly;
  var months = cm.months;

  function mc(title) {
    return {
      title: { text: title, left: "center", top: 4, textStyle: { fontSize: 14, color: COLOR.text } },
      tooltip: { trigger: "axis" },
      legend: { top: 32 },
      grid: { left: 60, right: 60, top: 64, bottom: 55 },
      xAxis: { type: "category", data: months,
        axisLine: { lineStyle: { color: COLOR.grid } },
        axisLabel: { color: COLOR.sub, rotate: 35, fontSize: 10 } },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", start: 0, end: 100, height: 18, bottom: 4 }
      ]
    };
  }

  /* 1. 铜价走势（月度，叠加月环比柱） */
  renderChart("chartCopperPrice", Object.assign(mc("铜价走势（月度，2021.01-2026.08）"), {
    legend: { top: 32, data: ["铜价(美元/吨)", "月环比 %"] },
    yAxis: [
      { type: "value", name: "铜价 $/t", nameTextStyle: { color: COLOR.copper },
        axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "月环比 %", nameTextStyle: { color: COLOR.green },
        axisLabel: { color: COLOR.sub, formatter: "{value}%" }, splitLine: { show: false } }
    ],
    series: [
      { name: "铜价(美元/吨)", type: "line", smooth: true, data: cm.copper, yAxisIndex: 0,
        lineStyle: { color: COLOR.copper, width: 2 }, itemStyle: { color: COLOR.copper },
        symbol: "circle", symbolSize: 3,
        areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1,
          colorStops: [{offset:0,color:"rgba(192,108,60,0.2)"},{offset:1,color:"rgba(192,108,60,0)"}] } } },
      { name: "月环比 %", type: "bar", data: cm.copperMom, yAxisIndex: 1,
        itemStyle: { color: function(p) { return p.value >= 0 ? "rgba(58,166,107,0.4)" : "rgba(217,83,79,0.4)"; } },
        barWidth: "60%" }
    ]
  }));

  /* 2. 产能/需求/缺口（月度，双Y轴） */
  renderChart("chartCopperSupplyDemand", Object.assign(mc("全球铜产能·需求·缺口（月度，万吨）"), {
    legend: { top: 32, data: ["全球产量", "全球消费", "供需缺口"] },
    yAxis: [
      { type: "value", name: "万吨", nameTextStyle: { color: COLOR.sub },
        axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "缺口(万吨)", nameTextStyle: { color: COLOR.gold },
        axisLabel: { color: COLOR.sub }, splitLine: { show: false } }
    ],
    series: [
      { name: "全球产量", type: "line", smooth: true, data: cm.globalProd, yAxisIndex: 0,
        lineStyle: { color: COLOR.copper, width: 2 }, itemStyle: { color: COLOR.copper }, symbol: "none" },
      { name: "全球消费", type: "line", smooth: true, data: cm.globalCons, yAxisIndex: 0,
        lineStyle: { color: COLOR.primary, width: 2 }, itemStyle: { color: COLOR.primary }, symbol: "none" },
      { name: "供需缺口", type: "bar", data: cm.deficit, yAxisIndex: 1,
        itemStyle: { color: function(p) { return p.value >= 0 ? "rgba(58,166,107,0.5)" : "rgba(217,83,79,0.5)"; } },
        barWidth: "50%" }
    ]
  }));

  /* 3. 中国 vs 全球铜消费量（月度） */
  renderChart("chartCopperChinaCons", Object.assign(mc("中国 vs 全球铜消费量（月度，万吨）"), {
    legend: { top: 32, data: ["全球消费", "中国消费"] },
    yAxis: { type: "value", name: "万吨", nameTextStyle: { color: COLOR.sub },
      axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
    series: [
      { name: "全球消费", type: "line", smooth: true, data: cm.globalCons,
        lineStyle: { color: COLOR.primary, width: 2 }, itemStyle: { color: COLOR.primary }, symbol: "none" },
      { name: "中国消费", type: "bar", data: cm.chinaCons,
        itemStyle: { color: COLOR.gold, borderRadius: [3,3,0,0] } }
    ]
  }));

  /* 4. 三大交易所库存（月度） */
  renderChart("chartCopperInventory", Object.assign(mc("三大交易所铜库存（月度，万吨）"), {
    legend: { top: 32, data: ["LME", "SHFE", "COMEX"] },
    yAxis: { type: "value", name: "万吨", nameTextStyle: { color: COLOR.sub },
      axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
    series: [
      { name: "LME", type: "line", smooth: true, data: cm.lme,
        lineStyle: { color: COLOR.copper, width: 2 }, itemStyle: { color: COLOR.copper }, symbol: "none" },
      { name: "SHFE", type: "line", smooth: true, data: cm.shfe,
        lineStyle: { color: COLOR.gold, width: 2 }, itemStyle: { color: COLOR.gold }, symbol: "none" },
      { name: "COMEX", type: "line", smooth: true, data: cm.comex,
        lineStyle: { color: COLOR.red, width: 2 }, itemStyle: { color: COLOR.red }, symbol: "none" }
    ]
  }));

  /* 5. 加工费TC（月度现货 + 年度长单） */
  renderChart("chartCopperTc", Object.assign(mc("铜精矿加工费TC（月度现货，美元/吨）"), {
    legend: { top: 32, data: ["TC现货", "TC年度长单"] },
    yAxis: { type: "value", name: "美元/吨", nameTextStyle: { color: COLOR.sub },
      axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
    series: [
      { name: "TC现货", type: "line", smooth: false, data: cm.tcSpot,
        lineStyle: { color: COLOR.red, width: 2 }, itemStyle: { color: COLOR.red }, symbol: "circle", symbolSize: 3,
        markLine: { data: [{ yAxis: 0, name: "零线", lineStyle: { color: COLOR.muted, type: "dashed" } }] } },
      { name: "TC年度长单", type: "line", step: "end", data: [59.5,59.5,59.5,59.5,59.5,59.5,59.5,59.5,59.5,59.5,59.5,59.5,65,65,65,65,65,65,65,65,65,65,65,65,88,88,88,88,88,88,88,88,88,88,88,88,80,80,80,80,80,80,80,80,80,80,80,80,21.25,21.25,21.25,21.25,21.25,21.25,21.25,21.25,21.25,21.25,21.25,21.25,0,0,0,0,0,0,0],
        lineStyle: { color: COLOR.primary, width: 2, type: "dashed" }, itemStyle: { color: COLOR.primary }, symbol: "none" }
    ]
  }));
}

/* ============================================================
   金铜比分析页
   ============================================================ */
function renderRatio() {
  var r = D.ratio;
  var macro = D.macro;

  /* 金铜比 vs 宏观指标（双Y轴） */
  renderChart("chartRatioMacro", {
    color: [COLOR.primary, COLOR.red],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["金铜比", "美元指数DXY"] },
    grid: { left: 56, right: 60, top: 40, bottom: 40 },
    xAxis: { type: "category", data: r.years, axisLabel: { color: COLOR.sub } },
    yAxis: [
      { type: "value", name: "金铜比", nameTextStyle: { color: COLOR.primary }, axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.border } } },
      { type: "value", name: "DXY", nameTextStyle: { color: COLOR.gold }, axisLabel: { color: COLOR.sub }, splitLine: { show: false } }
    ],
    series: [
      { name: "金铜比", type: "line", smooth: true, data: r.value, yAxisIndex: 0,
        lineStyle: { color: COLOR.primary, width: 3 }, itemStyle: { color: COLOR.primary } },
      { name: "美元指数DXY", type: "line", smooth: true, data: macro.dxy.value, yAxisIndex: 1,
        lineStyle: { color: COLOR.gold, width: 2, type: "dashed" }, itemStyle: { color: COLOR.gold } }
    ]
  });

  /* 金铜景气度对比 */
  renderChart("chartScoreCompare", {
    tooltip: {},
    legend: { top: 0, data: ["黄金", "铜"] },
    grid: { left: 56, right: 24, top: 40, bottom: 40 },
    xAxis: { type: "category", data: D.score.dimensions, axisLabel: { color: COLOR.sub } },
    yAxis: { type: "value", max: 100, splitLine: { lineStyle: { color: COLOR.border, type: "dashed" } } },
    series: [
      { name: "黄金", type: "bar", data: D.score.gold, itemStyle: { color: COLOR.gold, borderRadius: [4,4,0,0] } },
      { name: "铜", type: "bar", data: D.score.copper, itemStyle: { color: COLOR.copper, borderRadius: [4,4,0,0] } }
    ]
  });

  /* 滚动相关性 */
  renderChart("chartCorr", Object.assign(baseConfig("金铜价格滚动相关性"), {
    xAxis: { type: "category", data: r.years, axisLabel: { color: COLOR.sub } },
    series: [{
      type: "bar",
      data: r.value,
      itemStyle: { color: function (p) { return p.value >= 0.5 ? COLOR.red : COLOR.primary; }, borderRadius: [4,4,0,0] },
      label: { show: true, position: "top", formatter: "{c}", color: COLOR.sub }
    }]
  }));
}

/* ============================================================
   宏观背景页
   ============================================================ */
function renderMacro() {
  var mm = D.macroMonthly;
  var m = D.monthly;
  var months = mm.months;

  function mc(title) {
    return {
      title: { text: title, left: "center", top: 4, textStyle: { fontSize: 14, color: COLOR.text } },
      tooltip: { trigger: "axis" },
      legend: { top: 32 },
      grid: { left: 60, right: 60, top: 64, bottom: 55 },
      xAxis: { type: "category", data: months,
        axisLine: { lineStyle: { color: COLOR.grid } },
        axisLabel: { color: COLOR.sub, rotate: 35, fontSize: 10 } },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", start: 0, end: 100, height: 18, bottom: 4 }
      ]
    };
  }

  /* 1. 美元指数 DXY（月度） */
  renderChart("chartDxy", Object.assign(mc("美元指数 DXY（月度，2021.01-2026.08）"), {
    yAxis: { type: "value", name: "DXY", nameTextStyle: { color: COLOR.gold },
      axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
    series: [{
      name: "DXY", type: "line", smooth: true, data: mm.dxy,
      lineStyle: { color: COLOR.gold, width: 2 }, itemStyle: { color: COLOR.gold }, symbol: "none",
      areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1,
        colorStops: [{offset:0,color:"rgba(212,160,23,0.15)"},{offset:1,color:"rgba(212,160,23,0)"}] } }
    }]
  }));

  /* 2. TIPS实际利率 + 金铜价格叠加（三Y轴） */
  renderChart("chartTips", Object.assign(mc("10年期TIPS实际利率 + 金铜价格叠加（月度）"), {
    legend: { top: 32, data: ["TIPS实际利率(%)", "金价(美元/盎司)", "铜价(美元/吨)"] },
    yAxis: [
      { type: "value", name: "利率 %", position: "left", nameTextStyle: { color: COLOR.primary },
        axisLabel: { color: COLOR.sub, formatter: "{value}%" }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "金价 $/oz", position: "right", nameTextStyle: { color: COLOR.gold },
        axisLabel: { color: COLOR.sub }, splitLine: { show: false } },
      { type: "value", name: "铜价 $/t", position: "right", offset: 60, nameTextStyle: { color: COLOR.copper },
        axisLabel: { color: COLOR.sub }, splitLine: { show: false } }
    ],
    series: [
      { name: "TIPS实际利率(%)", type: "line", smooth: true, data: mm.tips, yAxisIndex: 0,
        lineStyle: { color: COLOR.primary, width: 2 }, itemStyle: { color: COLOR.primary }, symbol: "none",
        markLine: { data: [{ yAxis: 0, lineStyle: { color: COLOR.muted, type: "dashed" } }] } },
      { name: "金价(美元/盎司)", type: "line", smooth: true, data: m.gold, yAxisIndex: 1,
        lineStyle: { color: COLOR.gold, width: 1.5, type: "dashed" }, itemStyle: { color: COLOR.gold }, symbol: "none" },
      { name: "铜价(美元/吨)", type: "line", smooth: true, data: m.copper, yAxisIndex: 2,
        lineStyle: { color: COLOR.copper, width: 1.5, type: "dashed" }, itemStyle: { color: COLOR.copper }, symbol: "none" }
    ]
  }));

  /* 3. 全球制造业PMI + CPI（月度，双Y轴） */
  renderChart("chartPmi", Object.assign(mc("全球制造业PMI + 美国CPI同比（月度）"), {
    legend: { top: 32, data: ["全球PMI", "美国CPI同比(%)"] },
    yAxis: [
      { type: "value", name: "PMI", position: "left", nameTextStyle: { color: COLOR.copper },
        axisLabel: { color: COLOR.sub }, splitLine: { lineStyle: { color: COLOR.grid } } },
      { type: "value", name: "CPI %", position: "right", nameTextStyle: { color: COLOR.red },
        axisLabel: { color: COLOR.sub, formatter: "{value}%" }, splitLine: { show: false } }
    ],
    series: [
      { name: "全球PMI", type: "line", smooth: true, data: mm.pmi, yAxisIndex: 0,
        lineStyle: { color: COLOR.copper, width: 2 }, itemStyle: { color: COLOR.copper }, symbol: "none",
        markLine: { data: [{ yAxis: 50, name: "荣枯线", lineStyle: { color: COLOR.muted, type: "dashed" } }] } },
      { name: "美国CPI同比(%)", type: "line", smooth: true, data: mm.cpiYoy, yAxisIndex: 1,
        lineStyle: { color: COLOR.red, width: 2 }, itemStyle: { color: COLOR.red }, symbol: "none" }
    ]
  }));

  /* 4. 美联储利率时间轴（按半年维度，自定义渲染避免文字遮挡） */
  var ev = mm.rateEvents;
  var evColors = { primary: COLOR.primary, gold: COLOR.gold, green: COLOR.green, red: COLOR.red };
  renderChart("chartRateCycle", {
    title: { text: "美联储货币政策周期时间轴（按半年）", left: "center", top: 4, textStyle: { fontSize: 14, color: COLOR.text } },
    tooltip: {
      trigger: "item",
      formatter: function(p) {
        var d = ev[p.dataIndex];
        return d.period + "<br/>" + d.label + "<br/>利率区间：" + d.rate;
      }
    },
    grid: { left: 40, right: 24, top: 40, bottom: 80 },
    xAxis: { type: "category", data: ev.map(function(e) { return e.period; }),
      axisLine: { lineStyle: { color: COLOR.grid } },
      axisLabel: { color: COLOR.sub, fontSize: 10, rotate: 30 } },
    yAxis: { show: false, min: 0, max: 3 },
    series: [{
      type: "custom",
      renderItem: function(params, api) {
        var idx = api.value(0);
        var d = ev[idx];
        var cat = api.coord([idx, 1]);
        var cat2 = api.coord([idx, 0.5]);
        var w = api.size([1, 0])[0] * 0.7;
        return {
          type: "group",
          children: [
            { type: "rect", shape: { x: cat[0] - w/2, y: cat[1] - 25, width: w, height: 50 },
              style: { fill: evColors[d.color] || COLOR.primary, opacity: 0.85, stroke: "#fff", lineWidth: 2 } },
            { type: "text", style: { text: d.label, x: cat[0], y: cat[1] - 8, textAlign: "center",
              fill: "#fff", fontSize: 11, fontWeight: "bold" } },
            { type: "text", style: { text: d.rate, x: cat[0], y: cat[1] + 10, textAlign: "center",
              fill: "#fff", fontSize: 10 } },
            { type: "text", style: { text: d.period, x: cat[0], y: cat2[1] + 18, textAlign: "center",
              fill: COLOR.sub, fontSize: 10 } }
          ]
        };
      },
      data: ev.map(function(e, i) { return i; })
    }]
  });
}

/* ============================================================
   看空声音页
   ============================================================ */
var bearsState = { target: "all", category: "all", status: "all" };

function renderBears() {
  var B = D.bears;
  if (!B || !B.items) return;

  /* 计数 */
  var total = B.items.length;
  var countEl = document.getElementById("bearsCount");
  if (countEl) countEl.textContent = "共收录 " + total + " 条观点";

  /* 绑定筛选 */
  var btns = document.querySelectorAll(".bears-filter .filter-btn");
  btns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      var v = btn.getAttribute("data-value");
      bearsState[f] = v;
      btns.forEach(function (b) {
        var same = b.getAttribute("data-filter") === f;
        b.classList.toggle("active", same && b.getAttribute("data-value") === v);
      });
      bearsApply();
    });
  });

  bearsApply();
}

/* 分类统计（不随筛选变化，展示全量结构） */
function bearsStatsHtml() {
  var B = D.bears;
  var count = {};
  B.items.forEach(function (it) {
    it.category.forEach(function (c) { count[c] = (count[c] || 0) + 1; });
  });
  return B.categories.map(function (cat) {
    var n = count[cat.id] || 0;
    return '<span class="stat-chip"><span class="dot" style="background:' +
      bearsCatColor(cat.id) + '"></span><b>' + cat.id + '</b> ' + cat.name +
      ' · <b>' + n + '</b> 条</span>';
  }).join("");
}

function bearsCatColor(id) {
  var colors = { A: "#2f6fed", B: "#d4a017", C: "#8a63c9", D: "#c06c3c", E: "#3aa66b", F: "#d9534f" };
  return colors[id] || "#9aa8bb";
}

function bearsStatusInfo(st) {
  return (D.bears.statusMap && D.bears.statusMap[st]) ||
    { label: st, color: "#9aa8bb" };
}

function bearsCardHtml(it) {
  var sm = bearsStatusInfo(it.status);
  var catTags = it.category.map(function (c) {
    var cat = D.bears.categories.find(function (x) { return x.id === c; });
    return '<span class="bear-tag" title="' + (cat ? cat.desc : "") + '">' + c + ' ' + (cat ? cat.name : "") + '</span>';
  }).join("");
  var targetTag = '<span class="bear-tag target-' + it.target + '">' +
    ({ gold: "黄金", copper: "铜", both: "金铜" }[it.target] || it.target) + '</span>';
  var quote = it.quote ? '<div class="bear-quote">"' + it.quote + '"</div>' : "";
  var src = it.url ? '<a href="' + it.url + '" target="_blank" rel="noopener">' + it.source + '</a>' : it.source;
  return '<div class="bear-card">' +
    '<div class="bear-card-head">' +
      '<div><div class="bear-card-name">' + it.name + '</div>' +
      '<div class="bear-card-role">' + it.role + '</div></div>' +
      '<span class="bear-status ' + it.status + '" style="color:' + sm.color + '">' + sm.label + '</span>' +
    '</div>' +
    '<div class="bear-tags">' + targetTag + catTags + '</div>' +
    '<div class="bear-thesis"><strong>核心逻辑：</strong>' + it.thesis + '</div>' +
    quote +
    '<div class="bear-card-meta">' +
      '<span class="bear-date">' + it.date + '</span>' +
      '<span class="bear-source">' + src + '</span>' +
    '</div>' +
  '</div>';
}

function bearsApply() {
  var B = D.bears;
  var st = bearsState;
  var list = B.items.filter(function (it) {
    if (st.target !== "all" && it.target !== st.target) return false;
    if (st.category !== "all" && it.category.indexOf(st.category) < 0) return false;
    if (st.status !== "all" && it.status !== st.status) return false;
    return true;
  });
  var grid = document.getElementById("bearsGrid");
  if (grid) grid.innerHTML = list.map(bearsCardHtml).join("") ||
    '<div class="chart-empty">该筛选条件下暂无收录</div>';

  /* 统计条（全量） */
  var statsEl = document.getElementById("bearsStats");
  if (statsEl) statsEl.innerHTML = bearsStatsHtml();

  var countEl = document.getElementById("bearsCount");
  if (countEl) countEl.textContent = "共收录 " + B.items.length + " 条 · 当前显示 " + list.length + " 条";
}

/* ============================================================
   数据源页
   ============================================================ */
function renderSources() {
  var wrap = document.getElementById("sourcesTable");
  if (!wrap) return;
  var rows = D.sources.map(function (s) {
    var statusCls = s.status === "参考" || s.status === "官方估算" ? " src-missing" : "";
    return "<tr><td>" + s.indicator + "</td><td>" + s.agency +
      "</td><td>" + s.freq + "</td><td>" + s.last + "</td><td class='" + statusCls + "'>" +
      s.status + "</td><td>" + s.ref + "</td></tr>";
  }).join("");
  wrap.innerHTML = "<table><thead><tr><th>指标</th><th>数据机构</th><th>更新频率</th><th>最后更新</th><th>状态</th><th>说明</th></tr></thead><tbody>" + rows + "</tbody></table>";
}

/* ============================================================
   初始化
   ============================================================ */
function init() {
  if (!checkEcharts()) return;
  initNav();
  // 默认页（总览）立即渲染，其余子页懒加载
  renderPage("overview");
}

document.addEventListener("DOMContentLoaded", init);

/* ---------- 自动验证钩子（?verify=1 时自动切换所有页面） ---------- */
if (typeof window !== "undefined" && window.location && window.location.search && window.location.search.indexOf("verify=1") >= 0) {
  window.addEventListener("load", function () {
    setTimeout(function () {
      var pages = ["gold", "copper", "ratio", "macro", "bears", "sources"];
      pages.forEach(function (p) {
        var b = document.querySelector('.nav-btn[data-page="' + p + '"]');
        if (b) b.click();
      });
      var tag = document.getElementById("overallTag");
      if (tag) tag.textContent = "自动验证：已渲染 " + Object.keys(charts).length + " 个图表实例";
    }, 600);
  });
}