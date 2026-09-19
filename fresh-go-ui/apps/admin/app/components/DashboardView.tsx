export function DashboardView() {
  return (
    <>
      <section className="kpis">
        <div className="kpi featured">
          <strong>Rs 2.84L</strong>
          <span>Today's revenue · +12.4%</span>
        </div>
        <div className="kpi">
          <strong>312</strong>
          <span>Orders today</span>
        </div>
        <div className="kpi">
          <strong>24</strong>
          <span>Preparing now</span>
        </div>
        <div className="kpi">
          <strong>6</strong>
          <span>Low stock items</span>
        </div>
      </section>
      <div className="grid">
        <section className="panel">
          <h2>Revenue, last 7 days</h2>
          <div className="bar-chart">
            {[52, 64, 48, 80, 92, 70, 85].map((height, index) => (
              <div className="bar" style={{ height: `${height}%` }} key={index}>
                <small>
                  {["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"][index]}
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Needs attention</h2>
          <div className="attention">
            <div>
              <span>Order FF10284 delayed</span>
              <b className="badge error">12 min</b>
            </div>
            <div>
              <span>Seer Fish low stock</span>
              <b className="badge warning">8 kg left</b>
            </div>
            <div>
              <span>3 unassigned deliveries</span>
              <b className="badge warning">Zone 2</b>
            </div>
            <div>
              <span>Freshness audit</span>
              <b className="badge success">Ready</b>
            </div>
          </div>
        </section>
      </div>
      <div className="grid">
        <section className="panel">
          <h2>Category sales split</h2>
          <div className="row">
            <span>Fish</span>
            <strong>Rs 1.2L</strong>
          </div>
          <div className="row">
            <span>Meat</span>
            <strong>Rs 94K</strong>
          </div>
          <div className="row">
            <span>Vegetables</span>
            <strong>Rs 50K</strong>
          </div>
        </section>
        <section className="panel">
          <h2>Top products</h2>
          <div className="row">
            <span>Seer Fish</span>
            <strong>142 kg</strong>
          </div>
          <div className="row">
            <span>Tiger Prawns</span>
            <strong>98 kg</strong>
          </div>
          <div className="row">
            <span>Country Chicken</span>
            <strong>210 kg</strong>
          </div>
        </section>
      </div>
    </>
  );
}
