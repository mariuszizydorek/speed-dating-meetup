/* @ds-bundle: {"format":3,"namespace":"CreditTradingTerminalDesignSystem_384086","components":[],"sourceHashes":{"ui_kits/credit_trading_view/App.jsx":"41f485d707cd","ui_kits/credit_trading_view/Assistance.jsx":"cfac7e8e3779","ui_kits/credit_trading_view/Panel.jsx":"b72a4c92b2a2","ui_kits/credit_trading_view/PriorityRFQs.jsx":"7f87d52b5e5b","ui_kits/credit_trading_view/RFQInbox.jsx":"40398567953d","ui_kits/credit_trading_view/SwapDetail.jsx":"71ba661059e1","ui_kits/credit_trading_view/TradeBlotter.jsx":"27ce9e8c5f00"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CreditTradingTerminalDesignSystem_384086 = window.CreditTradingTerminalDesignSystem_384086 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/credit_trading_view/App.jsx
try { (() => {
// App.jsx — top-level composition
const initialInbox = [{
  id: "i1",
  time: "1s",
  product: "SIE 0.875 06/30",
  qty: "1.2m",
  price: "99.875",
  status: "Live"
}, {
  id: "i2",
  time: "8s",
  product: "FBB 1.14 02/09/30",
  qty: "48,000",
  price: "100.06",
  status: "Live"
}, {
  id: "i3",
  time: "10s",
  product: "TUI 1.95 04/05/28",
  qty: "-55,000",
  price: "99.875",
  status: "Live"
}, {
  id: "i4",
  time: "12s",
  product: "T. 5.55 10/12/40",
  qty: "140,000",
  price: "100.1",
  status: "Live"
}, {
  id: "i5",
  time: "18s",
  product: "TUI 1.95 04/05/28",
  qty: "2m",
  price: "100.250",
  status: "OTW"
}, {
  id: "i6",
  time: "21s",
  product: "SIE 6.42 10/10/35",
  qty: "95,20",
  price: "99.99",
  status: "OTW"
}, {
  id: "i7",
  time: "33s",
  product: "FBB 1.14 02/09/30",
  qty: "-55,000",
  price: "1.000",
  status: "Live"
}, {
  id: "i8",
  time: "44s",
  product: "T. 5.55 10/12/40",
  qty: "1.3m",
  price: "98.875",
  status: "Live"
}, {
  id: "i9",
  time: "46s",
  product: "TUI 1.95 04/05/28",
  qty: "-55,000",
  price: "96.255",
  status: "Won"
}, {
  id: "i10",
  time: "48s",
  product: "FBB 1.14 02/09/30",
  qty: "870,000",
  price: "100.05",
  status: "Won"
}, {
  id: "i11",
  time: "51s",
  product: "SIE 6.42 10/10/35",
  qty: "1.8m",
  price: "99.975",
  status: "Lost"
}, {
  id: "i12",
  time: "52s",
  product: "FBB 1.14 02/09/30",
  qty: "654,820",
  price: "99.500",
  status: "Lost"
}];
const initialBlotter = [{
  time: "11:55:30",
  status: "Won",
  client: "JP Morgan",
  direction: "Buy",
  size: "10m",
  instrument: "FBB 1.14 02/09/30"
}, {
  time: "11:55:30",
  status: "Won",
  client: "Citadel",
  direction: "Sell",
  size: "7.5m",
  instrument: "SIE 6.42 10/10/35"
}, {
  time: "11:55:30",
  status: "Won",
  client: "Barclays",
  direction: "Buy",
  size: "10m",
  instrument: "TUI 1.95 04/05/28"
}, {
  time: "11:55:30",
  status: "Won",
  client: "ICAP",
  direction: "Buy",
  size: "7.5m",
  instrument: "T. 5.55 10/12/40"
}, {
  time: "11:55:30",
  status: "Won",
  client: "ICAP",
  direction: "Buy",
  size: "10m",
  instrument: "SIE 3.99 5/5/25"
}, {
  time: "11:55:30",
  status: "Won",
  client: "ICAP",
  direction: "Buy",
  size: "7m",
  instrument: "SIE 3.99 5/5/25"
}];
const swapBySelection = {
  i5: {
    title: "Buy TUI 1.95 04/05/28",
    counterparty: "Citadel Securities",
    leadTrader: "Ian Crew",
    secondTrader: "Tiane Richards",
    sentTo: 3,
    hitRate: 52
  },
  i6: {
    title: "Buy SIE 6.42 10/10/35",
    counterparty: "Citadel Securities",
    leadTrader: "Ian Crew",
    secondTrader: "Tiane Richards",
    sentTo: 3,
    hitRate: 52
  },
  i1: {
    title: "Swap USD/HKD",
    counterparty: "Citadel Securities",
    leadTrader: "Ian Crew",
    secondTrader: "Tiane Richards",
    sentTo: 3,
    hitRate: 52
  },
  default: {
    title: "Swap USD/HKD",
    counterparty: "Citadel Securities",
    leadTrader: "Ian Crew",
    secondTrader: "Tiane Richards",
    sentTo: 3,
    hitRate: 52
  }
};
function App() {
  const [selected, setSelected] = React.useState("i1");
  const [sort, setSort] = React.useState("Newest");
  const [blotter, setBlotter] = React.useState(initialBlotter);
  const [inbox] = React.useState(initialInbox);
  const [flashing, setFlashing] = React.useState(false);
  const swap = swapBySelection[selected] || swapBySelection.default;
  const submit = () => {
    setFlashing(true);
    setTimeout(() => setFlashing(false), 200);
    const sel = inbox.find(r => r.id === selected);
    if (!sel) return;
    setBlotter(b => [{
      key: Date.now(),
      time: new Date().toLocaleTimeString("en-GB", {
        hour12: false
      }),
      status: "Won",
      client: swap.counterparty.split(" ")[0],
      direction: String(sel.qty).startsWith("-") ? "Sell" : "Buy",
      size: sel.qty,
      instrument: sel.product,
      isNew: true
    }, ...b]);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(PriorityRFQs, null), /*#__PURE__*/React.createElement(RFQInbox, {
    rows: inbox,
    selectedId: selected,
    onSelect: r => setSelected(r.id),
    sort: sort,
    onSortChange: setSort
  }), /*#__PURE__*/React.createElement(SwapDetail, {
    rfq: swap,
    onSubmit: submit,
    flashing: flashing
  }), /*#__PURE__*/React.createElement(Assistance, null), /*#__PURE__*/React.createElement(TradeBlotter, {
    rows: blotter
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/credit_trading_view/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/credit_trading_view/Assistance.jsx
try { (() => {
// Assistance.jsx — AI assistant panel
function Assistance() {
  const [msgs, setMsgs] = React.useState([]);
  const [txt, setTxt] = React.useState("");
  const send = () => {
    const t = txt.trim();
    if (!t) return;
    setMsgs(m => [...m, {
      role: "user",
      text: t
    }]);
    setTxt("");
    setTimeout(() => {
      const reply = canned(t);
      setMsgs(m => [...m, {
        role: "bot",
        text: reply
      }]);
    }, 400);
  };
  const canned = q => {
    const s = q.toLowerCase();
    if (s.includes("citadel")) return "Citadel Securities has a 52% hit rate with us over the last 30 days. Two traders covered: Ian Crew (lead) and Tiane Richards.";
    if (s.includes("usd/hkd") || s.includes("swap")) return "USD/HKD is trading 7.2911 spot, 1M fwd points 310. Two-way All-in 7.2941 / 7.2961.";
    if (s.includes("rfq")) return "3 priority RFQs in the queue. JPM is 35% keen on T. 1.155 03/30, 1.1m SELL.";
    return "I can summarize RFQs, explain pricing, or pull up recent trades. Try asking about a counterparty or a swap.";
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "assist-panel assist"
  }, /*#__PURE__*/React.createElement("header", {
    className: "assist-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "title"
  }, "Assistance"), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "settings"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-gear"
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "more"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-ellipsis-vertical"
  })))), msgs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "assist-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sparkle"
  }), /*#__PURE__*/React.createElement("div", {
    className: "assist-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, "Hi, I'm your assistant"), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, "Ask me anything, or pick a suggestion to get started."))) : /*#__PURE__*/React.createElement("div", {
    className: "assist-messages"
  }, msgs.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "msg " + (m.role === "bot" ? "bot" : "")
  }, m.text))), /*#__PURE__*/React.createElement("div", {
    className: "composer"
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "Ask me anything...",
    value: txt,
    onChange: e => setTxt(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") send();
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "tools"
  }, /*#__PURE__*/React.createElement("div", {
    className: "left"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "attach"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-light fa-paperclip"
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": "history"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-light fa-list"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "send",
    onClick: send
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-paper-plane"
  }))))));
}
Object.assign(window, {
  Assistance
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/credit_trading_view/Assistance.jsx", error: String((e && e.message) || e) }); }

// ui_kits/credit_trading_view/Panel.jsx
try { (() => {
// Panel.jsx — generic panel surface (head + body)
function Panel({
  title,
  actions,
  children,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: `panel ${className}`
  }, /*#__PURE__*/React.createElement("header", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, actions)), /*#__PURE__*/React.createElement("div", {
    className: "panel-body"
  }, children));
}

// Dropdown — small inline pill with chevron
function Dropdown({
  value,
  options = [],
  onChange
}) {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "dropdown",
    onClick: () => setOpen(o => !o)
  }, /*#__PURE__*/React.createElement("span", null, value), /*#__PURE__*/React.createElement("i", {
    className: "chev fa-solid fa-chevron-down"
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 4px)",
      right: 0,
      background: "#0F1216",
      border: "1px solid #505050",
      borderRadius: 2,
      minWidth: 100,
      zIndex: 10
    }
  }, options.map(opt => /*#__PURE__*/React.createElement("div", {
    key: opt,
    onClick: () => {
      onChange?.(opt);
      setOpen(false);
    },
    style: {
      padding: "6px 10px",
      fontSize: 13,
      cursor: "pointer",
      color: "#fff"
    },
    onMouseEnter: e => e.currentTarget.style.background = "#191C21",
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, opt))));
}

// StatusPill — color-only pill (no background) matching the source
function StatusPill({
  status
}) {
  const colors = {
    Live: "#FFFFFF",
    OTW: "#8CA7EC",
    Won: "#39E9A9",
    Lost: "#BD3333"
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      color: colors[status] || "#fff"
    }
  }, status);
}
Object.assign(window, {
  Panel,
  Dropdown,
  StatusPill
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/credit_trading_view/Panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/credit_trading_view/PriorityRFQs.jsx
try { (() => {
// PriorityRFQs.jsx
function PriorityRFQs() {
  const cards = [{
    org: "JPM Investors Ch…",
    ticker: "T. 1.155 03/30",
    side: "SELL",
    qty: "1.1m",
    pct: 35
  }, {
    org: "Barclays Wealth",
    ticker: "FBB 1.14 02/09/30",
    side: "BUY",
    qty: "2.4m",
    pct: 28
  }, {
    org: "Citadel Securities",
    ticker: "SIE 6.42 10/10/35",
    side: "BUY",
    qty: "7.5m",
    pct: 22
  }];
  return /*#__PURE__*/React.createElement(Panel, {
    title: "Priority RFQs",
    actions: /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      "aria-label": "more"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-ellipsis-vertical"
    })),
    className: "priority"
  }, cards.map((c, i) => /*#__PURE__*/React.createElement("div", {
    className: "rfq-card",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "org"
  }, c.org), /*#__PURE__*/React.createElement("div", {
    className: "ticker"
  }, c.ticker), /*#__PURE__*/React.createElement("div", {
    className: "side"
  }, c.side), /*#__PURE__*/React.createElement("div", {
    className: "qty"
  }, c.qty), /*#__PURE__*/React.createElement("div", {
    className: "keen"
  }, c.pct, /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "% keen"), /*#__PURE__*/React.createElement("span", {
    className: "arr"
  })))));
}
Object.assign(window, {
  PriorityRFQs
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/credit_trading_view/PriorityRFQs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/credit_trading_view/RFQInbox.jsx
try { (() => {
// RFQInbox.jsx
function RFQInbox({
  rows,
  onSelect,
  selectedId,
  sort,
  onSortChange
}) {
  return /*#__PURE__*/React.createElement(Panel, {
    title: "RFQ Inbox",
    actions: /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      "aria-label": "more"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-ellipsis-vertical"
    })),
    className: "inbox"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hitrate-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, "Hit Rate"), /*#__PURE__*/React.createElement("div", {
    className: "row2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "11", /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Today")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "small"
  }, "9.3%"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Last 30 days")))), /*#__PURE__*/React.createElement("div", {
    className: "vrule"
  }), /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, "Hit Rate ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#39E9A9"
    }
  }, "when keen")), /*#__PURE__*/React.createElement("div", {
    className: "row2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "18", /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Today")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "small"
  }, "17%"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Last 30 days"))))), /*#__PURE__*/React.createElement("div", {
    className: "hitrate-foot"
  }, /*#__PURE__*/React.createElement("a", null, "View more")), /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "filter"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-filter"
  })), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Dropdown, {
    value: sort,
    options: ["Newest", "Oldest", "Hit Rate"],
    onChange: onSortChange
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      minHeight: 0,
      margin: "0 -8px",
      padding: "0 8px"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "rfq-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Time"), /*#__PURE__*/React.createElement("th", null, "Product"), /*#__PURE__*/React.createElement("th", {
    className: "qty"
  }, "Qty"), /*#__PURE__*/React.createElement("th", {
    className: "price"
  }, "Price"), /*#__PURE__*/React.createElement("th", {
    className: "status"
  }, "Status"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    onClick: () => onSelect?.(r),
    style: {
      background: selectedId === r.id ? "#191C21" : undefined,
      boxShadow: selectedId === r.id ? "inset 2px 0 0 #39E9A9" : undefined
    }
  }, /*#__PURE__*/React.createElement("td", {
    className: "time"
  }, r.time), /*#__PURE__*/React.createElement("td", null, r.product), /*#__PURE__*/React.createElement("td", {
    className: "qty",
    style: {
      color: String(r.qty).startsWith("−") || String(r.qty).startsWith("-") ? "#BD3333" : undefined
    }
  }, r.qty), /*#__PURE__*/React.createElement("td", {
    className: "price"
  }, r.price), /*#__PURE__*/React.createElement("td", {
    className: "status"
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: r.status
  }))))))));
}
Object.assign(window, {
  RFQInbox
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/credit_trading_view/RFQInbox.jsx", error: String((e && e.message) || e) }); }

// ui_kits/credit_trading_view/SwapDetail.jsx
try { (() => {
// SwapDetail.jsx — pricing detail for the selected RFQ
function RateCard({
  label,
  value,
  valueColor,
  va,
  cva,
  allInRate,
  spot,
  fwd,
  margin
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rate"
  }, /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: valueColor
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    className: "stepper"
  }, /*#__PURE__*/React.createElement("span", null, "\u25B2"), /*#__PURE__*/React.createElement("span", null, "\u25BC"))), /*#__PURE__*/React.createElement("div", {
    className: "grid"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "VA"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, va), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "CVA"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, cva)), /*#__PURE__*/React.createElement("hr", null), /*#__PURE__*/React.createElement("div", {
    className: "allin"
  }, "All in rate"), /*#__PURE__*/React.createElement("div", {
    className: "big",
    style: {
      justifyContent: "flex-end"
    }
  }, allInRate), /*#__PURE__*/React.createElement("div", {
    className: "grid"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Spot"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, spot), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Fwd"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, fwd), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Margin"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, margin)));
}
function SwapDetail({
  rfq,
  onSubmit,
  flashing
}) {
  const [near, setNear] = React.useState({
    notional: "1,400,000",
    tenor: "1M",
    date: "10 Nov 23"
  });
  const [far, setFar] = React.useState({
    notional: "1,400,000",
    tenor: "3M",
    date: "10 Feb 24"
  });
  return /*#__PURE__*/React.createElement(Panel, {
    title: rfq.title,
    actions: /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      "aria-label": "more"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-ellipsis-vertical"
    })),
    className: "swap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "swap-meta-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, rfq.counterparty), /*#__PURE__*/React.createElement("div", {
    className: "traders"
  }, /*#__PURE__*/React.createElement("span", {
    className: "trader lead"
  }, rfq.leadTrader), /*#__PURE__*/React.createElement("span", {
    className: "trader"
  }, rfq.secondTrader))), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, /*#__PURE__*/React.createElement("div", null, "Sent to: ", rfq.sentTo), /*#__PURE__*/React.createElement("div", null, "Hit rate: ", rfq.hitRate, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "legs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "leg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "leg-title"
  }, "Near Leg"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, "Notional"), /*#__PURE__*/React.createElement("div", {
    className: "input"
  }, /*#__PURE__*/React.createElement("input", {
    value: near.notional,
    onChange: e => setNear({
      ...near,
      notional: e.target.value
    })
  }), /*#__PURE__*/React.createElement("span", {
    className: "suffix"
  }, "USD"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, "Value date"), /*#__PURE__*/React.createElement("div", {
    className: "input"
  }, /*#__PURE__*/React.createElement("input", {
    value: near.tenor,
    onChange: e => setNear({
      ...near,
      tenor: e.target.value
    })
  }), /*#__PURE__*/React.createElement("span", {
    className: "suffix"
  }, near.date)))), /*#__PURE__*/React.createElement("div", {
    className: "leg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "leg-title"
  }, "Far leg"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, "Notional"), /*#__PURE__*/React.createElement("div", {
    className: "input"
  }, /*#__PURE__*/React.createElement("input", {
    value: far.notional,
    onChange: e => setFar({
      ...far,
      notional: e.target.value
    })
  }), /*#__PURE__*/React.createElement("span", {
    className: "suffix"
  }, "USD"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, "Value date"), /*#__PURE__*/React.createElement("div", {
    className: "input"
  }, /*#__PURE__*/React.createElement("input", {
    value: far.tenor,
    onChange: e => setFar({
      ...far,
      tenor: e.target.value
    })
  }), /*#__PURE__*/React.createElement("span", {
    className: "suffix"
  }, far.date))))), /*#__PURE__*/React.createElement("div", {
    className: "rate-row"
  }, /*#__PURE__*/React.createElement(RateCard, {
    label: "We sell and buy USD",
    value: "\u2212687",
    valueColor: "#BD3333",
    va: "4,877",
    cva: "41",
    allInRate: "7.2941",
    spot: "7.2911",
    fwd: "310",
    margin: "412"
  }), /*#__PURE__*/React.createElement(RateCard, {
    label: "We buy and sell USD",
    value: "\u221221",
    valueColor: "#FFFFFF",
    va: "4,857",
    cva: "\u2212\u2212",
    allInRate: "7.2961",
    spot: "7.2951",
    fwd: "310",
    margin: "390"
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn-submit" + (flashing ? " flash" : ""),
    onClick: onSubmit
  }, "Submit"));
}
Object.assign(window, {
  RateCard,
  SwapDetail
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/credit_trading_view/SwapDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/credit_trading_view/TradeBlotter.jsx
try { (() => {
// TradeBlotter.jsx — completed trade list
function TradeBlotter({
  rows
}) {
  return /*#__PURE__*/React.createElement(Panel, {
    title: "Trade Blotter",
    actions: /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      "aria-label": "more"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-ellipsis-vertical"
    })),
    className: "blotter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "filter"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-filter"
  })), /*#__PURE__*/React.createElement(Dropdown, {
    value: "Newest",
    options: ["Newest", "Oldest", "Won", "Lost"]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "blotter-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: 14
    }
  }), /*#__PURE__*/React.createElement("th", null, "Time"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Client"), /*#__PURE__*/React.createElement("th", null, "Direction"), /*#__PURE__*/React.createElement("th", null, "Size"), /*#__PURE__*/React.createElement("th", null, "Instrument"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.key || i,
    className: r.isNew ? "new-row" : ""
  }, /*#__PURE__*/React.createElement("td", {
    className: "caret"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-caret-right"
  })), /*#__PURE__*/React.createElement("td", null, r.time), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusPill, {
    status: r.status
  })), /*#__PURE__*/React.createElement("td", null, r.client), /*#__PURE__*/React.createElement("td", {
    style: {
      color: r.direction === "Sell" ? "#BD3333" : "#fff"
    }
  }, r.direction), /*#__PURE__*/React.createElement("td", null, r.size), /*#__PURE__*/React.createElement("td", null, r.instrument)))))));
}
Object.assign(window, {
  TradeBlotter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/credit_trading_view/TradeBlotter.jsx", error: String((e && e.message) || e) }); }

})();
