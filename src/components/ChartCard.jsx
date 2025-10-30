const ChartCard = ({ title, description, insight, legend, children }) => (
  <article className="chart-card">
    <div>
      <h2>{title}</h2>
      <p className="chart-description">{description}</p>
      {legend}
    </div>
    {children}
    {insight ? <p className="chart-insight">{insight}</p> : null}
  </article>
);

export default ChartCard;
