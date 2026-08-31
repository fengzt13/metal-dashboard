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
  renderChart("chartRatio", Object.assign(baseConfig("金铜比走势（月度，2021.01-2026.07）"), {
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
  renderChart("chartGoldPrice", Object.assign(monthlyConfig("黄金价格走势（月度，2021.01-2026.07）"), {
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
  renderChart("chartGoldChinaCb", Object.assign(monthlyConfig("中国央行月度净买入 & 储备（2021.01-2026.07）"), {
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
  var c = D.copper;

  /* 铜价 */
  renderChart("chartCopperPrice", Object.assign(baseConfig("LME铜价（美元/吨）"), {
    xAxis: { type: "category", data: c.price.years, axisLabel: { color: COLOR.sub } },
    series: [{
      name: "铜价",
      type: "line",
      smooth: true,
      data: c.price.annual,
      lineStyle: { color: COLOR.copper, width: 3 },
      itemStyle: { color: COLOR.copper },
      areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1,
        colorStops: [{offset:0,color:"rgba(192,108,60,0.3)"},{offset:1,color:"rgba(192,108,60,0)"}] } },
      markLine: {
        data: [{ type: "max", name: "最高", itemStyle: { color: COLOR.red } }]
      }
    }]
  }));

  /* 精炼铜产量 */
  renderChart("chartCopperSupply", Object.assign(baseConfig("全球精炼铜产量（万吨）"), {
    xAxis: { type: "category", data: c.production.years, axisLabel: { color: COLOR.sub } },
    series: [{
      name: "产量",
      type: "bar",
      data: c.production.ktons,
      itemStyle: { color: COLOR.copper, borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: "top", color: COLOR.sub }
    }]
  }));

  /* 三大交易所库存 */
  renderChart("chartCopperInventory", Object.assign(baseConfig("三大交易所铜库存（万吨）"), {
    xAxis: { type: "category", data: c.inventory.years, axisLabel: { color: COLOR.sub } },
    legend: { top: 32, data: ["LME", "SHFE", "COMEX"] },
    series: [
      { name: "LME", type: "line", smooth: true, data: c.inventory.lme, itemStyle: { color: COLOR.copper }, lineStyle: { color: COLOR.copper } },
      { name: "SHFE", type: "line", smooth: true, data: c.inventory.shfe, itemStyle: { color: COLOR.gold }, lineStyle: { color: COLOR.gold } },
      { name: "COMEX", type: "line", smooth: true, data: c.inventory.comex, itemStyle: { color: COLOR.primary }, lineStyle: { color: COLOR.primary } }
    ]
  }));

  /* 精炼铜消费 */
  renderChart("chartCopperDemand", Object.assign(baseConfig("全球精炼铜消费量（万吨）"), {
    xAxis: { type: "category", data: c.demand.years, axisLabel: { color: COLOR.sub } },
    series: [{
      type: "line", smooth: true,
      data: c.demand.ktons,
      lineStyle: { color: COLOR.primary, width: 3 },
      itemStyle: { color: COLOR.primary },
      areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1,
        colorStops: [{offset:0,color:"rgba(47,111,237,0.25)"},{offset:1,color:"rgba(47,111,237,0)"}] } }
    }]
  }));

  /* 加工费TC */
  renderChart("chartCopperTc", Object.assign(baseConfig("铜精矿加工费TC（美元/吨，年度长单）"), {
    xAxis: { type: "category", data: c.tc.years, axisLabel: { color: COLOR.sub } },
    series: [{
      type: "line", smooth: true,
      data: c.tc.value,
      lineStyle: { color: COLOR.red, width: 3 },
      itemStyle: { color: COLOR.red },
      markPoint: {
        data: [
          { coord: [5, 0], name: "2026零加工费", value: "历史首次", itemStyle: { color: COLOR.red } }
        ]
      }
    }]
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
  var macro = D.macro;

  renderChart("chartDxy", Object.assign(baseConfig("美元指数 DXY"), {
    xAxis: { type: "category", data: macro.dxy.years, axisLabel: { color: COLOR.sub } },
    series: [{ type: "line", smooth: true, data: macro.dxy.value,
      lineStyle: { color: COLOR.gold, width: 3 }, itemStyle: { color: COLOR.gold },
      areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1,
        colorStops: [{offset:0,color:"rgba(212,160,23,0.2)"},{offset:1,color:"rgba(212,160,23,0)"}] } } }]
  }));

  renderChart("chartTips", Object.assign(baseConfig("10年期美债实际利率 TIPS（%）"), {
    xAxis: { type: "category", data: macro.tips.years, axisLabel: { color: COLOR.sub } },
    series: [{
      type: "line", smooth: true, data: macro.tips.value,
      lineStyle: { color: COLOR.primary, width: 3 }, itemStyle: { color: COLOR.primary },
      markLine: { data: [{ yAxis: 0, lineStyle: { color: COLOR.muted } }] }
    }]
  }));

  renderChart("chartPmi", Object.assign(baseConfig("全球制造业 PMI（荣枯线50）"), {
    xAxis: { type: "category", data: macro.pmi.years, axisLabel: { color: COLOR.sub } },
    series: [{
      type: "line", smooth: true, data: macro.pmi.value,
      lineStyle: { color: COLOR.copper, width: 3 }, itemStyle: { color: COLOR.copper },
      markLine: { data: [{ yAxis: 50, name: "荣枯线", lineStyle: { color: COLOR.red, type: "dashed" } }] }
    }]
  }));

  renderChart("chartRateCycle", {
    tooltip: {},
    grid: { left: 40, right: 24, top: 30, bottom: 40 },
    xAxis: { type: "category", data: macro.rateCycle.events.map(function (e) { return e.year; }), axisLabel: { color: COLOR.sub } },
    yAxis: { show: false, min: 0, max: 1 },
    series: [{
      type: "bar",
      data: macro.rateCycle.events.map(function (e, i) {
        return { value: 0.5, name: e.label, itemStyle: { color: i < 3 ? COLOR.primary : COLOR.green } };
      }),
      label: {
        show: true, position: "top", formatter: function (p) {
          return p.name;
        }, color: COLOR.text, fontSize: 12
      },
      barWidth: 30
    }]
  });
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
      var pages = ["gold", "copper", "ratio", "macro", "sources"];
      pages.forEach(function (p) {
        var b = document.querySelector('.nav-btn[data-page="' + p + '"]');
        if (b) b.click();
      });
      var tag = document.getElementById("overallTag");
      if (tag) tag.textContent = "自动验证：已渲染 " + Object.keys(charts).length + " 个图表实例";
    }, 600);
  });
}