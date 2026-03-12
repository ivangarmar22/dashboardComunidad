import React from 'react';

function ServiceCard({ title, badge, badgeClass, value, unit, label, loading, error, color }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>{title}</h2>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
          Cargando...
        </div>
      ) : error ? (
        <div className="error-message">Sin datos disponibles</div>
      ) : (
        <>
          <div className="stat-value" style={{ color }}>
            {value}
            <span className="stat-unit"> {unit}</span>
          </div>
          <div className="stat-label">{label}</div>
        </>
      )}
    </div>
  );
}

export default ServiceCard;
