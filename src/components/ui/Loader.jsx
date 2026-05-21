import React from 'react';

export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="global-loader">
      <div className="global-loader__box">
        <div className="spinner" />
        <div className="global-loader__text">{text}</div>
      </div>
    </div>
  );
}
